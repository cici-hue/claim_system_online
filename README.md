# Claim Management System v8

Otto International Quality Control — Claim Management System

## Project Structure

```
claim-management-system/
├── backend/                        # Spring Boot 3 (Java 17)
│   ├── src/main/java/com/otto/cms/
│   │   ├── ClaimSystemApplication.java
│   │   ├── config/
│   │   │   └── SecurityConfig.java
│   │   ├── controller/
│   │   │   ├── AuthController.java
│   │   │   ├── ClaimController.java
│   │   │   ├── UserController.java
│   │   │   ├── AuditLogController.java
│   │   │   └── AnalyticsController.java
│   │   ├── dto/
│   │   │   ├── ClaimRequest.java / ClaimResponse.java
│   │   │   ├── LoginRequest.java / LoginResponse.java
│   │   │   ├── UserDTO.java
│   │   │   ├── RcaStructuredDto.java / RcaQualityScoreDto.java
│   │   │   ├── RcaApprovalHistoryDto.java
│   │   │   ├── CorrectiveActionDto.java
│   │   │   ├── ClaimAttachmentDto.java / ClaimNoteDto.java
│   │   │   ├── RCAScoreRequest.java / RCASubmitRequest.java
│   │   │   ├── RcaApproveRequest.java / EmailTemplateRequest.java
│   │   │   └── SavedSearchDTO.java
│   │   ├── entity/
│   │   │   ├── Claim.java
│   │   │   ├── User.java
│   │   │   ├── RcaStructured.java
│   │   │   ├── RcaApprovalHistory.java
│   │   │   ├── RcaQualityScore.java
│   │   │   ├── RcaTemplate.java
│   │   │   ├── CorrectiveAction.java
│   │   │   ├── ClaimAttachment.java
│   │   │   ├── ClaimNote.java
│   │   │   └── AuditLog.java
│   │   ├── repository/
│   │   │   ├── ClaimRepository.java
│   │   │   ├── UserRepository.java
│   │   │   ├── AuditLogRepository.java
│   │   │   ├── RcaTemplateRepository.java
│   │   │   └── CorrectiveActionRepository.java
│   │   ├── security/
│   │   │   ├── JwtTokenProvider.java
│   │   │   └── JwtAuthenticationFilter.java
│   │   └── service/
│   │       ├── ClaimService.java
│   │       ├── UserService.java
│   │       ├── UserDetailsServiceImpl.java
│   │       ├── AuditLogService.java
│   │       └── EmailService.java
│   └── src/main/resources/
│       └── application.properties
│
└── frontend/                       # React 18 + TypeScript + Vite
    └── src/
        ├── App.tsx
        ├── main.tsx
        ├── components/
        │   ├── AuditLogs/AuditLogsPage.tsx
        │   ├── Claims/
        │   │   ├── ClaimsListPage.tsx
        │   │   ├── ClaimFormPage.tsx
        │   │   └── ClaimDetailPage.tsx
        │   ├── Dashboard/DashboardPage.tsx
        │   ├── RCA/RCAModal.tsx
        │   ├── Users/UsersPage.tsx
        │   └── common/
        │       ├── LoginPage.tsx
        │       └── Sidebar.tsx
        ├── hooks/useAuth.tsx
        ├── services/
        │   ├── api.ts
        │   ├── authService.ts
        │   ├── claimService.ts
        │   ├── userService.ts
        │   ├── auditService.ts
        │   └── analyticsService.ts
        └── types/claim.ts
```

## Quick Start

### Backend
```bash
cd backend
mvn spring-boot:run
# API runs on http://localhost:8080
# H2 console: http://localhost:8080/h2-console
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# UI runs on http://localhost:3000
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Login |
| GET | /api/claims | List claims (paginated, filtered) |
| POST | /api/claims | Create claim |
| GET | /api/claims/:id | Get claim |
| PUT | /api/claims/:id | Update claim |
| DELETE | /api/claims/:id | Delete (cancelled only) |
| PUT | /api/claims/:id/rca | Save RCA |
| POST | /api/claims/:id/rca/submit | Submit RCA |
| POST | /api/claims/:id/rca/approve | Approve RCA |
| POST | /api/claims/:id/rca/reject | Reject RCA |
| POST | /api/claims/:id/rca/score | Score RCA quality |
| POST | /api/claims/:id/notes | Add team note |
| GET | /api/users | List users (admin) |
| POST | /api/users | Create user (admin) |
| PUT | /api/users/:id | Update user (admin) |
| DELETE | /api/users/:id | Delete user (admin) |
| GET | /api/audit-logs | Audit logs (admin) |
| GET | /api/analytics/top-vendors | Vendor stats |
| GET | /api/analytics/claims-by-status | Status breakdown |
| GET | /api/analytics/claims-by-defect | Defect stats |
| GET | /api/analytics/claims-by-inspector | Inspector stats |

## User Roles

- **SUPERADMIN** — Full access, global scope
- **ADMIN** — Full access, user management, audit logs
- **SUPERVISOR** — Claims + RCA approval, quality scoring
- **INSPECTOR** — Create/edit own claims, submit RCA

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Spring Boot 3.2, Spring Security, Spring Data JPA |
| Auth | JWT (jjwt 0.12) |
| Database | H2 (dev) / PostgreSQL (prod) |
| Frontend | React 18, TypeScript, Vite |
| Charts | Chart.js + react-chartjs-2 |
| HTTP Client | Axios |
