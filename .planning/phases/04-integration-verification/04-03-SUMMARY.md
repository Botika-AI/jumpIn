---
phase: 04-integration-verification
plan: "03"
subsystem: auth
tags: [auth, hydration, flash-fix, ux]
dependency_graph:
  requires: []
  provides: [no-flash-auth-init]
  affects: [types.ts, components/AuthController.tsx]
tech_stack:
  added: []
  patterns: [useIsomorphicLayoutEffect, loading-guard]
key_files:
  created: []
  modified:
    - types.ts
    - components/AuthController.tsx
decisions:
  - "'loading' added to AuthState so render can be deferred until localStorage is read"
  - "useIsomorphicLayoutEffect fires synchronously before paint on client, preventing login form flash"
  - "readSession() function removed — localStorage read is now colocated in the layout effect"
metrics:
  duration_seconds: 61
  completed_date: "2026-03-14"
  tasks_completed: 1
  files_modified: 2
---

# Phase 04 Plan 03: Login Flash Fix Summary

**One-liner:** Added `'loading'` AuthState and useIsomorphicLayoutEffect localStorage read to eliminate login form flash on hard refresh.

## What Was Built

The login form was briefly visible on hard refresh because `useState` initialized `authState` by calling `readSession()` synchronously. During SSR/pre-render, `typeof window === 'undefined'` so `readSession()` always returned `'login'` — baking the login form into the pre-rendered HTML. On the client, hydration would update the state, but only after the first paint, causing a visible flash.

The fix:

1. `types.ts` — Added `'loading'` to the `AuthState` union type.
2. `components/AuthController.tsx` — Replaced the `readSession()` synchronous initializer with:
   - `useState('loading')` as the initial state
   - A `useIsomorphicLayoutEffect` that reads `localStorage` before the first paint and sets the real auth state
   - A `if (authState === 'loading') return null` render guard that prevents any UI from rendering until the true session state is known

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add loading auth state and hydration-safe init | 5a8f6a4 | types.ts, components/AuthController.tsx |

## Verification

- `npx tsc --noEmit` — zero TypeScript errors
- `npm run build` — static export succeeded, 4 pages generated

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `types.ts` — modified, contains `'loading'`
- `components/AuthController.tsx` — modified, contains `useIsomorphicLayoutEffect` and `loading` guard
- Commit `5a8f6a4` exists in git log
