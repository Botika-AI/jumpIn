# JumpIn — Stato dell'Applicazione

## Panoramica

App di check-in QR per eventi JumpIn (Rimini). Gli studenti si registrano, accedono alla dashboard e scansionano un QR code fisico (ingresso o uscita) all'evento. Ogni scansione viene salvata su Supabase e Google Sheets.

---

## Infrastruttura

| Servizio | Dettaglio |
|---|---|
| **GitHub** | `Botika-AI/jumpIn` — branch `main` |
| **Vercel** | Progetto `jumpindeploy` (`prj_X2yqSlPehWFEbzz1ct2xs45lIgHT`) |
| **Supabase** | Progetto `Jump'in` — ref `rneifgkgpabasmzfhkfg` — region `eu-west-3` |
| **Framework** | Next.js App Router (TypeScript) |
| **UI** | Tailwind CSS, glassmorphism, font Montserrat + Inter |

---

## Stack Tecnico

- **Frontend**: Next.js 14 App Router, React, Tailwind CSS
- **Auth + DB**: Supabase (`@supabase/ssr`) — email/password
- **QR Scanner**: `html5-qrcode` (client-side, camera)
- **Backup presenze**: Google Sheets via Google Service Account (`googleapis`)
- **Deployment**: Vercel (auto-deploy su push a `main`)

---

## Schema Database (Supabase — schema `public`)

### `profiles`
| Colonna | Tipo | Note |
|---|---|---|
| `id` | `uuid` PK | FK → `auth.users.id` |
| `first_name` | `text` | |
| `last_name` | `text` | |
| `email` | `text` | |
| `school` | `text` | |
| `dob` | `text` | data di nascita |
| `last_checkin` | `timestamptz` | timestamp ultima scansione (aggiornato lato client) |

Auto-popolata da trigger `on_auth_user_created` al signup.

### `events`
| Colonna | Tipo | Note |
|---|---|---|
| `id` | `text` PK | es. `jumpin_2026_05` |
| `name` | `text` | es. `JumpIn - Maggio 2026` |
| `event_date` | `date` | |
| `location` | `text` | |
| `created_at` | `timestamptz` | |

### `attendances`
| Colonna | Tipo | Note |
|---|---|---|
| `id` | `uuid` PK | auto-generato |
| `user_id` | `uuid` | FK → `profiles.id` |
| `event_id` | `text` | FK → `events.id` |
| `type` | `text` | `'ingresso'` oppure `'uscita'` |
| `scanned_at` | `timestamptz` | default `now()` |

> Le scansioni si **accodano** (INSERT), non si sovrascrivono. Ogni scan crea una nuova riga.

**RLS**: ogni utente autenticato può inserire e leggere solo le proprie righe.

---

## Flusso Check-in

1. Utente loggato → apre scanner → scansiona QR fisico affisso all'evento
2. `decodedText` inviato a `POST /api/checkin` con dati utente
3. Server confronta `decodedText` con `ENTRANCE_QR_VALUE` / `EXIT_QR_VALUE` (env var)
4. Se valido → scrive su Google Sheets + inserisce riga in `attendances` (con `CURRENT_EVENT_ID`)
5. Client aggiorna `profiles.last_checkin`

---

## Variabili d'Ambiente (Vercel)

| Chiave | Descrizione |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL progetto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Anon key Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypass RLS — solo server) |
| `ENTRANCE_QR_VALUE` | Stringa codificata nel QR di ingresso |
| `EXIT_QR_VALUE` | Stringa codificata nel QR di uscita |
| `CURRENT_EVENT_ID` | ID evento attivo (es. `jumpin_2026_05`) |
| `ADMIN_EMAILS` | Email admin separate da virgola (es. `ciliberti.andrea@gmail.com,andrea.ciliberti@botika.ai`) |
| `GOOGLE_SPREADSHEET_ID` | ID Google Spreadsheet di backup |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | JSON service account Google (stringato) |

> Per ogni nuovo evento: aggiorna `CURRENT_EVENT_ID` su Vercel e inserisci il nuovo evento in `public.events`.

---

## Struttura File Chiave

```
app/
  page.tsx                  # Entry point → <AuthController />
  layout.tsx                # Font, metadata, mesh background
  api/
    checkin/route.ts        # POST — valida QR, scrive Sheets + Supabase attendances
  admin/
    page.tsx                # Dashboard admin: QR ingresso/uscita + lista eventi + CSV
    api/
      qr/route.ts           # GET /admin/api/qr?type=ingresso|uscita — PNG server-side
      csv/route.ts          # GET /admin/api/csv?event_id=... — export CSV presenze
lib/
  admin.ts                  # isAdmin(email) — legge ADMIN_EMAILS env var
  supabase/
    client.ts               # Browser client (createBrowserClient)
    server.ts               # Server client (createServerClient + cookies)
    service.ts              # Service role client (bypass RLS, solo server)
    middleware.ts           # Session refresh middleware
  googleSheets.ts           # appendCheckin(), resolveQrTipo()
  schools.ts                # Lista scuole Rimini
components/
  AuthController.tsx        # Stato auth globale, login/register/logout/checkin
  Dashboard.tsx             # Profilo utente + pulsante scanner
  QRScanner.tsx             # Overlay camera html5-qrcode
  LoginForm.tsx
  RegisterForm.tsx
  GlassCard.tsx
middleware.ts               # Next.js middleware → updateSession()
supabase/schema.sql         # Schema completo (idempotente, da eseguire su DB vergine)
```

---

## Dashboard Admin — Completata ✓

### Funzionalità
- `/admin` — pagina protetta (Server Component): mostra QR ingresso/uscita + lista eventi con download CSV
- `/admin/api/qr?type=ingresso|uscita` — genera PNG QR server-side (valori env non esposti al client)
- `/admin/api/csv?event_id=...` — export CSV presenze (BOM UTF-8, compatibile Excel)

### Protezione
- `isAdmin()` in `lib/admin.ts` legge `ADMIN_EMAILS` env var (comma-separated)
- Redirect a `/` se non autenticato; pagina 403 se autenticato ma non admin
- Il CSV usa `SUPABASE_SERVICE_ROLE_KEY` per bypassare RLS e leggere tutte le presenze

### Schema CSV Export
```
Nome,Cognome,Email,Scuola,Tipo,Data e Ora
Mario,Rossi,mario@example.com,Liceo Einstein,ingresso,07/05/2026 21:30:00
Mario,Rossi,mario@example.com,Liceo Einstein,uscita,07/05/2026 23:45:00
```

### Admin Emails Configurate
- `ciliberti.andrea@gmail.com`
- `andrea.ciliberti@botika.ai`

### URL Produzione
`https://jumpindeploy.vercel.app/admin`

### Commit
- `bdcd7bcdc5cc3ae2e58770204b59d5ae3977fd6d` — feat: implementazione iniziale
- `5eeccad242d381ab8376baacaac77526f27ba847` — fix: type cast CSV (profiles array) — **deploy READY** 2026-05-07

---

## MCP Server Configurati (globali — `~/.claude.json`)

| Server | Pacchetto | Scope |
|---|---|---|
| `supabase` | `@supabase/mcp-server-supabase` | user |
| `github` | `@modelcontextprotocol/server-github` | user |
| `vercel` | `vercel-mcp` | user |

---

## Note Operative

- **Nuovo evento**: inserire riga in `public.events` + aggiornare `CURRENT_EVENT_ID` su Vercel + rideploy
- **QR fisici**: il contenuto dei QR è `ENTRANCE_QR_VALUE` / `EXIT_QR_VALUE` — questi vanno stampati e affissi al venue
- **Le scansioni si accodano**: ogni scan = nuova riga in `attendances`. Non c'è limite al numero di volte che uno stesso utente può scansionare
- **Google Sheets** è il backup/vista admin attuale — verrà affiancato dalla dashboard admin
