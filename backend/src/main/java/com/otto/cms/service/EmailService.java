package com.otto.cms.service;

import com.otto.cms.dto.ClaimResponse;
import com.otto.cms.dto.EmailTemplateRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private static final int MAX_RETRIES = 3;
    private static final long RETRY_DELAY_MS = 2000;

    private final JavaMailSender mailSender;
    private final AuditLogService auditLogService;

    @Async
    public void sendClaimEmail(EmailTemplateRequest req) {
        sendWithRetry(() -> {
            var message = mailSender.createMimeMessage();
            var helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(req.getTo());
            if (req.getCc() != null && !req.getCc().isBlank()) helper.setCc(req.getCc());
            helper.setSubject(req.getSubject());
            helper.setText(req.getBodyHtml(), true);
            mailSender.send(message);
        }, "EMAIL_SENT", "Email sent to " + req.getTo() + " for claim " + req.getClaimId());
    }

    @Async
    public void sendSimpleMessage(String to, String subject, String text) {
        sendWithRetry(() -> {
            var message = mailSender.createMimeMessage();
            var helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(text, false);
            mailSender.send(message);
        }, "EMAIL_SENT", "Simple email sent to " + to + ": " + subject);
    }

    @Async
    public void sendSimilarClaimsAlert(ClaimResponse trigger, List<ClaimResponse> similar,
                                       String recipients, String subject, String bodyHtml) {
        if (similar.isEmpty()) return;
        sendWithRetry(() -> {
            if (bodyHtml == null || bodyHtml.isBlank()) {
                String rows = similar.stream().map(c ->
                    "<tr><td>" + c.getClaimNo() + "</td>" +
                    "<td>" + c.getVendor() + "</td>" +
                    "<td>" + (c.getDefectCategory() != null ? c.getDefectCategory() : "—") + "</td>" +
                    "<td>" + (c.getRcaStructured() != null && c.getRcaStructured().getRootCauseCategory() != null
                            ? c.getRcaStructured().getRootCauseCategory() : "—") + "</td>" +
                    "<td>" + (c.getClaimDate() != null ? c.getClaimDate() : "—") + "</td></tr>"
                ).collect(Collectors.joining());

                bodyHtml = "<p>Dear Team,</p>" +
                    "<p>This is a quality alert for recurring claim patterns at factory: <strong>" +
                    trigger.getVendor() + "</strong>.</p>" +
                    "<p>Triggered by Claim: <strong>" + trigger.getClaimNo() + "</strong><br>" +
                    "Defect Category: " + (trigger.getDefectCategory() != null ? trigger.getDefectCategory() : "—") + "<br>" +
                    "Root Cause: " + (trigger.getRcaStructured() != null && trigger.getRcaStructured().getRootCauseCategory() != null
                            ? trigger.getRcaStructured().getRootCauseCategory() : "—") + "</p>" +
                    "<table border='1' cellpadding='6' cellspacing='0' style='border-collapse:collapse;font-family:sans-serif;font-size:13px;'>" +
                    "<thead style='background:#1a3a5c;color:#fff;'>" +
                    "<tr><th>Claim No.</th><th>Vendor</th><th>Defect Category</th><th>Root Cause</th><th>Claim Date</th></tr>" +
                    "</thead><tbody>" + rows + "</tbody></table>" +
                    "<p>Please coordinate corrective actions to prevent further recurrence.</p>";
            }

            if (subject == null || subject.isBlank()) {
                subject = "[Quality Alert] Recurring claim pattern — " + trigger.getVendor();
            }

            String[] toAddresses = recipients != null
                    ? recipients.split("[;,]")
                    : new String[0];
            if (toAddresses.length == 0) return;

            var message = mailSender.createMimeMessage();
            var helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(toAddresses[0].trim());
            if (toAddresses.length > 1) {
                String[] cc = new String[toAddresses.length - 1];
                for (int i = 1; i < toAddresses.length; i++) cc[i - 1] = toAddresses[i].trim();
                helper.setCc(cc);
            }
            helper.setSubject(subject);
            helper.setText(bodyHtml, true);
            mailSender.send(message);
        }, "SIMILAR_CLAIMS_ALERT",
                "Similar claims alert sent for " + trigger.getClaimNo() +
                " to " + recipients + " (" + similar.size() + " matches)");
    }

    private void sendWithRetry(Runnable sendAction, String auditAction, String auditDetail) {
        Exception lastException = null;
        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                sendAction.run();
                auditLogService.log(auditAction, auditDetail);
                return;
            } catch (Exception e) {
                lastException = e;
                log.warn("Email send attempt {}/{} failed: {}", attempt, MAX_RETRIES, e.getMessage());
                if (attempt < MAX_RETRIES) {
                    try {
                        Thread.sleep(RETRY_DELAY_MS * attempt);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            }
        }
        log.error("Email send failed after {} attempts: {}", MAX_RETRIES,
                lastException != null ? lastException.getMessage() : "unknown");
        auditLogService.log("EMAIL_FAILED", "Failed after " + MAX_RETRIES + " retries: " + auditDetail);
    }
}
