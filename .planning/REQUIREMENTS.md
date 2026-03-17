# Requirements: JumpIn QR Check-In

**Defined:** 2026-02-13
**Core Value:** Users can scan a QR code to instantly check in, with their attendance reliably recorded

## v1 Requirements

Requirements for initial release. Migrate existing React+Vite SPA to Next.js App Router while preserving all current functionality.

### Migration

- [x] **MIG-01**: Project scaffolded as Next.js App Router with TypeScript
- [x] **MIG-02**: Existing glassmorphism CSS and styles ported to Next.js (mesh background, glass cards, glass inputs)
- [x] **MIG-03**: Tailwind CSS configured via package (replace CDN)
- [x] **MIG-04**: Google Fonts (Montserrat, Inter) loaded via Next.js font optimization

### UI Components

- [x] **UI-01**: Login form renders with email/password inputs and glassmorphism styling
- [x] **UI-02**: Registration form renders with all fields (name, surname, email, school dropdown, DOB, password)
- [x] **UI-03**: School dropdown includes Rimini schools list with "Altro" + custom input logic
- [x] **UI-04**: Dashboard displays user profile card (read-only) with glassmorphism styling
- [x] **UI-05**: QR scanner opens camera overlay and scans QR codes via html5-qrcode
- [x] **UI-06**: Check-in success feedback displays (green checkmark / animation)

### State & Auth (Mock)

- [x] **AUTH-01**: Mock login validates credentials and transitions to dashboard
- [x] **AUTH-02**: Mock registration creates user profile and transitions to dashboard
- [x] **AUTH-03**: User session persists across browser refresh via localStorage
- [x] **AUTH-04**: Logout clears session and returns to login view
- [x] **AUTH-05**: QR scan updates last_checkin timestamp in localStorage user object

### Infrastructure

- [x] **INF-01**: Vite config replaced with Next.js config (next.config.js)
- [x] **INF-02**: Path aliases (@/) configured for Next.js
- [x] **INF-03**: Project builds successfully with `next build`
- [x] **INF-04**: Development server runs with `next dev`
- [x] **INF-05**: Project structure follows Next.js App Router conventions (app/ directory)

## v2 Requirements

Deferred to future release. Backend integration and real data persistence.

### Authentication (Supabase)

- [x] **SAUTH-01**: Replace mock auth with Supabase Auth (email/password)
- [x] **SAUTH-02**: Cookie-based session management via @supabase/ssr
- [x] **SAUTH-03**: Middleware route protection for dashboard
- [x] **SAUTH-04**: Registration creates Supabase Auth user + profiles table row

### Database (Supabase)

- [x] **DB-01**: Profiles table schema (id, first_name, last_name, email, school, dob, last_checkin)
- [x] **DB-02**: Dashboard reads profile data from Supabase
- [x] **DB-03**: QR scan writes last_checkin timestamp to Supabase
- [x] **DB-04**: Row Level Security policies on profiles table

### Google Sheets Integration

- **GS-01**: Service Account authentication via Next.js API routes
- **GS-02**: Registration appends row to Google Sheet
- **GS-03**: Check-in updates timestamp column in Google Sheet
- **GS-04**: Async/non-blocking writes with retry logic

### Check-In Enhancements

- **CHK-01**: Duplicate check-in prevention
- **CHK-02**: Check-in history view for users
- **CHK-03**: QR code content validation (specific event QR)

## Out of Scope

| Feature | Reason |
|---------|--------|
| PWA / offline support | Deferred, not needed for v1 |
| OAuth / social login | Email/password sufficient |
| Profile editing | Data is read-only per PRD |
| Push notifications | Not needed for event check-in |
| Admin dashboard (in-app) | Google Sheets serves as admin view |
| Multi-language support | Italian only for Rimini context |
| Event management system | Simple QR check-in, no event CRUD needed |
| Real-time dashboard updates | Deferred to v2+ |
| Deployment to Vercel | Code is Vercel-ready but deploy is manual |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| MIG-01 | Phase 1 | Complete |
| MIG-02 | Phase 2 | Complete |
| MIG-03 | Phase 1 | Complete |
| MIG-04 | Phase 1 | Complete |
| UI-01 | Phase 2 | Complete |
| UI-02 | Phase 2 | Complete |
| UI-03 | Phase 2 | Complete |
| UI-04 | Phase 2 | Complete |
| UI-05 | Phase 2 | Complete |
| UI-06 | Phase 2 | Complete |
| AUTH-01 | Phase 3 | Complete |
| AUTH-02 | Phase 3 | Complete |
| AUTH-03 | Phase 3 | Complete |
| AUTH-04 | Phase 3 | Complete |
| AUTH-05 | Phase 3 | Complete |
| INF-01 | Phase 1 | Complete |
| INF-02 | Phase 1 | Complete |
| INF-03 | Phase 1 | Complete |
| INF-04 | Phase 1 | Complete |
| INF-05 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0

---
*Requirements defined: 2026-02-13*
*Last updated: 2026-02-13 after roadmap creation*
