package com.singunu.api.guard;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/** 일별 토큰 사용량·비용 집계. _id = yyyy-MM-dd (KST) */
@Document("daily_usage")
public class DailyUsage {

    @Id
    private String date;
    private long inputTokens;
    private long outputTokens;
    private long cacheWriteTokens;
    private long cacheReadTokens;
    private double costUsd;
    private boolean budgetAlertSent;

    public DailyUsage() {
    }

    public DailyUsage(String date) {
        this.date = date;
    }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }
    public long getInputTokens() { return inputTokens; }
    public void setInputTokens(long v) { this.inputTokens = v; }
    public long getOutputTokens() { return outputTokens; }
    public void setOutputTokens(long v) { this.outputTokens = v; }
    public long getCacheWriteTokens() { return cacheWriteTokens; }
    public void setCacheWriteTokens(long v) { this.cacheWriteTokens = v; }
    public long getCacheReadTokens() { return cacheReadTokens; }
    public void setCacheReadTokens(long v) { this.cacheReadTokens = v; }
    public double getCostUsd() { return costUsd; }
    public void setCostUsd(double v) { this.costUsd = v; }
    public boolean isBudgetAlertSent() { return budgetAlertSent; }
    public void setBudgetAlertSent(boolean v) { this.budgetAlertSent = v; }
}
