# Phase 5: Supabase Authentication - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace mock localStorage auth (demo@example.com / password123) with real Supabase authentication. Covers: sign up with full profile, sign in, session management, remove demo account. Does NOT include Google Sheets integration (Phase 6).

</domain>

<decisions>
## Implementation Decisions

### User Profile Storage
- Use a separate `public.profiles` table linked to `auth.users` (standard Supabase pattern)
- Profile row created immediately on signup (not lazily)
- After login, fetch fresh profile data from Supabase (no localStorage cache for profile)
- School field constrained to the existing fixed schools list (not free text)

### Registration Fields
- All fields required: email, password, confirm password, first name, last name, school (dropdown), DOB
- Add a confirm password field (user types password twice)
- Keep all labels and validation messages in Italian
- If email already exists: show Italian error — e.g. "Email già registrata. Accedi invece."

### Email Verification
- Validate email format client-side (no blank/malformed emails accepted)
- No email confirmation step required — user lands on dashboard immediately after signup
- Supabase email confirmation flow is disabled or bypassed

### Session Behavior
- Use Supabase's silent token refresh (auto-refresh in background, user never redirected)
- Persistent session across browser restarts — user stays logged in until explicit logout
- On logout: call `supabase.auth.signOut()` and clear local state

### Claude's Discretion
- Supabase client initialization and environment variable naming
- RLS policies for the profiles table
- Error handling for network failures during auth calls

</decisions>

<specifics>
## Specific Ideas

- The existing schools dropdown in `lib/schools.ts` should be reused as-is for the registration form
- The existing Italian copy and form layout should be preserved — only the auth backend changes
- Remove the demo account check (`email === 'demo@example.com' && password === 'password123'`) entirely

</specifics>

<deferred>
## Deferred Ideas

- Password reset / forgot password flow — not in scope for Phase 5
- Admin user management — future phase
- Social login (Google, etc.) — future milestone

</deferred>

---

*Phase: 05-supabase-authentication*
*Context gathered: 2026-03-14*
