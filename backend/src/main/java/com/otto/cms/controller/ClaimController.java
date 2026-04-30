package com.otto.cms.controller;

import com.otto.cms.dto.*;
import com.otto.cms.entity.Claim;
import com.otto.cms.service.ClaimService;
import com.otto.cms.service.EmailService;
import com.otto.cms.repository.ClaimRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/claims")
@RequiredArgsConstructor
public class ClaimController {

    private final ClaimService claimService;
    private final EmailService emailService;
    private final ClaimRepository claimRepository;

    @GetMapping
    public Page<ClaimResponse> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String vendor,
            @RequestParam(required = false) String customer,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String defectCategory,
            @RequestParam(required = false) String inspector,
            @RequestParam(required = false) String rcaStatus,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return claimService.findAll(search, vendor, customer, status, location,
                defectCategory, inspector, rcaStatus, dateFrom, dateTo, page, size);
    }

    @GetMapping("/{id}")
    public ClaimResponse get(@PathVariable Long id) {
        return claimService.findById(id);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    public ResponseEntity<ClaimResponse> create(@RequestBody ClaimRequest req) {
        return ResponseEntity.ok(claimService.create(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    public ClaimResponse update(@PathVariable Long id, @RequestBody ClaimRequest req) {
        return claimService.update(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        claimService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/rca")
    public ClaimResponse saveRCA(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        RcaStructuredDto dto = null;
        if (body.containsKey("rcaStructured")) {
            // Simple deserialization from map - in prod use @RequestBody POJO
            dto = new RcaStructuredDto();
        }
        String freeText = (String) body.get("rcaReport");
        return claimService.saveRCA(id, dto, freeText);
    }

    @PostMapping("/{id}/rca/submit")
    @PreAuthorize("hasAnyRole('INSPECTOR','SUPERVISOR','MANAGER','ADMIN','SUPERADMIN')")
    public ClaimResponse submitRCA(@PathVariable Long id, @RequestBody RCASubmitRequest req) {
        return claimService.submitRCA(id, req.getComment());
    }

    @PostMapping("/{id}/rca/approve")
    @PreAuthorize("hasAnyRole('SUPERVISOR','MANAGER','ADMIN','SUPERADMIN')")
    public ClaimResponse approveRCA(@PathVariable Long id,
                                    @RequestBody RcaApproveRequest req,
                                    @RequestParam(defaultValue = "false") boolean final_approval) {
        return claimService.approveRCA(id, req.getComment(), final_approval);
    }

    @PostMapping("/{id}/rca/reject")
    @PreAuthorize("hasAnyRole('SUPERVISOR','MANAGER','ADMIN','SUPERADMIN')")
    public ClaimResponse rejectRCA(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return claimService.rejectRCA(id, body.get("reason"));
    }

    @PostMapping("/{id}/rca/score")
    @PreAuthorize("hasAnyRole('SUPERVISOR','MANAGER','ADMIN','SUPERADMIN')")
    public ClaimResponse scoreRCA(@PathVariable Long id, @RequestBody RCAScoreRequest req) {
        return claimService.scoreRCA(id, req);
    }

    @PostMapping("/{id}/notes")
    public ClaimResponse addNote(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return claimService.addNote(id, body.get("text"));
    }

    @GetMapping("/{id}/similar")
    public List<ClaimResponse> getSimilar(@PathVariable Long id) {
        return claimService.findSimilar(id);
    }

    @PostMapping("/{id}/similar/notify")
    public ResponseEntity<Void> notifySimilar(@PathVariable Long id,
                                              @RequestBody Map<String, String> body) {
        List<ClaimResponse> similar = claimService.findSimilar(id);
        ClaimResponse trigger = claimService.findById(id);
        // Combine to and cc for recipients, with cc labeled
        String to = body.getOrDefault("to", "");
        String cc = body.getOrDefault("cc", "");
        String recipients = to;
        if (!cc.isEmpty()) {
            recipients = recipients + "; CC: " + cc;
        }
        emailService.sendSimilarClaimsAlert(trigger, similar,
                recipients, body.get("subject"), body.get("body"));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/email")
    public ResponseEntity<Void> sendClaimEmail(@PathVariable Long id, @RequestBody EmailTemplateRequest req) {
        emailService.sendClaimEmail(req);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/risk-alert")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN','MANAGER','SUPERVISOR')")
    public ResponseEntity<Void> sendRiskAlert(@PathVariable Long id, @RequestBody EmailTemplateRequest req,
                                               @AuthenticationPrincipal UserDetails userDetails) {
        emailService.sendClaimEmail(req);
        // Update claim with sender info
        Claim claim = claimService.findByIdEntity(id);
        if (claim != null) {
            claim.setRiskAlertSentAt(LocalDateTime.now());
            claim.setRiskAlertSentBy(userDetails.getUsername());
            claimRepository.save(claim);
        }
        return ResponseEntity.noContent().build();
    }
}
