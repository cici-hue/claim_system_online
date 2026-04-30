package com.otto.cms.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class RcaApprovalHistoryDto {
    private String action;
    private String byName;
    private LocalDateTime at;
    private String comment;
}
