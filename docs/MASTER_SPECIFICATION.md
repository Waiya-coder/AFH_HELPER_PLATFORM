# AFH Helper Platform — Master Specification Document

## 1. Executive Summary

AFH Helper is a staff management and audit-ready platform designed for assisted facilities, home healthcare agencies, and similar organizations. The platform enables seamless staff hour tracking, employee management, call-out and coverage coordination, training record management, and audit compliance without overwhelming non-technical users.

## 2. Core Objectives

- Enable staff to check in hours with minimal friction
- Provide employers with an at-a-glance view of staffing status and employee records
- Facilitate call-outs and rapid coverage coordination
- Track training expiration dates and compliance items automatically
- Generate audit-ready documentation and compliance reports on demand
- Maintain data integrity and system reliability above all else

## 3. Target Users & Design Constraints

### Primary Users

- **Facility staff** (ages 45+) with varying technical proficiency
- **Administrators and supervisors** (supervisory roles, tech-comfortable)
- **Auditors** (need clear, comprehensive documentation trails)
- **HR personnel** (training tracking and compliance oversight)

### Design Principles for Non-Technical Users

- Minimize cognitive load: Each screen should present only necessary actions
- Use icons and color coding to communicate status at a glance
- Provide clear call-to-action buttons with large touch targets
- Avoid nested menus and complex workflows
- Include contextual help tooltips and confirmation dialogs
- Support mobile and tablet devices (many staff use personal phones)

## 4. Core Features

### 4.1 Staff Hour Check-In

- Simple check-in/check-out button on staff dashboard
- Display current shift start time, elapsed hours, and daily total
- Support manual time entry (for retroactive logging, with supervisor approval)
- Mobile-optimized, works offline with sync when connectivity returns
- Automatic GPS tagging optional (for field staff, consent required)
- Confirmation prompt before check-out to prevent accidental logs

### 4.2 Employee Management Dashboard

- **List view:** Show all staff with status (on duty, off duty, on break)
- Color-coded badges for quick status recognition
- Individual employee profiles: contact, availability, certifications, notes
- Search and filter by name, role, availability, or certification status
- Edit employee records without leaving the dashboard
- Archive or deactivate staff members (never delete for audit trail)

### 4.3 Call-Out and Coverage Management

- Staff initiate call-out request (specify shift, reason, optional duration)
- System immediately identifies available staff for that shift
- Send notifications to available staff with auto-accept option
- Track all call-outs with reason and coverage resolution
- Supervisor override: manually assign coverage if no volunteers
- Notification history and communication log for compliance

### 4.4 Training & Certification Tracking

- Centralized training record database (CPR, first aid, specialized certs, etc.)
- Automatic expiration alerts 30/60/90 days before date
- Assign training to staff; track completion with dates and issuing body
- Bulk expiration reports by certification type
- Calendar view showing upcoming expirations across all staff

### 4.5 Audit Readiness & Compliance

- Audit checklist: pre-built or customizable compliance items
- Track completion status of each checklist item with evidence uploads
- Generate audit packet (PDF): comprehensive report with all supporting docs
- Immutable audit log: record of all data changes, user actions, timestamps
- Compliance dashboard: real-time status of critical items
- Export capabilities: hour records, staff files, training records, call-out logs

### 4.6 Records and Document Management

- Centralized file storage per employee (policies, acknowledgments, etc.)
- Version control: retain all document versions with change dates
- E-signature integration for policy acknowledgments
- Search across all uploaded documents
- Permission tiers: staff see only their own files; supervisors and auditors see all

## 5. Technical Architecture

### 5.1 Technology Stack

#### Frontend

- React (TypeScript) for web application
- React Native or Flutter for mobile apps (iOS/Android)
- State management: Redux or Zustand for predictable data flow
- UI library: shadcn or custom component library for consistency
- Offline support: Service Worker (web) and local SQLite (mobile)

#### Backend

- Node.js (Express or Fastify) or Python (Django/FastAPI) for REST/GraphQL API
- PostgreSQL for primary relational database (audit trail, strong ACID compliance)
- Redis for caching and real-time updates (presence, notifications)
- Message queue (Bull/RabbitMQ) for async tasks: notifications, PDF generation
- S3 or MinIO for document storage (immutable, timestamped)

### 5.2 Database Schema (Key Tables)

| Table | Key Fields |
|-------|------------|
| `users` | id, email, password_hash, role, facility_id, created_at, updated_at |
| `facilities` | id, name, address, contact_info, subscription_plan, created_at |
| `staff` | id, facility_id, first_name, last_name, email, phone, role, status, hire_date, created_at, updated_at |
| `timesheets` | id, staff_id, date, check_in_time, check_out_time, hours_worked, notes, created_at, updated_at |
| `certifications` | id, staff_id, cert_type, issue_date, expiration_date, issuing_body, created_at |
| `call_outs` | id, facility_id, staff_id, shift_date, reason, status, assigned_coverage_staff_id, created_at, resolved_at |
| `documents` | id, staff_id, facility_id, file_path, file_type, upload_date, version, created_at |
| `audit_logs` | id, facility_id, user_id, action, table_name, record_id, changes, timestamp |

### 5.3 Core API Endpoints

#### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | email, password |
| POST | `/auth/logout` | |
| POST | `/auth/refresh` | |
| POST | `/auth/password-reset` | |

#### Timesheets

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/timesheets/check-in` | auto-timestamp |
| POST | `/timesheets/check-out` | auto-timestamp |
| GET | `/timesheets` | list with filters: date range, staff_id |
| PUT | `/timesheets/:id` | manual edit by supervisor |
| GET | `/timesheets/:id/details` | |

#### Staff Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/staff` | list all staff |
| POST | `/staff` | create new staff record |
| GET | `/staff/:id` | individual profile |
| PUT | `/staff/:id` | update profile |
| GET | `/staff/:id/availability` | check if available for shift |

#### Call-Out Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/call-outs` | staff initiates |
| GET | `/call-outs` | filter by status, date, facility |
| POST | `/call-outs/:id/accept` | coverage staff accepts |
| POST | `/call-outs/:id/assign` | supervisor assigns coverage |

#### Certifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/certifications` | add training record |
| GET | `/certifications` | list, filter by expiration status |
| PUT | `/certifications/:id` | update dates |
| GET | `/certifications/expiring-soon` | 30/60/90 day alerts |

#### Audit & Compliance

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/compliance/checklist` | |
| PUT | `/compliance/checklist/:id` | mark item complete, upload evidence |
| GET | `/compliance/status` | dashboard overview |
| POST | `/compliance/export-packet` | generate audit PDF |
| GET | `/audit-logs` | immutable change history |

### 5.4 Reliability & Robustness Requirements

- **Database:** Automatic backups every 4 hours, point-in-time restore capability
- **API redundancy:** Load balanced across 3+ instances with automatic failover
- **Error handling:** Graceful degradation; if write fails, log to local queue and retry
- **Health checks:** Automated monitoring of all services; PagerDuty alerts for downtime
- **Rate limiting:** Per-user and per-IP to prevent abuse
- **Data validation:** Strict schema validation on all inputs; stored procedures for critical operations
- **Logging:** Centralized logging (ELK stack) with configurable retention for audit trail
- **Testing:** Unit tests (more than 80% coverage), integration tests, and monthly load testing

## 6. Security & Compliance

- **Authentication:** JWT tokens with refresh tokens; MFA optional for admins
- **Authorization:** Role-based access control (RBAC) with granular permissions
- **Encryption:** TLS 1.3 in transit; AES-256 at rest
- **Compliance:** HIPAA-ready (audit logs, encryption, access controls)
- **Data retention:** Configurable per facility; never delete records, only archive
- **GDPR compliance:** Right to access, data portability, deletion requests tracked
- **Regular security audits:** Annual penetration testing, quarterly vulnerability scans

## 7. User Interface Guidelines

### Dashboard Organization

Organize screens into clear sections based on user role:

| Role | Dashboard Focus |
|------|-----------------|
| **Staff** | Check-in/out, view my schedule, see alerts |
| **Supervisor** | Staffing overview, pending call-outs, compliance items |
| **HR** | Training tracking, document management, bulk reports |
| **Auditor** | Read-only access to audit logs, compliance status, export tools |

### Visual Design Standards

- Use large, tap-friendly buttons (minimum 48px for mobile)
- Color coding: Green for available, red for unavailable, yellow for pending
- Icons for quick status recognition (clock for hours, person for staff, etc.)
- Consistent navigation: Bottom tab bar on mobile, top nav on desktop
- High contrast: Ensure readability for all vision abilities

## 8. Deployment & DevOps

- **Container orchestration:** Kubernetes or ECS for scalability
- **CI/CD:** GitHub Actions or GitLab CI for automated testing and deployment
- **Environments:** Development, staging, production with separate databases
- **Monitoring:** Prometheus, Grafana for metrics; Sentry for error tracking
- **Disaster recovery:** RTO 1 hour, RPO 15 minutes
- **Uptime target:** 99.9% SLA with documented failover procedures

## 9. Development Roadmap

### Phase 1: MVP (Weeks 1–8)

- User authentication and role setup
- Staff check-in/check-out functionality
- Basic employee directory
- Simple timesheet export
- Initial audit logging

### Phase 2: Core Features (Weeks 9–20)

- Call-out and coverage management
- Certification and training tracking
- Document management with e-signature
- Enhanced audit dashboard
- Mobile app (iOS/Android)

### Phase 3: Optimization & Polish (Weeks 21–28)

- Offline-first sync (mobile)
- Advanced reporting and analytics
- Integration with external systems (payroll, HRIS)
- Performance optimization and load testing
- Security hardening and penetration testing

## 10. Success Metrics

| Metric | Target |
|--------|--------|
| User adoption | 90% of staff check-in via app within 30 days of launch |
| Data accuracy | 99%+ timesheet accuracy within 5% variance |
| System reliability | 99.9% uptime with zero unplanned downtime per month |
| Audit readiness | Generate audit packet in less than 5 minutes |
| User satisfaction | NPS score above 50 within 60 days |
| Support load | Less than 5 support tickets per 100 users per month |

---

## Development Notes for Cursor

Use this document as your **source of truth** when building out features. Reference the database schema, API endpoints, and UI guidelines sections when designing components.

### Code Organization

Follow a layered architecture:

- **Routes** (Express/FastAPI) pass to services
- **Services** contain business logic
- **Repositories** handle database queries

Keep the backend stateless for horizontal scaling.

### Testing & Quality

Test all critical paths (check-in, call-out acceptance, audit export) thoroughly before merging to main.

### Priorities

Prioritize **reliability** and **backward compatibility** over feature velocity.
