package com.otto.cms.repository;

import com.otto.cms.entity.CorrectiveAction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CorrectiveActionRepository extends JpaRepository<CorrectiveAction, Long> {
    List<CorrectiveAction> findByClaimId(Long claimId);
}
