package com.otto.cms.dto;

import lombok.Data;

@Data
public class EmailTemplateRequest {
    private Long claimId;
    private String to;
    private String cc;
    private String subject;
    private String bodyHtml;
}
