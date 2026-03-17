# Roadmap: JumpIn QR Check-In

## Overview

This roadmap guides the migration from React+Vite to Next.js App Router while preserving existing functionality. The project already has a working glassmorphism UI, QR scanner, and mock auth using localStorage. Our task is to transplant these components into Next.js with proper server/client boundaries while maintaining the same user experience. This is v1 (migration only) — Supabase and real backend integration are deferred to v2.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Next.js Foundation** - Scaffold project and configure build tooling ✓
- [x] **Phase 2: UI Component Migration** - Port all components with glassmorphism styling (completed 2026-02-27)
- [x] **Phase 3: Mock Auth & State** - Wire up localStorage-based authentication flows (completed 2026-03-14)
- [x] **Phase 4: Integration & Verification** - End-to-end testing and build validation (gap closure in progress) (completed 2026-03-14)

## Phase Details

### Phase 1: Next.js Foundation
**Goal**: Developer can run Next.js dev server and build the project successfully
**Depends on**: Nothing (first phase)
**Requirements**: INF-01, INF-02, INF-03, INF-04, INF-05, MIG-01, MIG-03, MIG-04
**Success Criteria** (what must be TRUE):
  1. Developer runs `next dev` and sees localhost:3000 load without errors
  2. Developer runs `next build` and production bundle is generated successfully
  3. Path aliases with @/ syntax resolve correctly in imports
  4. Tailwind CSS classes apply styling (not CDN warnings)
  5. Montserrat and Inter fonts render on pages

**Plans**: 3 plans in 3 waves

Plans:
- [x] 01-01-PLAN.md — Scaffold Next.js with Tailwind and Google Fonts ✓
- [x] 01-02-PLAN.md — Migrate custom CSS and configure path aliases ✓
- [x] 01-03-PLAN.md — Verify dev server and production build ✓

---

### Phase 2: UI Component Migration
**Goal**: All existing UI components render with glassmorphism styling in Next.js
**Depends on**: Phase 1
**Requirements**: MIG-02, UI-01, UI-02, UI-03, UI-04, UI-05, UI-06
**Success Criteria** (what must be TRUE):
  1. Login form displays with glassmorphism card styling and email/password inputs
  2. Registration form displays with all fields (name, surname, email, school dropdown with Rimini schools + "Altro", DOB, password)
  3. School dropdown shows "Altro" option and reveals custom text input when selected
  4. Dashboard view renders with glassmorphism profile card layout
  5. QR scanner button opens camera overlay (html5-qrcode initialized)
  6. Mesh gradient background displays behind all glass elements

**Plans**: 3 plans in 2 waves

Plans:
- [ ] 02-01-PLAN.md — Infrastructure prep: Tailwind content paths, layout mesh-bg, lib/schools.ts, page.tsx entry point
- [ ] 02-02-PLAN.md — Auth forms: LoginForm.tsx and RegisterForm.tsx with glassmorphism styling
- [ ] 02-03-PLAN.md — Dashboard and QR scanner: Dashboard.tsx with profile card, QrScanner.tsx with html5-qrcode

---

### Phase 3: Mock Auth & State
**Goal**: User can register, log in, scan QR, and persist session across refresh using localStorage
**Depends on**: Phase 2
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05
**Success Criteria** (what must be TRUE):
  1. User enters credentials on login form, clicks submit, and transitions to dashboard if valid
  2. User fills registration form, submits, and transitions to dashboard with profile data
  3. User refreshes browser on dashboard and remains logged in (session persists via localStorage)
  4. User clicks logout button and returns to login view with session cleared
  5. User scans any QR code and sees check-in success feedback (green checkmark)
  6. Dashboard displays updated last_checkin timestamp after QR scan

**Plans**: 2 plans in 2 waves

Plans:
- [ ] 03-01-PLAN.md — AuthController and page.tsx wiring: central auth state hub with all handlers
- [ ] 03-02-PLAN.md — Component props wiring: LoginForm, RegisterForm, Dashboard accept callbacks

---

### Phase 4: Integration & Verification
**Goal**: Entire application works end-to-end with no regressions from original React+Vite version
**Depends on**: Phase 3
**Requirements**: (Cross-phase validation of all v1 requirements)
**Success Criteria** (what must be TRUE):
  1. User can complete full flow: register → auto-login → dashboard → scan QR → see timestamp update → logout → login again
  2. All glassmorphism styles match original design (mesh background, glass cards, glass inputs)
  3. School dropdown behavior matches original (Altro shows custom input, other selections do not)
  4. Camera permissions work on mobile devices (https required)
  5. Italian text displays correctly on all forms and feedback messages

**Plans**: 4 plans in 2 waves

Plans:
- [x] 04-01-PLAN.md — Pre-flight: build verification, lang="it" fix, camera error handling fix ✓
- [x] 04-02-PLAN.md — UAT checklist creation and human walkthrough on live Vercel URL ✓
- [ ] 04-03-PLAN.md — Gap closure: fix login form flash on hard refresh (hydration guard)
- [ ] 04-04-PLAN.md — Gap closure: fix QR scanner mobile overlay (error detection, race guard, viewport)

---

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Next.js Foundation | 3/3 | Complete ✓ | 2026-02-27 |
| 2. UI Component Migration | 3/3 | Complete    | 2026-02-27 |
| 3. Mock Auth & State | 2/2 | Complete   | 2026-03-14 |
| 4. Integration & Verification | 4/4 | Complete   | 2026-03-14 |

### Phase 5: Supabase Authentication

**Goal:** User can register, log in, and persist session using real Supabase Auth with profile data stored in a Supabase profiles table
**Requirements**: SAUTH-01, SAUTH-02, SAUTH-03, SAUTH-04, DB-01, DB-02, DB-03, DB-04
**Depends on:** Phase 4
**Plans:** 3/4 plans executed

Plans:
- [ ] 05-01-PLAN.md — Supabase packages + client utilities + middleware + schema SQL (Wave 1)
- [ ] 05-02-PLAN.md — RegisterForm confirm password field + LoginForm mock hint removal (Wave 1)
- [ ] 05-03-PLAN.md — AuthController rewrite: replace all mock localStorage auth with Supabase calls (Wave 2)
- [ ] 05-04-PLAN.md — UAT checkpoint: full auth flow human verification (Wave 3)

### Phase 6: Google Sheets Check-in

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 5
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 6 to break down)

---

*Roadmap created: 2026-02-13*
*Last updated: 2026-03-14*
