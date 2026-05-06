package com.otto.cms.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@NamedEntityGraph(
    name = "Claim.detail",
    attributeNodes = {
        @NamedAttributeNode("attachments"),
        @NamedAttributeNode("correctiveActions"),
        @NamedAttributeNode("rcaApprovalHistory"),
        @NamedAttributeNode("notes"),
        @NamedAttributeNode("rcaStructured"),
        @NamedAttributeNode("rcaQualityScore")
    }
)
@Entity
@Table(name = "claims", indexes = {
    @Index(name = "idx_claims_vendor", columnList = "vendor"),
    @Index(name = "idx_claims_status", columnList = "status"),
    @Index(name = "idx_claims_defect_category", columnList = "defectCategory"),
    @Index(name = "idx_claims_inspector", columnList = "inspector"),
    @Index(name = "idx_claims_factory_agent", columnList = "factoryAgent"),
    @Index(name = "idx_claims_rca_status", columnList = "rcaStatus"),
    @Index(name = "idx_claims_claim_date", columnList = "claimDate"),
    @Index(name = "idx_claims_vendor_defect", columnList = "vendor, defectCategory")
})
@Data
public class Claim {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String claimNo;

    @Column(nullable = false)
    private String vendor;

    private String customer;
    private String fid;
    private String location;
    private String styleNo;
    private String orderNo;
    private String articleNo;
    private String inspector;
    private String factoryAgent;

    private Integer shippedQty;
    private Integer claimQty;

    private LocalDate claimDate;
    private LocalDate marketInspectionDate;
    private LocalDate qcInformDate;

    private String defectCategory;
    private String qualityDigit;

    @Column(columnDefinition = "TEXT")
    private String defectDescription;

    private String defectRateByCustomer;
    private String fullCheckResult;
    private String fullCheckRejectionRate;

    @Enumerated(EnumType.STRING)
    private ClaimStatus status = ClaimStatus.OPEN;

    private String qcResponsibility;

    @Column(columnDefinition = "TEXT")
    private String rcaReport;

    @Enumerated(EnumType.STRING)
    private RcaStatus rcaStatus;

    private Boolean repeatDefectFlag = false;
    private String repeatOrderNo;
    private LocalDate repeatOrderDeliveryDate;

    @Column(columnDefinition = "TEXT")
    private String repeatOrderRemark;

    private String createdBy;
    private String updatedBy;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "claim", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<ClaimAttachment> attachments = new ArrayList<>();

    @OneToMany(mappedBy = "claim", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<CorrectiveAction> correctiveActions = new ArrayList<>();

    @OneToMany(mappedBy = "claim", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<RcaApprovalHistory> rcaApprovalHistory = new ArrayList<>();

    @OneToMany(mappedBy = "claim", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<ClaimNote> notes = new ArrayList<>();

    @OneToOne(mappedBy = "claim", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private RcaStructured rcaStructured;

    @OneToOne(mappedBy = "claim", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private RcaQualityScore rcaQualityScore;

    private String rcaSupervisorComment;
    private String rcaSupervisorCommentBy;
    private LocalDateTime rcaSupervisorCommentAt;

    private String rcaManagerComment;
    private String rcaManagerCommentBy;
    private LocalDateTime rcaManagerCommentAt;
    private LocalDateTime riskAlertSentAt;
    private String riskAlertSentBy;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum ClaimStatus {
        OPEN, IN_PROGRESS, CLOSED, CANCELLED
    }

    public enum RcaStatus {
        DRAFT, SUBMITTED, PENDING_MANAGER, APPROVED, REJECTED
    }
}
