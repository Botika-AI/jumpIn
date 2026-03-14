# Phase 3: Mock Auth & State - Research

**Researched:** 2026-03-14
**Domain:** Client-side state management, localStorage auth, Next.js App Router view routing, React context/prop drilling
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | Mock login validates credentials and transitions to dashboard | Original App.tsx handleLogin pattern (setTimeout 1200ms, hardcoded demo credentials, localStorage.setItem) is directly portable. LoginForm.tsx already has the UI shell — needs onSuccess/onNavigate callback prop added. |
| AUTH-02 | Mock registration creates user profile and transitions to dashboard | Original App.tsx handleRegister pattern (setTimeout 2000ms, UserProfile construction from form fields) is directly portable. RegisterForm.tsx already has the UI shell — needs onSuccess callback prop added. |
| AUTH-03 | User session persists across browser refresh via localStorage | Original App.tsx useEffect reads `jumpin_user` key on mount and restores auth state. This pattern must move to a root-level client component (app/page.tsx or a wrapper) since localStorage is browser-only. |
| AUTH-04 | Logout clears session and returns to login view | Original App.tsx handleLogout removes `jumpin_user` from localStorage and resets authState to 'login'. Dashboard.tsx logout button currently fires console.log — needs real handler via prop. |
| AUTH-05 | QR scan updates last_checkin timestamp in localStorage user object | Original App.tsx handleCheckIn mutates user with new timestamp and writes back to localStorage. Dashboard.tsx handleScan currently only calls console.log + setLastCheckin local state — needs to persist to localStorage and receive/update real user data. |
</phase_requirements>

---

## Summary

Phase 3 is a state-wiring task. All the UI components are complete and verified (Phase 2 UAT: 9/10 passed, 1 environmental issue). The original Vite `App.tsx` already contains a complete, working mock auth implementation using localStorage. The work is: (1) architect how view state (`login | register | dashboard`) lives in the Next.js App Router context, (2) wire the existing components together with callbacks and user data flow, (3) port the localStorage auth logic from `App.tsx` into the new component architecture.

The critical architectural decision for Phase 3 is: **where does top-level auth state live?** In the original Vite app it lives in `App.tsx` as `useState<AuthState>`. In Next.js App Router, `app/page.tsx` is a Server Component by default. The state must therefore live in a Client Component. The cleanest solution is a thin `AuthController` client component that holds `authState` and `user` state, renders the correct view component, and passes callbacks down as props. This avoids React Context entirely, which would be premature for a 3-view SPA.

The second key insight: `Dashboard.tsx` was built in Phase 2 with a static `PLACEHOLDER_USER` and a local-only `lastCheckin` state. Phase 3 must replace `PLACEHOLDER_USER` with a real `user` prop (of type `UserProfile`), and the `handleScan` function must persist the updated timestamp back to localStorage and call a parent callback to keep the in-memory user state synchronized.

**Primary recommendation:** Create a `components/AuthController.tsx` client component that owns all auth state and orchestrates view transitions. Update `app/page.tsx` to render only `<AuthController />`. Update `LoginForm`, `RegisterForm`, and `Dashboard` props interfaces to receive callbacks and/or user data. Port the exact auth logic from `App.tsx` verbatim.

---

## Standard Stack

### Core (no new installs — all already in place)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | ^19.2.4 | `useState`, `useEffect` for auth state and localStorage hydration | Phase 1/2 foundation |
| next | ^16.1.6 | App Router, client/server boundary | Phase 1 foundation |
| typescript | ~5.8.2 | `UserProfile`, `AuthState` types from `types.ts` | Phase 1 foundation |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| localStorage (browser API) | native | Persist `jumpin_user` JSON across refresh | Client-side only, inside `useEffect` or event handlers |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| AuthController client component | React Context + Provider | Context is correct for deeply nested components; overkill for 3 flat views. Props are simpler and more explicit. |
| AuthController client component | Next.js App Router cookies/middleware | Appropriate for real auth (v2 Supabase scope). Not needed for localStorage mock. |
| `app/page.tsx` + AuthController | Next.js App Router file-based routing (`app/login/page.tsx`, `app/dashboard/page.tsx`) | File-based routing is natural for real pages, but for a SPA-style auth flow where state is in memory, a single-page view switcher is simpler. Avoids full page navigation and URL changes that were not in the original app. |

**Installation:** No new packages needed.

---

## Architecture Patterns

### Recommended Project Structure

```
app/
├── page.tsx              # Server Component — renders <AuthController /> only
└── layout.tsx            # Unchanged

components/
├── AuthController.tsx    # NEW: 'use client' — owns authState, user state, all auth logic
├── LoginForm.tsx         # UPDATE: add onSuccess + onNavigateRegister props
├── RegisterForm.tsx      # UPDATE: add onSuccess prop
├── Dashboard.tsx         # UPDATE: replace PLACEHOLDER_USER with user prop, add onLogout prop, wire handleScan to persist
└── QRScanner.tsx         # UNCHANGED — already complete

lib/
└── auth.ts               # NEW (optional): localStorage helpers (getUser, saveUser, clearUser)
types.ts                  # UNCHANGED — UserProfile and AuthState types already defined
```

### Pattern 1: AuthController as Central State Hub

**What:** A single `'use client'` component that owns `authState: AuthState` and `user: UserProfile | null`. On mount, reads localStorage to restore session. Renders the correct view based on `authState`, passing callbacks and data as props.

**When to use:** This is the correct pattern for a 3-view SPA-style client-only auth flow in Next.js App Router.

**Source:** Ported directly from `App.tsx` lines 9-95 (verified by direct code inspection).

```typescript
// components/AuthController.tsx
'use client';

import { useState, useEffect } from 'react';
import LoginForm from '@/components/LoginForm';
import RegisterForm from '@/components/RegisterForm';
import Dashboard from '@/components/Dashboard';
import type { AuthState, UserProfile } from '@/types';

export default function AuthController() {
  const [authState, setAuthState] = useState<AuthState>('login');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // AUTH-03: Restore session from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('jumpin_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setAuthState('dashboard');
    }
  }, []);

  // AUTH-01: Mock login
  const handleLogin = (email: string, password: string, onError: (msg: string) => void) => {
    setIsLoading(true);
    setTimeout(() => {
      if (email === 'demo@example.com' && password === 'password123') {
        const mockUser: UserProfile = {
          id: 'demo-123',
          first_name: 'Demo',
          last_name: 'User',
          email: 'demo@example.com',
          school: 'JumpIn Testing School',
          dob: '2000-01-01',
          last_checkin: undefined,
        };
        setUser(mockUser);
        localStorage.setItem('jumpin_user', JSON.stringify(mockUser));
        setAuthState('dashboard');
      } else {
        onError('Credenziali non valide. Usa demo@example.com / password123');
      }
      setIsLoading(false);
    }, 1200);
  };

  // AUTH-02: Mock registration
  const handleRegister = (profile: Omit<UserProfile, 'id' | 'last_checkin'>) => {
    setIsLoading(true);
    setTimeout(() => {
      const mockUser: UserProfile = {
        id: Math.random().toString(36).substr(2, 9),
        ...profile,
        last_checkin: undefined,
      };
      setUser(mockUser);
      localStorage.setItem('jumpin_user', JSON.stringify(mockUser));
      setAuthState('dashboard');
      setIsLoading(false);
    }, 2000);
  };

  // AUTH-04: Logout
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('jumpin_user');
    setAuthState('login');
  };

  // AUTH-05: QR scan updates last_checkin in localStorage
  const handleCheckIn = () => {
    if (!user) return;
    const updatedUser = { ...user, last_checkin: new Date().toISOString() };
    setUser(updatedUser);
    localStorage.setItem('jumpin_user', JSON.stringify(updatedUser));
  };

  if (authState === 'login') {
    return (
      <LoginForm
        onLogin={handleLogin}
        isLoading={isLoading}
        onNavigateRegister={() => setAuthState('register')}
      />
    );
  }

  if (authState === 'register') {
    return (
      <RegisterForm
        onRegister={handleRegister}
        isLoading={isLoading}
        onNavigateLogin={() => setAuthState('login')}
      />
    );
  }

  if (authState === 'dashboard' && user) {
    return (
      <Dashboard
        user={user}
        onLogout={handleLogout}
        onCheckIn={handleCheckIn}
      />
    );
  }

  return null; // Fallback during SSR hydration before useEffect fires
}
```

### Pattern 2: Updated app/page.tsx

**What:** `app/page.tsx` stays a Server Component but delegates all client behavior to `AuthController`.

**Source:** Direct inspection of current `app/page.tsx` — already imports LoginForm directly. Phase 3 replaces that with AuthController.

```typescript
// app/page.tsx
import AuthController from '@/components/AuthController';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 sm:p-4">
      <AuthController />
    </div>
  );
}
```

### Pattern 3: LoginForm Props Interface Update

**What:** `LoginForm` currently has no props. Phase 3 adds `onLogin`, `isLoading`, and `onNavigateRegister`.

**Source:** Current `components/LoginForm.tsx` (direct inspection, lines 6-14).

```typescript
interface LoginFormProps {
  onLogin: (email: string, password: string, onError: (msg: string) => void) => void;
  isLoading: boolean;
  onNavigateRegister: () => void;
}

export default function LoginForm({ onLogin, isLoading, onNavigateRegister }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password, (msg) => setLoginError(msg));
  };

  // ... rest of JSX unchanged, except:
  // - "Crea un account" button: onClick={() => onNavigateRegister()}
  // - Submit button: disabled={isLoading}
  // - "Continua" text: {isLoading ? 'Attendi...' : 'Continua'}
}
```

### Pattern 4: RegisterForm Props Interface Update

**What:** `RegisterForm` currently has no props. Phase 3 adds `onRegister`, `isLoading`, `onNavigateLogin`.

**Source:** Current `components/RegisterForm.tsx` (direct inspection, lines 7-19). The form already collects all fields needed for `UserProfile`.

```typescript
interface RegisterFormProps {
  onRegister: (profile: Omit<UserProfile, 'id' | 'last_checkin'>) => void;
  isLoading: boolean;
  onNavigateLogin: () => void;
}

export default function RegisterForm({ onRegister, isLoading, onNavigateLogin }: RegisterFormProps) {
  // ... existing state unchanged ...

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRegister({
      first_name: firstName,
      last_name: lastName,
      email,
      school: school === 'altro' ? customSchool : school,
      dob,
    });
  };

  // ... rest of JSX, except:
  // - Submit button: disabled={isLoading}, text conditional on isLoading
  // - "Effettua l'accesso" button: onClick={() => onNavigateLogin()}
}
```

### Pattern 5: Dashboard Props Interface Update

**What:** `Dashboard` currently uses `PLACEHOLDER_USER` (static const) and local `lastCheckin` state. Phase 3 replaces this with real `user` prop and wires `onLogout` + `onCheckIn`.

**Source:** Current `components/Dashboard.tsx` (direct inspection, lines 7-29, 45-48, 140-153).

**Key change: `lastCheckin` display.** Currently, `lastCheckin` is a local `useState` that only persists in memory during the session. After Phase 3, `user.last_checkin` from the prop is the source of truth (persisted in localStorage). The local `lastCheckin` state in Dashboard can be kept for the immediate post-scan display, but the initial value should come from `user.last_checkin`.

```typescript
interface DashboardProps {
  user: UserProfile;
  onLogout: () => void;
  onCheckIn: () => void;
}

export default function Dashboard({ user, onLogout, onCheckIn }: DashboardProps) {
  const [showScanner, setShowScanner] = useState(false);
  const [success, setSuccess] = useState(false);
  const [lastCheckin, setLastCheckin] = useState<string | undefined>(user.last_checkin);

  const initials = `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();

  const handleScan = (decodedText: string) => {
    console.log('QR scanned:', decodedText);
    setShowScanner(false);
    setSuccess(true);
    const now = new Date().toISOString();
    setLastCheckin(now);      // local display update
    onCheckIn();              // AUTH-05: persist to localStorage via parent
    if ('vibrate' in navigator) navigator.vibrate(200);
    setTimeout(() => setSuccess(false), 4000);
  };

  // Replace PLACEHOLDER_USER references with user prop:
  // user.first_name, user.last_name, user.email, user.school

  // Logout button:
  // onClick={onLogout}  (was: console.log placeholder)
}
```

### Anti-Patterns to Avoid

- **Putting auth logic in LoginForm/RegisterForm directly:** These components should only manage their own UI state (form fields, local error message). Business logic (localStorage writes, user object construction) belongs in AuthController.
- **Accessing localStorage at module scope or during SSR:** `localStorage.getItem()` must only be called inside `useEffect`. Calling it outside causes "localStorage is not defined" errors during Next.js SSR/static generation.
- **Using Next.js router.push() for view transitions:** The original app used SPA-style in-memory state transitions (not URL changes). Using `router.push('/dashboard')` would require creating route directories, break the localStorage-only auth model, and add unnecessary complexity. Keep the `authState` string approach from `App.tsx`.
- **Forgetting the `null` fallback during hydration:** Between SSR render and the `useEffect` firing on the client, `authState` defaults to `'login'`. This is correct — the login form briefly flashes before hydration restores a previous session. This is acceptable for v1.
- **Trying to make `app/page.tsx` a Server Component that reads localStorage:** Server Components run on the server (or during static generation) and have no access to the browser's localStorage. The auth check MUST happen in a Client Component via `useEffect`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session persistence | Custom cookie/session system | localStorage directly (per requirements) | localStorage is specified; cookies are v2 scope (SAUTH-02) |
| View routing | Next.js App Router file-based routes per view | `authState` string in AuthController | Original SPA used in-memory state; file routes would require URL changes and additional pages |
| State management | Redux, Zustand, Jotai, React Context | `useState` in AuthController passed as props | Only 3 views, flat component tree — no need for shared state library |
| Form validation library | zod, react-hook-form | Native HTML5 validation (`required`, `minLength`, `type="email"`) | Already present in all forms via HTML attributes; sufficient for mock auth |
| Auth library | NextAuth.js, Clerk, Auth0 | Hardcoded credentials + localStorage | v2 scope (SAUTH-01); v1 is purely mock |

**Key insight:** All the auth logic already exists and is correct in `App.tsx`. This phase is extraction and re-wiring, not invention. Copy the logic, adapt the interfaces.

---

## Common Pitfalls

### Pitfall 1: localStorage access during SSR

**What goes wrong:** Calling `localStorage.getItem('jumpin_user')` outside of `useEffect` causes a build error: `ReferenceError: localStorage is not defined`.

**Why it happens:** Next.js runs a server-side render pass even in `output: 'export'` (static export) mode. The server does not have a `window` object.

**How to avoid:** The exact pattern from `App.tsx` lines 24-30 is correct:
```typescript
useEffect(() => {
  const savedUser = localStorage.getItem('jumpin_user');
  if (savedUser) {
    setUser(JSON.parse(savedUser));
    setAuthState('dashboard');
  }
}, []);
```
Never read localStorage outside `useEffect`, event handlers, or callbacks.

**Warning signs:** Build fails with "ReferenceError: localStorage is not defined" or "window is not defined".

### Pitfall 2: Hydration flash (login → dashboard flicker on refresh)

**What goes wrong:** User is logged in (has `jumpin_user` in localStorage). On refresh, the page briefly shows the Login form before switching to Dashboard.

**Why it happens:** During SSR/hydration, `authState` is `'login'` (default). The `useEffect` that reads localStorage fires after hydration, causing a view change. This is expected behavior with client-side auth persistence.

**How to avoid:** For v1, this is acceptable. If it becomes visually jarring, add a loading state:
```typescript
const [hydrated, setHydrated] = useState(false);

useEffect(() => {
  const savedUser = localStorage.getItem('jumpin_user');
  if (savedUser) {
    setUser(JSON.parse(savedUser));
    setAuthState('dashboard');
  }
  setHydrated(true);
}, []);

if (!hydrated) return null; // or a loading spinner
```
The original `App.tsx` does NOT use this pattern — it accepts the brief flash. The planner should decide: add loading state (polished) or skip (simpler, acceptable for v1).

### Pitfall 3: Dashboard lastCheckin state vs. prop out of sync

**What goes wrong:** User scans QR, `handleCheckIn()` updates localStorage, but Dashboard still shows old `user.last_checkin` because the prop hasn't changed in the parent.

**Why it happens:** The `user` prop in Dashboard is passed by value. Calling `onCheckIn()` in the parent updates `user.last_checkin` in the parent's state, which re-renders Dashboard with the updated prop. However, if local `lastCheckin` state is initialized from `user.last_checkin` only once (`useState(user.last_checkin)`), it won't update when the prop changes.

**How to avoid:** Keep `lastCheckin` as a local state for immediate post-scan display. `onCheckIn()` in the parent updates the parent's `user` state which flows back into the prop. Since `useState` initial value only runs on first mount, use:
```typescript
// Option A: use prop directly for display (no local state needed)
const displayCheckin = user.last_checkin;

// Option B: local state initialized from prop (current Dashboard pattern) — works because
// the parent re-renders Dashboard with updated user.last_checkin after onCheckIn fires
```
The cleanest approach: remove local `lastCheckin` state from Dashboard entirely and read directly from `user.last_checkin` prop. This is simpler and always in sync with localStorage.

**Warning signs:** Dashboard shows "last check-in" time that doesn't update after scanning, even though localStorage has the new timestamp.

### Pitfall 4: TypeScript errors from Dashboard receiving no props

**What goes wrong:** `Dashboard.tsx` currently exports `function Dashboard()` with no parameters. Adding a `user: UserProfile` prop without updating the function signature causes TypeScript to error at the call site in AuthController.

**Why it happens:** Phase 2 explicitly built Dashboard with no props (SUMMARY 02-03 decision: "Phase 2 uses static placeholder data, Phase 3 will add props or context for real user data"). This is a known pending debt.

**How to avoid:** Update `Dashboard.tsx` to accept props as its first step in Phase 3. Simultaneously remove `PLACEHOLDER_USER` constant. Run `npx tsc --noEmit` to verify.

**Warning signs:** TypeScript error at `<Dashboard user={user} onLogout={handleLogout} onCheckIn={handleCheckIn} />` call site.

### Pitfall 5: JSON.parse errors on corrupted localStorage data

**What goes wrong:** `JSON.parse(localStorage.getItem('jumpin_user'))` throws a SyntaxError if the stored value is malformed or the key exists but holds a non-JSON string.

**Why it happens:** Can happen during development if localStorage was set to a bad value manually, or if a previous code version wrote malformed data.

**How to avoid:** Wrap the parse in a try/catch:
```typescript
useEffect(() => {
  try {
    const savedUser = localStorage.getItem('jumpin_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setAuthState('dashboard');
    }
  } catch {
    localStorage.removeItem('jumpin_user'); // Clear corrupted data
  }
}, []);
```
The original `App.tsx` does NOT include this guard. For v1 robustness, add it.

---

## Code Examples

Verified patterns from direct source code inspection:

### Original App.tsx handleLogin (source of truth for AUTH-01)

```typescript
// Source: App.tsx lines 32-56 (direct code inspection)
const handleLogin = (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  setLoginError(null);

  setTimeout(() => {
    if (formData.email === 'demo@example.com' && formData.password === 'password123') {
      const mockUser: UserProfile = {
        id: 'demo-123',
        first_name: 'Demo',
        last_name: 'User',
        email: 'demo@example.com',
        school: 'JumpIn Testing School',
        dob: '2000-01-01',
        last_checkin: new Date().toISOString()
      };
      setUser(mockUser);
      localStorage.setItem('jumpin_user', JSON.stringify(mockUser));
      setAuthState('dashboard');
    } else {
      setLoginError('Credenziali non valide. Usa demo@example.com / password123');
    }
    setIsLoading(false);
  }, 1200);
};
```

### Original App.tsx handleRegister (source of truth for AUTH-02)

```typescript
// Source: App.tsx lines 58-77 (direct code inspection)
const handleRegister = (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  setTimeout(() => {
    const mockUser: UserProfile = {
      id: Math.random().toString(36).substr(2, 9),
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email,
      school: formData.school === 'altro' ? formData.customSchool : formData.school,
      dob: formData.dob,
      last_checkin: undefined
    };
    setUser(mockUser);
    localStorage.setItem('jumpin_user', JSON.stringify(mockUser));
    setAuthState('dashboard');
    setIsLoading(false);
  }, 2000);
};
```

Note: In the adapted AuthController version, the form field data is passed in as a structured argument instead of reading from a shared `formData` state, since forms are now separate components.

### Original App.tsx handleLogout (source of truth for AUTH-04)

```typescript
// Source: App.tsx lines 79-85 (direct code inspection)
const handleLogout = () => {
  setUser(null);
  localStorage.removeItem('jumpin_user');
  setAuthState('login');
  // Note: no need to reset formData in AuthController — forms have their own local state
};
```

### Original App.tsx handleCheckIn (source of truth for AUTH-05)

```typescript
// Source: App.tsx lines 87-94 (direct code inspection)
const handleCheckIn = async () => {
  if (user) {
    const timestamp = new Date().toISOString();
    const updatedUser = { ...user, last_checkin: timestamp };
    setUser(updatedUser);
    localStorage.setItem('jumpin_user', JSON.stringify(updatedUser));
  }
};
```

Note: The `async` keyword on this function is a no-op (no `await` used) — use sync in AuthController.

### UserProfile type (from types.ts)

```typescript
// Source: types.ts (direct code inspection)
export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  school: string;
  dob: string;
  last_checkin?: string;  // undefined before first scan
}

export type AuthState = 'login' | 'register' | 'dashboard';
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| All auth state in `App.tsx` (Vite SPA entry) | Auth state in `AuthController.tsx` client component (Next.js) | Phase 3 | Same logic, new home. App.tsx becomes fully unused legacy file. |
| Dashboard renders with `PLACEHOLDER_USER` | Dashboard receives `user: UserProfile` as prop | Phase 3 | Dashboard is now reusable and data-driven |
| `console.log('navigate to register')` in LoginForm | `onNavigateRegister()` callback prop | Phase 3 | Actual view transition wired up |
| `console.log('Logout clicked')` in Dashboard | `onLogout()` callback prop | Phase 3 | Actual logout wired up |

**Deprecated/outdated after Phase 3:**
- `PLACEHOLDER_USER` constant in Dashboard.tsx: Remove when adding `user` prop
- Navigation `console.log` placeholders in LoginForm and RegisterForm: Replace with prop callbacks
- Logout `console.log` placeholder in Dashboard: Replace with `onLogout` prop call
- `App.tsx`: Already a legacy file unused by Next.js routing — remains as dead code reference; do not delete until Phase 4 verification

---

## Open Questions

1. **Hydration flash (login → dashboard) on refresh**
   - What we know: SSR default state is `'login'`, `useEffect` fires after hydration and switches to `'dashboard'` if localStorage has a user. This causes a brief flash of the login form.
   - What's unclear: Is this visually acceptable for v1? The original Vite app had no SSR so no flash occurred.
   - Recommendation: Add a `hydrated` boolean state (see Pitfall 2 above) that shows `null` or a minimal loading state before the localStorage check completes. This is one extra `useState` and prevents the flash entirely. Recommend including it.

2. **`lib/auth.ts` helper module — worth extracting?**
   - What we know: Three functions (`getUser`, `saveUser`, `clearUser`) would abstract localStorage key management and JSON handling.
   - What's unclear: Whether the added indirection is worth the small project scope.
   - Recommendation: For v1 simplicity, inline the localStorage calls directly in AuthController. A `lib/auth.ts` helper is beneficial for v2 when Supabase auth replaces localStorage — defer.

3. **`last_checkin` display: local state vs prop**
   - What we know: Current Dashboard has `useState<string | undefined>(undefined)` for `lastCheckin`, updated optimistically on scan. After Phase 3, `user.last_checkin` (from prop) will also be updated after `onCheckIn()` triggers a parent re-render.
   - What's unclear: Whether to remove local `lastCheckin` state entirely and read from `user.last_checkin` prop.
   - Recommendation: Remove local `lastCheckin` state. Initialize the displayed value from `user.last_checkin` prop directly. Since `onCheckIn()` triggers parent state update → re-render → updated `user` prop flows back to Dashboard, the display will always reflect localStorage. This is simpler and eliminates the dual-source-of-truth problem.

4. **Test demo user — `last_checkin` on login**
   - What we know: Original `handleLogin` sets `last_checkin: new Date().toISOString()` on the hardcoded demo user. This means every login shows a "last check-in" timestamp immediately.
   - What's unclear: Intended behavior — should demo user start with no `last_checkin`?
   - Recommendation: Set `last_checkin: undefined` on demo user for realistic UX (first scan establishes the timestamp). Planner's discretion.

---

## Sources

### Primary (HIGH confidence)

- Direct code inspection: `D:/!programming/botika/jumpInLoginAndQrCode/App.tsx` — complete mock auth implementation, all 5 auth handlers (lines 24-94)
- Direct code inspection: `D:/!programming/botika/jumpInLoginAndQrCode/types.ts` — `UserProfile` and `AuthState` type definitions
- Direct code inspection: `D:/!programming/botika/jumpInLoginAndQrCode/components/LoginForm.tsx` — current component state (no props, console.log submit)
- Direct code inspection: `D:/!programming/botika/jumpInLoginAndQrCode/components/RegisterForm.tsx` — current component state (no props, console.log submit)
- Direct code inspection: `D:/!programming/botika/jumpInLoginAndQrCode/components/Dashboard.tsx` — current component state (PLACEHOLDER_USER, local lastCheckin, console.log logout)
- Direct code inspection: `D:/!programming/botika/jumpInLoginAndQrCode/app/page.tsx` — currently renders LoginForm directly
- Direct code inspection: `D:/!programming/botika/jumpInLoginAndQrCode/package.json` — confirms no new dependencies needed
- Phase 2 SUMMARY 02-03: confirms Dashboard.tsx uses PLACEHOLDER_USER and is marked for Phase 3 replacement
- Phase 2 UAT: 9/10 passed — all components render correctly, QR scanner initializes (1 issue was environmental camera conflict, not code)

### Secondary (MEDIUM confidence)

- Next.js App Router documentation pattern: `'use client'` + `useEffect` required for localStorage access; Server Components cannot access browser APIs — well-established in Next.js 13+ conventions, applies to Next.js 16

### Tertiary (LOW confidence)

- None — all critical claims are backed by direct source code inspection

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified present; no new dependencies needed
- Architecture: HIGH — original App.tsx provides the exact auth logic to port; component files directly inspected to identify what props need adding
- Pitfalls: HIGH for localStorage/SSR patterns (directly observed in codebase); MEDIUM for hydration flash UX (depends on whether it's visually acceptable, not verified with user)

**Research date:** 2026-03-14
**Valid until:** 2026-04-13 (30 days — stable libraries, no fast-moving dependencies)
