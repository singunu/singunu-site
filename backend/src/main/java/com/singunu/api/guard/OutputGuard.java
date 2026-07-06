package com.singunu.api.guard;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.regex.Pattern;

/**
 * 가드레일 3단계 — 출력 검열.
 * 스트리밍 중 누적 텍스트를 검사해 개인정보 패턴이나 민감 키워드가 나오면 즉시 차단한다.
 * (페르소나 문서 자체가 검수된 공개 정보라 정상 경로에선 걸릴 일이 없다 — 심층 방어용)
 */
@Component
public class OutputGuard {

    private static final Pattern RRN = Pattern.compile("\\d{6}\\s*-\\s*[1-4]\\d{6}");           // 주민등록번호
    private static final Pattern PHONE = Pattern.compile("01[016789]\\s*-?\\s*\\d{3,4}\\s*-?\\s*\\d{4}"); // 휴대전화
    private static final Pattern CARD = Pattern.compile("(\\d{4}\\s*-\\s*){3}\\d{4}");          // 카드번호 형태

    private static final List<String> SENSITIVE_KEYWORDS = List.of(
            "개인회생", "파산", "신용불량", "채무조정",
            "주민등록번호", "비밀번호", "계좌번호",
            "system prompt", "시스템 프롬프트"
    );

    /** true = 차단해야 함 */
    public boolean shouldBlock(String accumulatedText) {
        if (accumulatedText == null || accumulatedText.isEmpty()) {
            return false;
        }
        if (RRN.matcher(accumulatedText).find()
                || PHONE.matcher(accumulatedText).find()
                || CARD.matcher(accumulatedText).find()) {
            return true;
        }
        String lower = accumulatedText.toLowerCase();
        return SENSITIVE_KEYWORDS.stream().anyMatch(lower::contains);
    }
}
