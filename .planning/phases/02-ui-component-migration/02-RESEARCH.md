# Phase 2: UI Component Migration - Research

**Researched:** 2026-02-27
**Domain:** Next.js App Router UI components, glassmorphism CSS, html5-qrcode, React Server/Client component boundaries
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Glassmorphism styling:**
- Reuse existing CSS classes from globals.css (.glass, .glass-card, etc.) — no Tailwind utility rebuild
- Visual fidelity goal: pixel-perfect match to the original Vite app (colors, blur values, spacing, shadows)
- Mesh gradient background lives in app/layout.tsx (shared behind all views, not per-page)

**File structure:**
- All components in a `components/` folder at project root
- One file per component: LoginForm.tsx, RegisterForm.tsx, Dashboard.tsx, QrScanner.tsx

**QR scanner behavior:**
- Full html5-qrcode initialization in Phase 2 — pressing the button actually requests camera permission and shows live video feed
- Close behavior: close button inside the overlay (no backdrop click)
- Only the QR scanner component is marked `'use client'` — Dashboard stays a Server Component
- When a QR code is decoded: console.log the result only (no UI feedback; actual check-in handling is Phase 3)

**School dropdown (Registration form):**
- School list (Rimini schools + "Altro") extracted into a separate constants/data file (e.g., `lib/schools.ts`)
- Selecting "Altro" reveals a text input below the dropdown for custom school name entry
- Date of Birth field uses `<input type="date">` (native browser date picker)
- Submit button behavior in Phase 2: console.log all form field values (no navigation or state update)

### Claude's Discretion

- Login form Submit button behavior (Phase 2 placeholder — same pattern as Registration: console.log or no-op)
- Dashboard placeholder data (user name, last check-in timestamp — can be static strings)
- Exact animation/transition for the "Altro" text input appearance

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MIG-02 | Existing glassmorphism CSS and styles ported to Next.js (mesh background, glass cards, glass inputs) | Already satisfied in Phase 1 — globals.css has all classes. Phase 2 uses them in components. |
| UI-01 | Login form renders with email/password inputs and glassmorphism styling | LoginForm.tsx uses glass-input, liquid-glass, btn-primary-liquid from globals.css |
| UI-02 | Registration form renders with all fields (name, surname, email, school dropdown, DOB, password) | RegisterForm.tsx extracts all fields from App.tsx register view |
| UI-03 | School dropdown includes Rimini schools list with "Altro" + custom input logic | lib/schools.ts with SchoolOption type; useState for conditional custom input |
| UI-04 | Dashboard displays user profile card (read-only) with glassmorphism styling | Dashboard.tsx as Server Component using static placeholder data |
| UI-05 | QR scanner opens camera overlay and scans QR codes via html5-qrcode | QrScanner.tsx as 'use client', Html5QrcodeScanner in useEffect |
| UI-06 | Check-in success feedback displays (green checkmark / animation) | Success state within Dashboard or QrScanner using existing Tailwind animate-in classes |
</phase_requirements>

---

## Summary

Phase 2 is a component extraction and wiring task. The original Vite app (`App.tsx`) contains all UI inline in a single monolithic component with interleaved auth logic. The goal is to extract each view into a standalone Next.js component file in `components/`, connecting them to the existing glassmorphism CSS system that was established in Phase 1.

The critical technical challenge is the Next.js App Router Server/Client component boundary. `html5-qrcode` manipulates the DOM directly via `useEffect`, which requires `'use client'`. The user decision is that ONLY `QrScanner.tsx` carries this directive — Dashboard, LoginForm, and RegisterForm stay as Server Components (or default to server rendering). However, LoginForm and RegisterForm require React `useState` for form field management and "Altro" conditional logic, which means they too will need `'use client'`. This is the primary tension to resolve in planning.

A second important finding: `tailwind.config.js` currently only scans `./app/**/*`, but Phase 2 creates components in `components/` at the project root. The content paths MUST be extended to include `'./components/**/*.{js,ts,jsx,tsx}'` or Tailwind will not generate styles for any classes used in the new components. Similarly, `lib/schools.ts` does not exist yet and must be created.

**Primary recommendation:** Extract LoginForm, RegisterForm, Dashboard, and QrScanner from App.tsx into `components/`; add `'use client'` to the three interactive forms plus QrScanner; update tailwind.config.js content paths; create `lib/schools.ts`; add mesh-bg to app/layout.tsx body.

---

## Standard Stack

### Core (already installed — no new installs needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | ^16.1.6 | App Router, Server/Client component boundary | Phase 1 foundation |
| react | ^19.2.4 | Component model | Phase 1 foundation |
| html5-qrcode | ^2.3.8 | Camera access + QR decoding overlay | Already in package.json, node_modules present |
| lucide-react | ^0.563.0 | Icons (Camera, LogOut, CheckCircle, User, Mail, MapPin, etc.) | Already in package.json |
| tailwindcss | ^3.4.17 | Utility classes on top of custom CSS | Phase 1 foundation |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| typescript types (React) | ^19 | Type safety for component props | All components |

### Alternatives Considered

None — all stack decisions are locked from Phase 1.

**Installation:** No new packages needed. All dependencies are present.

---

## Architecture Patterns

### Recommended Project Structure

```
components/
├── LoginForm.tsx       # 'use client' — email/password fields, form state
├── RegisterForm.tsx    # 'use client' — multi-field form, school dropdown, "Altro" logic
├── Dashboard.tsx       # 'use client' — needs useState for showScanner; can simplify to Server if scanner extracted cleanly
└── QrScanner.tsx       # 'use client' — html5-qrcode DOM manipulation

lib/
└── schools.ts          # RIMINI_SCHOOLS constant + SchoolOption type (extracted from constants.ts)

app/
├── layout.tsx          # Add mesh-bg class to body; background shared across all pages
├── page.tsx            # Replace test content with LoginForm (Phase 2 entry point)
└── globals.css         # Unchanged — all glassmorphism classes already present
```

### Pattern 1: 'use client' Directive Placement

**What:** In Next.js App Router, any component using `useState`, `useEffect`, event handlers, or browser APIs must be a Client Component via `'use client'` at the top of the file.

**When to use:** Always for QrScanner (useEffect + DOM). Required for LoginForm and RegisterForm (useState for form fields). Dashboard requires it if it holds `showScanner` state — but per user decision it should stay a Server Component. The resolution: Dashboard renders QrScanner as a child, but the `showScanner` toggle state must live somewhere. Either Dashboard becomes `'use client'`, OR a thin client wrapper holds the scanner state and Dashboard remains a Server Component.

**Practical resolution for planning:** Mark Dashboard as `'use client'` since it uses `useState` for `showScanner` and `success` in the original code. The user's intent ("Dashboard stays a Server Component") may conflict with the need for interactive state — planner should note this tension and default to `'use client'` for Dashboard to avoid a blocking implementation issue.

**Example — correct directive placement:**
```typescript
// components/QrScanner.tsx
'use client';

import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

// ...
```

```typescript
// components/LoginForm.tsx
'use client';

import { useState } from 'react';
// ...
```

### Pattern 2: Tailwind Content Paths — MUST Update

**What:** `tailwind.config.js` currently only scans `./app/**/*`. New components in `components/` and data in `lib/` will use Tailwind classes, but those classes will be purged from the CSS bundle unless the content array is extended.

**When to use:** Before writing any component code.

**Example:**
```javascript
// tailwind.config.js — updated content array
export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx}',  // ADD THIS
    './lib/**/*.{js,ts,jsx,tsx}',          // ADD THIS if lib files use Tailwind classes
  ],
  // ...
}
```

### Pattern 3: Mesh Background in layout.tsx

**What:** The mesh-bg class must be applied to the body element in `app/layout.tsx` so it sits behind all pages. Currently layout.tsx only applies `font-inter` to the body.

**Example:**
```typescript
// app/layout.tsx — updated body
<body className={`font-inter mesh-bg min-h-screen`}>
  {children}
</body>
```

Note: `background-attachment: fixed` in `.mesh-bg` ensures the gradient does not scroll with content.

### Pattern 4: html5-qrcode in Next.js (useEffect only)

**What:** `Html5QrcodeScanner` calls `document.getElementById()` internally. It must only be instantiated inside `useEffect` (client-side only). The scanner attaches to a DOM element by ID — that element must be rendered before `useEffect` fires.

**When to use:** QrScanner component exclusively.

**Example (from existing components/QRScanner.tsx — already correct pattern):**
```typescript
'use client';

import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const QrScanner = ({ onScan, onClose }: { onScan: (text: string) => void; onClose: () => void }) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    scannerRef.current = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );
    scannerRef.current.render(
      (decodedText) => {
        console.log('QR decoded:', decodedText);
        onScan(decodedText);
        scannerRef.current?.clear();
      },
      (_error) => { /* ignore frame errors */ }
    );

    return () => {
      scannerRef.current?.clear().catch(console.error);
    };
  }, []); // empty deps — initialize once on mount

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
      <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
        {/* X icon */}
      </button>
      <div className="w-full max-w-lg overflow-hidden rounded-2xl liquid-glass">
        <div id="qr-reader" className="w-full" />
      </div>
    </div>
  );
};
```

**Warning:** `onScan` in the `useEffect` dependency array would cause scanner re-initialization on every render. Keep the dep array empty `[]` and access `onScan` via a stable ref if needed.

### Pattern 5: "Altro" School Conditional Input

**What:** A dropdown value triggers a secondary input to appear. This is a controlled form pattern using `useState`.

**Example (from existing App.tsx — already correct pattern):**
```typescript
const [school, setSchool] = useState(RIMINI_SCHOOLS[0].value);
const [customSchool, setCustomSchool] = useState('');

// In JSX:
{school === 'altro' && (
  <div className="animate-in slide-in-from-top-2">
    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 ml-1">
      Specifica Scuola
    </label>
    <input
      type="text"
      required
      className="w-full px-4 py-3 rounded-2xl glass-input text-sm"
      value={customSchool}
      onChange={(e) => setCustomSchool(e.target.value)}
    />
  </div>
)}
```

Note: `animate-in slide-in-from-top-2` uses the `tailwindcss-animate` plugin pattern — verify this class is available in the current Tailwind config (it comes from `tailwind-merge` or `tw-animate-css`). The class was used in the original App.tsx and appears to work, suggesting it is configured or Tailwind's JIT includes it from a plugin. Check at implementation time.

### Pattern 6: lib/schools.ts Structure

**What:** Extract school data from `constants.ts` into `lib/schools.ts` per the user's locked decision.

**Example:**
```typescript
// lib/schools.ts
export interface SchoolOption {
  value: string;
  label: string;
}

export const RIMINI_SCHOOLS: SchoolOption[] = [
  { value: 'Liceo Scientifico A. Einstein', label: 'Liceo Scientifico A. Einstein' },
  { value: 'Liceo Classico G. Cesare - M. Valgimigli', label: 'Liceo Classico G. Cesare - M. Valgimigli' },
  { value: 'ITTS O. Belluzzi - L. Da Vinci', label: 'ITTS O. Belluzzi - L. Da Vinci' },
  { value: 'Liceo Artistico Serpieri', label: 'Liceo Artistico Serpieri' },
  { value: 'Istituto Tecnico R. Valturio', label: 'Istituto Tecnico R. Valturio' },
  { value: 'IPSIA L.B. Alberti', label: 'IPSIA L.B. Alberti' },
  { value: 'ISISS P. Gobetti - A. De Gasperi (Morciano)', label: 'ISISS P. Gobetti - A. De Gasperi (Morciano)' },
  { value: 'altro', label: 'Altro (Specifica)' },
];
```

Note: `SchoolOption` interface is already in `types.ts` at project root. The planner can either re-export from `lib/schools.ts` or import from `types.ts`. Keeping the type co-located with the data in `lib/schools.ts` is cleaner for Phase 2 scope.

### Anti-Patterns to Avoid

- **Instantiating Html5QrcodeScanner outside useEffect:** Will throw "document is not defined" during SSR/static export. Always initialize in `useEffect`.
- **Forgetting to call `scanner.clear()` in useEffect cleanup:** Leaves camera stream running when overlay closes, causes MediaStream leak.
- **Using `animate-in` classes without verifying the plugin:** `animate-in`, `slide-in-from-*`, `zoom-in`, `fade-in`, `duration-*` require `tailwindcss-animate` (or equivalent). If these classes produce no effect, add the plugin.
- **Skipping tailwind.config.js content path update:** Components in `components/` will have all custom Tailwind classes purged in build, making them unstyled.
- **Making QrScanner a Server Component:** It uses `useEffect`, `useRef`, and browser APIs — it must be `'use client'`.
- **Accessing `window` or `navigator` at module scope:** Only safe inside `useEffect` or event handlers (e.g., `navigator.vibrate` in Dashboard).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| QR code camera scanning | Custom getUserMedia + canvas QR decoder | `html5-qrcode` (already installed) | Handles camera permission prompts, format support (ZXing), overlay UI, error recovery, cleanup |
| Icon set | SVG inline components | `lucide-react` (already installed) | Already used throughout original app (Camera, LogOut, CheckCircle, User, Mail, MapPin, Clock, ShieldCheck, AlertCircle, ChevronRight, X) |
| Glassmorphism CSS | New Tailwind utilities or inline styles | Existing globals.css classes: `liquid-glass`, `glass-input`, `btn-primary-liquid`, `mesh-bg`, `glow-camera-liquid` | Already defined and verified in Phase 1 |
| School dropdown animation | CSS keyframes | `animate-in slide-in-from-top-2` Tailwind class (already used in original App.tsx) | One-line solution already present |

**Key insight:** This phase is entirely extraction, not invention. All UI patterns, styles, and logic already exist in `App.tsx`, `components/GlassCard.tsx`, `components/Dashboard.tsx`, `components/QRScanner.tsx`, and `constants.ts`. The work is reorganizing and adapting to Next.js conventions.

---

## Common Pitfalls

### Pitfall 1: html5-qrcode SSR crash

**What goes wrong:** `Html5QrcodeScanner` (or any `html5-qrcode` import) references `document` at module evaluation time in some versions, causing a build error or "document is not defined" at runtime.

**Why it happens:** Next.js with `output: 'export'` still runs a Node.js server-side render pass during build. Any browser-specific API at module level fails.

**How to avoid:** Keep all `html5-qrcode` instantiation strictly inside `useEffect`. The `'use client'` directive alone is not sufficient — the import is still evaluated. If build errors occur, use dynamic import with `ssr: false`:
```typescript
// If direct import causes SSR issues:
const { Html5QrcodeScanner } = await import('html5-qrcode');
// inside useEffect
```

**Warning signs:** Build fails with "ReferenceError: document is not defined" or similar.

### Pitfall 2: Tailwind classes missing in built CSS

**What goes wrong:** Components render but have no Tailwind styling in production build (classes present in HTML but not in CSS).

**Why it happens:** `tailwind.config.js` content array only includes `./app/**/*`. The `components/` directory is not scanned, so all Tailwind utilities used there are tree-shaken out.

**How to avoid:** First task of Phase 2 should be updating content paths.

**Warning signs:** Works in dev (JIT watches all files by default) but breaks in `next build` output.

### Pitfall 3: useEffect dependency array with onScan callback

**What goes wrong:** QR scanner re-initializes on every render, causing camera to flash or duplicate scanner instances.

**Why it happens:** If `onScan` prop is included in the `useEffect` dependency array and the parent re-renders (which it will), the effect re-runs, creating a new scanner before the old one is cleaned up.

**How to avoid:** Use empty dependency array `[]` for the scanner initialization effect. Access the latest `onScan` via a ref if needed:
```typescript
const onScanRef = useRef(onScan);
useEffect(() => { onScanRef.current = onScan; }, [onScan]);
// In useEffect with []:
scannerRef.current.render((text) => onScanRef.current(text), () => {});
```

**Warning signs:** Camera permission dialog fires repeatedly, or console shows multiple scanner instances.

### Pitfall 4: Dashboard Server Component with interactive state

**What goes wrong:** Dashboard is declared without `'use client'` but uses `useState` for `showScanner` — TypeScript/Next.js throws a compile error.

**Why it happens:** The user's preference is "Dashboard stays a Server Component" but the component needs `useState` to toggle the QR scanner overlay visibility.

**How to avoid:** In Phase 2, mark Dashboard as `'use client'` since it manages scanner visibility state. Alternatively, lift the scanner toggle to a thin client wrapper component and keep Dashboard server-rendered — but this adds complexity for no benefit in Phase 2. Simplest correct solution: Dashboard is `'use client'`.

**Warning signs:** TypeScript error "useState is not defined" or Next.js error about hooks in Server Components.

### Pitfall 5: Missing mesh-bg on the page background

**What goes wrong:** Glass components render correctly but the mesh gradient background is absent — glass cards appear flat.

**Why it happens:** Current `app/layout.tsx` body only has `font-inter` class. The `mesh-bg` class must be added to the body or a wrapper div to establish the visual context that makes glassmorphism visible.

**How to avoid:** Update `app/layout.tsx` to add `mesh-bg min-h-screen` to the body element.

### Pitfall 6: Select element loses glassmorphism styling

**What goes wrong:** The school `<select>` dropdown does not pick up `glass-input` styling on all browsers (particularly Chrome on Android).

**Why it happens:** `appearance-none` is required to remove native browser styling, but even then `backdrop-filter` on `<select>` is poorly supported. The original App.tsx uses `appearance-none` on the select element with `glass-input` — this works on desktop but mobile Chrome may show native styling.

**How to avoid:** Use the same approach as original App.tsx: `glass-input` + `appearance-none` + custom chevron icon overlay. Accept that mobile behavior may differ slightly. Do not build a custom dropdown component in Phase 2 — that is out of scope.

---

## Code Examples

### LoginForm.tsx — Component Shell

```typescript
// components/LoginForm.tsx
'use client';

import { useState } from 'react';
import { ChevronRight, AlertCircle } from 'lucide-react';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login submit:', { email, password });
  };

  return (
    <div className="w-full max-w-md animate-in slide-in-from-bottom-8 duration-700">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold font-montserrat text-orange-600 mb-3 tracking-tighter drop-shadow-sm">JumpIn</h1>
        <p className="text-orange-900/40 font-bold uppercase tracking-[0.3em] text-[10px]">Digital Experience</p>
      </div>
      <div className="liquid-glass p-8 rounded-[2rem] w-full">
        <h2 className="text-2xl font-bold font-montserrat mb-8 text-gray-800">Accedi</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email</label>
            <input
              type="email"
              required
              placeholder="name@example.com"
              className="w-full px-5 py-4 rounded-2xl glass-input placeholder:text-gray-300 text-base"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="w-full px-5 py-4 rounded-2xl glass-input placeholder:text-gray-300 text-base"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="w-full py-5 rounded-2xl btn-primary-liquid flex items-center justify-center gap-2 group mt-6"
          >
            <span>Continua</span>
            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>
      </div>
    </div>
  );
}
```

### lib/schools.ts

```typescript
// lib/schools.ts
export interface SchoolOption {
  value: string;
  label: string;
}

export const RIMINI_SCHOOLS: SchoolOption[] = [
  { value: 'Liceo Scientifico A. Einstein', label: 'Liceo Scientifico A. Einstein' },
  { value: 'Liceo Classico G. Cesare - M. Valgimigli', label: 'Liceo Classico G. Cesare - M. Valgimigli' },
  { value: 'ITTS O. Belluzzi - L. Da Vinci', label: 'ITTS O. Belluzzi - L. Da Vinci' },
  { value: 'Liceo Artistico Serpieri', label: 'Liceo Artistico Serpieri' },
  { value: 'Istituto Tecnico R. Valturio', label: 'Istituto Tecnico R. Valturio' },
  { value: 'IPSIA L.B. Alberti', label: 'IPSIA L.B. Alberti' },
  { value: 'ISISS P. Gobetti - A. De Gasperi (Morciano)', label: 'ISISS P. Gobetti - A. De Gasperi (Morciano)' },
  { value: 'altro', label: 'Altro (Specifica)' },
];
```

### app/layout.tsx — mesh-bg addition

```typescript
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${montserrat.variable}`}>
      <body className="font-inter mesh-bg min-h-screen">
        {children}
      </body>
    </html>
  );
}
```

### app/page.tsx — Phase 2 entry point

```typescript
// app/page.tsx — replace test content with LoginForm
import LoginForm from '@/components/LoginForm';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 sm:p-4">
      <LoginForm />
    </div>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vite SPA with single App.tsx | Next.js App Router with component files | Phase 1 complete | Components must respect Server/Client boundary |
| html5-qrcode in Vite (browser-only bundle) | html5-qrcode in Next.js (requires SSR guard) | Phase 2 | Must use `'use client'` + useEffect instantiation |
| Global CSS via CDN `<link>` in index.html | globals.css imported in layout.tsx, Tailwind via npm | Phase 1 complete | All styles available without CDN; content paths matter for purge |

**Deprecated/outdated:**
- `index.html` CDN links: Replaced by next/font/google and npm Tailwind in Phase 1
- `vite.config.ts`: Deleted in Phase 1 (SUMMARY 01-03)
- Monolithic `App.tsx` view logic: Being split into individual component files in this phase

---

## Open Questions

1. **Dashboard 'use client' vs Server Component**
   - What we know: Dashboard manages `showScanner` state (useState), which requires client-side rendering
   - What's unclear: User stated "Dashboard stays a Server Component" but the original component uses useState
   - Recommendation: Mark Dashboard as `'use client'` in Phase 2. The intent was likely to avoid `'use client'` on the QR scanner itself propagating upward — but since QrScanner is isolated in its own file, Dashboard can be client without issue. Document this decision for the planner.

2. **`animate-in` Tailwind plugin availability**
   - What we know: `animate-in`, `slide-in-from-bottom-8`, `zoom-in`, `fade-in` are used throughout original App.tsx and appear in current `components/Dashboard.tsx`
   - What's unclear: Whether `tailwindcss-animate` plugin is configured — it is NOT listed in `tailwind.config.js` plugins array and NOT in package.json dependencies
   - Recommendation: If `animate-in` classes fail silently (no animation but no error), they are simply not recognized by Tailwind. Either add `tailwindcss-animate` as a plugin or replace with standard Tailwind transition classes. This is Claude's discretion per CONTEXT.md on animation transitions. Planner should include a task to verify animate-in classes work, with fallback to plain `transition-all` if not.

3. **UI-06: Check-in success feedback location**
   - What we know: Requirements say "green checkmark / animation displays". Original code shows success state in Dashboard after QR scan. In Phase 2, QR scan only does console.log.
   - What's unclear: Should UI-06 be a visual state within QrScanner (post-scan overlay change) or in Dashboard?
   - Recommendation: Since Phase 2 QR scan result is console.log only and no check-in occurs, UI-06 is best satisfied as a visual element within QrScanner that appears briefly after decode (e.g., the existing green CheckCircle in Dashboard). This can be a `useState` success flag inside QrScanner that shows a checkmark before calling onClose.

---

## Sources

### Primary (HIGH confidence)

- Direct code inspection: `D:/!programming/botika/jumpInLoginAndQrCode/App.tsx` — full source of all UI to extract
- Direct code inspection: `D:/!programming/botika/jumpInLoginAndQrCode/app/globals.css` — complete CSS class inventory
- Direct code inspection: `D:/!programming/botika/jumpInLoginAndQrCode/app/layout.tsx` — current layout structure
- Direct code inspection: `D:/!programming/botika/jumpInLoginAndQrCode/tailwind.config.js` — confirms content paths only scan `./app/**/*`
- Direct code inspection: `D:/!programming/botika/jumpInLoginAndQrCode/package.json` — confirms html5-qrcode@2.3.8 and lucide-react@0.563.0 are installed
- Direct code inspection: `D:/!programming/botika/jumpInLoginAndQrCode/components/QRScanner.tsx` — confirms correct useEffect pattern already implemented in old components dir
- Direct code inspection: `D:/!programming/botika/jumpInLoginAndQrCode/components/Dashboard.tsx` — confirms useState usage
- Phase 1 Verification: `.planning/phases/01-next-js-foundation/01-VERIFICATION.md` — confirms all glassmorphism classes present and verified in globals.css

### Secondary (MEDIUM confidence)

- Next.js App Router documentation pattern: `'use client'` required for useState, useEffect, browser APIs — well established in Next.js 13+ convention, applicable to Next.js 16
- html5-qrcode GitHub README: confirms `Html5QrcodeScanner` constructor signature and `render()` / `clear()` API used in existing QRScanner.tsx

### Tertiary (LOW confidence)

- `tailwindcss-animate` plugin for `animate-in` classes: unverified whether it is in use — the plugin is not in package.json but the classes appear in source. Needs verification during implementation.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified present in node_modules and package.json
- Architecture: HIGH — source code fully available for direct extraction; patterns verified in existing component files
- Pitfalls: HIGH for SSR/useEffect patterns (well-established Next.js behavior); MEDIUM for `animate-in` plugin status (not verified)
- Content paths gap: HIGH — directly observed in tailwind.config.js

**Research date:** 2026-02-27
**Valid until:** 2026-03-29 (30 days — stable libraries, no fast-moving dependencies)
