package com.singunu.api.guard;

import com.singunu.api.config.AppProperties;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

/**
 * 가드레일 5단계(운영 방어) — IP별 슬라이딩 윈도우 레이트리밋.
 * 인스타그램 공개 링크 특성상 불특정 트래픽이 들어올 수 있어 분당/일당 상한을 둔다.
 */
@Component
public class RateLimiter {

    private final AppProperties props;
    private final Map<String, ConcurrentLinkedDeque<Instant>> requests = new ConcurrentHashMap<>();

    public RateLimiter(AppProperties props) {
        this.props = props;
    }

    /** true = 허용, false = 제한 초과 */
    public boolean tryAcquire(String clientIp) {
        Instant now = Instant.now();
        ConcurrentLinkedDeque<Instant> window = requests.computeIfAbsent(clientIp, k -> new ConcurrentLinkedDeque<>());

        synchronized (window) {
            Instant dayAgo = now.minus(24, ChronoUnit.HOURS);
            window.removeIf(t -> t.isBefore(dayAgo));

            long lastMinute = window.stream()
                    .filter(t -> t.isAfter(now.minus(60, ChronoUnit.SECONDS)))
                    .count();
            if (lastMinute >= props.rateLimitPerMinute() || window.size() >= props.rateLimitPerDay()) {
                return false;
            }
            window.add(now);
            return true;
        }
    }

    @Scheduled(fixedDelay = 3600_000)
    void cleanup() {
        Instant dayAgo = Instant.now().minus(24, ChronoUnit.HOURS);
        requests.entrySet().removeIf(e -> {
            synchronized (e.getValue()) {
                e.getValue().removeIf(t -> t.isBefore(dayAgo));
                return e.getValue().isEmpty();
            }
        });
    }
}
