package com.otto.cms.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;

@Entity
@Table(name = "rca_structured")
@Data
public class RcaStructured {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "claim_id", nullable = false)
    private Claim claim;

    @Column(columnDefinition = "TEXT")
    private String whatHappened;

    // Legacy 5-why fields (kept for backward compat)
    @Column(columnDefinition = "TEXT") private String why1;
    @Column(columnDefinition = "TEXT") private String why2;
    @Column(columnDefinition = "TEXT") private String why3;
    @Column(columnDefinition = "TEXT") private String why4;
    @Column(columnDefinition = "TEXT") private String why5;

    // Root cause
    private String rootCauseCategory;
    @Column(columnDefinition = "TEXT") private String rootCauseSummary;

    // Fishbone 6M
    @Column(columnDefinition = "TEXT") private String fbMan;
    @Column(columnDefinition = "TEXT") private String fbMachine;
    @Column(columnDefinition = "TEXT") private String fbMaterial;
    @Column(columnDefinition = "TEXT") private String fbMethod;
    @Column(columnDefinition = "TEXT") private String fbMeasurement;
    @Column(columnDefinition = "TEXT") private String fbEnvironment;

    // Factory corrective actions — Immediate
    @Column(columnDefinition = "TEXT") private String facImmAction;
    private String facImmPerson;
    private LocalDate facImmDeadline;
    private LocalDate facImmFollowup;

    // Factory corrective actions — Mid-term
    @Column(columnDefinition = "TEXT") private String facMidAction;
    private String facMidPerson;
    private LocalDate facMidDeadline;
    private LocalDate facMidFollowup;

    // Factory corrective actions — Long-term
    @Column(columnDefinition = "TEXT") private String facLongAction;
    private String facLongPerson;
    private LocalDate facLongDeadline;
    private LocalDate facLongFollowup;

    // OI action
    @Column(columnDefinition = "TEXT") private String oiAction;
    private String oiPerson;
    private LocalDate oiDeadline;
    private LocalDate oiFollowup;

    // Legacy fields kept for backward compat
    @Column(columnDefinition = "TEXT") private String correctiveAction;
    @Column(columnDefinition = "TEXT") private String preventiveAction;
    private LocalDate targetDate;
}
