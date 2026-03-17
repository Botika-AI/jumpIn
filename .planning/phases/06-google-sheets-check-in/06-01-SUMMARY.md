---
phase: 06-google-sheets-check-in
plan: 01
subsystem: api
tags: [googleapis, google-sheets, service-account, jwt-auth, nextjs-api-route]

# Dependency graph
requires:
  - phase: 05-supabase-authentication
    provides: UserProfile interface and Next.js App Router foundation
provides:
  - lib/googleSheets.ts with Service Account auth, ensureHeaders, and appendCheckin helpers
  - POST /api/checkin route with Node.js runtime, field validation, and 1-retry logic
  - .env.local.example updated with GOOGLE_SERVICE_ACCOUNT_KEY, GOOGLE_SPREADSHEET_ID, ENTRANCE_QR_VALUE, EXIT_QR_VALUE
affects: [06-02-client-integration, 06-03-end-to-end-verification]

# Tech tracking
tech-stack:
  added: [googleapis@144.x, google-auth-library (peer dep)]
  patterns: [Service Account JWT auth for server-side Sheets access, Node.js runtime route to avoid Edge crypto limitations]

key-files:
  created:
    - lib/googleSheets.ts
    - app/api/checkin/route.ts
  modified:
    - .env.local.example
    - package.json
    - package-lock.json

key-decisions:
  - "runtime = 'nodejs' on checkin route — googleapis uses Node.js crypto APIs, incompatible with Edge runtime"
  - "JSON.parse(GOOGLE_SERVICE_ACCOUNT_KEY) with no .replace() on private_key — key arrives correctly escaped as JSON string"
  - "Unknown QR value defaults to 'Entrata' with console.log warning — safe default, no hard failure on unrecognized QR"
  - "1-retry pattern in route.ts, not in googleSheets.ts — retry is transport concern, not Sheets service concern"

patterns-established:
  - "Server-side QR resolution: decodedText sent in payload, tipo resolved server-side by comparing env vars"
  - "Auto header row: ensureHeaders() writes HEADERS if A1:F1 is empty, ensuring sheet is self-initializing"

requirements-completed: [GS-01, GS-03, GS-04, GS-INIT, GS-ENV]

# Metrics
duration: 8min
completed: 2026-03-17
---

# Phase 6 Plan 01: Google Sheets Integration Layer Summary

**googleapis Service Account auth + appendCheckin helper + POST /api/checkin route with Italian error messages and auto header row initialization**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-17T17:19:32Z
- **Completed:** 2026-03-17T17:27:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Installed googleapis package and created `lib/googleSheets.ts` with Service Account JWT auth, ensureHeaders (auto-writes Italian column headers if sheet is empty), and appendCheckin (resolves QR tipo server-side, appends row)
- Created `app/api/checkin/route.ts` with Node.js runtime, required field validation, 1-retry on transient Sheets failure, Italian error messages
- Updated `.env.local.example` with all four new server-side env vars and usage comments

## Task Commits

1. **Task 1: Install googleapis and create lib/googleSheets.ts** - `0aa4b75` (feat)
2. **Task 2: Create POST /api/checkin route and update .env.local.example** - `e70b513` (feat)

## Files Created/Modified

- `lib/googleSheets.ts` - CheckInPayload interface, getSheetsClient (Service Account JWT), ensureHeaders, appendCheckin
- `app/api/checkin/route.ts` - POST handler with Node.js runtime, validation, 1-retry, Italian error messages
- `.env.local.example` - Added GOOGLE_SERVICE_ACCOUNT_KEY, GOOGLE_SPREADSHEET_ID, ENTRANCE_QR_VALUE, EXIT_QR_VALUE with usage comments
- `package.json` / `package-lock.json` - googleapis and google-auth-library added

## Decisions Made

- `runtime = 'nodejs'` on the checkin route — googleapis uses Node.js crypto APIs, incompatible with Next.js Edge runtime
- No `.replace()` on `private_key` in JSON parse — the service account JSON string already contains correctly escaped `\n` characters
- Unknown QR value defaults to `'Entrata'` with a console warning rather than throwing — avoids hard failures from misconfigured env vars at event time
- Retry logic lives in `route.ts` not `lib/googleSheets.ts` — keeps the service module focused on Sheets operations, retry is a transport/infrastructure concern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- First `npm install` attempt failed with ECONNRESET (network flakiness). Resolved on immediate retry with no code changes.

## User Setup Required

None - no external service configuration required at this plan stage. Credentials must be added to `.env.local` by the developer before the endpoint is functional (documented in `.env.local.example`).

## Next Phase Readiness

- `lib/googleSheets.ts` exports `appendCheckin` and `CheckInPayload` — ready for Plan 02 client integration
- `POST /api/checkin` endpoint is deployed and returns correct status codes
- TypeScript compiles clean, `next build` succeeds with `/api/checkin` as Dynamic route
- Plan 02 will wire the QR scan callback in Dashboard to call this endpoint

## Self-Check: PASSED

All created files verified on disk. Both task commits verified in git history.

---
*Phase: 06-google-sheets-check-in*
*Completed: 2026-03-17*
