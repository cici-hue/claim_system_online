package com.otto.cms.service;

import com.otto.cms.entity.Claim;
import com.otto.cms.repository.ClaimRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class RcaOverdueService {

    private final ClaimRepository claimRepository;
    private final EmailService emailService;

    @Scheduled(cron = "0 0 8 * * MON-FRI")
    public void checkOverdueRCA() {
        LocalDate cutoff = LocalDate.now().minusDays(14);
        List<Claim> overdueClaims = claimRepository.findOverdueRCA(cutoff);

        if (overdueClaims.isEmpty()) {
            log.info("No overdue RCA claims found");
            return;
        }

        log.info("Found {} overdue RCA claims", overdueClaims.size());

        for (Claim claim : overdueClaims) {
            try {
                String subject = "[RCA Overdue] Claim " + claim.getClaimNo() + " - " + claim.getVendor();
                String body = buildOverdueEmailBody(claim);
                emailService.sendSimpleMessage("admin@ottointl.com", subject, body);
                log.info("Sent overdue notification for claim {}", claim.getClaimNo());
            } catch (Exception e) {
                log.error("Failed to send overdue notification for claim {}: {}", claim.getClaimNo(), e.getMessage());
            }
        }
    }

    private String buildOverdueEmailBody(Claim claim) {
        long daysOverdue = java.time.temporal.ChronoUnit.DAYS.between(claim.getQcInformDate(), LocalDate.now()) - 14;
        return String.format("""
                RCA Overdue Alert
                ================
                
                Claim No: %s
                Vendor: %s
                Inspector: %s
                QC Inform Date: %s
                Days Overdue: %d
                RCA Status: %s
                
                Please complete the RCA immediately.
                """,
                claim.getClaimNo(),
                claim.getVendor(),
                claim.getInspector() != null ? claim.getInspector() : "N/A",
                claim.getQcInformDate() != null ? claim.getQcInformDate().toString() : "N/A",
                daysOverdue,
                claim.getRcaStatus() != null ? claim.getRcaStatus().name() : "N/A"
        );
    }
}
