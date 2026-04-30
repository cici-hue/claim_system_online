package com.otto.cms.dto;

import com.otto.cms.entity.Claim;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class ClaimResponse {
    private Long id;
    private String claimNo;
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
    private String defectDescription;
    private String defectRateByCustomer;
    private String fullCheckResult;
    private String fullCheckRejectionRate;
    private Claim.ClaimStatus status;
    private String qcResponsibility;
    private String rcaReport;
    private Claim.RcaStatus rcaStatus;
    private Boolean repeatDefectFlag;
    private String repeatOrderNo;
    private java.time.LocalDate repeatOrderDeliveryDate;
    private String repeatOrderRemark;
    private String createdBy;
    private String updatedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private RcaStructuredDto rcaStructured;
    private RcaQualityScoreDto rcaQualityScore;
    private List<CorrectiveActionDto> correctiveActions;
    private List<RcaApprovalHistoryDto> rcaApprovalHistory;
    private List<ClaimAttachmentDto> attachments;
    private List<ClaimNoteDto> notes;
    private String rcaSupervisorComment;
    private String rcaSupervisorCommentBy;
    private LocalDateTime rcaSupervisorCommentAt;
    private String rcaManagerComment;
    private String rcaManagerCommentBy;
    private LocalDateTime rcaManagerCommentAt;
    private LocalDateTime riskAlertSentAt;
    private String riskAlertSentBy;
}
