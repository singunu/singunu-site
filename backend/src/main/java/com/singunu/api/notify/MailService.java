package com.singunu.api.notify;

import com.singunu.api.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    private final JavaMailSender mailSender;
    private final AppProperties props;

    public MailService(JavaMailSender mailSender, AppProperties props) {
        this.mailSender = mailSender;
        this.props = props;
    }

    @Async
    public void sendFallbackNotification(String contact, String question, String historyText) {
        String body = """
                singunu.com에 직접 답변이 필요한 질문이 도착했습니다.

                ■ 연락처(자유입력): %s

                ■ 질문:
                %s

                ■ 직전 대화:
                %s
                """.formatted(contact, question, historyText == null || historyText.isBlank() ? "(없음)" : historyText);
        send("[singunu.com] 직접 답변 요청: " + truncate(question, 30), body);
    }

    @Async
    public void sendBudgetAlert(double spentUsd, double budgetUsd) {
        send("[singunu.com] ⚠️ 일일 API 예산 초과 — 서비스 일시 잠금",
                "오늘 지출 $%.4f 이 예산 $%.2f 을 초과해 챗 서비스가 폴백 모드로 전환되었습니다.%n자정(KST) 이후 자동 해제됩니다. 필요하면 DAILY_BUDGET_USD를 조정하세요."
                        .formatted(spentUsd, budgetUsd));
    }

    private void send(String subject, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(props.adminEmail());
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            log.info("메일 발송: {}", subject);
        } catch (Exception e) {
            // 메일 실패가 요청 처리를 막으면 안 된다 — DB에는 이미 저장됨
            log.error("메일 발송 실패: {}", subject, e);
        }
    }

    private static String truncate(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max) + "…";
    }
}
