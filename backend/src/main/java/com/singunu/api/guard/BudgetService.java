package com.singunu.api.guard;

import com.singunu.api.config.AppProperties;
import com.singunu.api.notify.MailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;

/**
 * 가드레일 5단계(운영 방어) — 일일 API 지출 상한 서킷브레이커.
 * 상한 초과 시 서비스가 폴백 안내로 전환되고 관리자에게 메일 알림(하루 1회).
 * Mongo에 집계를 영속화해 서버 재시작에도 유지된다.
 */
@Service
public class BudgetService {

    private static final Logger log = LoggerFactory.getLogger(BudgetService.class);
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    // Claude Haiku 4.5 가격 ($/1M tokens). 모델 변경 시 함께 갱신할 것.
    static final double INPUT_PER_MTOK = 1.00;
    static final double OUTPUT_PER_MTOK = 5.00;
    static final double CACHE_WRITE_PER_MTOK = 1.25;
    static final double CACHE_READ_PER_MTOK = 0.10;

    private final AppProperties props;
    private final DailyUsageRepository repository;
    private final MailService mailService;

    public BudgetService(AppProperties props, DailyUsageRepository repository, MailService mailService) {
        this.props = props;
        this.repository = repository;
        this.mailService = mailService;
    }

    static double cost(long input, long output, long cacheWrite, long cacheRead) {
        return input * INPUT_PER_MTOK / 1_000_000
                + output * OUTPUT_PER_MTOK / 1_000_000
                + cacheWrite * CACHE_WRITE_PER_MTOK / 1_000_000
                + cacheRead * CACHE_READ_PER_MTOK / 1_000_000;
    }

    private String today() {
        return LocalDate.now(KST).toString();
    }

    /** true = 예산 내, 요청 진행 가능 */
    public synchronized boolean hasBudget() {
        DailyUsage usage = repository.findById(today()).orElse(null);
        return usage == null || usage.getCostUsd() < props.dailyBudgetUsd();
    }

    public synchronized void record(long input, long output, long cacheWrite, long cacheRead) {
        DailyUsage usage = repository.findById(today()).orElseGet(() -> new DailyUsage(today()));
        usage.setInputTokens(usage.getInputTokens() + input);
        usage.setOutputTokens(usage.getOutputTokens() + output);
        usage.setCacheWriteTokens(usage.getCacheWriteTokens() + cacheWrite);
        usage.setCacheReadTokens(usage.getCacheReadTokens() + cacheRead);
        usage.setCostUsd(usage.getCostUsd() + cost(input, output, cacheWrite, cacheRead));
        repository.save(usage);

        if (usage.getCostUsd() >= props.dailyBudgetUsd() && !usage.isBudgetAlertSent()) {
            usage.setBudgetAlertSent(true);
            repository.save(usage);
            log.warn("일일 예산 초과: ${} — 서비스 일시 잠금", usage.getCostUsd());
            mailService.sendBudgetAlert(usage.getCostUsd(), props.dailyBudgetUsd());
        }
    }
}
