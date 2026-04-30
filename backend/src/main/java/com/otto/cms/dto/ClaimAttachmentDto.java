package com.otto.cms.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ClaimAttachmentDto {
    private Long id;
    private String fileName;
    private String contentType;
    private Long fileSize;
    private String uploadedBy;
    private LocalDateTime uploadedAt;
}
