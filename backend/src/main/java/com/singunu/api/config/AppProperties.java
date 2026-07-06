package com.singunu.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String anthropicApiKey,
        String model,
        long maxOutputTokens,
        String personaPath,
        String adminEmail,
        double dailyBudgetUsd,
        String allowedOrigin,
        int rateLimitPerMinute,
        int rateLimitPerDay,
        int maxMessageLength,
        int maxHistoryTurns
) {
}
