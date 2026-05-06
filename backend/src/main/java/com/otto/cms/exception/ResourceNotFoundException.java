package com.otto.cms.exception;

import org.springframework.http.HttpStatus;

public class ResourceNotFoundException extends BusinessException {
    public ResourceNotFoundException(String resource, Object id) {
        super(resource + " not found: " + id, HttpStatus.NOT_FOUND);
    }
}
