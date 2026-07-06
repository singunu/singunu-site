package com.singunu.api.conversation;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/** 대화 전량 로깅 — 사후 감사·QA용. IP는 해시로만 저장. */
@Document("conversations")
public class ConversationLog {

    @Id
    private String id;
    @Indexed
    private String sessionId;
    private String ipHash;
    private String userMessage;
    private String assistantMessage;
    private String guardFlag;       // null | INPUT_BLOCKED:<사유> | OUTPUT_BLOCKED | FALLBACK | RATE_LIMITED | BUDGET_EXCEEDED
    private long inputTokens;
    private long outputTokens;
    @Indexed
    private Instant createdAt = Instant.now();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getSessionId() { return sessionId; }
    public void setSessionId(String v) { this.sessionId = v; }
    public String getIpHash() { return ipHash; }
    public void setIpHash(String v) { this.ipHash = v; }
    public String getUserMessage() { return userMessage; }
    public void setUserMessage(String v) { this.userMessage = v; }
    public String getAssistantMessage() { return assistantMessage; }
    public void setAssistantMessage(String v) { this.assistantMessage = v; }
    public String getGuardFlag() { return guardFlag; }
    public void setGuardFlag(String v) { this.guardFlag = v; }
    public long getInputTokens() { return inputTokens; }
    public void setInputTokens(long v) { this.inputTokens = v; }
    public long getOutputTokens() { return outputTokens; }
    public void setOutputTokens(long v) { this.outputTokens = v; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant v) { this.createdAt = v; }
}
