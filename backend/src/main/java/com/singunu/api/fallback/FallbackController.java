package com.singunu.api.fallback;

import com.singunu.api.chat.ChatController;
import com.singunu.api.chat.ChatService;
import com.singunu.api.guard.RateLimiter;
import com.singunu.api.notify.MailService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class FallbackController {

    private final FallbackQuestionRepository repository;
    private final MailService mailService;
    private final RateLimiter rateLimiter;

    public FallbackController(FallbackQuestionRepository repository, MailService mailService,
                              RateLimiter rateLimiter) {
        this.repository = repository;
        this.mailService = mailService;
        this.rateLimiter = rateLimiter;
    }

    public record FallbackRequest(
            @NotBlank @Size(max = 64) String sessionId,
            @NotBlank @Size(max = 1000) String question,
            @NotBlank @Size(max = 200) String contact,
            List<FallbackQuestion.Turn> history,
            String website   // 허니팟 — 사람은 비워둠, 봇은 채움 (프론트에서 숨김 처리)
    ) {
    }

    @PostMapping("/fallback")
    public ResponseEntity<Map<String, Object>> submit(@Valid @RequestBody FallbackRequest request,
                                                      HttpServletRequest http) {
        String clientIp = ChatController.clientIp(http);
        if (!rateLimiter.tryAcquire(clientIp)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("ok", false, "message", "잠시 후 다시 시도해 주세요."));
        }

        boolean spam = request.website() != null && !request.website().isBlank();

        FallbackQuestion question = new FallbackQuestion();
        question.setSessionId(request.sessionId());
        question.setQuestion(request.question());
        question.setContact(request.contact());
        question.setHistory(request.history());
        question.setIpHash(ChatService.sha256(clientIp));
        question.setSpamSuspected(spam);
        repository.save(question);

        if (!spam) {
            String historyText = request.history() == null ? "" : request.history().stream()
                    .map(t -> ("user".equals(t.role()) ? "방문자: " : "AI 건우: ") + t.text())
                    .collect(Collectors.joining("\n"));
            mailService.sendFallbackNotification(request.contact(), request.question(), historyText);
        }

        return ResponseEntity.ok(Map.of("ok", true, "message", "질문이 전달됐어요. 건우가 직접 답해드릴게요!"));
    }
}
