package com.otto.cms.repository;

import com.otto.cms.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    @Query("SELECT a FROM AuditLog a WHERE " +
           "(:search IS NULL OR LOWER(a.username) LIKE LOWER(CONCAT('%',:search,'%')) " +
           "  OR LOWER(a.details) LIKE LOWER(CONCAT('%',:search,'%'))) " +
           "AND (:action IS NULL OR a.action = :action) " +
           "AND (:user IS NULL OR a.username = :user) " +
           "AND (:from IS NULL OR a.timestamp >= :from) " +
           "AND (:to IS NULL OR a.timestamp <= :to) " +
           "ORDER BY a.timestamp DESC")
    Page<AuditLog> search(@Param("search") String search,
                          @Param("action") String action,
                          @Param("user") String user,
                          @Param("from") LocalDateTime from,
                          @Param("to") LocalDateTime to,
                          Pageable pageable);
}
