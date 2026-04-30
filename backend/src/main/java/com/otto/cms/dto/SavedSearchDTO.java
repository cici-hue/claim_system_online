package com.otto.cms.dto;

import lombok.Data;

@Data
public class SavedSearchDTO {
    private String name;
    private String vendor;
    private String customer;
    private String location;
    private String status;
    private String defectCategory;
    private String inspector;
    private String dateFrom;
    private String dateTo;
    private String rcaStatus;
}
