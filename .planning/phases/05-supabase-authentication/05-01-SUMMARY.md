---
phase: 05-supabase-authentication
plan: 01
subsystem: auth
tags: [supabase, supabase-js, supabase-ssr, next.js, middleware, postgres, rls, typescript]

# Dependency graph
requires:
  - phase: 04-integration-verification
    provides: "Clean Next.js build without output: 'export', full server features available"
provides:
  - "Supabase browser client factory (lib/supabase/client.ts) for Client Components"
  - "Supabase server client factory (lib/supabase/server.ts) for Server Components and Route Handlers"
  - "Session refresh middleware helper (lib/supabase/middleware.ts) using getUser() for server-side validation"
  - "Next.js middleware entry (middleware.ts) wiring updateSession on every non-static request"
  - "Idempotent database schema SQL with profiles table, RLS policies, and on_auth_user_created trigger"
affects: [05-02, 05-03, 05-04, 06-google-sheets-check-in]

# Tech tracking
tech-stack:
  added:
    - "@supabase/supabase-js (^2.99.1) — Supabase JavaScript client"
    - "@supabase/ssr (^0.9.0) — SSR-compatible Supabase helpers for Next.js"
  patterns:
    - "Split browser/server Supabase clients — client.ts for Client Components, server.ts for Server Components/Route Handlers"
    - "Middleware session refresh pattern — updateSession() called on every non-static request to keep cookies fresh"
    - "getUser() over getSession() in middleware — validates token server-side, prevents spoofed sessions"
    - "security definer set search_path = '' on trigger function — required for RLS bypass during signup"

key-files:
  created:
    - lib/supabase/client.ts
    - lib/supabase/server.ts
    - lib/supabase/middleware.ts
    - middleware.ts
    - supabase/schema.sql
    - .env.local.example
  modified: []

key-decisions:
  - "Used NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (not ANON_KEY) as env var name — matches Supabase's new naming convention for the publishable/anon key"
  - "Force-added .env.local.example past .gitignore (.env* pattern) — it's a safe template with no secrets, must be committed for developer onboarding"
  - "npm install used --legacy-peer-deps flag — @supabase/ssr@0.9.0 peer requires supabase-js ^2.97.0, installed version is 2.99.x (compatible but peer resolution strict)"
  - "supabase/ directory is reference SQL only — no Supabase CLI used in this project, schema is pasted manually in Supabase SQL Editor"

patterns-established:
  - "Supabase client split: browser (createBrowserClient) vs server (createServerClient + cookies()) — use correct factory per render context"
  - "Middleware always calls getUser() to validate session — never getSession() which can return stale data"
  - "RLS policies use (select auth.uid()) not auth.uid() directly — subselect form is more performant in Postgres"

requirements-completed: [SAUTH-02, SAUTH-03, DB-01, DB-04]

# Metrics
duration: 10min
completed: 2026-03-17
---

# Phase 5 Plan 01: Supabase Infrastructure Setup Summary

**Supabase @supabase/ssr client utilities, Next.js session-refresh middleware, and idempotent Postgres schema with profiles table, RLS, and signup trigger**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-17T12:23:41Z
- **Completed:** 2026-03-17T12:33:15Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Installed @supabase/supabase-js and @supabase/ssr packages
- Created three Supabase utility files: browser client, async server client (with cookie read/write), and updateSession middleware helper
- Wired Next.js middleware entry to call updateSession on every non-static request
- Created idempotent supabase/schema.sql with profiles table, two RLS policies, and on_auth_user_created trigger function using security definer
- Build passes with zero TypeScript errors after middleware addition

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Supabase packages and create client utilities** - `1ecd935` (feat)
2. **Task 2: Create Next.js middleware entry and database schema** - `84b2b3d` (feat)

## Files Created/Modified

- `lib/supabase/client.ts` - Browser createClient() using createBrowserClient for Client Components
- `lib/supabase/server.ts` - Async server createClient() using createServerClient + next/headers cookies()
- `lib/supabase/middleware.ts` - updateSession() helper that refreshes the Supabase session via getUser()
- `middleware.ts` - Next.js middleware entry, imports updateSession, excludes static assets via matcher
- `supabase/schema.sql` - Idempotent DDL: profiles table, RLS select/update policies, handle_new_user() trigger
- `.env.local.example` - Template documenting NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

## Decisions Made

- Used NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (not ANON_KEY) — matches Supabase's current naming convention for the publishable/anon key
- Force-added .env.local.example past .gitignore (.env* pattern) — safe template with no secrets, committed for developer onboarding
- npm install required --legacy-peer-deps — @supabase/ssr@0.9.0 peer spec requires supabase-js ^2.97.0 but 2.99.x is installed (compatible, strict peer resolution)
- supabase/ directory is reference SQL only, no Supabase CLI used — schema applied manually via Supabase SQL Editor

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- First npm install attempt failed with ECONNRESET network error (transient). Retry with --legacy-peer-deps succeeded due to peer dependency version mismatch between @supabase/ssr@0.9.0 and @supabase/supabase-js@2.99.x.
- lib/supabase/ files were already present in repo from a prior partial execution (commit 5183cd4, tagged as feat(05-02) but containing 05-01 files). No rework needed — files matched plan spec exactly.

## User Setup Required

**External services require manual configuration.** Before Plan 02 can be tested:

1. Create a Supabase project at https://supabase.com
2. Copy `.env.local.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` — from Supabase Dashboard -> Project Settings -> API -> Project URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — from Supabase Dashboard -> Project Settings -> API -> anon/publishable key
3. Run `supabase/schema.sql` in Supabase Dashboard -> SQL Editor
4. Disable email confirmation: Authentication -> Providers -> Email -> uncheck "Confirm email" -> Save

## Next Phase Readiness

- All three Supabase utility files are in place at expected import paths
- Next.js middleware is wired and the build is clean
- Plan 02 (AuthController with Supabase) can import from `@/lib/supabase/client` and `@/lib/supabase/server`
- No blockers for Plan 02 execution

---
*Phase: 05-supabase-authentication*
*Completed: 2026-03-17*

## Self-Check: PASSED

- FOUND: lib/supabase/client.ts
- FOUND: lib/supabase/server.ts
- FOUND: lib/supabase/middleware.ts
- FOUND: middleware.ts
- FOUND: supabase/schema.sql
- FOUND: .env.local.example
- FOUND: .planning/phases/05-supabase-authentication/05-01-SUMMARY.md
- FOUND commit: 1ecd935 (Task 1)
- FOUND commit: 84b2b3d (Task 2)
