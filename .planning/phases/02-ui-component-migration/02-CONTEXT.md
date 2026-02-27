# Phase 2: UI Component Migration - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Port all existing UI components (LoginForm, RegisterForm, Dashboard, QR scanner overlay) into Next.js with glassmorphism styling intact. No authentication logic — components are visual-only with placeholder behavior. Phase 3 wires up actual auth and state.

</domain>

<decisions>
## Implementation Decisions

### Glassmorphism styling
- Reuse existing CSS classes from globals.css (.glass, .glass-card, etc.) — no Tailwind utility rebuild
- Visual fidelity goal: pixel-perfect match to the original Vite app (colors, blur values, spacing, shadows)
- Mesh gradient background lives in app/layout.tsx (shared behind all views, not per-page)

### File structure
- All components in a `components/` folder at project root
- One file per component: LoginForm.tsx, RegisterForm.tsx, Dashboard.tsx, QrScanner.tsx

### QR scanner behavior
- Full html5-qrcode initialization in Phase 2 — pressing the button actually requests camera permission and shows live video feed
- Close behavior: close button inside the overlay (no backdrop click)
- Only the QR scanner component is marked `'use client'` — Dashboard stays a Server Component
- When a QR code is decoded: console.log the result only (no UI feedback; actual check-in handling is Phase 3)

### School dropdown (Registration form)
- School list (Rimini schools + "Altro") extracted into a separate constants/data file (e.g., `lib/schools.ts`)
- Selecting "Altro" reveals a text input below the dropdown for custom school name entry
- Date of Birth field uses `<input type="date">` (native browser date picker)
- Submit button behavior in Phase 2: console.log all form field values (no navigation or state update)

### Claude's Discretion
- Login form Submit button behavior (Phase 2 placeholder — same pattern as Registration: console.log or no-op)
- Dashboard placeholder data (user name, last check-in timestamp — can be static strings)
- Exact animation/transition for the "Altro" text input appearance

</decisions>

<specifics>
## Specific Ideas

- No specific design references beyond "pixel-perfect match to the original Vite app"
- Mobile-first implied (QR scanner, school dropdown for Italian school registration app)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-ui-component-migration*
*Context gathered: 2026-02-27*
