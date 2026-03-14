---
status: complete
phase: 04-integration-verification
source: [04-01-SUMMARY.md, 04-02-SUMMARY.md]
started: 2026-03-14T14:30:00Z
updated: 2026-03-14T14:30:00Z
vercel_url: "jumpindeploy.vercel.app"
---

# Phase 4 UAT — Re-verification Session

Targeted re-verification of 5 tests: 3 previously blocked (tests 13, 14, 17) + 2 inline fixes needing confirmation (login flash, QR overlay look).

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. Login Form No-Flash on Refresh
expected: Log in (or register), then hard-refresh the page (F5 / Cmd+R). The dashboard appears directly — no login form flash before it loads.
result: issue
reported: "the login page flashes before the appearance of the dashboard"
severity: major

### 2. QR Scanner Overlay Look
expected: Click the camera button on the dashboard. The scanner overlay opens as a full dark overlay with 'Inquadra il QR Code...' instruction text and no library UI (no device picker list, no extra buttons/dropdowns injected by the scanner library).
result: issue
reported: "The scanner overlay is unreadable (the buttons the user must press are invisible/hard to see) and is poorly scaled (it messes up the page size on a phone). The library injects a dropdown where you can choose the camera. No live feed is present from it however."
severity: major

### 3. QR Scan → Success Checkmark
expected: On mobile, with camera permission granted and a live feed showing — point the camera at any QR code. The scanner detects it, the overlay closes, and a green checkmark appears on the dashboard with Italian success text.
result: skipped
reason: blocked — no live camera feed (test 2 failing)

### 4. Timestamp After Check-In
expected: Wait ~4 seconds for the green checkmark to dismiss. After it clears, a timestamp appears below the camera button in Italian format (e.g., 'Ultimo: 14 mar, 10:30').
result: skipped
reason: blocked — depends on QR scan completing (test 3 skipped)

### 5. Persisted Timestamp on Login
expected: Log out, then log back in with demo@example.com / password123. The dashboard shows the last_checkin timestamp from the previous QR scan session (persisted in localStorage).
result: skipped
reason: blocked — depends on QR scan completing (test 3 skipped)

## Summary

total: 5
passed: 0
issues: 2
pending: 0
skipped: 3

## Gaps

- truth: "Dashboard appears directly on refresh — no login form flash"
  status: failed
  reason: "User reported: the login page flashes before the appearance of the dashboard"
  severity: major
  test: 1
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "QR scanner overlay is a clean full-screen dark overlay with no injected library UI, readable controls, and correct mobile scaling — live feed starts automatically"
  status: failed
  reason: "User reported: The scanner overlay is unreadable (the buttons the user must press are invisible/hard to see) and is poorly scaled (it messes up the page size on a phone). The library injects a dropdown where you can choose the camera. No live feed is present from it however."
  severity: major
  test: 2
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
