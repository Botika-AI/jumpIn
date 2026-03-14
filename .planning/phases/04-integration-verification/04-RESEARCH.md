# Phase 4: Integration & Verification - Research

**Researched:** 2026-03-14
**Domain:** End-to-end manual verification, Next.js static export, QR scanner camera, glassmorphism CSS parity
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**HTTPS & Mobile Camera**
- App is already deployed on Vercel — no deployment setup needed. Use the live Vercel URL for all HTTPS-dependent testing.
- Camera testing: use a real mobile device (any phone with a browser) scanning a real QR code (printed or displayed on another screen).
- QR scan success state must specifically show a green checkmark AND update the last_checkin timestamp display.
- Camera permission denied state must show a user-friendly error message (verify existing QrScanner error handling covers this).

**Test Strategy**
- Manual walkthrough only — no E2E test code (Playwright/Cypress) to write.
- Checklist is flow-based: follows the full user journey in order (register → auto-login → dashboard → scan QR → logout → login again).
- Covers happy path + key error cases: invalid credentials error, camera denied error, school dropdown "Altro" behavior, Italian text across all views.
- Automated production build check: `npx next build` must pass as part of verification (already passes from Phase 3, but confirm).

**Deliverable & Done Criteria**
- Primary deliverable: working app on Vercel URL that passes all 5 success criteria when tested manually.
- Phase 2 UAT had 1 environmental issue — re-test this on a real phone to confirm whether it's truly environmental or a code bug. If it's a real bug, fix it inline in this phase.
- Regressions found during testing get fixed inline — Phase 4 ends with a passing app, not a bug list.
- Vercel deployment has no outstanding config issues — no env vars or build settings to change.

### Claude's Discretion
- Exact structure of the manual testing checklist (as long as it's flow-based and covers all 5 success criteria)
- How to handle the school dropdown "Altro" verification (code inspection + manual check)
- Whether to do a quick visual diff of specific CSS properties or rely on manual eyeball review for glassmorphism parity

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

## Summary

Phase 4 is a verification-and-fix phase, not a feature-building phase. All three preceding phases have completed successfully — the Next.js foundation, UI component migration, and mock auth/state are all in place. The codebase builds cleanly (`npx next build` passes, `npx tsc --noEmit` passes, zero TypeScript errors). The task is to walk the full user journey end-to-end, confirm it matches the original React+Vite behavior, fix any bugs found, and produce a UAT checklist document that records human sign-off.

The work breaks into two kinds of tasks: (1) code-level verification — inspect specific implementation details that cannot be fully confirmed without running the app (camera error handling, `output: 'export'` static build correctness, Vercel compat), and (2) manual testing — human walkthrough on a real phone using the live Vercel URL to exercise the complete flow.

The one known open issue from Phase 2 UAT is the `NotReadableError: Failed to allocate videosource` error. The root cause assessment was "environmental" (another app holding the camera), but it must be re-tested on mobile to close. QrScanner.tsx currently has no explicit error-message UI for camera errors — only a silent `.catch(console.error)` on the cleanup path. If the re-test surfaces a real code bug (e.g., no user-facing error on camera denial), that must be fixed inline.

**Primary recommendation:** Plan two tasks — (1) code inspection + build verification + inline fixes for any pre-flight issues, then (2) produce the flow-based UAT checklist and human walkthrough on the live Vercel URL.

---

## Standard Stack

### Core (already installed — no new dependencies needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | ^16.1.6 | App framework, `output: 'export'` static build | Project foundation |
| react | ^19.2.4 | UI runtime | Project foundation |
| html5-qrcode | ^2.3.8 | QR scanner, camera permission management | Already integrated |
| lucide-react | ^0.563.0 | Icon set used throughout all components | Already integrated |
| tailwindcss | ^3.4.17 | Utility CSS for all glassmorphism-adjacent classes | Already integrated |

No new npm packages are needed for Phase 4. This is verification work only.

### Key Configuration Facts

| Item | Value | Impact |
|------|-------|--------|
| `next.config.mjs output` | `'export'` | Static export — no server-side features, no API routes, no ISR |
| `tsconfig.json paths` | `"@/*": ["./*"]` | Aliases resolve from project root |
| `tsconfig.json jsx` | `'react-jsx'` | Correct for Next.js App Router |
| `tsconfig.json strict` | `true` | Full strict mode — type errors will not be silent |
| `package.json type` | `"module"` | ESM — config files must use ESM syntax |
| localStorage key | `'jumpin_user'` | Session persistence key used across AuthController |
| Mock login credentials | `demo@example.com` / `password123` | Hardcoded in AuthController.tsx handleLogin |

---

## Architecture Patterns

### What is Already Built and Wired

```
app/
├── layout.tsx          # Server Component — mesh-bg on body, Montserrat+Inter fonts
├── page.tsx            # Server Component — renders <AuthController />
└── globals.css         # All glassmorphism classes: .liquid-glass, .glass-input,
                        # .btn-primary-liquid, .mesh-bg, .glow-camera-liquid

components/
├── AuthController.tsx  # 'use client' — owns all auth state + view transitions
├── LoginForm.tsx       # 'use client' — LoginFormProps: onLogin/isLoading/onNavigateRegister
├── RegisterForm.tsx    # 'use client' — RegisterFormProps: onRegister/isLoading/onNavigateLogin
├── Dashboard.tsx       # 'use client' — DashboardProps: user/onLogout/onCheckIn
└── QRScanner.tsx       # 'use client' — QrScannerProps: onScan/onClose

lib/
└── schools.ts          # RIMINI_SCHOOLS array (8 entries, last entry value='altro')

types.ts                # UserProfile, AuthState, SchoolOption
```

### Data Flow for Full User Journey

```
localStorage('jumpin_user')
        ↕ read on mount / write on login/register/checkin / delete on logout
AuthController (owns: authState, user, isLoading, hydrated)
    │
    ├── authState === 'login'     → <LoginForm onLogin={handleLogin} ... />
    ├── authState === 'register'  → <RegisterForm onRegister={handleRegister} ... />
    └── authState === 'dashboard' → <Dashboard user={user} onLogout={handleLogout} onCheckIn={handleCheckIn} />
                                        └── {showScanner && <QrScanner onScan={handleScan} onClose={...} />}
```

### Key Implementation Details for Verification

**AuthController hydration guard**
- Returns `null` until `hydrated === true` (set in `useEffect` finally block)
- Prevents login form flash when user refreshes while already on dashboard
- Verified correct in Phase 3

**QR scan success flow**
- `handleScan` in Dashboard.tsx: sets `success=true`, calls `onCheckIn()`, clears success after 4000ms
- `onCheckIn` in AuthController.tsx: creates `updatedUser` with `last_checkin: new Date().toISOString()`, updates state and localStorage
- `user.last_checkin` flows back down as prop — Dashboard reads it directly, no local copy
- The timestamp display (`Ultimo: ...`) appears when `user.last_checkin && !success`

**Altro school dropdown**
- `RIMINI_SCHOOLS[7]` is `{ value: 'altro', label: 'Altro (Specifica)' }`
- `RegisterForm.tsx` line 101: `{school === 'altro' && (` renders custom input
- When submitting: `school === 'altro' ? customSchool : school` — custom text goes to profile

**Camera permission denied**
- `QrScanner.tsx` has NO user-facing error state for camera denial or hardware errors
- The only error handler is the silent `() => {}` in `scanner.render(onSuccess, onError)` — this ignores per-frame failures (normal), but it also means hardware errors surface as nothing
- The cleanup path uses `.catch(console.error)` — not shown to user
- **This is the most likely code-level gap to fix in Phase 4** (not just environmental)

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| QR scanning | Custom camera+decode logic | html5-qrcode (already installed) | Handles camera stream lifecycle, decode errors, iOS/Android quirks |
| Session persistence | Custom cookie manager | localStorage with `jumpin_user` key (already in place) | Simple, sufficient for mock auth scope |
| Build validation | Custom TypeScript checker | `npx tsc --noEmit` + `npx next build` | Standard, already confirmed passing in Phase 3 |
| UAT document | Automated test runner | Flow-based manual checklist (per locked decision) | Camera/visual UI cannot be automated |

---

## Common Pitfalls

### Pitfall 1: Camera Error Is Code, Not Environment
**What goes wrong:** Phase 2 UAT test 9 failed with `NotReadableError: Failed to allocate videosource`. The documented root cause was "environmental" (another app holding the camera).
**Why it may be more:** `QrScanner.tsx` has no user-facing error message for camera failures. If tested on mobile where no other app holds the camera and it still fails, there is no error UI — the overlay just hangs showing "Inquadra il QR Code..." with no feedback.
**How to avoid:** Re-test on mobile first (with all other apps closed). If it works: environmental confirmed. If it fails silently: a user-facing error message needs adding to QrScanner.
**Warning signs:** Silent scanner overlay (no live feed, no error text) = code gap, not environment.

### Pitfall 2: output: 'export' Constraints
**What goes wrong:** The app uses `output: 'export'` in next.config.mjs. This generates a fully static site (no Node.js server). If any code accidentally uses server-only features (API routes, `cookies()`, `headers()`, dynamic segments), the build will fail.
**Current status:** All components are client components or server components with no server-only APIs. `npx next build` passed after Phase 3. Just confirm it still passes in Phase 4.
**How to avoid:** Run `npx next build` early in the phase before manual testing. Fix any TypeScript or build errors before starting browser walkthrough.

### Pitfall 3: Vercel Static Export Routing
**What goes wrong:** With `output: 'export'`, Next.js generates an `out/` directory. Vercel must be configured to serve the static output directory. If the Vercel project was created from this repo, it should auto-detect Next.js. If any 404 errors occur on the live URL, it may be a Vercel build config issue, not app code.
**How to avoid:** Confirm the live Vercel URL loads correctly as the first step. If it 404s, check Vercel dashboard for build output directory settings.

### Pitfall 4: last_checkin Display Only Visible After Scan
**What goes wrong:** The timestamp display in Dashboard.tsx renders conditionally: `{user.last_checkin && !success}`. After a scan, `success=true` hides both the camera button AND the timestamp (to show the green checkmark). After 4000ms success resets to false, and the timestamp appears. Testers who look for the timestamp during the success animation will not see it.
**How to avoid:** Include explicit note in UAT checklist: "wait for green checkmark to dismiss (~4 seconds), then confirm timestamp appears below the camera button."

### Pitfall 5: Registration Uses Any QR for Check-In
**What goes wrong:** `handleScan` in Dashboard.tsx calls `onCheckIn()` on ANY decoded QR text. This is by design (per STATE.md: "Any QR triggers check-in: QR content validation deferred to future iteration"). But testers may expect only a specific JumpIn QR to work.
**How to avoid:** Note in UAT checklist that any QR code triggers a successful check-in — this is expected behavior for v1.

### Pitfall 6: HTML lang="en" in layout.tsx
**What goes wrong:** `layout.tsx` sets `<html lang="en">`. The app is entirely in Italian. While this is not a functional bug, browser spell-check and accessibility tools will use English language rules. It's a minor polish issue.
**Impact:** Low — no functionality breaks. Worth noting as a potential inline fix: change `lang="en"` to `lang="it"`.
**How to avoid:** Inspect layout.tsx during code review task and fix as part of inline fixes.

---

## Code Examples

Verified patterns from code inspection:

### QrScanner Error Handling — Current State (Gap)
```typescript
// Source: components/QRScanner.tsx (current code — Phase 3 final state)
// The render callback's error handler ignores ALL errors:
scannerRef.current.render(
  (decodedText) => {
    onScanRef.current(decodedText);
    scannerRef.current?.clear();
  },
  () => {
    // Ignore per-frame errors (no QR in frame)  ← also ignores hardware errors
  }
);
// Cleanup:
return () => {
  scannerRef.current?.clear().catch(console.error);  ← not shown to user
};
```

If camera is denied or hardware fails, html5-qrcode fires the error callback with an error object. Currently this is silently swallowed. A minimal fix pattern:

```typescript
// Minimal camera error display pattern (if fix is needed)
const [cameraError, setCameraError] = useState<string | null>(null);

scannerRef.current.render(
  (decodedText) => { onScanRef.current(decodedText); scannerRef.current?.clear(); },
  (errorMsg) => {
    // Per-frame errors are strings like "QR code not found" — ignore those
    // Real errors are objects with name like "NotReadableError"
    if (typeof errorMsg !== 'string' && errorMsg?.name) {
      setCameraError('Impossibile accedere alla fotocamera. Verifica i permessi.');
    }
  }
);
```

### AuthController — Demo Credentials Reference
```typescript
// Source: components/AuthController.tsx
// Mock login hardcoded credentials:
if (email === 'demo@example.com' && password === 'password123') {
  // ...creates mock user
} else {
  onError('Credenziali non valide. Usa demo@example.com / password123');
}
// Italian error message IS shown — this is correct
```

### Dashboard — last_checkin Flow
```typescript
// Source: components/Dashboard.tsx
// Timestamp only visible when: user has checked in AND success animation is not showing
{user.last_checkin && !success && (
  <div className="...">
    <Clock size={16} />
    <span>
      Ultimo:{' '}
      {new Date(user.last_checkin).toLocaleString('it-IT', {
        hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short',
      })}
    </span>
  </div>
)}
```

---

## What Needs Verification (Cross-phase Requirements Map)

This phase validates all v1 requirements. Here is the current status and what needs re-confirming:

| Req ID | Description | Prior Status | Phase 4 Check |
|--------|-------------|--------------|---------------|
| MIG-01 | Next.js App Router scaffolded with TypeScript | Phase 1 Complete | Confirm `npx next build` still passes |
| MIG-02 | Glassmorphism CSS ported (mesh, glass, inputs) | Phase 2 Complete | Manual eyeball on Vercel URL |
| MIG-03 | Tailwind via package (not CDN) | Phase 1 Complete | Build confirms — no CDN warnings |
| MIG-04 | Google Fonts via next/font/google | Phase 1 Complete | Visual font check on Vercel URL |
| UI-01 | Login form with glassmorphism | Phase 2 Complete | Manual check on Vercel |
| UI-02 | Registration form all fields | Phase 2 Complete | Manual walkthrough |
| UI-03 | School dropdown + Altro logic | Phase 2 Complete | Code inspect + manual |
| UI-04 | Dashboard profile card | Phase 2 Complete | Manual check on Vercel |
| UI-05 | QR scanner camera overlay | Phase 2 Complete | **Mobile re-test required** |
| UI-06 | Check-in success feedback (green checkmark) | Phase 2 Complete | Mobile scan walkthrough |
| AUTH-01 | Mock login validates + transitions to dashboard | Phase 3 Complete | Full flow walkthrough |
| AUTH-02 | Registration creates profile + auto-login | Phase 3 Complete | Full flow walkthrough |
| AUTH-03 | Session persists across browser refresh | Phase 3 Complete | Refresh test in walkthrough |
| AUTH-04 | Logout clears session + returns to login | Phase 3 Complete | Logout step in walkthrough |
| AUTH-05 | QR scan updates last_checkin in localStorage | Phase 3 Complete | Timestamp display check post-scan |
| INF-01 | next.config.mjs (not vite.config.ts) | Phase 1 Complete | File exists, confirmed |
| INF-02 | @/* path aliases configured | Phase 1 Complete | Build passes = aliases work |
| INF-03 | `next build` succeeds | Phase 1 Complete | Re-run in Phase 4 to confirm |
| INF-04 | `next dev` runs | Phase 1 Complete | Run locally as pre-flight |
| INF-05 | App Router conventions (app/ directory) | Phase 1 Complete | Structural check |

**Highest risk items for Phase 4:**
1. Camera permission error handling (UI-05) — QrScanner has no user-facing error state
2. `output: 'export'` Vercel deployment — confirm live URL serves correctly
3. `lang="en"` in layout.tsx — minor but worth an inline fix

---

## Phase 4 Plan Shape (Recommendation for Planner)

Phase 4 should be two tasks in sequence:

**Task 1 — Pre-flight: Code inspection + build verification + inline fixes**
- Run `npx next build` locally (confirm still passes)
- Run `npx tsc --noEmit` (confirm zero errors)
- Inspect QrScanner.tsx for camera error handling gap — add user-facing error message if absent
- Inspect layout.tsx for `lang="en"` — fix to `lang="it"`
- Confirm no remaining `console.log` placeholders in production code paths
- Commit any fixes

**Task 2 — UAT Checklist: Write + human walkthrough**
- Produce `04-UAT.md` as a flow-based checklist (register → dashboard → scan → logout → login)
- Include all 5 success criteria as verifiable checklist items
- Include mobile camera test with explicit note about Phase 2 environmental issue
- Include error-case tests: invalid login, camera denied
- Human tester signs off by running through the checklist against the live Vercel URL

This two-task structure keeps the automated code work (Task 1) separate from the human verification document (Task 2), allowing Task 1 to be executed and committed by Claude, and Task 2 to produce a document for human sign-off.

---

## Open Questions

1. **Live Vercel URL**
   - What we know: CONTEXT.md states "app is already deployed on Vercel"
   - What's unclear: The actual URL is not recorded in any planning document
   - Recommendation: The planner/executor should include a step to verify the Vercel URL is known and accessible before starting the UAT checklist task. It may be in the Vercel dashboard or README.

2. **Camera error behavior on mobile**
   - What we know: Phase 2 UAT test 9 failed with `NotReadableError`. Root cause was called "environmental".
   - What's unclear: Whether QrScanner.tsx shows any user-facing error when permission is denied vs. hardware not available.
   - Recommendation: Code inspection in Task 1 should explicitly check for and fix this before mobile testing in Task 2.

3. **tailwindcss-animate plugin**
   - What we know: `animate-in slide-in-from-top-2` classes are used (RegisterForm conditional Altro input). Phase 2 verification notes: "if the plugin is absent the slide animation is visual-only fallback."
   - What's unclear: Whether the tailwindcss-animate plugin is actually configured in tailwind.config.js
   - Recommendation: Inspect tailwind.config.js for the `tailwindcss-animate` plugin entry in Task 1. If absent, the animation degrades silently — functionality is not broken, just the slide-in animation.

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection of all components (AuthController.tsx, Dashboard.tsx, QrScanner.tsx, LoginForm.tsx, RegisterForm.tsx, layout.tsx, globals.css, lib/schools.ts, types.ts)
- Phase summaries: 02-UAT.md, 02-VERIFICATION.md, 03-01-SUMMARY.md, 03-02-SUMMARY.md
- Planning documents: REQUIREMENTS.md, ROADMAP.md, STATE.md, 04-CONTEXT.md
- package.json (dependency versions confirmed)
- next.config.mjs, tsconfig.json (configuration confirmed)

### Secondary (MEDIUM confidence)
- html5-qrcode error callback behavior: inferred from library API (render second argument receives per-frame errors as strings and hardware errors as Error objects) — consistent with Phase 2 UAT report

### Tertiary (LOW confidence)
- None — all findings are based on direct code inspection of the current codebase

---

## Metadata

**Confidence breakdown:**
- Current codebase state: HIGH — read directly from source files
- What needs fixing (camera error UI): HIGH — gap confirmed by code inspection
- Build/TypeScript status: HIGH — Phase 3 summary documents clean build
- UAT checklist structure: HIGH — 5 success criteria are explicit in ROADMAP.md
- Vercel deployment status: MEDIUM — CONTEXT.md states it exists, URL not verified

**Research date:** 2026-03-14
**Valid until:** 2026-03-28 (stable codebase, 14-day window appropriate)
