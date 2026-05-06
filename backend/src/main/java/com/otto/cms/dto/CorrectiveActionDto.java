package com.otto.cms.dto;

import com.otto.cms.entity.CorrectiveAction;
import lombok.Data;
import java.time.LocalDate;

@Data
public class CorrectiveActionDto {
    private Long id;
    private String description;
    private String owner;
    private LocalDate dueDate;
    private CorrectiveAction.Status status;
}
