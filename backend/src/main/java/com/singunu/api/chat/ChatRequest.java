package com.singunu.api.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record ChatRequest(
        @NotBlank @Size(max = 64) String sessionId,
        @NotBlank @Size(max = 2000) String message,
        List<Turn> history
) {
    /** role: "user" | "assistant" */
    public record Turn(String role, String text) {
    }
}
