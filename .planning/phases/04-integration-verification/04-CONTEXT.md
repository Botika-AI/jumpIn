# Phase 4: Integration & Verification - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

End-to-end validation that the Next.js migration matches the original React+Vite version and works as a complete product. This phase does not add new features — it verifies, fixes regressions, and confirms the app is shippable.

</domain>

<decisions>
## Implementation Decisions

### HTTPS & Mobile Camera
- App is already deployed on Vercel — no deployment setup needed. Use the live Vercel URL for all HTTPS-dependent testing.
- Camera testing: use a real mobile device (any phone with a browser) scanning a real QR code (printed or displayed on another screen).
- QR scan success state must specifically show a green checkmark AND update the last_checkin timestamp display.
- Camera permission denied state must show a user-friendly error message (verify existing QrScanner error handling covers this).

### Test Strategy
- Manual walkthrough only — no E2E test code (Playwright/Cypress) to write.
- Checklist is flow-based: follows the full user journey in order (register → auto-login → dashboard → scan QR → logout → login again).
- Covers happy path + key error cases: invalid credentials error, camera denied error, school dropdown "Altro" behavior, Italian text across all views.
- Automated production build check: `npx next build` must pass as part of verification (already passes from Phase 3, but confirm).

### Deliverable & Done Criteria
- Primary deliverable: working app on Vercel URL that passes all 5 success criteria when tested manually.
- Phase 2 UAT had 1 environmental issue — re-test this on a real phone to confirm whether it's truly environmental or a code bug. If it's a real bug, fix it inline in this phase.
- Regressions found during testing get fixed inline — Phase 4 ends with a passing app, not a bug list.
- Vercel deployment has no outstanding config issues — no env vars or build settings to change.

### Claude's Discretion
- Exact structure of the manual testing checklist (as long as it's flow-based and covers all 5 success criteria)
- How to handle the school dropdown "Altro" verification (code inspection + manual check)
- Whether to do a quick visual diff of specific CSS properties or rely on manual eyeball review for glassmorphism parity

</decisions>

<specifics>
## Specific Ideas

- The Phase 2 UAT issue needs real-phone testing to distinguish environment vs code — this is a priority early in Phase 4 testing.
- All success criteria from ROADMAP.md must be checked: full flow, glassmorphism parity, school dropdown Altro behavior, camera on mobile, Italian text.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-integration-verification*
*Context gathered: 2026-03-14*
