# Phase 6: Google Sheets Check-in - Research

**Researched:** 2026-03-17
**Domain:** Google Sheets API v4 / Next.js App Router Route Handlers / Service Account Authentication
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Sync behavior**
- Check-in only — registration does NOT write to Google Sheets
- Supabase write happens first (existing `handleCheckIn` flow); API route call happens after
- On Sheets write failure: surface an Italian error to the user (Claude decides exact wording)
- If Sheets write fails, the Supabase `last_checkin` write still stands — do NOT roll back
- Each QR scan appends a new row (not update-in-place) — full history of all entrance/exit events

**Spreadsheet structure**
- All column headers and values in Italian
- Columns (in order): `Nome`, `Cognome`, `Email`, `Scuola`, `Data e Ora`, `Tipo`
- `Tipo` values: `Entrata` (entrance QR) or `Uscita` (exit QR)
- App auto-initializes headers: on first call, if row 1 is empty, write the header row before appending data
- One spreadsheet, one sheet tab — all events in one place

**API route design**
- Single API route: `POST /api/checkin`
- Called from `AuthController.handleCheckIn` after the Supabase `profiles.update` succeeds
- Payload: `{ nome, cognome, email, scuola, dataOra, tipo }` — all data passed from client
- Route runs server-side (Node.js runtime) — Google credentials never exposed to client

**QR content & entrance/exit detection**
- Two QR codes in use: one for entrance (`Entrata`), one for exit (`Uscita`)
- Detection uses configurable env vars: `ENTRANCE_QR_VALUE` and `EXIT_QR_VALUE`
- `AuthController` compares scanned QR content against these values to determine `tipo`
- QR content specifics (actual string values) will be provided during phase execution — executor must wire env vars accordingly
- `ENTRANCE_QR_VALUE` and `EXIT_QR_VALUE` must be added to `.env.local.example`

**Credentials & setup**
- Service Account credentials stored as `GOOGLE_SERVICE_ACCOUNT_KEY` env var (full JSON key file content as a string)
- Spreadsheet ID stored as `GOOGLE_SPREADSHEET_ID` env var
- Code will be ready to accept credentials via env vars — actual credentials provided later
- Both vars must be added to `.env.local.example`

### Claude's Discretion
- Google Sheets library choice (googleapis vs google-spreadsheet vs similar)
- Exact retry implementation (delay, mechanism)
- TypeScript types for the API request/response
- How to handle `GOOGLE_SERVICE_ACCOUNT_KEY` JSON parsing (try/catch on JSON.parse)

### Deferred Ideas (OUT OF SCOPE)
- Vercel MIDDLEWARE_INVOCATION_FAILED error (from Phase 5): needs Supabase env vars added to Vercel project settings and a redeploy — not a code change, but must be resolved before testing Phase 6 on Vercel
- Registration sync to Sheets — explicitly out of scope for Phase 6 (check-in only)
- Admin error reporting / Sheets failure logging — not needed for v1
- QR code content validation (beyond entrance/exit detection) — deferred per PRD
</user_constraints>

<phase_requirements>
## Phase Requirements

Phase 6 requirements are derived from CONTEXT.md locked decisions (GS-01/GS-03/GS-04 in REQUIREMENTS.md map to this phase with modifications per CONTEXT.md):

| ID | Description | Research Support |
|----|-------------|-----------------|
| GS-01 | Service Account authentication via Next.js API route | googleapis v171 JWT auth with JSON key from env var |
| GS-03-mod | QR scan appends new row to Google Sheet (not update — CONTEXT overrides original GS-03) | spreadsheets.values.append with INSERT_ROWS |
| GS-04 | Async writes — Supabase always succeeds; Sheets failure surfaces Italian error | await-based call after Supabase write; try/catch surfaces Italian message |
| GS-INIT | Auto-initialize header row if sheet is empty | spreadsheets.values.get row 1, write headers if empty |
| GS-ENV | Four env vars added to .env.local.example | GOOGLE_SERVICE_ACCOUNT_KEY, GOOGLE_SPREADSHEET_ID, ENTRANCE_QR_VALUE, EXIT_QR_VALUE |
| GS-QR | AuthController detects Entrata/Uscita from scanned QR value via env vars | decodedText comparison in handleCheckIn or QRScanner.handleScan |
</phase_requirements>

---

## Summary

This phase adds a Google Sheets audit trail to every QR scan check-in event. The architecture is: QR scan → `Dashboard.handleScan` passes `decodedText` to `AuthController.handleCheckIn` → Supabase update executes (existing) → client calls `POST /api/checkin` with user data + `tipo` → server-side route authenticates with Google Service Account and appends one row to the spreadsheet.

The key technical decision (Claude's discretion) is library choice: **use `googleapis` v171** (the official Google Node.js client) rather than `google-spreadsheet`. The project already uses an official Google SDK (Supabase), and `googleapis` is Google's own maintained library with full TypeScript types, zero extra dependencies beyond `google-auth-library`. The `google-spreadsheet` wrapper is friendlier but introduces an intermediary abstraction that could lag behind API changes.

The most common pitfall in this integration is the **private key newline handling** when the full JSON key is stored as a single env var (`GOOGLE_SERVICE_ACCOUNT_KEY`). The JSON key has literal `\n` sequences in the `private_key` field. When stored verbatim in `.env.local`, `JSON.parse` handles them correctly since they remain valid JSON escapes. However, some deployment platforms (notably Vercel's dashboard UI) re-encode these, causing auth failures. The recommended mitigation is to parse `GOOGLE_SERVICE_ACCOUNT_KEY` with `JSON.parse` at runtime and use `credentials.private_key` directly without further replace calls.

**Primary recommendation:** Use `googleapis` v171 with `google-auth-library` JWT auth. Parse `GOOGLE_SERVICE_ACCOUNT_KEY` via `JSON.parse` in the route handler. Call `spreadsheets.values.get` to check row 1, write headers if empty, then call `spreadsheets.values.append` with `insertDataOption: 'INSERT_ROWS'`. Wrap everything in try/catch — Supabase write stands regardless.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `googleapis` | ^171.4.0 | Google Sheets API v4 client | Google's official Node.js SDK; full TypeScript support; includes auth helpers |
| `google-auth-library` | ^10.6.2 | JWT / Service Account token management | Peer dependency of googleapis; required for `new google.auth.JWT()` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none extra) | — | All needed functionality is in googleapis + google-auth-library | These two packages are sufficient for append-only sheet writes |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `googleapis` | `google-spreadsheet` v5.2 | google-spreadsheet has a friendlier API (`sheet.addRow({...})`). However it adds an extra dependency layer and lags Google's official releases. For a simple append operation, the added complexity is not justified. |
| `googleapis` | Raw HTTP fetch to Sheets REST API | Avoids npm packages entirely but requires manual token refreshing — OAuth2 token management is non-trivial. Not recommended. |

**Installation:**
```bash
npm install googleapis google-auth-library
```

---

## Architecture Patterns

### Recommended Project Structure
```
app/
└── api/
    └── checkin/
        └── route.ts           # POST handler — Sheets append logic
lib/
└── googleSheets.ts            # Service: auth + append + header-init helper
components/
└── AuthController.tsx         # (existing) — add QR tipo detection + POST /api/checkin call
```

### Pattern 1: Next.js App Router Route Handler (POST)

**What:** A `route.ts` file exported from `app/api/checkin/` handles HTTP POST requests server-side. The Node.js runtime has access to env vars and googleapis — credentials never reach the browser.

**When to use:** Any server-side mutation that must keep credentials secret (Google Service Account) and be callable from client components.

**Example:**
```typescript
// app/api/checkin/route.ts
// Source: https://nextjs.org/docs/app/getting-started/route-handlers (v16.1.7, 2026-03-16)
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  // ... process body, call Sheets
  return Response.json({ ok: true });
}
```

### Pattern 2: Google Sheets JWT Service Account Auth

**What:** Parse the full JSON key from `GOOGLE_SERVICE_ACCOUNT_KEY` env var, create a JWT auth client, instantiate the Sheets API client.

**When to use:** Every server-side route that calls Sheets — create auth once per request (lightweight).

**Example:**
```typescript
// lib/googleSheets.ts
// Source: googleapis GitHub README + google-auth-library docs
import { google } from 'googleapis';

function getSheetsClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!);
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}
```

Note: `JSON.parse` of the full key file works because the private key's `\n` sequences are valid JSON escapes — no `.replace()` needed when using the full JSON object approach.

### Pattern 3: Header Auto-Initialization

**What:** On first call, check if row 1 is empty. If so, write Italian headers before appending data.

**When to use:** The locked decision specifies auto-init on first call.

**Example:**
```typescript
// Source: Google Sheets API v4 official docs
async function ensureHeaders(sheets: any, spreadsheetId: string) {
  const check = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'A1:F1',
  });
  const row1 = check.data.values;
  if (!row1 || row1.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'A1:F1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [['Nome', 'Cognome', 'Email', 'Scuola', 'Data e Ora', 'Tipo']],
      },
    });
  }
}
```

### Pattern 4: Append Row

**What:** Append a data row using `spreadsheets.values.append`. The range `A:F` tells the API to find the existing table and append below it.

**Example:**
```typescript
// Source: https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/append
await sheets.spreadsheets.values.append({
  spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
  range: 'A:F',
  valueInputOption: 'USER_ENTERED',
  insertDataOption: 'INSERT_ROWS',
  requestBody: {
    values: [[nome, cognome, email, scuola, dataOra, tipo]],
  },
});
```

`insertDataOption: 'INSERT_ROWS'` inserts new rows for each append — this ensures existing rows are never overwritten.

### Pattern 5: Italian Datetime Formatting

**What:** Format the check-in timestamp as Italian human-readable string for `Data e Ora` column.

**Example:**
```typescript
// Source: MDN — Date.prototype.toLocaleString()
const dataOra = new Date().toLocaleString('it-IT', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});
// Output: "17/03/2026, 14:30:45"
```

This formatting happens **client-side** before sending the payload (or server-side in the route handler using the `dataOra` string from the payload).

### Pattern 6: QR Tipo Detection in AuthController

**What:** Compare scanned QR content to env var values to determine `Entrata` vs `Uscita`. The env vars `ENTRANCE_QR_VALUE` and `EXIT_QR_VALUE` must be prefixed with `NEXT_PUBLIC_` to be readable client-side, since `AuthController` is a Client Component (`'use client'`).

**When to use:** QR scan fires `onScan(decodedText)` in Dashboard — `AuthController.handleCheckIn` receives `decodedText` and resolves tipo.

**Example:**
```typescript
// In AuthController.handleCheckIn — client component reads NEXT_PUBLIC_ vars
const handleCheckIn = async (decodedText: string) => {
  if (!user) return;

  const entranceValue = process.env.NEXT_PUBLIC_ENTRANCE_QR_VALUE;
  const exitValue = process.env.NEXT_PUBLIC_EXIT_QR_VALUE;

  let tipo: string;
  if (decodedText === entranceValue) {
    tipo = 'Entrata';
  } else if (decodedText === exitValue) {
    tipo = 'Uscita';
  } else {
    // Unknown QR — still log to Sheets? Per CONTEXT: detection via env vars.
    // Executor decision: treat as Entrata or skip Sheets write.
    tipo = 'Entrata'; // safe default
  }

  // 1. Supabase write (existing)
  const supabase = createClient();
  const checkinTime = new Date().toISOString();
  const { error } = await supabase.from('profiles')
    .update({ last_checkin: checkinTime })
    .eq('id', user.id);
  if (error) return;
  setUser({ ...user, last_checkin: checkinTime });

  // 2. Sheets write (new — fire after Supabase)
  const dataOra = new Date().toLocaleString('it-IT', { ... });
  try {
    const res = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: user.first_name,
        cognome: user.last_name,
        email: user.email,
        scuola: user.school,
        dataOra,
        tipo,
      }),
    });
    if (!res.ok) {
      // Surface Italian error — Supabase write already stands
      setSheetsError('Errore di sincronizzazione. Il check-in è stato registrato.');
    }
  } catch {
    setSheetsError('Errore di sincronizzazione. Il check-in è stato registrato.');
  }
};
```

**IMPORTANT: Env var naming for client-side access.** Because `AuthController` is a Client Component, QR detection env vars MUST be `NEXT_PUBLIC_ENTRANCE_QR_VALUE` and `NEXT_PUBLIC_EXIT_QR_VALUE` (not `ENTRANCE_QR_VALUE`). The CONTEXT.md says to add them to `.env.local.example` as `ENTRANCE_QR_VALUE` and `EXIT_QR_VALUE` — executor should confirm whether detection lives in AuthController (client, needs NEXT_PUBLIC_) or a server utility called from the route (server-side, no prefix needed). Recommendation: pass `decodedText` in the `/api/checkin` payload and do tipo detection server-side in the route handler using non-prefixed env vars. This avoids leaking QR values to the client bundle.

### Anti-Patterns to Avoid
- **Using `output: 'export'` (static export mode):** Check `next.config.mjs` — currently empty `{}` so dynamic routes work. If static export had been set, API routes would fail. Current config is fine.
- **Storing private key as two separate env vars:** CONTEXT.md locks `GOOGLE_SERVICE_ACCOUNT_KEY` as full JSON string. Do not split into `CLIENT_EMAIL` + `PRIVATE_KEY` even though many tutorials show this pattern.
- **Calling Sheets API from client code:** Credentials would be exposed. All Sheets logic MUST be in the route handler (`app/api/checkin/route.ts`).
- **Rolling back Supabase on Sheets failure:** Explicitly forbidden by CONTEXT.md — Sheets failure is non-fatal.
- **`fire-and-forget` (no await on fetch('/api/checkin')):** The CONTEXT.md requires surfacing an Italian error on Sheets failure — this requires awaiting the fetch response.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Google OAuth2 token refresh | Custom token expiry + refresh logic | `google.auth.JWT` from googleapis | JWT auth auto-refreshes tokens; manual refresh logic has many edge cases |
| Sheets range detection for append | Custom "find last row" logic | `spreadsheets.values.append` with range `A:F` | The append endpoint auto-detects the last row of the table |
| Retry on transient 429/503 | Custom retry loop | Build simple 1-retry with 1s delay (acceptable for v1) | googleapis does NOT have built-in retry; but v1 with low traffic does not need sophisticated retry |
| Italian datetime format | Custom date formatting string builder | `new Date().toLocaleString('it-IT', {...})` | Native Intl API handles all Italian locale rules correctly |

**Key insight:** The Google Sheets API v4 `append` endpoint is far smarter than it appears — specifying a broad range like `A:F` causes it to find the existing data table and insert rows below it. No "find last row" logic is needed.

---

## Common Pitfalls

### Pitfall 1: Private Key Newline Corruption
**What goes wrong:** Auth fails with `error:09091064:PEM routines:PEM_read_bio:no start line` or similar crypto error.
**Why it happens:** The service account JSON has `"private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"`. When this JSON is stored as `GOOGLE_SERVICE_ACCOUNT_KEY` in `.env.local`, the `\n` sequences are valid JSON — `JSON.parse()` converts them to real newlines correctly. The problem occurs if the value is pasted WITHOUT quotes into the env file (not as JSON), or if Vercel's dashboard re-encodes them.
**How to avoid:** Store the ENTIRE contents of the Google service account `.json` file as the value of `GOOGLE_SERVICE_ACCOUNT_KEY` (the full JSON object as a string). Parse with `JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!)` at runtime. Do NOT add extra `.replace(/\\n/g, '\n')` — that is only needed when the private key is stored as a raw string (not inside a JSON object).
**Warning signs:** Auth error on first request but not locally; works locally but fails on Vercel.

### Pitfall 2: Service Account Not Shared on the Spreadsheet
**What goes wrong:** API call returns 403 `The caller does not have permission`.
**Why it happens:** The Google Service Account has a `client_email` like `name@project.iam.gserviceaccount.com`. The spreadsheet must be explicitly shared with this email (Editor access) — it's not automatically accessible.
**How to avoid:** Document in `.env.local.example` comments that the spreadsheet must be shared with the service account email. Executor must do this during setup.
**Warning signs:** All env vars correct but every request returns 403.

### Pitfall 3: Env Var Prefix for Client-Side QR Detection
**What goes wrong:** `process.env.ENTRANCE_QR_VALUE` is `undefined` in the browser — AuthController is a Client Component.
**Why it happens:** Next.js only exposes `NEXT_PUBLIC_*` env vars to the client bundle. Non-prefixed vars are server-only.
**How to avoid:** Either (a) prefix the QR env vars as `NEXT_PUBLIC_` for client-side detection, or (b) pass `decodedText` in the API payload and do detection in the server-side route handler using non-prefixed vars. Option (b) is recommended — keeps QR values out of the client bundle.
**Warning signs:** `tipo` is always `undefined` or falls through to default.

### Pitfall 4: Dashboard.handleScan Does Not Pass decodedText to AuthController
**What goes wrong:** `tipo` cannot be determined because `AuthController.handleCheckIn` receives no QR content.
**Why it happens:** Current `Dashboard.handleScan` calls `onCheckIn()` with no arguments. The `handleCheckIn` signature in AuthController takes no parameters. Both must be updated to pass `decodedText`.
**How to avoid:** Plan must include updating `onCheckIn` prop signature in `DashboardProps` interface and `Dashboard.handleScan` to pass `decodedText`, and updating `AuthController.handleCheckIn` to accept it.
**Warning signs:** Compilation error on prop mismatch; or all check-ins write same default `tipo`.

### Pitfall 5: Header Init Race Condition on Concurrent Requests
**What goes wrong:** Two simultaneous check-ins both check row 1, both see empty, both write headers — resulting in two header rows.
**Why it happens:** The check-then-write for header init is not atomic.
**How to avoid:** For v1 (low-traffic single-user event), this is acceptable risk. Note the limitation. If needed, the simple mitigation is: the header init only writes if `values` array is empty — duplicate headers would only appear if truly simultaneous (millisecond precision). Low risk for this use case.
**Warning signs:** Row 1 AND row 2 contain headers.

### Pitfall 6: Next.js Static Export Breaking API Routes
**What goes wrong:** `app/api/checkin/route.ts` causes build error if `output: 'export'` is set.
**Why it happens:** Static export mode disables all server-side routes.
**How to avoid:** Verify `next.config.mjs` has NO `output: 'export'` setting. Current config is `const nextConfig = {}` — safe.
**Warning signs:** `next build` errors: "API routes cannot be used with next export".

---

## Code Examples

### Complete Route Handler Pattern
```typescript
// app/api/checkin/route.ts
// Source: Next.js official docs v16.1.7 + googleapis pattern
import { NextRequest } from 'next/server';
import { google } from 'googleapis';

interface CheckInPayload {
  nome: string;
  cognome: string;
  email: string;
  scuola: string;
  dataOra: string;
  tipo: string; // 'Entrata' | 'Uscita' — or raw decodedText if detection is server-side
}

const HEADERS = ['Nome', 'Cognome', 'Email', 'Scuola', 'Data e Ora', 'Tipo'];

function getSheetsClient() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not set');
  const credentials = JSON.parse(raw);
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

async function ensureHeaders(sheets: ReturnType<typeof google.sheets>, spreadsheetId: string) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'A1:F1',
  });
  if (!res.data.values || res.data.values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'A1:F1',
      valueInputOption: 'RAW',
      requestBody: { values: [HEADERS] },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CheckInPayload = await request.json();
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    if (!spreadsheetId) {
      return Response.json({ error: 'Configurazione mancante.' }, { status: 500 });
    }

    const sheets = getSheetsClient();
    await ensureHeaders(sheets, spreadsheetId);

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'A:F',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [[
          body.nome,
          body.cognome,
          body.email,
          body.scuola,
          body.dataOra,
          body.tipo,
        ]],
      },
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error('[checkin] Sheets write failed:', err);
    return Response.json(
      { error: 'Errore di sincronizzazione con Google Sheets.' },
      { status: 500 }
    );
  }
}
```

### AuthController handleCheckIn Update
```typescript
// components/AuthController.tsx (modified handleCheckIn)
const handleCheckIn = async (decodedText: string) => {
  if (!user) return;
  const supabase = createClient();
  const checkinTime = new Date().toISOString();

  // 1. Supabase write (primary — must succeed)
  const { error } = await supabase
    .from('profiles')
    .update({ last_checkin: checkinTime })
    .eq('id', user.id);
  if (!error) {
    setUser({ ...user, last_checkin: checkinTime });
  }

  // 2. Sheets write (secondary — failure is non-fatal)
  const dataOra = new Date(checkinTime).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  try {
    const res = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: user.first_name,
        cognome: user.last_name,
        email: user.email,
        scuola: user.school,
        dataOra,
        decodedText, // server resolves tipo from ENTRANCE_QR_VALUE / EXIT_QR_VALUE
      }),
    });
    if (!res.ok) {
      // Surface non-fatal Italian error — Supabase write stands
      // (show via state variable in Dashboard or AuthController)
    }
  } catch {
    // Network error — non-fatal, Supabase write stands
  }
};
```

### .env.local.example additions
```bash
# Google Sheets Integration
# Paste entire contents of Google Service Account JSON key file
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"name@project.iam.gserviceaccount.com",...}'
GOOGLE_SPREADSHEET_ID=your_spreadsheet_id_here

# QR Code Values (must match the actual QR codes used at the event)
# IMPORTANT: These are server-side only — do NOT prefix with NEXT_PUBLIC_
# The scanned QR content is passed in the API payload; tipo detection happens server-side
ENTRANCE_QR_VALUE=your_entrance_qr_content_here
EXIT_QR_VALUE=your_exit_qr_content_here
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Next.js Pages Router `pages/api/*.ts` | App Router `app/api/*/route.ts` with Web Request/Response | Next.js 13+ | Route files use `export async function POST(req: Request)` not `export default function handler(req, res)` |
| `google.auth.GoogleAuth` with ADC | `google.auth.JWT` with explicit service account credentials | Stable | JWT is explicit and works without GCP environment; required for non-GCP deploys (Vercel) |
| Separate `GOOGLE_CLIENT_EMAIL` + `GOOGLE_PRIVATE_KEY` env vars | Single `GOOGLE_SERVICE_ACCOUNT_KEY` JSON string | Project decision | Simpler credential management; JSON.parse extracts all fields |
| google-spreadsheet v3 (deprecated) | google-spreadsheet v5 or googleapis v171 | 2023+ | v3 used v3 Sheets API which is deprecated |

**Deprecated/outdated:**
- `pages/api/checkin.ts` style: This project uses App Router, so route handlers go in `app/api/checkin/route.ts`
- `new google.auth.OAuth2(...)` for service accounts: Use `google.auth.JWT` for service-to-service (no user interaction)
- Sheets API v3: Fully deprecated by Google; all new code must use v4

---

## Open Questions

1. **Where does `tipo` detection live: client or server?**
   - What we know: `AuthController` is a Client Component; env vars without `NEXT_PUBLIC_` prefix are not available client-side
   - What's unclear: CONTEXT.md says "AuthController compares scanned QR content against these values" but also says env vars are `ENTRANCE_QR_VALUE` (no NEXT_PUBLIC prefix)
   - Recommendation: Do tipo detection **server-side** in `app/api/checkin/route.ts`. Pass `decodedText` in the payload. Route handler compares against `process.env.ENTRANCE_QR_VALUE` / `process.env.EXIT_QR_VALUE`. This keeps QR values out of the client bundle.

2. **Where to display the non-fatal Sheets error to the user?**
   - What we know: CONTEXT.md says "surface an Italian error to the user"; exact wording is Claude's discretion
   - What's unclear: Dashboard's existing `success` state shows a checkmark overlay — a Sheets error would need a separate error display
   - Recommendation: Add a `sheetsError` state to `AuthController`, passed down to `Dashboard` as a prop. Display a dismissable banner below the success checkmark: `"Check-in registrato. Errore di sincronizzazione con il registro."` This distinguishes the fatal (Supabase) failure from the non-fatal (Sheets) one.

3. **Retry logic specifics**
   - What we know: CONTEXT.md says "exact retry implementation is Claude's discretion"
   - What's unclear: Is 1 retry acceptable or is the user expecting robust retry?
   - Recommendation: For v1 with low-traffic event use, implement **1 immediate retry** (no delay) inside the route handler's catch block before returning 500. Simple, adds resilience against transient 429s without complexity.

---

## Sources

### Primary (HIGH confidence)
- Next.js official docs v16.1.7 (2026-03-16) — Route Handlers, POST body parsing, Response API
- Google Sheets API v4 official docs — `spreadsheets.values.append` method, `insertDataOption`, `valueInputOption`
- googleapis npm registry — confirmed current version 171.4.0
- google-auth-library npm registry — confirmed current version 10.6.2

### Secondary (MEDIUM confidence)
- https://github.com/theoephraim/node-google-spreadsheet — google-spreadsheet v5.2.0 (Feb 14 2026), service account auth pattern, `sheet.addRow()` API
- https://github.com/vercel/next.js/discussions/38430 — Verified Vercel env var newline encoding issue; CLI-based entry recommended as workaround
- https://manuelsanchezdev.com/blog/nextjs-react-typescript-google-sheets/ — googleapis JWT pattern with Next.js server actions
- https://www.adamdrake.dev/blog/working-with-googlesheets-api-nextjs — private key `.replace(/\\n/g, '\n')` pattern (needed only for raw string approach, not JSON.parse)

### Tertiary (LOW confidence)
- Multiple blog posts (Medium, DEV Community) — general googleapis + Next.js patterns, cross-verified against official docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — googleapis and google-auth-library versions confirmed via npm registry
- Architecture: HIGH — Next.js App Router route handler pattern confirmed via official docs v16.1.7
- Pitfalls: HIGH — newline/Vercel issue confirmed across multiple sources including official GitHub discussion; env var prefix issue is documented Next.js behavior
- QR detection placement: MEDIUM — recommendation is server-side, but CONTEXT.md wording slightly implies client-side; executor should clarify

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (googleapis is stable; Next.js App Router route handler API is stable)
