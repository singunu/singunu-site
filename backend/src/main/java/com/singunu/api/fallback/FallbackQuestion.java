package com.singunu.api.fallback;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

/** AI가 답하지 못한 질문 + 방문자 연락처 — 건우가 직접 답변할 목록. */
@Document("fallback_questions")
public class FallbackQuestion {

    @Id
    private String id;
    private String sessionId;
    private String question;
    private String contact;          // 자유텍스트: 카톡 오픈채팅, 인스타 아이디, 전화번호 등
    private List<Turn> history;
    private String ipHash;
    private boolean spamSuspected;   // 허니팟 필드에 값이 있으면 true
    private boolean answered;
    @Indexed
    private Instant createdAt = Instant.now();

    public record Turn(String role, String text) {
    }

    public String getId() { return id; }
    public void setId(String v) { this.id = v; }
    public String getSessionId() { return sessionId; }
    public void setSessionId(String v) { this.sessionId = v; }
    public String getQuestion() { return question; }
    public void setQuestion(String v) { this.question = v; }
    public String getContact() { return contact; }
    public void setContact(String v) { this.contact = v; }
    public List<Turn> getHistory() { return history; }
    public void setHistory(List<Turn> v) { this.history = v; }
    public String getIpHash() { return ipHash; }
    public void setIpHash(String v) { this.ipHash = v; }
    public boolean isSpamSuspected() { return spamSuspected; }
    public void setSpamSuspected(boolean v) { this.spamSuspected = v; }
    public boolean isAnswered() { return answered; }
    public void setAnswered(boolean v) { this.answered = v; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant v) { this.createdAt = v; }
}
