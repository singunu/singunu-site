package com.singunu.api.guard;

import com.singunu.api.config.AppProperties;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RateLimiterTest {

    private RateLimiter limiterWith(int perMinute, int perDay) {
        AppProperties props = new AppProperties(
                "key", "claude-haiku-4-5", 1024, "persona.md", "admin@test.com",
                1.0, "http://localhost:3000", perMinute, perDay, 500, 20);
        return new RateLimiter(props);
    }

    @Test
    void 분당_상한을_넘으면_차단한다() {
        RateLimiter limiter = limiterWith(3, 100);
        assertThat(limiter.tryAcquire("1.2.3.4")).isTrue();
        assertThat(limiter.tryAcquire("1.2.3.4")).isTrue();
        assertThat(limiter.tryAcquire("1.2.3.4")).isTrue();
        assertThat(limiter.tryAcquire("1.2.3.4")).isFalse();
    }

    @Test
    void IP별로_독립적으로_계산한다() {
        RateLimiter limiter = limiterWith(1, 100);
        assertThat(limiter.tryAcquire("1.1.1.1")).isTrue();
        assertThat(limiter.tryAcquire("1.1.1.1")).isFalse();
        assertThat(limiter.tryAcquire("2.2.2.2")).isTrue();
    }

    @Test
    void 일일_상한을_넘으면_차단한다() {
        RateLimiter limiter = limiterWith(100, 2);
        assertThat(limiter.tryAcquire("3.3.3.3")).isTrue();
        assertThat(limiter.tryAcquire("3.3.3.3")).isTrue();
        assertThat(limiter.tryAcquire("3.3.3.3")).isFalse();
    }
}
