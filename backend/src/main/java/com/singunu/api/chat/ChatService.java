package com.singunu.api.chat;

import com.anthropic.client.AnthropicClient;
import com.anthropic.core.http.StreamResponse;
import com.anthropic.models.messages.CacheControlEphemeral;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.MessageParam;
import com.anthropic.models.messages.RawMessageStreamEvent;
import com.anthropic.models.messages.TextBlockParam;
import com.singunu.api.config.AppProperties;
import com.singunu.api.conversation.ConversationLog;
import com.singunu.api.conversation.ConversationLogRepository;
import com.singunu.api.guard.BudgetService;
import com.singunu.api.guard.InputGuard;
import com.singunu.api.guard.OutputGuard;
import com.singunu.api.guard.RateLimiter;
import com.singunu.api.persona.PersonaService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

/**
 * 챗 파이프라인: 레이트리밋 → 예산 → 입력필터 → Claude 스트리밍(SSE)
 *              → 폴백 토큰 감지 → 출력 검열 → 사용량 기록 → 대화 로깅
 *
 * SSE 이벤트 프로토콜:
 *   delta  {"t": "..."}                     — 답변 텍스트 조각
 *   done   {"fallback": bool}               — 정상 종료 (fallback=true면 프론트가 직접질문 모달 표시)
 *   guard  {"reason": "...", "fallback": true} — 가드레일 차단 (폴백 유도)
 *   error  {"message": "..."}               — 서버 오류
 */
@Service
public class ChatService {

    private static final Logger log = LoggerFactory.getLogger(ChatService.class);
    private static final String FALLBACK_TOKEN = "<<FALLBACK>>";

    private final AnthropicClient anthropic;
    private final AppProperties props;
    private final PersonaService personaService;
    private final InputGuard inputGuard;
    private final OutputGuard outputGuard;
    private final RateLimiter rateLimiter;
    private final BudgetService budgetService;
    private final ConversationLogRepository conversationRepository;

    public ChatService(AnthropicClient anthropic, AppProperties props, PersonaService personaService,
                       InputGuard inputGuard, OutputGuard outputGuard, RateLimiter rateLimiter,
                       BudgetService budgetService, ConversationLogRepository conversationRepository) {
        this.anthropic = anthropic;
        this.props = props;
        this.personaService = personaService;
        this.inputGuard = inputGuard;
        this.outputGuard = outputGuard;
        this.rateLimiter = rateLimiter;
        this.budgetService = budgetService;
        this.conversationRepository = conversationRepository;
    }

    public void stream(ChatRequest request, String clientIp, SseEmitter emitter) {
        String guardFlag = null;
        String answer = "";
        AtomicLong inputTokens = new AtomicLong();
        AtomicLong outputTokens = new AtomicLong();
        AtomicLong cacheWrite = new AtomicLong();
        AtomicLong cacheRead = new AtomicLong();

        try {
            // 1) 운영 방어: 레이트리밋 · 예산 서킷브레이커
            if (!rateLimiter.tryAcquire(clientIp)) {
                guardFlag = "RATE_LIMITED";
                sendGuard(emitter, "잠시 후 다시 시도해 주세요. 급한 질문이면 직접 남겨주셔도 됩니다!");
                return;
            }
            if (!budgetService.hasBudget()) {
                guardFlag = "BUDGET_EXCEEDED";
                sendGuard(emitter, "오늘은 AI 건우가 잠시 쉬는 중이에요. 질문을 남겨주시면 건우가 직접 답해드릴게요!");
                return;
            }

            // 2) 입력 필터
            var blocked = inputGuard.check(request.message());
            if (blocked.isPresent()) {
                guardFlag = "INPUT_BLOCKED:" + blocked.get();
                sendGuard(emitter, "이 질문엔 답하기 어려워요. 건우에게 직접 물어보시겠어요?");
                return;
            }

            // 3) Claude 호출 (시스템 프롬프트 캐싱 + 스트리밍)
            MessageCreateParams params = buildParams(request);
            StringBuilder full = new StringBuilder();
            StringBuilder prefixBuffer = new StringBuilder();   // 폴백 토큰 감지용 선두 버퍼
            boolean[] prefixFlushed = {false};
            boolean[] fallbackDetected = {false};
            boolean[] outputBlocked = {false};

            try (StreamResponse<RawMessageStreamEvent> streamResponse = anthropic.messages().createStreaming(params)) {
                streamResponse.stream().forEach(event -> {
                    event.messageStart().ifPresent(start -> {
                        var usage = start.message().usage();
                        inputTokens.set(usage.inputTokens());
                        usage.cacheCreationInputTokens().ifPresent(cacheWrite::set);
                        usage.cacheReadInputTokens().ifPresent(cacheRead::set);
                    });
                    event.messageDelta().ifPresent(delta ->
                            outputTokens.set(delta.usage().outputTokens()));

                    if (fallbackDetected[0] || outputBlocked[0]) {
                        return; // 이미 종결 — 남은 이벤트 무시
                    }
                    event.contentBlockDelta().ifPresent(blockDelta ->
                            blockDelta.delta().text().ifPresent(textDelta -> {
                                String text = textDelta.text();
                                full.append(text);

                                // 3-a) 확신도 라우팅: 선두가 폴백 토큰이면 답변 대신 폴백 신호
                                if (!prefixFlushed[0]) {
                                    prefixBuffer.append(text);
                                    String prefix = prefixBuffer.toString();
                                    if (FALLBACK_TOKEN.startsWith(prefix) || prefix.startsWith(FALLBACK_TOKEN)) {
                                        if (prefix.startsWith(FALLBACK_TOKEN)) {
                                            fallbackDetected[0] = true;
                                        }
                                        return; // 아직 판별 중이거나 폴백 확정 — 전송 보류
                                    }
                                    prefixFlushed[0] = true;
                                    emitDelta(emitter, prefix);
                                    return;
                                }

                                // 3-b) 출력 검열: 누적 텍스트 검사
                                if (outputGuard.shouldBlock(full.toString())) {
                                    outputBlocked[0] = true;
                                    return;
                                }
                                emitDelta(emitter, text);
                            }));
                });
            }

            answer = full.toString();

            // 4) 종결 처리
            if (outputBlocked[0]) {
                guardFlag = "OUTPUT_BLOCKED";
                answer = "";
                sendGuard(emitter, "이 답변은 전달할 수 없어요. 건우에게 직접 물어보시겠어요?");
            } else if (fallbackDetected[0] || answer.startsWith(FALLBACK_TOKEN)) {
                guardFlag = "FALLBACK";
                answer = "";
                emitter.send(SseEmitter.event().name("done").data(Map.of("fallback", true)));
                emitter.complete();
            } else {
                if (!prefixFlushed[0] && !prefixBuffer.isEmpty()) {
                    emitDelta(emitter, prefixBuffer.toString()); // 아주 짧은 답변 잔여 버퍼
                }
                emitter.send(SseEmitter.event().name("done").data(Map.of("fallback", false)));
                emitter.complete();
            }
        } catch (Exception e) {
            log.error("chat stream 실패 (session={})", request.sessionId(), e);
            guardFlag = guardFlag == null ? "ERROR" : guardFlag;
            try {
                emitter.send(SseEmitter.event().name("error")
                        .data(Map.of("message", "잠시 문제가 생겼어요. 다시 시도해 주세요.")));
                emitter.complete();
            } catch (Exception ignored) {
                emitter.completeWithError(e);
            }
        } finally {
            budgetService.record(inputTokens.get(), outputTokens.get(), cacheWrite.get(), cacheRead.get());
            saveLog(request, clientIp, answer, guardFlag, inputTokens.get(), outputTokens.get());
        }
    }

    private MessageCreateParams buildParams(ChatRequest request) {
        var builder = MessageCreateParams.builder()
                .model(props.model())
                .maxTokens(props.maxOutputTokens())
                // 페르소나 시스템 프롬프트는 요청 간 동일 → 프롬프트 캐싱으로 입력 비용 ~90% 절감
                .systemOfTextBlockParams(List.of(
                        TextBlockParam.builder()
                                .text(personaService.systemPrompt())
                                .cacheControl(CacheControlEphemeral.builder().build())
                                .build()));

        List<ChatRequest.Turn> history = request.history() == null ? List.of() : request.history();
        int from = Math.max(0, history.size() - props.maxHistoryTurns());
        List<MessageParam> messages = new ArrayList<>();
        for (ChatRequest.Turn turn : history.subList(from, history.size())) {
            if (turn.text() == null || turn.text().isBlank()) {
                continue;
            }
            MessageParam.Role role = "assistant".equals(turn.role())
                    ? MessageParam.Role.ASSISTANT : MessageParam.Role.USER;
            messages.add(MessageParam.builder().role(role).content(turn.text()).build());
        }
        messages.add(MessageParam.builder().role(MessageParam.Role.USER).content(request.message()).build());
        return builder.messages(messages).build();
    }

    private void emitDelta(SseEmitter emitter, String text) {
        try {
            emitter.send(SseEmitter.event().name("delta").data(Map.of("t", text)));
        } catch (IOException e) {
            throw new RuntimeException("클라이언트 연결 끊김", e);
        }
    }

    private void sendGuard(SseEmitter emitter, String userMessage) throws IOException {
        emitter.send(SseEmitter.event().name("guard")
                .data(Map.of("reason", userMessage, "fallback", true)));
        emitter.complete();
    }

    private void saveLog(ChatRequest request, String clientIp, String answer,
                         String guardFlag, long inputTokens, long outputTokens) {
        try {
            ConversationLog logEntry = new ConversationLog();
            logEntry.setSessionId(request.sessionId());
            logEntry.setIpHash(sha256(clientIp));
            logEntry.setUserMessage(request.message());
            logEntry.setAssistantMessage(answer);
            logEntry.setGuardFlag(guardFlag);
            logEntry.setInputTokens(inputTokens);
            logEntry.setOutputTokens(outputTokens);
            conversationRepository.save(logEntry);
        } catch (Exception e) {
            log.error("대화 로그 저장 실패", e);
        }
    }

    static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8))).substring(0, 16);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
