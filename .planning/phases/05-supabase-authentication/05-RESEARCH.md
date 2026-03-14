# Phase 5: Supabase Authentication - Research

**Researched:** 2026-03-14
**Domain:** Supabase Auth + @supabase/ssr + Next.js App Router
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**User Profile Storage**
- Use a separate `public.profiles` table linked to `auth.users` (standard Supabase pattern)
- Profile row created immediately on signup (not lazily)
- After login, fetch fresh profile data from Supabase (no localStorage cache for profile)
- School field constrained to the existing fixed schools list (not free text)

**Registration Fields**
- All fields required: email, password, confirm password, first name, last name, school (dropdown), DOB
- Add a confirm password field (user types password twice)
- Keep all labels and validation messages in Italian
- If email already exists: show Italian error — e.g. "Email già registrata. Accedi invece."

**Email Verification**
- Validate email format client-side (no blank/malformed emails accepted)
- No email confirmation step required — user lands on dashboard immediately after signup
- Supabase email confirmation flow is disabled or bypassed

**Session Behavior**
- Use Supabase's silent token refresh (auto-refresh in background, user never redirected)
- Persistent session across browser restarts — user stays logged in until explicit logout
- On logout: call `supabase.auth.signOut()` and clear local state

### Claude's Discretion
- Supabase client initialization and environment variable naming
- RLS policies for the profiles table
- Error handling for network failures during auth calls

### Deferred Ideas (OUT OF SCOPE)
- Password reset / forgot password flow — not in scope for Phase 5
- Admin user management — future phase
- Social login (Google, etc.) — future milestone
</user_constraints>

---

## Summary

Phase 5 replaces the mock localStorage auth in `components/AuthController.tsx` with real Supabase email/password authentication. The project is a Next.js App Router app (no `output: 'export'` — confirmed in `next.config.mjs`), so the full `@supabase/ssr` cookie-based session stack is compatible and is the correct approach.

The standard pattern is: install `@supabase/supabase-js` + `@supabase/ssr`, create two client utility files (browser and server), add `middleware.ts` for silent token refresh, and replace the three mock handlers in `AuthController` (`handleLogin`, `handleRegister`, `handleLogout`) with real Supabase calls. The `profiles` table is created in Supabase with a Postgres trigger that auto-inserts on signup using `raw_user_meta_data`, and RLS policies restrict rows to their owner.

The critical architectural fact is that **`AuthController` must remain a Client Component** (it already has `'use client'`). Supabase's cookie refresh is handled by middleware transparently — `AuthController` calls the browser client, middleware keeps cookies fresh, and the session persists across restarts via httpOnly cookies instead of localStorage. The `last_checkin` field currently stored in localStorage will be cleared from local state; the profiles table already has a `last_checkin` column per REQUIREMENTS.md (DB-01).

**Primary recommendation:** Use `@supabase/supabase-js@^2.99.1` + `@supabase/ssr@^0.9.0`, the trigger-based profile creation pattern, and a thin middleware for token refresh. All three mock handlers in `AuthController` are straightforward replacements — no architectural changes to the component tree are needed.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.99.1 | Auth + DB client | Official Supabase JS SDK |
| @supabase/ssr | ^0.9.0 | Cookie-based SSR session management | Official replacement for deprecated auth-helpers-nextjs |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next/headers (built-in) | Next.js 15+ | `cookies()` for server client | Used inside `lib/supabase/server.ts` |
| next/server (built-in) | Next.js 15+ | `NextRequest`/`NextResponse` | Used inside `middleware.ts` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @supabase/ssr | @supabase/auth-helpers-nextjs | auth-helpers is deprecated; ssr is the current standard |
| Postgres trigger for profile creation | Insert from client after signUp | Trigger is atomic and cannot be skipped by client-side bugs; preferred by Supabase docs |
| Middleware token refresh | Manual refresh on page load | Middleware is transparent, handles Server Components that cannot write cookies |

**Installation:**
```bash
npm install @supabase/supabase-js @supabase/ssr
```

---

## Architecture Patterns

### Recommended Project Structure
```
lib/
├── supabase/
│   ├── client.ts        # Browser client (createBrowserClient)
│   ├── server.ts        # Server client (createServerClient + cookies())
│   └── middleware.ts    # updateSession helper (createServerClient + request cookies)
middleware.ts            # Next.js middleware entry — calls updateSession
.env.local               # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

### Pattern 1: Browser Client (Client Components)
**What:** Singleton-like factory for the browser Supabase client.
**When to use:** Inside any `'use client'` component that calls auth methods.

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
```
Source: Supabase UI Docs — https://supabase.com/ui/docs/nextjs/client

### Pattern 2: Server Client (Server Components / Route Handlers)
**What:** Async factory for the server Supabase client that reads/writes cookies.
**When to use:** Server Components, Route Handlers, Server Actions.

```typescript
// lib/supabase/server.ts
import 'server-only'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — safe to ignore; middleware handles refresh
          }
        },
      },
    }
  )
}
```
Source: Supabase UI Docs — https://supabase.com/ui/docs/nextjs/client

### Pattern 3: Middleware (Token Refresh)
**What:** Refreshes the Supabase session on every request so Server Components see a valid session.
**When to use:** Required for any app using @supabase/ssr with Next.js App Router.

```typescript
// lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Must call getUser() (not getSession()) to refresh the token
  await supabase.auth.getUser()

  return supabaseResponse
}
```

```typescript
// middleware.ts (project root)
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```
Source: Supabase SSR docs — https://supabase.com/docs/guides/auth/server-side/nextjs

### Pattern 4: AuthController Auth Calls (Client Component)
**What:** Replace mock `setTimeout` handlers with real Supabase calls using the browser client.

```typescript
// Inside AuthController.tsx (existing 'use client' component)
import { createClient } from '@/lib/supabase/client'

// Login
const supabase = createClient()
const { data, error } = await supabase.auth.signInWithPassword({ email, password })
if (error) { onError('Credenziali non valide.'); return }
// fetch profile after login:
const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()

// Registration
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { first_name, last_name, school, dob }  // stored as raw_user_meta_data → trigger reads these
  }
})
// Profile row is created by trigger; fetch it immediately after

// Logout
await supabase.auth.signOut()
setUser(null)
setAuthState('login')
```
Source: Supabase Auth docs — https://supabase.com/docs/guides/auth/passwords

### Pattern 5: Session Initialization (Replace localStorage Read)
**What:** On mount, check for an existing Supabase session instead of reading localStorage.

```typescript
// Replace the useIsomorphicLayoutEffect in AuthController
useEffect(() => {
  const supabase = createClient()

  supabase.auth.getUser().then(async ({ data: { user } }) => {
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setUser(profile)
      setAuthState('dashboard')
    } else {
      setAuthState('login')
    }
  })

  // Listen for auth state changes (handles token refresh, external logout)
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_OUT') {
      setUser(null)
      setAuthState('login')
    }
  })
  return () => subscription.unsubscribe()
}, [])
```

### Pattern 6: Profiles Table + RLS
**What:** Supabase SQL for the profiles table, trigger, and RLS policies.

```sql
-- Create the profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  first_name text not null,
  last_name text not null,
  email text not null,
  school text not null,
  dob text not null,
  last_checkin timestamptz
);

alter table public.profiles enable row level security;

-- RLS: users can only see/update their own row
create policy "Users can view own profile"
  on profiles for select
  using ( (select auth.uid()) = id );

create policy "Users can update own profile"
  on profiles for update
  to authenticated
  using ( (select auth.uid()) = id )
  with check ( (select auth.uid()) = id );

-- Trigger: auto-create profile row on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name, last_name, email, school, dob)
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.email,
    new.raw_user_meta_data ->> 'school',
    new.raw_user_meta_data ->> 'dob'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```
Source: Supabase User Management docs — https://supabase.com/docs/guides/auth/managing-user-data
Source: Supabase RLS docs — https://supabase.com/docs/guides/database/postgres/row-level-security

### Anti-Patterns to Avoid

- **`supabase.auth.getSession()` in server code:** Not validated against the auth server; always use `supabase.auth.getUser()` on the server. In `AuthController` (client component) `getUser()` is also preferred.
- **localStorage for session:** Remove all `jumpin_user` localStorage reads/writes. Session lives in httpOnly cookies managed by `@supabase/ssr`.
- **`output: 'export'` in next.config:** Would break middleware and cookie-based auth. Current `next.config.mjs` is empty — this is correct and must remain so.
- **Inserting profile from client only:** If signUp succeeds but the subsequent `from('profiles').insert()` call fails, the user has an auth account but no profile. Use the trigger pattern to guarantee atomicity.
- **Blocking auth confirmation flow:** Per locked decisions, email confirmation is disabled in the Supabase Dashboard (Authentication → Email → "Confirm email" toggle). This is a dashboard setting, not a code setting. Without disabling it, `signUp` returns `user` but `session: null`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session cookie management | Custom cookie logic | `@supabase/ssr` `createServerClient` + middleware | Cookie format, expiry, httpOnly, SameSite handled automatically |
| Token refresh | Manual refresh timer | `updateSession()` in `middleware.ts` | Server Components can't write cookies; middleware proxy is the only correct approach |
| Profile row on signup | Client-side insert after signUp | Postgres trigger `on_auth_user_created` | Atomic; survives network failures between signUp and subsequent insert |
| Auth state change listener | Polling `getUser()` | `supabase.auth.onAuthStateChange()` | Handles tab visibility changes, token expiry events, external signout |
| Email format validation | Custom regex | `type="email"` + `required` HTML attributes (already present) | Per locked decisions, client-side only needed |

**Key insight:** The `@supabase/ssr` package was specifically built to solve the "Server Components can't write cookies" problem in Next.js. Any custom session management would need to re-solve the same problem worse.

---

## Common Pitfalls

### Pitfall 1: Email Confirmation Not Disabled in Dashboard
**What goes wrong:** After `signUp`, `data.session` is `null` (user exists but unconfirmed). Dashboard page never loads. The user sees a loading spinner or gets redirected to login.
**Why it happens:** Supabase projects have email confirmation **enabled by default**.
**How to avoid:** Disable in Supabase Dashboard → Authentication → Providers → Email → uncheck "Confirm email".
**Warning signs:** `signUp` returns `{ user: {...}, session: null }` — check this in console on first test.

### Pitfall 2: `last_checkin` Still in localStorage
**What goes wrong:** After Phase 5, `handleCheckIn` still writes to localStorage. The field becomes stale or out-of-sync with the DB.
**Why it happens:** `handleCheckIn` in `AuthController` currently writes `last_checkin` to localStorage. Phase 5 must update this to write to Supabase (via `supabase.from('profiles').update({ last_checkin: ... })`), or defer to Phase 6.
**How to avoid:** In Phase 5, `handleCheckIn` should update Supabase directly — the `profiles` table already has a `last_checkin` column. If deferred to Phase 6, remove the localStorage write now.
**Warning signs:** Dashboard shows a `last_checkin` that differs from what Supabase has.

### Pitfall 3: Confirm Password Field Missing
**What goes wrong:** Build succeeds but `RegisterForm` only has one password field, violating the locked decision.
**Why it happens:** Current `RegisterForm` already has `password` state but no `confirmPassword` field or mismatch validation.
**How to avoid:** Add `confirmPassword` state + client-side check (`password !== confirmPassword → setError('Le password non coincidono')`) before calling `signUp`.
**Warning signs:** Registration form submits without confirming password.

### Pitfall 4: "Altro" School Handling at Signup
**What goes wrong:** If user selects "Altro" and types a custom school name, `school === 'altro'` gets stored in Supabase instead of the custom value.
**Why it happens:** `RegisterForm` uses `school === 'altro' ? customSchool : school` logic locally, but if this mapping isn't applied before the `signUp` call, the literal value `'altro'` reaches the trigger.
**How to avoid:** Resolve the school value before passing to `signUp options.data`.
**Warning signs:** `profiles.school = 'altro'` in the database.

### Pitfall 5: RLS Blocks Profile INSERT from Trigger
**What goes wrong:** The trigger fails silently (or with a Postgres error) because no INSERT RLS policy exists.
**Why it happens:** RLS is enabled on profiles; the trigger runs as `security definer` (postgres role), which bypasses RLS. However, if the trigger is not marked `security definer`, it runs as `supabase_auth_admin` which does not own public tables.
**How to avoid:** Always declare the trigger function with `security definer set search_path = ''` (shown in the SQL above).
**Warning signs:** User appears in `auth.users` but no row in `public.profiles` after signup.

### Pitfall 6: `useIsomorphicLayoutEffect` Removed Too Aggressively
**What goes wrong:** The current `AuthController` uses `useIsomorphicLayoutEffect` to prevent login-form flash on hard refresh. If replaced with a simple `useEffect` for the Supabase session check, the flash returns.
**Why it happens:** `useEffect` fires after paint; `useLayoutEffect` fires before.
**How to avoid:** Keep the `authState: 'loading'` guard (`if (authState === 'loading') return null`). The async `getUser()` call means there will be a brief loading state — this is acceptable and was already handled in Phase 4 (04-03).

---

## Code Examples

### Supabase Dashboard: Disable Email Confirmation
Navigate to: Authentication → Providers → Email → Uncheck "Confirm email" → Save.
This is a one-time manual step, not code.

### Environment Variables (.env.local)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-publishable-or-anon-key>
```
Note: The new naming uses `PUBLISHABLE_KEY` (previously `ANON_KEY`). Both work; use the publishable key as the dashboard recommends it for new projects.

### signUp with metadata for trigger
```typescript
// Source: https://supabase.com/docs/guides/auth/managing-user-data
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      first_name: firstName,
      last_name: lastName,
      school: resolvedSchool,  // already resolved 'altro' → custom value
      dob,
    }
  }
})
// data.user is set; data.session is set only if email confirmation is disabled
```

### signInWithPassword + fetch profile
```typescript
// Source: https://supabase.com/docs/guides/auth/passwords
const { data, error } = await supabase.auth.signInWithPassword({ email, password })
if (error) {
  onError('Credenziali non valide.')
  return
}
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', data.user.id)
  .single()
// profile shape matches UserProfile interface
```

### Italian error mapping
```typescript
function mapSupabaseError(error: AuthError): string {
  switch (error.message) {
    case 'Invalid login credentials':
      return 'Credenziali non valide.'
    case 'User already registered':
      return 'Email già registrata. Accedi invece.'
    case 'Email not confirmed':
      return 'Conferma la tua email prima di accedere.'
    default:
      return 'Errore di connessione. Riprova.'
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2023 | auth-helpers is deprecated; all new projects use @supabase/ssr |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ~2024 | Either works; new dashboard shows publishable key naming |
| `supabase.auth.getSession()` in server code | `supabase.auth.getUser()` | 2023 | getSession() not validated server-side; getUser() sends request to auth server |
| `supabase.auth.getClaims()` in middleware | `supabase.auth.getUser()` | Fluid | Some docs show getClaims(); getUser() is the widely-documented stable API |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Replaced by `@supabase/ssr`. Do not install.
- `createPagesBrowserClient` / `createPagesServerClient`: Pages Router API; not applicable here.

---

## Open Questions

1. **`handleCheckIn` and `last_checkin` in Phase 5 vs Phase 6**
   - What we know: CONTEXT.md says Phase 5 covers auth only; Phase 6 covers Google Sheets check-in. DB-03 ("QR scan writes last_checkin timestamp to Supabase") is a v2 requirement.
   - What's unclear: Should `handleCheckIn` write `last_checkin` to Supabase in Phase 5, or is that deferred to Phase 6?
   - Recommendation: Write `last_checkin` to Supabase in Phase 5 (it's an auth-DB concern, not a Sheets concern). Remove the localStorage write. This keeps the profile data fresh and avoids a half-baked state between phases.

2. **`UserProfile` type vs Supabase row shape**
   - What we know: Current `UserProfile` has `id: string`. Supabase returns `id: string` (UUID formatted as string). Shape matches.
   - What's unclear: `dob` is stored as `text` in the proposed schema but Supabase might coerce dates. Storing as `text` is safe for display purposes.
   - Recommendation: Keep `dob` as `text` in both the DB schema and TypeScript type.

3. **`outro` / `altro` school value in the DB constraint**
   - What we know: The CONTEXT.md says "school field constrained to the existing fixed schools list (not free text)." But the RIMINI_SCHOOLS list includes `'altro'` as a value and allows custom text.
   - What's unclear: Should the DB enforce a CHECK constraint on school values, or is the frontend list sufficient?
   - Recommendation: No DB CHECK constraint — the "Altro" option allows free-text custom school names (the constraint refers to the dropdown being used, not free-text entry without a dropdown). Store whatever resolved value comes from the form.

---

## Validation Architecture

No automated test framework is configured in this project (no jest.config, vitest.config, or test files outside node_modules). The `workflow.nyquist_validation` key is absent from `.planning/config.json`, treating validation as manual/UAT-based (consistent with how Phases 1–4 were validated).

Phase 5 validation is UAT-based:
- Register new user → confirm profile row in Supabase dashboard
- Login → confirm session cookie set in browser DevTools
- Refresh page → confirm still on dashboard (persistent session)
- Logout → confirm redirected to login, cookie cleared
- Login with wrong password → confirm Italian error message
- Login with duplicate email attempt at registration → confirm Italian error message

---

## Sources

### Primary (HIGH confidence)
- https://supabase.com/ui/docs/nextjs/client — `createBrowserClient`, `createServerClient`, `updateSession` code (verified, fetched directly)
- https://supabase.com/docs/guides/auth/managing-user-data — profiles table SQL + trigger pattern (verified, fetched directly)
- https://supabase.com/docs/guides/database/postgres/row-level-security — RLS policy SQL (verified, fetched directly)
- https://supabase.com/docs/guides/auth/server-side/nextjs — middleware architecture and `getUser()` requirement (verified, fetched directly)
- https://supabase.com/docs/guides/auth/passwords — `signInWithPassword`, `signUp` method signatures (verified via web search)
- `npm view @supabase/ssr version` → `0.9.0` (verified locally)
- `npm view @supabase/supabase-js version` → `2.99.1` (verified locally)
- `npm view @supabase/ssr peerDependencies` → `{ '@supabase/supabase-js': '^2.97.0' }` (verified locally)

### Secondary (MEDIUM confidence)
- WebSearch corroboration of `PUBLISHABLE_KEY` vs `ANON_KEY` naming and email confirmation dashboard toggle
- WebSearch corroboration of `output: export` incompatibility with @supabase/ssr (consistent with Next.js static export limitations)

### Tertiary (LOW confidence)
- Italian error message strings for specific Supabase `AuthError.message` values — these are training-data-era values; validate against actual Supabase error responses during implementation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified via npm, official docs fetched
- Architecture patterns: HIGH — client/server/middleware code fetched from official Supabase UI docs
- Pitfalls: HIGH for structural (email confirmation, trigger security definer, output:export); MEDIUM for Italian error strings (verify at runtime)

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable ecosystem; @supabase/ssr 0.x minor versions may release, but patterns are stable)
