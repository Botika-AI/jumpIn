---
status: complete
phase: 04-integration-verification
source: [04-01-SUMMARY.md]
started: 2026-03-14T11:17:44Z
updated: 2026-03-14T12:00:00Z
vercel_url: "jumpindeploy.vercel.app"
---

# Phase 4 UAT — JumpIn QR Check-In App

Flow-based user acceptance test for the complete v1 application on the live Vercel deployment.

## Pre-Flight (confirmed in Plan 01)

- [x] `npx next build` passes (static export generated, 2 routes)
- [x] `npx tsc --noEmit` passes (zero TypeScript errors)
- [x] `lang="it"` set on `<html>` element in `app/layout.tsx`
- [x] Camera error handling added to `components/QRScanner.tsx` (`cameraError` state, Italian error message)

All pre-flight checks passed in Plan 01. Proceed directly to browser testing.

---

## Flow 1 — Registration and Auto-Login

### Test 1
description: "Open the Vercel URL on a desktop browser. The page shows the login form with glassmorphism card and mesh gradient background. Italian text visible."
result: "pass"

### Test 2
description: "Click 'Crea un account' to navigate to the registration form. All 6 fields render: Nome, Cognome, Email, Scuola (dropdown), Data di Nascita, Password."
result: "pass"

### Test 3
description: "Open the Scuola dropdown. Scroll to the bottom — 'Altro (Specifica)' is present. Select it. A custom text input appears below the dropdown."
result: "pass"

### Test 4
description: "Select a regular school (not Altro) from the dropdown. The custom text input disappears."
result: "pass"

### Test 5
description: "Fill all fields with test data. Submit the form. The dashboard view appears immediately with the registered user's profile data (name, school, email visible in the profile card)."
result: "pass"

---

## Flow 2 — Dashboard and Session Persistence

### Test 6
description: "On the dashboard, the glassmorphism profile card shows initials avatar, full name, school, and email. All text is in Italian labels."
result: "pass"

### Test 7
description: "Refresh the browser page (F5 / Cmd+R). The dashboard view remains — the user is still logged in. The login form does NOT flash before the dashboard appears."
result: "fixed inline — useIsomorphicLayoutEffect replaces useEffect for localStorage read; fires before browser paint, preventing login form flash"

---

## Flow 3 — QR Check-In (desktop simulation)

### Test 8
description: "Click the camera button on the dashboard. The QR scanner overlay opens — full dark overlay with 'Inquadra il QR Code...' instruction text."
result: "fixed inline — Html5Qrcode direct API replaces Html5QrcodeScanner; library no longer injects its own UI with buttons and dropdowns"

### Test 9
description: "On desktop: deny camera permission when prompted (if prompted). The scanner overlay should show an Italian error message ('Impossibile accedere alla fotocamera. Verifica i permessi del browser.') instead of a silent hang. NOTE: This tests the Plan 01 camera error fix."
result: "fixed inline — string error keyword detection; error handler now inspects string messages for NotAllowedError/NotReadableError/etc. instead of checking for Error object .name property"

### Test 10
description: "Close the scanner overlay (X button). Return to normal dashboard view."
result: "pass"

---

## Flow 4 — QR Check-In (mobile — REQUIRED)

> NOTE: Use a REAL MOBILE DEVICE (phone browser, not desktop). HTTPS is provided by the Vercel URL. Close all other apps that might hold the camera (Teams, Zoom, camera app, etc.) before starting.

### Test 11
description: "Open the Vercel URL on a real mobile device. NOTE: Close all other camera-using apps first. HTTPS is already provided by the Vercel URL."
result: "pass"

### Test 12
description: "Navigate to the dashboard (register or login with demo@example.com / password123). Click the camera button. The browser requests camera permission. GRANT permission. A live camera feed appears inside the scanner overlay. NOTE: Re-test of Phase 2 UAT test 9 which previously failed with NotReadableError. If live feed appears, Phase 2 issue was environmental. If error message appears, cameraError fix is working."
result: "fixed inline — facingMode: { ideal: 'environment' } auto-selects back camera; Html5QrcodeScanner was showing a device picker list (Facing front:3, Facing front:1, Facing back:2, Facing back:0) instead of a live feed"

### Test 13
description: "Point the phone camera at any QR code (printed, or displayed on another screen). The scanner detects it. The overlay closes and a green checkmark appears on the dashboard with Italian success text."
result: "needs re-verification on next deploy — could not test during UAT due to test 12 issue; fix applied, re-test required"

### Test 14
description: "Wait approximately 4 seconds for the green checkmark to dismiss. After it clears, a timestamp appears below the camera button showing the check-in time in Italian format (e.g., 'Ultimo: 14 mar, 10:30')."
result: "needs re-verification on next deploy — could not test during UAT due to test 12 issue; fix applied, re-test required"

---

## Flow 5 — Logout and Login

### Test 15
description: "Click the logout button on the dashboard. The login form appears. The dashboard is no longer visible."
result: "pass"

### Test 16
description: "Enter incorrect credentials (e.g., wrong@email.com / wrongpass). Submit. An Italian error message appears: 'Credenziali non valide. Usa demo@example.com / password123'"
result: "pass"

### Test 17
description: "Enter demo@example.com and password123. Submit. The dashboard view appears. The last_checkin timestamp from the previous session is still visible (persisted in localStorage from the earlier QR scan)."
result: "needs re-verification on next deploy — could not test during UAT due to test 12 issue; depends on QR scan completing first"

---

## Visual Parity

### Test 18
description: "All views (login, register, dashboard, scanner overlay) show the purple/blue animated mesh gradient as the page background."
result: "pass"

### Test 19
description: "Form cards and the dashboard profile card appear as frosted glass (translucent, slightly blurred, with subtle border) against the gradient."
result: "pass"

### Test 20
description: "Form inputs appear as glass-styled inputs (not plain white browser defaults)."
result: "pass"

### Test 21
description: "The submit/primary buttons use the amber/orange color scheme."
result: "pass"

---

## Summary

total: 21
passed: 14
issues: 4 (all fixed inline)
pending: 0
skipped: 0
needs-reverification: 3 (tests 13, 14, 17 — blocked by test 12 during UAT; fix applied)

---

## Gaps

- Tests 7, 8, 9, 12 found issues during UAT — all fixed inline in commit 363957c (fix(04-02))
- Tests 13, 14, 17 could not be executed during UAT because test 12 was failing (camera picker shown instead of live feed). Root cause fixed. These tests need re-verification on the next Vercel deploy.
- Core app flow (registration, auto-login, dashboard, session persistence, logout, login, visual parity) is fully verified and passing.

---

## Tester Notes
The app is currently deployed on https://www.jumpindeploy.vercel.app, however it is a temporary address and will change in the future.
