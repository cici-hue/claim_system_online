package com.otto.cms.service;

import com.otto.cms.entity.Claim;
import com.otto.cms.entity.User;
import com.otto.cms.repository.ClaimRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final ClaimRepository claimRepository;

    public Map<String, Object> getNotifications() {
        User currentUser = getCurrentUser();
        User.Role role = currentUser != null ? currentUser.getRole() : null;
        String factoryAgent = currentUser != null ? currentUser.getFactoryAgent() : null;

        Map<String, Object> result = new LinkedHashMap<>();

        long rcaCount = 0;
        String rcaType = "none";

        if (role == User.Role.SUPERVISOR) {
            rcaCount = countByRcaStatusAndFactoryAgent("SUBMITTED", factoryAgent);
            rcaType = "SUBMITTED";
        } else if (role == User.Role.MANAGER) {
            rcaCount = countByRcaStatusAndFactoryAgent("PENDING_MANAGER", factoryAgent);
            rcaType = "PENDING_MANAGER";
        } else if (role == User.Role.INSPECTOR || role == User.Role.ADMIN) {
            rcaCount = countByRcaStatusAndFactoryAgent("REJECTED", factoryAgent);
            rcaType = "REJECTED";
        } else if (role == User.Role.SUPERADMIN) {
            rcaCount = claimRepository.countRcaOverdue(LocalDate.now().minusDays(14));
            rcaType = "OVERDUE";
        }

        result.put("rcaCount", rcaCount);
        result.put("rcaType", rcaType);

        boolean shouldShowNewClaims = role == User.Role.SUPERADMIN || role == User.Role.ADMIN
                || role == User.Role.SUPERVISOR || role == User.Role.MANAGER;
        long newClaimCount = 0;
        if (shouldShowNewClaims && factoryAgent != null) {
            newClaimCount = claimRepository.countNewClaimsByFactoryAgent(
                    factoryAgent, LocalDateTime.now().minusHours(24));
        }
        result.put("newClaimCount", newClaimCount);

        return result;
    }

    private long countByRcaStatusAndFactoryAgent(String rcaStatus, String factoryAgent) {
        if (factoryAgent == null || factoryAgent.isBlank()) {
            return 0;
        }
        List<Claim> claims = claimRepository.findByFactoryAgent(factoryAgent);
        return claims.stream()
                .filter(c -> rcaStatus.equals(c.getRcaStatus() != null ? c.getRcaStatus().name() : null))
                .count();
    }

    private User getCurrentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof User) {
            return (User) principal;
        }
        return null;
    }
}
