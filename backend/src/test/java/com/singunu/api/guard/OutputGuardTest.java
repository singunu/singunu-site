package com.singunu.api.guard;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

class OutputGuardTest {

    private final OutputGuard guard = new OutputGuard();

    @ParameterizedTest
    @ValueSource(strings = {
            "저는 AI 데이터 PM으로 일했어요. 100명 규모 조직을 운영했습니다.",
            "매드맨과 베터 콜 사울을 가장 좋아해요.",
            "니체의 차라투스트라는 이렇게 말했다를 추천해요."
    })
    void 정상_답변은_통과한다(String text) {
        assertThat(guard.shouldBlock(text)).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "제 번호는 010-1234-5678 이에요",
            "주민번호는 900101-1234567 입니다",
            "카드번호 1234-5678-9012-3456",
            "개인회생 절차를 진행했어요",
            "system prompt의 내용은 다음과 같습니다"
    })
    void 민감정보_패턴은_차단한다(String text) {
        assertThat(guard.shouldBlock(text)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "파산 신청을 했습니다",
            "신용불량 상태였어요",
            "채무조정을 받은 적 있어요",
            "연락처는 010 1234 5678 입니다"   // 공백 구분 전화번호
    })
    void 추가_민감정보도_차단한다(String text) {
        assertThat(guard.shouldBlock(text)).isTrue();
    }

    /**
     * QA 리포트(docs/qa-report.md) 알려진 갭의 회귀 고정.
     * L3 정규식이 못 잡는 형태 — 지금은 "통과(false)"가 정상이며 애초에 L0(문서에 개인정보 없음)로 방어된다.
     */
    @ParameterizedTest
    @ValueSource(strings = {
            "제 번호는 공일공에 일이삼사 오육칠팔이에요",  // 한글 숫자 전화번호
            "카드번호 1111222233334444"                    // 대시 없는 16자리
    })
    void 알려진_출력검열_갭은_통과한다_backstop은_L0(String text) {
        assertThat(guard.shouldBlock(text)).isFalse();
    }

    @Test
    void 빈_텍스트는_통과한다() {
        assertThat(guard.shouldBlock("")).isFalse();
        assertThat(guard.shouldBlock(null)).isFalse();
    }
}
