package com.otto.cms.dto;

import com.otto.cms.entity.Claim;
import lombok.Data;
import java.time.LocalDate;

@Data
public class ClaimRequest {
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
    private Boolean repeatDefectFlag;
    private String repeatOrderNo;
    private java.time.LocalDate repeatOrderDeliveryDate;
    private String repeatOrderRemark;
}
