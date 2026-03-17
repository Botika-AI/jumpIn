---
phase: 06-google-sheets-check-in
plan: 02
subsystem: ui
tags: [react, typescript, google-sheets, supabase, nextjs]

# Dependency graph
requires:
  - phase: 06-01
    provides: POST /api/checkin route and lib/googleSheets.ts with CheckInPayload interface
  - phase: 05-supabase-authentication
    provides: AuthController with handleCheckIn, Dashboard with QR scan flow, UserProfile type
provides:
  - handleCheckIn(decodedText: string) wired to both Supabase update and POST /api/checkin
  - Non-fatal sheetsError banner in Dashboard, dismissable by user
  - Full end-to-end QR scan -> Supabase -> Sheets data flow
affects: [06-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dual-write pattern: Supabase primary (blocking), Sheets secondary (non-fatal)"
    - "Non-fatal error surfacing via optional prop passed from controller to view"
    - "decodedText threaded from QR scan event through prop callback to API payload"

key-files:
  created: []
  modified:
    - components/AuthController.tsx
    - components/Dashboard.tsx

key-decisions:
  - "sheetsError is optional in DashboardProps — no crash if AuthController omits it"
  - "Both Supabase and Sheets writes always fire — Sheets failure does not gate Supabase write"
  - "dataOra formatted as it-IT locale string inside AuthController, not in the API route — keeps route generic"

patterns-established:
  - "Non-fatal side-effect errors: set error state in controller, pass down as optional prop, display in view"
  - "QR decoded payload thread: Dashboard.handleScan receives string, passes via onCheckIn(decodedText) prop, controller sends in API body"

requirements-completed: [GS-03, GS-04, GS-QR]

# Metrics
duration: 3min
completed: 2026-03-17
---

# Phase 6 Plan 02: Client-Side Wiring Summary

**QR scan now triggers Supabase update + POST /api/checkin with full user payload, with non-fatal yellow error banner if Sheets sync fails**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-17T17:27:19Z
- **Completed:** 2026-03-17T17:30:57Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `handleCheckIn` updated to accept `decodedText: string` and POST to `/api/checkin` after Supabase write
- `sheetsError` state in AuthController drives a dismissable yellow banner in Dashboard
- Dashboard's `handleScan` now passes `decodedText` through the `onCheckIn` prop callback
- TypeScript compilation and `npm run build` pass with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Update AuthController** - `0c1a334` (feat)
2. **Task 2: Update Dashboard** - `753e1b5` (feat)

## Files Created/Modified

- `components/AuthController.tsx` - Added sheetsError state; replaced handleCheckIn with (decodedText: string) version that calls /api/checkin; passes sheetsError + onClearSheetsError to Dashboard
- `components/Dashboard.tsx` - Updated DashboardProps (onCheckIn now takes string); handleScan passes decodedText; added sheetsError yellow banner with dismiss button

## Decisions Made

- `sheetsError` and `onClearSheetsError` are optional props in DashboardProps — Dashboard does not crash if AuthController does not provide them
- Both writes always fire regardless of each other's outcome — Sheets is an audit log, not a gate
- `dataOra` formatted in AuthController (locale string) rather than in the API route — keeps the route payload generic

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Full end-to-end data flow is complete: QR scan -> Supabase update -> Sheets row append
- Plan 03 (UAT / end-to-end verification) can proceed
- Environment variables GOOGLE_SERVICE_ACCOUNT_KEY and GOOGLE_SHEETS_ID must be set in production for Sheets writes to succeed

---
*Phase: 06-google-sheets-check-in*
*Completed: 2026-03-17*

## Self-Check: PASSED

- components/AuthController.tsx: FOUND
- components/Dashboard.tsx: FOUND
- .planning/phases/06-google-sheets-check-in/06-02-SUMMARY.md: FOUND
- Commit 0c1a334: FOUND
- Commit 753e1b5: FOUND
