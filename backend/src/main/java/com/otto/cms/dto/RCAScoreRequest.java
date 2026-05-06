package com.otto.cms.dto;

import lombok.Data;

@Data
public class RCAScoreRequest {
    private Integer completeness;
    private Integer accuracy;
    private Integer actionQuality;
}
