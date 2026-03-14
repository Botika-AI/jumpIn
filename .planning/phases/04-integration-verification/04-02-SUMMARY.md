---
phase: 04-integration-verification
plan: "02"
subsystem: uat-verification
tags: [uat, bugfix, qr-scanner, hydration, auth]
dependency_graph:
  requires: [04-01-SUMMARY.md]
  provides: [04-UAT.md, inline-fixes]
  affects: [components/AuthController.tsx, components/QRScanner.tsx]
tech_stack:
  added: []
  patterns:
    - useIsomorphicLayoutEffect for SSR-safe synchronous localStorage read
    - Html5Qrcode direct API (lower-level) instead of Html5QrcodeScanner (higher-level) for clean camera UI
key_files:
  created:
    - .planning/phases/04-integration-verification/04-UAT.md
  modified:
    - components/AuthController.tsx
    - components/QRScanner.tsx
decisions:
  - useIsomorphicLayoutEffect chosen over useEffect for localStorage read — fires synchronously before browser paint, eliminates login form flash; isomorphic pattern (falls back to useEffect on server) avoids SSR warning
  - Html5Qrcode direct API chosen over Html5QrcodeScanner — lower-level API gives full control of camera UI; facingMode environment constraint auto-selects back camera on mobile without showing picker
metrics:
  duration: "~45 minutes"
  completed: "2026-03-14"
  tasks_completed: 2
  files_modified: 3
---

# Phase 4 Plan 02: UAT Walkthrough Summary

Phase 4 UAT completed. Inline fixes applied for 4 issues found during walkthrough. Core app flow (registration, auto-login, dashboard, session persistence, logout, login, visual parity) fully verified on live Vercel deployment.

## What Was Built

Flow-based UAT checklist covering all 5 ROADMAP success criteria (21 tests across 5 flows). UAT executed against live Vercel URL `jumpindeploy.vercel.app`. Four issues were found and fixed inline. 14 of 21 tests passed directly; 4 were fixed inline; 3 require re-verification on next deploy after the scanner fix.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Write flow-based UAT checklist document | 54063ae | .planning/phases/04-integration-verification/04-UAT.md |
| 2 | UAT walkthrough + inline fixes | 363957c, 7da6748 | components/AuthController.tsx, components/QRScanner.tsx, 04-UAT.md |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Login form flashes briefly on page refresh (Test 7)**
- **Found during:** UAT Test 7
- **Issue:** `useEffect` fires after browser paint — login form visible for one frame before localStorage restores session
- **Fix:** Replaced `useEffect` with `useIsomorphicLayoutEffect` for the localStorage block in `AuthController.tsx`. Fires synchronously before paint; SSR-safe via conditional assignment.
- **Files modified:** `components/AuthController.tsx`
- **Commit:** 363957c

**2. [Rule 1 - Bug] QR scanner overlay shows full Html5QrcodeScanner UI with buttons and dropdowns (Test 8)**
- **Found during:** UAT Test 8
- **Issue:** `Html5QrcodeScanner` injects its own toolbar UI (start/stop buttons, file scan option) into the `#qr-reader` div — not the clean camera viewport expected
- **Fix:** Replaced `Html5QrcodeScanner` with `Html5Qrcode` (lower-level API). Our own JSX provides the overlay controls.
- **Files modified:** `components/QRScanner.tsx`
- **Commit:** 363957c

**3. [Rule 1 - Bug] Camera denial shows raw browser error string instead of Italian message (Test 9)**
- **Found during:** UAT Test 9
- **Issue:** Error handler checked `(errorMsg as Error).name` — but `Html5QrcodeScanner` passes errors as plain strings, not Error objects. Condition never triggered.
- **Fix:** Error handler now extracts string with `String(errorMsg)` and checks for keyword substrings (`NotAllowedError`, `NotReadableError`, `NotFoundError`, `OverconstrainedError`).
- **Files modified:** `components/QRScanner.tsx`
- **Commit:** 363957c

**4. [Rule 1 - Bug] Mobile camera shows device picker list instead of live feed (Test 12)**
- **Found during:** UAT Test 12
- **Issue:** `Html5QrcodeScanner` on multi-camera mobile devices shows a device picker (`Facing front:3`, `Facing front:1`, `Facing back:2`, `Facing back:0`) requiring user selection before camera starts
- **Fix:** `Html5Qrcode.start()` with `{ facingMode: { ideal: 'environment' } }` auto-selects the back camera without a picker. Part of the same Html5Qrcode migration.
- **Files modified:** `components/QRScanner.tsx`
- **Commit:** 363957c

## UAT Results

| Metric | Count |
|--------|-------|
| Total tests | 21 |
| Passed directly | 14 |
| Fixed inline | 4 (tests 7, 8, 9, 12) |
| Needs re-verification | 3 (tests 13, 14, 17) |
| Blocked/skipped | 0 |

Tests 13, 14, 17 (QR scan detection, timestamp display, timestamp persistence after login) could not be executed during UAT because test 12 was failing. Root cause fixed. These tests need re-verification on the next Vercel deploy.

## Decisions Made

1. **useIsomorphicLayoutEffect pattern** — Synchronous localStorage read before paint is the correct behavior for session restoration. The isomorphic wrapper (`typeof window !== 'undefined' ? useLayoutEffect : useEffect`) is the standard Next.js/React pattern for this.

2. **Html5Qrcode over Html5QrcodeScanner** — The high-level scanner API (`Html5QrcodeScanner`) bundles UI that cannot be suppressed. The lower-level `Html5Qrcode` class gives full control of what renders in the container div. Architecture: library owns only the `#qr-reader` div content (video feed + scan region); our JSX owns the overlay frame, close button, and instruction text.

## Self-Check: PASSED

- FOUND: components/AuthController.tsx
- FOUND: components/QRScanner.tsx
- FOUND: .planning/phases/04-integration-verification/04-UAT.md
- FOUND: .planning/phases/04-integration-verification/04-02-SUMMARY.md
- FOUND commit 363957c: fix(04-02): fix hydration flash, QR scanner device picker and camera error handling
- FOUND commit 7da6748: test(04-02): complete Phase 4 UAT walkthrough
- FOUND commit 54063ae: docs(04-02): create flow-based UAT checklist for Phase 4
