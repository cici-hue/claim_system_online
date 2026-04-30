package com.otto.cms.service;

import com.otto.cms.dto.*;
import com.otto.cms.entity.*;
import com.otto.cms.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ClaimService {

    private final ClaimRepository claimRepository;
    private final AuditLogService auditLogService;
    private final EmailService emailService;
    private final UserRepository userRepository;

    public Page<ClaimResponse> findAll(String search, String vendor, String customer,
                                       String status, String location, String defectCategory,
                                       String inspector, String rcaStatus,
                                       LocalDate dateFrom, LocalDate dateTo,
                                       int page, int size) {
        Specification<Claim> spec = buildSpec(search, vendor, customer, status,
                location, defectCategory, inspector, rcaStatus, dateFrom, dateTo);
        return claimRepository.findAll(spec, PageRequest.of(page, size)).map(this::toResponse);
    }

    public ClaimResponse findById(Long id) {
        return toResponse(claimRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Claim not found: " + id)));
    }

    public ClaimResponse create(ClaimRequest req) {
        if (claimRepository.existsByClaimNo(req.getClaimNo())) {
            throw new RuntimeException("Duplicate claim no: " + req.getClaimNo());
        }
        Claim claim = new Claim();
        mapRequest(claim, req);
        claim.setCreatedBy(currentUsername());
        Claim saved = claimRepository.save(claim);
        auditLogService.log("ADD_CLAIM", "Created claim " + saved.getClaimNo());
        
        // Send Risk-Repeat Order email alert if flagged
        if (Boolean.TRUE.equals(req.getRepeatDefectFlag())) {
            sendRiskRepeatAlert(saved);
        }
        
        return toResponse(saved);
    }

    public ClaimResponse update(Long id, ClaimRequest req) {
        Claim claim = claimRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Claim not found: " + id));
        boolean wasRepeatFlag = Boolean.TRUE.equals(claim.getRepeatDefectFlag());
        boolean hadRepeatOrderNo = claim.getRepeatOrderNo() != null && !claim.getRepeatOrderNo().isEmpty();
        mapRequest(claim, req);
        claim.setUpdatedBy(currentUsername());
        Claim saved = claimRepository.save(claim);
        auditLogService.log("EDIT_CLAIM", "Updated claim " + claim.getClaimNo());
        
        // Send Risk-Repeat Order email alert if newly flagged and has repeat order info
        boolean hasRepeatOrderNo = saved.getRepeatOrderNo() != null && !saved.getRepeatOrderNo().isEmpty();
        boolean isNewlyFlagged = Boolean.TRUE.equals(req.getRepeatDefectFlag()) && !wasRepeatFlag;
        boolean isNewlyFilled = Boolean.TRUE.equals(req.getRepeatDefectFlag()) && !hadRepeatOrderNo && hasRepeatOrderNo;
        boolean notYetSent = saved.getRiskAlertSentAt() == null;
        
        if ((isNewlyFlagged || isNewlyFilled) && hasRepeatOrderNo && notYetSent) {
            sendRiskRepeatAlert(saved);
            saved.setRiskAlertSentAt(LocalDateTime.now());
            claimRepository.save(saved);
        }
        
        return toResponse(saved);
    }

    public void delete(Long id) {
        Claim claim = claimRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Claim not found: " + id));
        if (claim.getStatus() != Claim.ClaimStatus.CANCELLED) {
            throw new RuntimeException("Only cancelled claims can be deleted");
        }
        auditLogService.log("DELETE_CLAIM", "Deleted claim " + claim.getClaimNo());
        claimRepository.delete(claim);
    }

    public ClaimResponse saveRCA(Long id, RcaStructuredDto dto, String freeText) {
        Claim claim = claimRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Claim not found: " + id));
        claim.setRcaReport(freeText);
        if (dto != null) {
            RcaStructured rs = claim.getRcaStructured() != null ? claim.getRcaStructured() : new RcaStructured();
            rs.setClaim(claim);
            rs.setWhatHappened(dto.getWhatHappened());
            // Legacy 5-why
            List<String> whys = dto.getWhys();
            if (whys != null && whys.size() >= 5) {
                rs.setWhy1(whys.get(0)); rs.setWhy2(whys.get(1)); rs.setWhy3(whys.get(2));
                rs.setWhy4(whys.get(3)); rs.setWhy5(whys.get(4));
            }
            // Root cause
            rs.setRootCauseCategory(dto.getRootCauseCategory());
            rs.setRootCauseSummary(dto.getRootCauseSummary());
            // Fishbone 6M
            rs.setFbMan(dto.getFbMan()); rs.setFbMachine(dto.getFbMachine());
            rs.setFbMaterial(dto.getFbMaterial()); rs.setFbMethod(dto.getFbMethod());
            rs.setFbMeasurement(dto.getFbMeasurement()); rs.setFbEnvironment(dto.getFbEnvironment());
            // Factory CA
            rs.setFacImmAction(dto.getFacImmAction()); rs.setFacImmPerson(dto.getFacImmPerson());
            rs.setFacImmDeadline(dto.getFacImmDeadline()); rs.setFacImmFollowup(dto.getFacImmFollowup());
            rs.setFacMidAction(dto.getFacMidAction()); rs.setFacMidPerson(dto.getFacMidPerson());
            rs.setFacMidDeadline(dto.getFacMidDeadline()); rs.setFacMidFollowup(dto.getFacMidFollowup());
            rs.setFacLongAction(dto.getFacLongAction()); rs.setFacLongPerson(dto.getFacLongPerson());
            rs.setFacLongDeadline(dto.getFacLongDeadline()); rs.setFacLongFollowup(dto.getFacLongFollowup());
            // OI action
            rs.setOiAction(dto.getOiAction()); rs.setOiPerson(dto.getOiPerson());
            rs.setOiDeadline(dto.getOiDeadline()); rs.setOiFollowup(dto.getOiFollowup());
            // Legacy
            rs.setCorrectiveAction(dto.getCorrectiveAction());
            rs.setPreventiveAction(dto.getPreventiveAction());
            rs.setTargetDate(dto.getTargetDate());
            claim.setRcaStructured(rs);
        }
        if (claim.getRcaStatus() == null) {
            claim.setRcaStatus(Claim.RcaStatus.DRAFT);
        }
        auditLogService.log("EDIT_RCA", "Saved RCA for claim " + claim.getClaimNo());
        return toResponse(claimRepository.save(claim));
    }

    public ClaimResponse submitRCA(Long id, String comment) {
        Claim claim = claimRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Claim not found: " + id));
        claim.setRcaStatus(Claim.RcaStatus.SUBMITTED);
        addApprovalHistory(claim, "submitted", comment);
        auditLogService.log("RCA_SUBMITTED", "Submitted RCA for claim " + claim.getClaimNo());
        return toResponse(claimRepository.save(claim));
    }

    public ClaimResponse approveRCA(Long id, String comment, boolean isFinal) {
        Claim claim = claimRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Claim not found: " + id));
        if (isFinal) {
            claim.setRcaStatus(Claim.RcaStatus.APPROVED);
            addApprovalHistory(claim, "final_approved", comment);
            auditLogService.log("RCA_FINAL_APPROVED", "Final approved RCA for claim " + claim.getClaimNo());
        } else {
            claim.setRcaStatus(Claim.RcaStatus.PENDING_ADMIN);
            addApprovalHistory(claim, "supervisor_approved", comment);
            auditLogService.log("RCA_APPROVED", "Supervisor approved RCA for claim " + claim.getClaimNo());
        }
        return toResponse(claimRepository.save(claim));
    }

    public ClaimResponse rejectRCA(Long id, String reason) {
        Claim claim = claimRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Claim not found: " + id));
        claim.setRcaStatus(Claim.RcaStatus.REJECTED);
        addApprovalHistory(claim, "rejected", reason);
        auditLogService.log("RCA_REJECTED", "Rejected RCA for claim " + claim.getClaimNo() + ": " + reason);
        return toResponse(claimRepository.save(claim));
    }

    public ClaimResponse scoreRCA(Long id, RCAScoreRequest req) {
        Claim claim = claimRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Claim not found: " + id));
        RcaQualityScore score = claim.getRcaQualityScore() != null ? claim.getRcaQualityScore() : new RcaQualityScore();
        score.setClaim(claim);
        score.setCompleteness(req.getCompleteness());
        score.setAccuracy(req.getAccuracy());
        score.setActionQuality(req.getActionQuality());
        score.setAvg((req.getCompleteness() + req.getAccuracy() + req.getActionQuality()) / 3.0);
        score.setScoredBy(currentUsername());
        score.setScoredAt(LocalDateTime.now());
        claim.setRcaQualityScore(score);
        auditLogService.log("RCA_SCORED", "Scored RCA for claim " + claim.getClaimNo());
        return toResponse(claimRepository.save(claim));
    }

    public ClaimResponse addNote(Long id, String text) {
        Claim claim = claimRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Claim not found: " + id));
        ClaimNote note = new ClaimNote();
        note.setClaim(claim);
        note.setAuthor(currentUsername());
        note.setText(text);
        claim.getNotes().add(note);
        return toResponse(claimRepository.save(claim));
    }

    public List<Object[]> getVendorStats() {
        return claimRepository.countByVendor();
    }

    public List<Object[]> getStatusStats() {
        return claimRepository.countByStatus();
    }

    public List<Object[]> getDefectStats() {
        return claimRepository.countByDefectCategory();
    }

    public List<Object[]> getInspectorStats() {
        return claimRepository.countByInspector();
    }

    public List<Object[]> getRcaStatusStats() {
        return claimRepository.countByRcaStatus();
    }

    public Map<String, Long> getRcaKpis() {
        LocalDate cutoff = LocalDate.now().minusDays(14);
        Map<String, Long> kpis = new java.util.LinkedHashMap<>();
        kpis.put("pending", claimRepository.countRcaPending());
        kpis.put("overdue", claimRepository.countRcaOverdue(cutoff));
        kpis.put("approved", claimRepository.countRcaApproved());
        return kpis;
    }

    public List<Map<String, Object>> getMonthlyTrend(int months) {
        LocalDate since = LocalDate.now().minusMonths(months).withDayOfMonth(1);
        List<Object[]> rows = claimRepository.countByMonth(since);
        List<Map<String, Object>> result = new java.util.ArrayList<>();
        for (Object[] row : rows) {
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            int year = ((Number) row[0]).intValue();
            int month = ((Number) row[1]).intValue();
            m.put("label", year + "-" + String.format("%02d", month));
            m.put("count", ((Number) row[2]).longValue());
            result.add(m);
        }
        return result;
    }

    public List<ClaimResponse> findSimilar(Long id) {
        Claim claim = claimRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Claim not found: " + id));
        String rcaCategory = claim.getRcaStructured() != null
                ? claim.getRcaStructured().getRootCauseCategory() : null;
        return claimRepository.findSimilarClaims(
                claim.getVendor(), id, claim.getDefectCategory(), rcaCategory)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void mapRequest(Claim claim, ClaimRequest req) {
        claim.setClaimNo(req.getClaimNo());
        claim.setVendor(req.getVendor());
        claim.setCustomer(req.getCustomer());
        claim.setFid(req.getFid());
        claim.setLocation(req.getLocation());
        claim.setStyleNo(req.getStyleNo());
        claim.setOrderNo(req.getOrderNo());
        claim.setArticleNo(req.getArticleNo());
        claim.setInspector(req.getInspector());
        claim.setFactoryAgent(req.getFactoryAgent());
        claim.setShippedQty(req.getShippedQty());
        claim.setClaimQty(req.getClaimQty());
        claim.setClaimDate(req.getClaimDate());
        claim.setMarketInspectionDate(req.getMarketInspectionDate());
        claim.setQcInformDate(req.getQcInformDate());
        claim.setDefectCategory(req.getDefectCategory());
        claim.setQualityDigit(req.getQualityDigit());
        claim.setDefectDescription(req.getDefectDescription());
        claim.setDefectRateByCustomer(req.getDefectRateByCustomer());
        claim.setFullCheckResult(req.getFullCheckResult());
        claim.setFullCheckRejectionRate(req.getFullCheckRejectionRate());
        claim.setStatus(req.getStatus() != null ? req.getStatus() : Claim.ClaimStatus.OPEN);
        claim.setQcResponsibility(req.getQcResponsibility());
        claim.setRcaReport(req.getRcaReport());
        claim.setRepeatDefectFlag(req.getRepeatDefectFlag() != null ? req.getRepeatDefectFlag() : false);
        claim.setRepeatOrderNo(req.getRepeatOrderNo());
        claim.setRepeatOrderDeliveryDate(req.getRepeatOrderDeliveryDate());
        claim.setRepeatOrderRemark(req.getRepeatOrderRemark());
    }

    private void addApprovalHistory(Claim claim, String action, String comment) {
        RcaApprovalHistory h = new RcaApprovalHistory();
        h.setClaim(claim);
        h.setAction(action);
        h.setByName(currentUsername());
        h.setAt(LocalDateTime.now());
        h.setComment(comment);
        claim.getRcaApprovalHistory().add(h);
    }

    private String currentUsername() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : "system";
    }

    private Specification<Claim> buildSpec(String search, String vendor, String customer,
                                            String status, String location, String defectCategory,
                                            String inspector, String rcaStatus,
                                            LocalDate dateFrom, LocalDate dateTo) {
        return (root, query, cb) -> {
            var predicates = new java.util.ArrayList<jakarta.persistence.criteria.Predicate>();
            if (search != null && !search.isBlank()) {
                String like = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("claimNo")), like),
                        cb.like(cb.lower(root.get("vendor")), like),
                        cb.like(cb.lower(root.get("customer")), like),
                        cb.like(cb.lower(root.get("defectDescription")), like)
                ));
            }
            if (vendor != null && !vendor.isBlank())
                predicates.add(cb.like(cb.lower(root.get("vendor")), "%" + vendor.toLowerCase() + "%"));
            if (customer != null && !customer.isBlank())
                predicates.add(cb.equal(root.get("customer"), customer));
            if (status != null && !status.isBlank())
                predicates.add(cb.equal(root.get("status"), Claim.ClaimStatus.valueOf(status.toUpperCase().replace(" ", "_"))));
            if (location != null && !location.isBlank())
                predicates.add(cb.equal(root.get("location"), location));
            if (defectCategory != null && !defectCategory.isBlank())
                predicates.add(cb.equal(root.get("defectCategory"), defectCategory));
            if (inspector != null && !inspector.isBlank())
                predicates.add(cb.equal(root.get("inspector"), inspector));
            if (rcaStatus != null && !rcaStatus.isBlank())
                predicates.add(cb.equal(root.get("rcaStatus"), Claim.RcaStatus.valueOf(rcaStatus.toUpperCase())));
            if (dateFrom != null)
                predicates.add(cb.greaterThanOrEqualTo(root.get("claimDate"), dateFrom));
            if (dateTo != null)
                predicates.add(cb.lessThanOrEqualTo(root.get("claimDate"), dateTo));
            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };
    }

    public ClaimResponse toResponse(Claim c) {
        ClaimResponse r = new ClaimResponse();
        r.setId(c.getId()); r.setClaimNo(c.getClaimNo()); r.setVendor(c.getVendor());
        r.setCustomer(c.getCustomer()); r.setFid(c.getFid()); r.setLocation(c.getLocation());
        r.setStyleNo(c.getStyleNo()); r.setOrderNo(c.getOrderNo()); r.setArticleNo(c.getArticleNo());
        r.setInspector(c.getInspector()); r.setFactoryAgent(c.getFactoryAgent());
        r.setShippedQty(c.getShippedQty()); r.setClaimQty(c.getClaimQty());
        r.setClaimDate(c.getClaimDate()); r.setMarketInspectionDate(c.getMarketInspectionDate());
        r.setQcInformDate(c.getQcInformDate()); r.setDefectCategory(c.getDefectCategory());
        r.setQualityDigit(c.getQualityDigit()); r.setDefectDescription(c.getDefectDescription());
        r.setDefectRateByCustomer(c.getDefectRateByCustomer()); r.setFullCheckResult(c.getFullCheckResult());
        r.setFullCheckRejectionRate(c.getFullCheckRejectionRate()); r.setStatus(c.getStatus());
        r.setQcResponsibility(c.getQcResponsibility()); r.setRcaReport(c.getRcaReport());
        r.setRcaStatus(c.getRcaStatus()); r.setRepeatDefectFlag(c.getRepeatDefectFlag());
        r.setRepeatOrderNo(c.getRepeatOrderNo());
        r.setRepeatOrderDeliveryDate(c.getRepeatOrderDeliveryDate());
        r.setRepeatOrderRemark(c.getRepeatOrderRemark());
        r.setCreatedBy(c.getCreatedBy()); r.setUpdatedBy(c.getUpdatedBy());
        r.setCreatedAt(c.getCreatedAt()); r.setUpdatedAt(c.getUpdatedAt());
        r.setRcaSupervisorComment(c.getRcaSupervisorComment());
        r.setRcaSupervisorCommentBy(c.getRcaSupervisorCommentBy());
        r.setRcaSupervisorCommentAt(c.getRcaSupervisorCommentAt());
        r.setRcaManagerComment(c.getRcaManagerComment());
        r.setRcaManagerCommentBy(c.getRcaManagerCommentBy());
        r.setRcaManagerCommentAt(c.getRcaManagerCommentAt());
        r.setRiskAlertSentAt(c.getRiskAlertSentAt());
        r.setRiskAlertSentBy(c.getRiskAlertSentBy());
        if (c.getRcaStructured() != null) {
            RcaStructured rs = c.getRcaStructured();
            RcaStructuredDto dto = new RcaStructuredDto();
            dto.setWhatHappened(rs.getWhatHappened());
            dto.setWhys(List.of(
                rs.getWhy1() != null ? rs.getWhy1() : "",
                rs.getWhy2() != null ? rs.getWhy2() : "",
                rs.getWhy3() != null ? rs.getWhy3() : "",
                rs.getWhy4() != null ? rs.getWhy4() : "",
                rs.getWhy5() != null ? rs.getWhy5() : ""
            ));
            dto.setRootCauseCategory(rs.getRootCauseCategory());
            dto.setRootCauseSummary(rs.getRootCauseSummary());
            // Fishbone
            dto.setFbMan(rs.getFbMan()); dto.setFbMachine(rs.getFbMachine());
            dto.setFbMaterial(rs.getFbMaterial()); dto.setFbMethod(rs.getFbMethod());
            dto.setFbMeasurement(rs.getFbMeasurement()); dto.setFbEnvironment(rs.getFbEnvironment());
            // Factory CA
            dto.setFacImmAction(rs.getFacImmAction()); dto.setFacImmPerson(rs.getFacImmPerson());
            dto.setFacImmDeadline(rs.getFacImmDeadline()); dto.setFacImmFollowup(rs.getFacImmFollowup());
            dto.setFacMidAction(rs.getFacMidAction()); dto.setFacMidPerson(rs.getFacMidPerson());
            dto.setFacMidDeadline(rs.getFacMidDeadline()); dto.setFacMidFollowup(rs.getFacMidFollowup());
            dto.setFacLongAction(rs.getFacLongAction()); dto.setFacLongPerson(rs.getFacLongPerson());
            dto.setFacLongDeadline(rs.getFacLongDeadline()); dto.setFacLongFollowup(rs.getFacLongFollowup());
            // OI action
            dto.setOiAction(rs.getOiAction()); dto.setOiPerson(rs.getOiPerson());
            dto.setOiDeadline(rs.getOiDeadline()); dto.setOiFollowup(rs.getOiFollowup());
            // Legacy
            dto.setCorrectiveAction(rs.getCorrectiveAction());
            dto.setPreventiveAction(rs.getPreventiveAction());
            dto.setTargetDate(rs.getTargetDate());
            r.setRcaStructured(dto);
        }
        if (c.getRcaQualityScore() != null) {
            RcaQualityScore qs = c.getRcaQualityScore();
            RcaQualityScoreDto dto = new RcaQualityScoreDto();
            dto.setCompleteness(qs.getCompleteness()); dto.setAccuracy(qs.getAccuracy());
            dto.setActionQuality(qs.getActionQuality()); dto.setAvg(qs.getAvg());
            dto.setScoredBy(qs.getScoredBy()); dto.setScoredAt(qs.getScoredAt());
            r.setRcaQualityScore(dto);
        }
        r.setCorrectiveActions(c.getCorrectiveActions().stream().map(ca -> {
            CorrectiveActionDto d = new CorrectiveActionDto();
            d.setId(ca.getId()); d.setDescription(ca.getDescription()); d.setOwner(ca.getOwner());
            d.setDueDate(ca.getDueDate()); d.setStatus(ca.getStatus()); return d;
        }).collect(Collectors.toList()));
        r.setRcaApprovalHistory(c.getRcaApprovalHistory().stream().map(h -> {
            RcaApprovalHistoryDto d = new RcaApprovalHistoryDto();
            d.setAction(h.getAction()); d.setByName(h.getByName()); d.setAt(h.getAt()); d.setComment(h.getComment());
            return d;
        }).collect(Collectors.toList()));
        r.setAttachments(c.getAttachments().stream().map(a -> {
            ClaimAttachmentDto d = new ClaimAttachmentDto();
            d.setId(a.getId()); d.setFileName(a.getFileName()); d.setContentType(a.getContentType());
            d.setFileSize(a.getFileSize()); d.setUploadedBy(a.getUploadedBy()); d.setUploadedAt(a.getUploadedAt());
            return d;
        }).collect(Collectors.toList()));
        r.setNotes(c.getNotes().stream().map(n -> {
            ClaimNoteDto d = new ClaimNoteDto();
            d.setId(n.getId()); d.setAuthor(n.getAuthor()); d.setAuthorRole(n.getAuthorRole());
            d.setText(n.getText()); d.setCreatedAt(n.getCreatedAt()); return d;
        }).collect(Collectors.toList()));
        return r;
    }

    /**
     * Send Risk-Repeat Order email alert
     * To: All QC (INSPECTOR) with same factory agent
     * CC: Supervisor, Admin, Manager with same factory agent
     */
    private void sendRiskRepeatAlert(Claim claim) {
        try {
            // Find all users with same factory agent
            List<User> sameAgentUsers = userRepository.findAll().stream()
                    .filter(u -> u.getFactoryAgent() != null && 
                                 u.getFactoryAgent().equals(claim.getFactoryAgent()))
                    .collect(Collectors.toList());

            // To: All QC (INSPECTOR)
            List<User> toUsers = sameAgentUsers.stream()
                    .filter(u -> u.getRole() == User.Role.INSPECTOR)
                    .collect(Collectors.toList());

            // CC: Supervisor, Admin, Manager
            List<User> ccUsers = sameAgentUsers.stream()
                    .filter(u -> u.getRole() == User.Role.SUPERVISOR || 
                                 u.getRole() == User.Role.ADMIN || 
                                 u.getRole() == User.Role.MANAGER)
                    .collect(Collectors.toList());

            if (toUsers.isEmpty() && ccUsers.isEmpty()) {
                return; // No recipients found
            }

            String toEmails = toUsers.stream()
                    .map(User::getEmail)
                    .filter(e -> e != null && !e.isEmpty())
                    .collect(Collectors.joining(", "));
            
            String ccEmails = ccUsers.stream()
                    .map(User::getEmail)
                    .filter(e -> e != null && !e.isEmpty())
                    .collect(Collectors.joining(", "));

            // V8 Style Subject
            String subject = "Risk — Repeat Order Alert | " + 
                    (claim.getVendor() != null ? claim.getVendor() : "Unknown") + 
                    " | Style: " + (claim.getStyleNo() != null ? claim.getStyleNo() : "N/A") + 
                    " | PO: " + (claim.getRepeatOrderNo() != null ? claim.getRepeatOrderNo() : "N/A");

            // V8 Style Email Body
            String claimDate = claim.getClaimDate() != null ? claim.getClaimDate().toString() : "—";
            String deliveryDate = claim.getRepeatOrderDeliveryDate() != null ? claim.getRepeatOrderDeliveryDate().toString() : "—";
            
            String bodyHtml = 
                "<div style='background: linear-gradient(135deg, #f59e0b, #d97706); padding: 20px; color: white; border-radius: 8px 8px 0 0;'>" +
                "<h3 style='margin: 0; font-size: 18px;'>⚠ Repeat Order Risk Notice</h3>" +
                "<p style='margin: 5px 0 0 0; opacity: 0.9;'>" + 
                (claim.getVendor() != null ? claim.getVendor() : "Unknown") + " · " + 
                (claim.getFactoryAgent() != null ? claim.getFactoryAgent() : "N/A") + " · " + claimDate + 
                "</p></div>" +
                "<div style='background: #fffbeb; padding: 20px; border: 1px solid #fcd34d; border-top: none;'>" +
                "<p>Dear Team,</p>" +
                "<p>Please be advised that the following style has been flagged as a <strong style='color: #d97706;'>Repeat Order Risk</strong>. " +
                "A defect was previously raised on this style and a repeat order is now in progress. Heightened QC attention is required during inspection.</p>" +
                "<table style='width: 100%; border-collapse: collapse; margin: 20px 0; background: white; border: 1px solid #fcd34d;'>" +
                "<tr style='background: #f59e0b; color: white;'><th colspan='2' style='padding: 10px; text-align: left;'>CLAIM REFERENCE</th></tr>" +
                "<tr><td style='padding: 10px; border-bottom: 1px solid #fcd34d; font-weight: bold; color: #92400e; width: 30%;'>CLAIM NO.</td>" +
                "<td style='padding: 10px; border-bottom: 1px solid #fcd34d;'>" + claim.getClaimNo() + "</td></tr>" +
                "<tr style='background: #fffbeb;'><td style='padding: 10px; border-bottom: 1px solid #fcd34d; font-weight: bold; color: #92400e;'>VENDOR</td>" +
                "<td style='padding: 10px; border-bottom: 1px solid #fcd34d;'>" + (claim.getVendor() != null ? claim.getVendor() : "—") + "</td></tr>" +
                "<tr><td style='padding: 10px; border-bottom: 1px solid #fcd34d; font-weight: bold; color: #92400e;'>STYLE NO.</td>" +
                "<td style='padding: 10px; border-bottom: 1px solid #fcd34d; font-weight: bold;'>" + (claim.getStyleNo() != null ? claim.getStyleNo() : "—") + "</td></tr>" +
                "<tr style='background: #fffbeb;'><td style='padding: 10px; border-bottom: 1px solid #fcd34d; font-weight: bold; color: #92400e;'>REPEAT ORDER NO.</td>" +
                "<td style='padding: 10px; border-bottom: 1px solid #fcd34d; font-weight: bold; color: #d97706;'>" + (claim.getRepeatOrderNo() != null ? claim.getRepeatOrderNo() : "—") + "</td></tr>" +
                "<tr><td style='padding: 10px; border-bottom: 1px solid #fcd34d; font-weight: bold; color: #92400e;'>DELIVERY DATE</td>" +
                "<td style='padding: 10px; border-bottom: 1px solid #fcd34d; font-weight: bold; color: #d97706;'>" + deliveryDate + "</td></tr>" +
                "<tr style='background: #fffbeb;'><td style='padding: 10px; font-weight: bold; color: #92400e;'>CLAIM REASON</td>" +
                "<td style='padding: 10px;'>" + (claim.getDefectCategory() != null ? claim.getDefectCategory() : "—") + 
                (claim.getDefectDescription() != null ? " — " + claim.getDefectDescription() : "") + "</td></tr>" +
                "</table>" +
                "<p style='font-size: 12px; color: #64748b; text-align: center; margin-top: 20px;'>Automated risk alert from Otto International QC Claim System</p>" +
                "</div>";

            emailService.sendClaimEmail(new EmailTemplateRequest(
                    claim.getId(),
                    toEmails,
                    ccEmails,
                    subject,
                    bodyHtml
            ));

            auditLogService.log("RISK_REPEAT_ALERT", 
                    "Risk-Repeat Order alert sent for claim " + claim.getClaimNo() + 
                    " to " + toUsers.size() + " QC, CC " + ccUsers.size() + " supervisors/managers");

        } catch (Exception e) {
            // Log error but don't fail the claim creation/update
            auditLogService.log("RISK_REPEAT_ALERT_FAILED", 
                    "Failed to send Risk-Repeat Order alert for claim " + claim.getClaimNo() + 
                    ": " + e.getMessage());
        }
    }
