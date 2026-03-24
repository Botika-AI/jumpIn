---
phase: 06-google-sheets-check-in
plan: 03
subsystem: testing
tags: [google-sheets, uat, checkin, vercel, api, supabase]

# Dependency graph
requires:
  - phase: 06-01
    provides: "lib/googleSheets.ts appendCheckin + POST /api/checkin route"
  - phase: 06-02
    provides: "AuthController.handleCheckIn wired to decodedText + Dashboard sheetsError banner"
provides:
  - "Full end-to-end UAT sign-off: entrance QR, exit QR, unknown QR — all 3 scenarios verified on live Vercel deployment"
  - "Confirmation that Sheets row write, Supabase last_checkin update, and UI feedback all work correctly in production"
  - "Confirmed graceful degradation: Sheets 500 shows yellow warning but check-in is still confirmed"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "UAT pattern: 3-scenario sign-off (entrance, exit, unknown QR) on live Vercel deployment"
    - "Graceful degradation: Sheets write failure shows warning but does not block check-in confirmation"

key-files:
  created:
    - ".planning/phases/06-google-sheets-check-in/06-03-SUMMARY.md"
  modified: []

key-decisions:
  - "UAT split: input validation layer fully testable via curl; actual Sheets row creation requires human with correct QR values and Sheets access"
  - "Unknown QR value returns 400 (not 500) and is rejected before any write — correct behaviour confirmed in UAT"
  - "Sheets 500 (simulated by demoting service account to Viewer) triggers yellow warning banner; Supabase write still succeeds and green checkmark is shown"

patterns-established:
  - "API validation pattern: all required fields checked server-side, Italian error message returned on failure"
  - "Dual-write resilience: Supabase write and Sheets write are independent; Sheets failure does not fail the check-in"

requirements-completed: [GS-01, GS-03, GS-04, GS-ENV, GS-INIT, GS-QR]

# Metrics
duration: UAT (human-verified)
completed: 2026-03-24
---

# Phase 06 Plan 03: UAT Walkthrough Summary

**Full end-to-end UAT completed on live Vercel deployment at jumpindeploy.vercel.app — all 3 scenarios passed including graceful degradation under Sheets 500.**

## Performance

- **Duration:** UAT (human-verified on live deployment)
- **Completed:** 2026-03-24
- **Tasks:** 2 (automated validation layer + human UAT sign-off)
- **Files modified:** 0 (UAT plan — no code changes)

## Accomplishments

- All 3 UAT scenarios passed on live Vercel production deployment
- Entrance QR scan: row written to Google Sheets (Tipo=Entrata), Supabase `last_checkin` updated, green checkmark shown in UI
- Exit QR scan: row written to Google Sheets (Tipo=Uscita), Supabase `last_checkin` updated, green checkmark shown in UI
- Unknown QR scan: rejected with 400, no Supabase update, red XCircle + "QR Non Riconosciuto" displayed — correct behaviour
- Graceful degradation confirmed: demoting service account to Viewer simulates Sheets 500 — yellow warning banner shown, check-in still confirmed (Supabase write succeeds independently)
- Phase 6 (Google Sheets Check-in) is fully complete

## UAT Results — Live Vercel Deployment

| Scenario | Action | Expected | Result | Status |
|----------|--------|----------|--------|--------|
| 1. Valid entrance QR | Scan entrance QR via UI | Sheets row (Tipo=Entrata), Supabase updated, green checkmark | All three confirmed | PASS |
| 2. Valid exit QR | Scan exit QR via UI | Sheets row (Tipo=Uscita), Supabase updated, green checkmark | All three confirmed | PASS |
| 3. Unknown QR | Scan unrecognized QR value | 400 rejected, no Supabase update, red XCircle + "QR Non Riconosciuto" | Confirmed | PASS |
| 4. Sheets 500 degradation | Service account demoted to Viewer | Yellow warning banner, check-in still confirmed | Confirmed | PASS |

## Graceful Degradation Verification

The Sheets 500 scenario was tested by demoting the service account to Viewer role (removing write permission). Observed behaviour:

- `/api/checkin` returned a Sheets error
- Dashboard displayed yellow warning banner (sheetsError prop)
- Supabase `last_checkin` was still updated — dual-write independence confirmed
- Green check-in confirmation was still shown to user

This confirms the architectural decision from Phase 06-01/02: Sheets is an audit log, not a gate for check-in success.

## Task Commits

This was a UAT-only plan. No code was modified.

1. **Task 1: Set up Google credentials** — human-action checkpoint (user confirmed complete prior to plan execution)
2. **Task 2: Full Sheets check-in UAT** — all 3 scenarios + degradation test verified on jumpindeploy.vercel.app

## Files Created/Modified

- `.planning/phases/06-google-sheets-check-in/06-03-SUMMARY.md` — This file

## Decisions Made

- UAT confirmed that unknown QR returns 400 (rejected at validation layer, not 500 from Sheets) — the code correctly identifies unrecognized QR values and returns an error before writing
- Sheets 500 graceful degradation works as designed — yellow warning does not block the check-in confirmation flow
- Phase 6 milestone is complete with full end-to-end verification on live production

## Deviations from Plan

None — plan executed exactly as written. All 3 planned UAT scenarios passed. An additional degradation scenario (Sheets 500 via Viewer demotion) was tested and also passed.

## Issues Encountered

None. All scenarios behaved as designed on first test.

## Next Phase Readiness

- Phase 6 (Google Sheets check-in) is complete — all 3 plans executed and signed off
- The v1.0 milestone is ready for final sign-off
- No blockers: API route live, validation correct, Sheets integration wired, graceful degradation confirmed
- Full system: Supabase auth + profiles, QR scan, dual-write to Supabase + Sheets, Italian error messages, mobile-first UI

---
*Phase: 06-google-sheets-check-in*
*Completed: 2026-03-24*
*UAT verified on: jumpindeploy.vercel.app*
