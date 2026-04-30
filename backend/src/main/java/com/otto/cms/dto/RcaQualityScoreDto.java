package com.otto.cms.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class RcaQualityScoreDto {
    private Integer completeness;
    private Integer accuracy;
    private Integer actionQuality;
    private Double avg;
    private String scoredBy;
    private LocalDateTime scoredAt;
}
