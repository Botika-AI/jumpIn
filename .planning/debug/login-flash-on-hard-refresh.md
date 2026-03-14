---
status: resolved
trigger: "On hard refresh, the login form briefly flashes/appears before the dashboard loads, even when the user is already logged in (session stored in localStorage)"
created: 2026-03-14T00:00:00Z
updated: 2026-03-14T00:00:00Z
---

## Current Focus

hypothesis: confirmed - useState lazy initializer calls readSession() which guards with `typeof window === 'undefined'`, but this guard is for SSR not for the static-export hydration timing problem
test: read all relevant source files and trace the render path
expecting: one frame of login shown before React hydration completes
next_action: return diagnosis

## Symptoms

expected: User with valid localStorage session sees dashboard immediately on hard refresh, no flash
actual: Login form appears briefly before dashboard renders
errors: none (silent visual bug)
reproduction: Log in, then hard-refresh the page
started: persists despite useIsomorphicLayoutEffect attempt

## Eliminated

- hypothesis: typeof window === 'undefined' guard is missing
  evidence: readSession() at line 10 of AuthController.tsx does have the guard, so the function is safe for SSR context
  timestamp: 2026-03-14

- hypothesis: readSession() is not being called during initialization
  evidence: useState lazy initializer `() => readSession().authState` at line 23 calls it at component mount time
  timestamp: 2026-03-14

## Evidence

- timestamp: 2026-03-14
  checked: AuthController.tsx lines 22-25
  found: |
    useState IS initialized with a lazy initializer that calls readSession().
    The `typeof window === 'undefined'` check in readSession() returns `{ authState: 'login', user: null }`
    when window is not available (SSR/server side). But with `output: 'export'`, Next.js
    still performs static HTML generation at build time where window IS undefined.
    The static HTML is therefore always generated with authState='login'.
  implication: |
    The pre-rendered HTML contains the LoginForm. When it arrives in the browser on hard
    refresh, the browser paints it immediately. React then hydrates the component — but
    during hydration the lazy initializer DOES have access to window, reads localStorage,
    and sets authState='dashboard'. React then swaps to Dashboard. This swap happens
    after the first paint, causing the visible flash.

- timestamp: 2026-03-14
  checked: next.config.mjs
  found: output is 'export' — full static site generation, no server runtime
  implication: |
    There is no SSR at request time. The HTML is baked at build time.
    All pages are pre-rendered without any runtime window/localStorage access.
    The pre-rendered HTML always shows the login state.

- timestamp: 2026-03-14
  checked: AuthController.tsx line 25
  found: `const [isLoading, setIsLoading] = useState(false);` — no loading/unknown state
  implication: |
    There is no "loading" or "unknown" intermediate state. The component transitions
    directly from login (pre-render) to dashboard (post-hydration). A third state
    like 'loading' or null would allow rendering nothing (or a neutral spinner)
    during the hydration window, preventing the flash entirely.

- timestamp: 2026-03-14
  checked: App.tsx (legacy file, not used by Next.js routing)
  found: Uses `useEffect` (not lazy initializer) to read localStorage, which is even worse —
    it fires after the first render and paint, guaranteeing a flash.
  implication: |
    App.tsx is the old CRA-style root. It is NOT the entry point for the Next.js app.
    The active code path is app/page.tsx -> AuthController.tsx.

## Resolution

root_cause: |
  With `output: 'export'`, Next.js generates static HTML at build time where `window`
  is undefined. The `readSession()` function's `typeof window === 'undefined'` guard
  returns `{ authState: 'login', user: null }` at build time, so the pre-rendered HTML
  always encodes the Login form. On hard refresh, the browser paints this pre-rendered
  HTML immediately. React then hydrates and the lazy useState initializer runs in the
  browser where window IS available — it reads localStorage, finds the session, and
  switches to 'dashboard'. This state update triggers a re-render after the first paint,
  producing the one-frame login flash. There is no intermediate "unknown/loading" state
  to suppress rendering during the hydration window.

fix: |
  Add a third AuthState value (e.g., 'loading') and initialize authState to 'loading'
  on the server/static-render path (i.e., when `typeof window === 'undefined'`).
  On the client, use useLayoutEffect (or useIsomorphicLayoutEffect) to read localStorage
  synchronously before paint and set the correct state. While authState is 'loading',
  render nothing (return null) or a non-intrusive placeholder. This prevents the login
  UI from ever painting when the user is actually authenticated.

verification: diagnosis only — no fix applied
files_changed: []
