package com.otto.cms.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ClaimNoteDto {
    private Long id;
    private String author;
    private String authorRole;
    private String text;
    private LocalDateTime createdAt;
}
