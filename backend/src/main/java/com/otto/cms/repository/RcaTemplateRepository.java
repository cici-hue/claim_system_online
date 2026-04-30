package com.otto.cms.repository;

import com.otto.cms.entity.RcaTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RcaTemplateRepository extends JpaRepository<RcaTemplate, Long> {
    List<RcaTemplate> findByCreatedByOrCreatedByIsNull(String createdBy);
}
