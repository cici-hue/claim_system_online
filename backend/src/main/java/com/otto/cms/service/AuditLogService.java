package com.otto.cms.service;

import com.otto.cms.entity.AuditLog;
import com.otto.cms.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(String action, String details) {
        AuditLog entry = new AuditLog();
        entry.setAction(action);
        entry.setDetails(details);
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null) {
            entry.setUsername(auth.getName());
            auth.getAuthorities().stream().findFirst()
                .ifPresent(a -> entry.setUserRole(a.getAuthority().replace("ROLE_", "")));
        }
        auditLogRepository.save(entry);
    }
}
