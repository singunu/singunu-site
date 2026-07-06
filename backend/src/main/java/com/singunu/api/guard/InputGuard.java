package com.singunu.api.guard;

import com.singunu.api.config.AppProperties;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * 가드레일 1단계 — 입력 필터.
 * 길이 제한과 명백한 프롬프트 주입·역할 탈취 패턴을 LLM 호출 전에 차단해 비용과 리스크를 줄인다.
 * 여기서 못 잡는 변형은 시스템 프롬프트(2단계)와 출력 검열(3단계)이 처리한다.
 */
@Component
public class InputGuard {

    private static final List<Pattern> BLOCK_PATTERNS = List.of(
            // 역할 탈취·규칙 무시
            Pattern.compile("(모든|이전|위의?)\\s*(규칙|지시|명령|설정).{0,10}(무시|잊|취소)", Pattern.CASE_INSENSITIVE),
            Pattern.compile("ignore\\s+(all\\s+)?(previous|above|prior)\\s+(instructions?|rules?|prompts?)", Pattern.CASE_INSENSITIVE),
            Pattern.compile("(disregard|forget|override)\\s+(your|all|the)\\s+(instructions?|rules?|guidelines?)", Pattern.CASE_INSENSITIVE),
            // 시스템 프롬프트 유출 시도
            Pattern.compile("(시스템\\s*프롬프트|system\\s*prompt|초기\\s*(지시|설정|명령))", Pattern.CASE_INSENSITIVE),
            Pattern.compile("(너의|네)\\s*(지시사항|규칙|프롬프트|설정).{0,10}(보여|알려|출력|말해)"),
            Pattern.compile("(repeat|print|output|show)\\s+.{0,20}(instructions?|prompt|rules)", Pattern.CASE_INSENSITIVE),
            // 내부 시스템 접근 요구
            Pattern.compile("(DB|데이터베이스|database|테이블|스키마|서버\\s*코드).{0,15}(보여|알려|출력|덤프|dump|접근)", Pattern.CASE_INSENSITIVE),
            // 역할 재정의
            Pattern.compile("(지금부터|이제부터)\\s*(너는|넌|당신은).{0,20}(역할|모드|캐릭터|~인\\s*척)"),
            Pattern.compile("you\\s+are\\s+now\\s+(a|an|in)\\s", Pattern.CASE_INSENSITIVE),
            Pattern.compile("(DAN|jailbreak|developer\\s*mode)", Pattern.CASE_INSENSITIVE)
    );

    private final AppProperties props;

    public InputGuard(AppProperties props) {
        this.props = props;
    }

    /** 문제가 있으면 차단 사유를 반환한다. empty = 통과. */
    public Optional<String> check(String message) {
        if (message == null || message.isBlank()) {
            return Optional.of("EMPTY");
        }
        if (message.length() > props.maxMessageLength()) {
            return Optional.of("TOO_LONG");
        }
        for (Pattern p : BLOCK_PATTERNS) {
            if (p.matcher(message).find()) {
                return Optional.of("INJECTION_PATTERN");
            }
        }
        return Optional.empty();
    }
}
