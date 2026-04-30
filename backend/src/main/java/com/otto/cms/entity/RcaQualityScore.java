package com.otto.cms.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "rca_quality_scores")
@Data
public class RcaQualityScore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "claim_id", nullable = false)
    private Claim claim;

    private Integer completeness;
    private Integer accuracy;
    private Integer actionQuality;
    private Double avg;
    private String scoredBy;
    private LocalDateTime scoredAt;
}
