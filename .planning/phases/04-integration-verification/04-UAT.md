---
status: diagnosed
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
  root_cause: "Static export bakes LoginForm into pre-rendered HTML (readSession() returns 'login' at build time); on hydration React finds real session in localStorage and updates state, but the update fires after first paint — no 'loading' state exists to suppress rendering during the hydration window"
  artifacts:
    - path: "components/AuthController.tsx"
      issue: "useState initializer calls readSession() which returns 'login' at build time, so pre-rendered HTML always contains LoginForm; no 'loading' auth state to render null during hydration"
    - path: "types.ts"
      issue: "AuthState type missing 'loading' value needed to represent undetermined state"
  missing:
    - "Add 'loading' value to AuthState type"
    - "Initialize authState to 'loading' unconditionally (remove localStorage read from initializer)"
    - "Move localStorage read into useLayoutEffect — fires before paint, sets real auth state invisibly"
    - "Render null while authState === 'loading' to suppress both LoginForm and Dashboard during hydration"
  debug_session: ".planning/debug/login-flash-on-hard-refresh.md"

- truth: "QR scanner overlay is a clean full-screen dark overlay with no injected library UI, readable controls, and correct mobile scaling — live feed starts automatically"
  status: failed
  reason: "User reported: The scanner overlay is unreadable (the buttons the user must press are invisible/hard to see) and is poorly scaled (it messes up the page size on a phone). The library injects a dropdown where you can choose the camera. No live feed is present from it however."
  severity: major
  test: 2
  root_cause: "Incomplete error keyword list silently swallows HTTP/insecure-context camera failures (primary cause of no live feed); async import/unmount race leaks camera resource; missing iOS viewport metadata causes scaling issues; zero clientWidth at start() call time; container has no min-height causing layout shifts; close button has insufficient z-index"
  artifacts:
    - path: "components/QRScanner.tsx"
      issue: ".catch() only checks 4 DOMException keywords — 'Camera streaming not supported' and insecure-context errors are silently swallowed; no live feed shown, no error message"
    - path: "components/QRScanner.tsx"
      issue: "Async import/unmount race — if component unmounts while import() is resolving, camera starts on unmounted component with no way to stop it"
    - path: "components/QRScanner.tsx"
      issue: "#qr-reader div has no min-height; video surface has unpredictable dimensions before stream arrives, causing layout shifts on mobile"
    - path: "components/QRScanner.tsx"
      issue: "Close button bg-white/10 is 90% transparent and may render below library-injected elements due to stacking context; needs z-10 or higher"
    - path: "app/layout.tsx"
      issue: "Missing viewport metadata: viewport-fit=cover, user-scalable=no, maximum-scale=1 — causes accidental zoom and unsafe area issues on iOS during scanning"
  missing:
    - "Expand .catch() error detection: add checks for 'Camera streaming not supported', 'insecure context', 'getUserMedia', plus generic fallback with Italian error message"
    - "Fix async-import/unmount race: introduce cancelled boolean flag, check before start(), set true before stop()"
    - "Add viewport export to app/layout.tsx: viewport-fit=cover, user-scalable=no, maximum-scale=1.0"
    - "Guard against zero clientWidth: check clientWidth > 0 before calling start(), defer with requestAnimationFrame if zero"
    - "Add min-h-[300px] to #qr-reader div to stabilise layout before stream arrives"
    - "Add z-10 to close button to ensure it stacks above library-injected elements"
  debug_session: ".planning/debug/qr-scanner-mobile-bugs.md"
