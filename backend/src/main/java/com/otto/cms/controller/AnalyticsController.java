package com.otto.cms.controller;

import com.otto.cms.service.ClaimService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class AnalyticsController {

    private final ClaimService claimService;

    @GetMapping("/top-vendors")
    public List<Map<String, Object>> topVendors() {
        return toMapList(claimService.getVendorStats());
    }

    @GetMapping("/claims-by-status")
    public List<Map<String, Object>> byStatus() {
        return toMapList(claimService.getStatusStats());
    }

    @GetMapping("/claims-by-defect")
    public List<Map<String, Object>> byDefect() {
        return toMapList(claimService.getDefectStats());
    }

    @GetMapping("/claims-by-inspector")
    public List<Map<String, Object>> byInspector() {
        return toMapList(claimService.getInspectorStats());
    }

    @GetMapping("/claims-by-rca-status")
    public List<Map<String, Object>> byRcaStatus() {
        return toMapList(claimService.getRcaStatusStats());
    }

    @GetMapping("/rca-kpis")
    public Map<String, Long> rcaKpis() {
        return claimService.getRcaKpis();
    }

    @GetMapping("/monthly-trend")
    public List<Map<String, Object>> monthlyTrend(@RequestParam(defaultValue = "12") int months) {
        return claimService.getMonthlyTrend(months);
    }

    private List<Map<String, Object>> toMapList(List<Object[]> rows) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : rows) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("label", row[0]);
            m.put("count", row[1]);
            result.add(m);
        }
        return result;
    }
}
