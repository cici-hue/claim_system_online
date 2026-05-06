package com.otto.cms.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.otto.cms.dto.*;
import com.otto.cms.entity.Claim;
import com.otto.cms.entity.ClaimAttachment;
import com.otto.cms.service.ClaimService;
import com.otto.cms.service.EmailService;
import com.otto.cms.repository.ClaimRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/claims")
@RequiredArgsConstructor
public class ClaimController {

    private final ClaimService claimService;
    private final EmailService emailService;
    private final ClaimRepository claimRepository;

    @Value("${app.upload.dir:./uploads}")
    private String uploadDir;

    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "text/plain",
        "text/csv"
    );

    private static final long MAX_FILE_SIZE = 20 * 1024 * 1024;

    @PostMapping("/{id}/attachments")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    public ResponseEntity<?> uploadAttachment(@PathVariable Long id,
                                               @RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "File is empty"));
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                    .body(Map.of("error", "File size exceeds 20MB limit"));
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType)) {
            return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
                    .body(Map.of("error", "File type not allowed: " + contentType));
        }

        try {
            Claim claim = claimService.findByIdEntity(id);
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            String originalFilename = file.getOriginalFilename();
            String safeFilename = originalFilename != null
                    ? originalFilename.replaceAll("[/\\\\]", "_").replaceAll("\\.\\.", "")
                    : "file";
            String storedName = UUID.randomUUID() + "_" + safeFilename;
            Path filePath = uploadPath.resolve(storedName);
            file.transferTo(filePath.toFile());

            ClaimAttachment attachment = new ClaimAttachment();
            attachment.setClaim(claim);
            attachment.setFileName(file.getOriginalFilename());
            attachment.setStoragePath(storedName);
            attachment.setContentType(contentType);
            attachment.setFileSize(file.getSize());
            attachment.setUploadedBy(SecurityContextHolder.getContext().getAuthentication().getName());
            attachment.setUploadedAt(LocalDateTime.now());
            claim.getAttachments().add(attachment);
            claimRepository.save(claim);

            ClaimAttachmentDto dto = new ClaimAttachmentDto();
            dto.setId(attachment.getId());
            dto.setFileName(attachment.getFileName());
            dto.setContentType(attachment.getContentType());
            dto.setFileSize(attachment.getFileSize());
            dto.setUploadedBy(attachment.getUploadedBy());
            dto.setUploadedAt(attachment.getUploadedAt());

            return ResponseEntity.ok(dto);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to store file"));
        }
    }

    @GetMapping("/{id}/attachments/{attachmentId}")
    public ResponseEntity<?> downloadAttachment(@PathVariable Long id,
                                                 @PathVariable Long attachmentId,
                                                 @RequestParam(defaultValue = "0") int download) {
        Claim claim = claimService.findByIdEntity(id);
        ClaimAttachment attachment = claim.getAttachments().stream()
                .filter(a -> a.getId().equals(attachmentId))
                .findFirst()
                .orElse(null);

        if (attachment == null) {
            return ResponseEntity.notFound().build();
        }

        try {
            Path filePath = Paths.get(uploadDir).resolve(attachment.getStoragePath());
            byte[] data = Files.readAllBytes(filePath);

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(
                            attachment.getContentType() != null ? attachment.getContentType() : "application/octet-stream"))
                    .header("Content-Disposition",
                            (download == 1 ? "attachment" : "inline") + "; filename=\"" + attachment.getFileName() + "\"")
                    .body(data);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to read file"));
        }
    }

    @DeleteMapping("/{id}/attachments/{attachmentId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    public ResponseEntity<?> deleteAttachment(@PathVariable Long id,
                                               @PathVariable Long attachmentId) {
        Claim claim = claimService.findByIdEntity(id);
        ClaimAttachment attachment = claim.getAttachments().stream()
                .filter(a -> a.getId().equals(attachmentId))
                .findFirst()
                .orElse(null);

        if (attachment == null) {
            return ResponseEntity.notFound().build();
        }

        try {
            Path filePath = Paths.get(uploadDir).resolve(attachment.getStoragePath());
            Files.deleteIfExists(filePath);
        } catch (IOException ignored) {
        }

        claim.getAttachments().remove(attachment);
        claimRepository.save(claim);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public Page<ClaimResponse> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String vendor,
            @RequestParam(required = false) String customer,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String defectCategory,
            @RequestParam(required = false) String inspector,
            @RequestParam(required = false) String rcaStatus,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return claimService.findAll(search, vendor, customer, status, location,
                defectCategory, inspector, rcaStatus, dateFrom, dateTo, page, size);
    }

    @GetMapping("/{id}")
    public ClaimResponse get(@PathVariable Long id) {
        return claimService.findById(id);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    public ResponseEntity<ClaimResponse> create(@RequestBody ClaimRequest req) {
        return ResponseEntity.ok(claimService.create(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    public ClaimResponse update(@PathVariable Long id, @RequestBody ClaimRequest req) {
        return claimService.update(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        claimService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/rca")
    @PreAuthorize("hasAnyRole('INSPECTOR','SUPERVISOR','MANAGER','ADMIN','SUPERADMIN')")
    public ClaimResponse saveRCA(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        RcaStructuredDto dto = null;
        if (body.containsKey("rcaStructured") && body.get("rcaStructured") != null) {
            ObjectMapper mapper = new ObjectMapper();
            mapper.findAndRegisterModules();
            dto = mapper.convertValue(body.get("rcaStructured"), RcaStructuredDto.class);
        }
        String freeText = (String) body.get("rcaReport");
        return claimService.saveRCA(id, dto, freeText);
    }

    @PostMapping("/{id}/rca/submit")
    @PreAuthorize("hasAnyRole('INSPECTOR','SUPERVISOR','MANAGER','ADMIN','SUPERADMIN')")
    public ClaimResponse submitRCA(@PathVariable Long id, @RequestBody RCASubmitRequest req) {
        return claimService.submitRCA(id, req.getComment());
    }

    @PostMapping("/{id}/rca/approve")
    @PreAuthorize("hasAnyRole('SUPERVISOR','MANAGER','ADMIN','SUPERADMIN')")
    public ClaimResponse approveRCA(@PathVariable Long id,
                                    @RequestBody RcaApproveRequest req,
                                    @RequestParam(defaultValue = "false") boolean final_approval) {
        return claimService.approveRCA(id, req.getComment(), final_approval);
    }

    @PostMapping("/{id}/rca/reject")
    @PreAuthorize("hasAnyRole('SUPERVISOR','MANAGER','ADMIN','SUPERADMIN')")
    public ClaimResponse rejectRCA(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return claimService.rejectRCA(id, body.get("reason"));
    }

    @PostMapping("/{id}/rca/reset-draft")
    @PreAuthorize("hasAnyRole('INSPECTOR','ADMIN','SUPERADMIN')")
    public ClaimResponse resetRCAToDraft(@PathVariable Long id) {
        return claimService.resetRCAToDraft(id);
    }

    @PostMapping("/{id}/rca/score")
    @PreAuthorize("hasAnyRole('SUPERVISOR','MANAGER','ADMIN','SUPERADMIN')")
    public ClaimResponse scoreRCA(@PathVariable Long id, @RequestBody RCAScoreRequest req) {
        return claimService.scoreRCA(id, req);
    }

    @PostMapping("/{id}/notes")
    @PreAuthorize("isAuthenticated()")
    public ClaimResponse addNote(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return claimService.addNote(id, body.get("text"));
    }

    @GetMapping("/{id}/similar")
    public List<ClaimResponse> getSimilar(@PathVariable Long id) {
        return claimService.findSimilar(id);
    }

    @PostMapping("/{id}/similar/notify")
    @PreAuthorize("hasAnyRole('SUPERVISOR','MANAGER','ADMIN','SUPERADMIN')")
    public ResponseEntity<Void> notifySimilar(@PathVariable Long id,
                                              @RequestBody Map<String, String> body) {
        List<ClaimResponse> similar = claimService.findSimilar(id);
        ClaimResponse trigger = claimService.findById(id);
        // Combine to and cc for recipients, with cc labeled
        String to = body.getOrDefault("to", "");
        String cc = body.getOrDefault("cc", "");
        String recipients = to;
        if (!cc.isEmpty()) {
            recipients = recipients + "; CC: " + cc;
        }
        emailService.sendSimilarClaimsAlert(trigger, similar,
                recipients, body.get("subject"), body.get("body"));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/email")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN','MANAGER','SUPERVISOR')")
    public ResponseEntity<Void> sendClaimEmail(@PathVariable Long id, @RequestBody EmailTemplateRequest req) {
        emailService.sendClaimEmail(req);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/risk-alert")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN','MANAGER','SUPERVISOR')")
    public ResponseEntity<Void> sendRiskAlert(@PathVariable Long id, @RequestBody EmailTemplateRequest req,
                                               @AuthenticationPrincipal UserDetails userDetails) {
        emailService.sendClaimEmail(req);
        // Update claim with sender info
        Claim claim = claimService.findByIdEntity(id);
        if (claim != null) {
            claim.setRiskAlertSentAt(LocalDateTime.now());
            claim.setRiskAlertSentBy(userDetails.getUsername());
            claimRepository.save(claim);
        }
        return ResponseEntity.noContent().build();
    }
}
