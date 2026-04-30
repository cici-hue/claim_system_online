package com.otto.cms.repository;

import com.otto.cms.entity.Claim;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ClaimRepository extends JpaRepository<Claim, Long>, JpaSpecificationExecutor<Claim> {

    Optional<Claim> findByClaimNo(String claimNo);
    boolean existsByClaimNo(String claimNo);

    List<Claim> findByFactoryAgent(String factoryAgent);

    @Query("SELECT c FROM Claim c WHERE c.vendor = :vendor AND c.defectCategory = :category " +
           "AND c.claimDate >= :since AND c.id != :excludeId")
    List<Claim> findRepeatDefects(@Param("vendor") String vendor,
                                  @Param("category") String category,
                                  @Param("since") LocalDate since,
                                  @Param("excludeId") Long excludeId);

    // Similar claims: same vendor, and same defect category OR same root cause category
    @Query("SELECT DISTINCT c FROM Claim c LEFT JOIN c.rcaStructured rs " +
           "WHERE c.vendor = :vendor AND c.id != :excludeId " +
           "AND (:defectCategory IS NULL OR c.defectCategory = :defectCategory " +
           "     OR :rcaCategory IS NULL OR rs.rootCauseCategory = :rcaCategory)")
    List<Claim> findSimilarClaims(@Param("vendor") String vendor,
                                  @Param("excludeId") Long excludeId,
                                  @Param("defectCategory") String defectCategory,
                                  @Param("rcaCategory") String rcaCategory);

    @Query("SELECT c FROM Claim c WHERE c.rcaStatus IN ('SUBMITTED', 'PENDING_ADMIN', 'DRAFT') " +
           "AND c.qcInformDate IS NOT NULL AND c.qcInformDate <= :cutoff")
    List<Claim> findOverdueRCA(@Param("cutoff") LocalDate cutoff);

    @Query("SELECT c.vendor, COUNT(c) FROM Claim c GROUP BY c.vendor ORDER BY COUNT(c) DESC")
    List<Object[]> countByVendor();

    @Query("SELECT c.defectCategory, COUNT(c) FROM Claim c GROUP BY c.defectCategory")
    List<Object[]> countByDefectCategory();

    @Query("SELECT c.inspector, COUNT(c) FROM Claim c GROUP BY c.inspector")
    List<Object[]> countByInspector();

    @Query("SELECT c.status, COUNT(c) FROM Claim c GROUP BY c.status")
    List<Object[]> countByStatus();

    @Query("SELECT c.rcaStatus, COUNT(c) FROM Claim c WHERE c.rcaStatus IS NOT NULL GROUP BY c.rcaStatus")
    List<Object[]> countByRcaStatus();

    @Query("SELECT COUNT(c) FROM Claim c WHERE c.rcaStatus IN ('SUBMITTED', 'PENDING_ADMIN')")
    long countRcaPending();

    @Query("SELECT COUNT(c) FROM Claim c WHERE c.rcaStatus = 'APPROVED'")
    long countRcaApproved();

    @Query("SELECT COUNT(c) FROM Claim c WHERE c.rcaStatus IN ('SUBMITTED', 'PENDING_ADMIN', 'DRAFT') " +
           "AND c.qcInformDate IS NOT NULL AND c.qcInformDate <= :cutoff")
    long countRcaOverdue(@Param("cutoff") LocalDate cutoff);

    @Query("SELECT FUNCTION('YEAR', c.claimDate), FUNCTION('MONTH', c.claimDate), COUNT(c) " +
           "FROM Claim c WHERE c.claimDate >= :since GROUP BY FUNCTION('YEAR', c.claimDate), FUNCTION('MONTH', c.claimDate) " +
           "ORDER BY FUNCTION('YEAR', c.claimDate) ASC, FUNCTION('MONTH', c.claimDate) ASC")
    List<Object[]> countByMonth(@Param("since") LocalDate since);
}
