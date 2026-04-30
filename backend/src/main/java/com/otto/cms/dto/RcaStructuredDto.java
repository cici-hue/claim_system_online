package com.otto.cms.dto;

import lombok.Data;
import java.time.LocalDate;
import java.util.List;

@Data
public class RcaStructuredDto {
    private String whatHappened;
    private List<String> whys;

    // Root cause
    private String rootCauseCategory;
    private String rootCauseSummary;

    // Fishbone 6M
    private String fbMan;
    private String fbMachine;
    private String fbMaterial;
    private String fbMethod;
    private String fbMeasurement;
    private String fbEnvironment;

    // Factory CA — Immediate
    private String facImmAction;
    private String facImmPerson;
    private LocalDate facImmDeadline;
    private LocalDate facImmFollowup;

    // Factory CA — Mid-term
    private String facMidAction;
    private String facMidPerson;
    private LocalDate facMidDeadline;
    private LocalDate facMidFollowup;

    // Factory CA — Long-term
    private String facLongAction;
    private String facLongPerson;
    private LocalDate facLongDeadline;
    private LocalDate facLongFollowup;

    // OI action
    private String oiAction;
    private String oiPerson;
    private LocalDate oiDeadline;
    private LocalDate oiFollowup;

    // Legacy
    private String correctiveAction;
    private String preventiveAction;
    private LocalDate targetDate;
}
