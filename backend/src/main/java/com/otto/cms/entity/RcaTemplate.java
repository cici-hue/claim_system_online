package com.otto.cms.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "rca_templates")
@Data
public class RcaTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String category;

    @Column(columnDefinition = "TEXT")
    private String whatHappened;

    @Column(columnDefinition = "TEXT")
    private String why1;
    @Column(columnDefinition = "TEXT")
    private String why2;
    @Column(columnDefinition = "TEXT")
    private String why3;
    @Column(columnDefinition = "TEXT")
    private String why4;
    @Column(columnDefinition = "TEXT")
    private String why5;

    private String rootCauseCategory;

    @Column(columnDefinition = "TEXT")
    private String correctiveAction;

    @Column(columnDefinition = "TEXT")
    private String preventiveAction;

    private String createdBy;
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
