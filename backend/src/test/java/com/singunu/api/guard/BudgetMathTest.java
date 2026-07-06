package com.singunu.api.guard;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class BudgetMathTest {

    @Test
    void 하이쿠_가격으로_비용을_계산한다() {
        // 1M input = $1, 1M output = $5
        assertThat(BudgetService.cost(1_000_000, 0, 0, 0)).isEqualTo(1.0, within(1e-9));
        assertThat(BudgetService.cost(0, 1_000_000, 0, 0)).isEqualTo(5.0, within(1e-9));
        // 캐시 쓰기 1.25x, 읽기 0.1x
        assertThat(BudgetService.cost(0, 0, 1_000_000, 0)).isEqualTo(1.25, within(1e-9));
        assertThat(BudgetService.cost(0, 0, 0, 1_000_000)).isEqualTo(0.10, within(1e-9));
    }

    @Test
    void 일반적인_대화_한_건은_1센트_미만이다() {
        // 페르소나 캐시 히트(8K read) + 질문(100) + 답변(300) 수준
        double cost = BudgetService.cost(100, 300, 0, 8_000);
        assertThat(cost).isLessThan(0.01);
    }
}
