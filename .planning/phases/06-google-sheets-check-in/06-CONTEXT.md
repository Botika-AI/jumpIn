# Phase 6: Google Sheets Check-in - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

When a user scans a QR code (entrance or exit), write the check-in event to a Google Sheets spreadsheet via a Next.js API route using a Google Service Account. Supabase remains the primary data store — Sheets is the admin/backup view. Registration does NOT write to Sheets; only QR scan check-ins do.

</domain>

<decisions>
## Implementation Decisions

### Sync behavior
- Check-in only — registration does NOT write to Google Sheets
- Supabase write happens first (existing `handleCheckIn` flow); API route call happens after
- On Sheets write failure: retry once automatically, then fail silently (Supabase write always succeeds regardless)
- Each QR scan appends a new row (not update-in-place) — full history of all entrance/exit events

### Spreadsheet structure
- All column headers and values in Italian
- Columns (in order): `Nome`, `Cognome`, `Email`, `Scuola`, `Data e Ora`, `Tipo`
- `Tipo` values: `Entrata` (entrance QR) or `Uscita` (exit QR)
- App auto-initializes headers: on first call, if row 1 is empty, write the header row before appending data
- One spreadsheet, one sheet tab — all events in one place

### API route design
- Single API route: `POST /api/checkin`
- Called from `AuthController.handleCheckIn` after the Supabase `profiles.update` succeeds
- Payload: `{ nome, cognome, email, scuola, dataOra, tipo }` — all data passed from client
- Route runs server-side (Node.js runtime) — Google credentials never exposed to client

### QR content & entrance/exit detection
- Two QR codes in use: one for entrance (`Entrata`), one for exit (`Uscita`)
- Detection uses configurable env vars: `ENTRANCE_QR_VALUE` and `EXIT_QR_VALUE`
- `AuthController` compares scanned QR content against these values to determine `tipo`
- QR content specifics (actual string values) will be provided during phase execution — executor must wire env vars accordingly
- `ENTRANCE_QR_VALUE` and `EXIT_QR_VALUE` must be added to `.env.local.example`

### Credentials & setup
- Service Account credentials stored as `GOOGLE_SERVICE_ACCOUNT_KEY` env var (full JSON key file content as a string)
- Spreadsheet ID stored as `GOOGLE_SPREADSHEET_ID` env var
- Code will be ready to accept credentials via env vars — actual credentials provided later
- Both vars must be added to `.env.local.example`

### Claude's Discretion
- Google Sheets library choice (googleapis vs google-spreadsheet vs similar)
- Exact retry implementation (delay, mechanism)
- TypeScript types for the API request/response
- How to handle `GOOGLE_SERVICE_ACCOUNT_KEY` JSON parsing (try/catch on JSON.parse)

</decisions>

<specifics>
## Specific Ideas

- Italian everywhere: column headers (`Nome`, `Cognome`, `Email`, `Scuola`, `Data e Ora`, `Tipo`) and cell values (`Entrata`, `Uscita`)
- `Data e Ora` should be a human-readable Italian datetime format (not ISO string)
- QR content parsing logic lives in `AuthController` or a utility — executor decides placement

</specifics>

<deferred>
## Deferred Ideas

- Vercel MIDDLEWARE_INVOCATION_FAILED error (from Phase 5): needs Supabase env vars added to Vercel project settings and a redeploy — not a code change, but must be resolved before testing Phase 6 on Vercel
- Registration sync to Sheets — explicitly out of scope for Phase 6 (check-in only)
- Admin error reporting / Sheets failure logging — not needed for v1
- QR code content validation (beyond entrance/exit detection) — deferred per PRD

</deferred>

---

*Phase: 06-google-sheets-check-in*
*Context gathered: 2026-03-17*
