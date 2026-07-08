package com.singunu.api.guard;

import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

/**
 * 가드레일 3단계 — 출력 검열.
 * 스트리밍 중 누적 텍스트에 개인정보 "값"(주민번호·전화·카드번호)이 나오면 즉시 차단한다.
 * (페르소나 문서 자체가 검수된 공개 정보라 정상 경로에선 걸릴 일이 없다 — 심층 방어용)
 *
 * 민감 "단어"(비밀번호·파산·개인회생·시스템 프롬프트 등)의 단순 언급은 차단하지 않는다:
 * AI가 경계를 설명하며 그 단어를 말하는 것("그건 안 알려드려요")은 무해하고, 실제 값 유출은
 * 아래 정규식이 잡는다. 단어 substring 매칭은 정상 답변을 통째로 폐기하는 오탐만 유발했다.
 * (프롬프트 유출 "시도"는 입력 단계 InputGuard가 방어. 재정 이력은 페르소나에서 이미 스크럽됨.)
 */
@Component
public class OutputGuard {

    private static final Pattern RRN = Pattern.compile("\\d{6}\\s*-\\s*[1-4]\\d{6}");           // 주민등록번호
    private static final Pattern PHONE = Pattern.compile("01[016789]\\s*-?\\s*\\d{3,4}\\s*-?\\s*\\d{4}"); // 휴대전화
    private static final Pattern CARD = Pattern.compile("(\\d{4}\\s*-\\s*){3}\\d{4}");          // 카드번호 형태

    /** true = 차단해야 함 */
    public boolean shouldBlock(String accumulatedText) {
        if (accumulatedText == null || accumulatedText.isEmpty()) {
            return false;
        }
        return RRN.matcher(accumulatedText).find()
                || PHONE.matcher(accumulatedText).find()
                || CARD.matcher(accumulatedText).find();
    }
}
