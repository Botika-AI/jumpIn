# JumpIn — Stato dell'Applicazione

## Panoramica

App di check-in QR per eventi JumpIn (Rimini). Gli studenti si registrano, accedono alla dashboard e scansionano un QR code fisico (ingresso o uscita) all'evento. Ogni scansione viene validata e salvata su Supabase interamente lato client.

---

## Infrastruttura

| Servizio | Dettaglio |
|---|---|
| **GitHub** | `Botika-AI/jumpIn` — branch `main` (repo privato) |
| **Vercel** | Progetto `jumpindeploy` (`prj_X2yqSlPehWFEbzz1ct2xs45lIgHT`) |
| **Supabase** | Progetto `Jump'in` — ref `rneifgkgpabasmzfhkfg` — region `eu-west-3` |
| **URL produzione** | `https://jumpindeploy.vercel.app` |

---

## Stack Tecnico

- **Frontend**: Vite + React 19, TypeScript, Tailwind CSS (CDN)
- **Auth + DB**: Supabase (`@supabase/supabase-js`) — email/password
- **QR Scanner**: `html5-qrcode` (client-side, camera)
- **QR Generator**: `qrcode` (admin dashboard, genera PNG client-side)
- **Routing**: `react-router-dom` v7 — `/` utente, `/admin` admin
- **Deployment**: Vercel (SPA rewrites via `vercel.json`)

---

## Variabili d'Ambiente (Vercel + `.env.local`)

| Chiave | Descrizione |
|---|---|
| `VITE_SUPABASE_URL` | URL progetto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Anon/publishable key Supabase |

> Queste sono le **uniche** variabili necessarie. Tutto il resto (auth, RLS, admin) è gestito da Supabase.

---

## Schema Database (Supabase — schema `public`)

### `profiles`
| Colonna | Tipo | Note |
|---|---|---|
| `id` | `uuid` PK | FK → `auth.users.id` |
| `first_name` | `text` | nullable |
| `last_name` | `text` | nullable |
| `email` | `text` | |
| `school` | `text` | nullable |
| `dob` | `text` | data di nascita, nullable |
| `last_checkin` | `timestamptz` | timestamp ultima scansione |
| `is_admin` | `boolean` | default `false` — impostare manualmente via SQL |

Auto-popolata dal trigger `on_auth_user_created` al signup (legge `raw_user_meta_data`).

**Impostare un admin:**
```sql
UPDATE public.profiles SET is_admin = true WHERE email = 'your@email.com';
```

### `events`
| Colonna | Tipo | Note |
|---|---|---|
| `id` | `text` PK | es. `jumpin_2026_05` |
| `name` | `text` | es. `JumpIn - Maggio 2026` |
| `event_date` | `date` | data di inizio |
| `event_end` | `date` | data di fine (nullable — se null = solo `event_date`) |
| `location` | `text` | nullable |
| `created_at` | `timestamptz` | |

### `attendances`
| Colonna | Tipo | Note |
|---|---|---|
| `id` | `uuid` PK | auto-generato |
| `user_id` | `uuid` | FK → `profiles.id` |
| `event_id` | `text` | FK → `events.id` |
| `type` | `text` | `'ingresso'` oppure `'uscita'` |
| `scanned_at` | `timestamptz` | default `now()` |

> Le scansioni si **accodano** (INSERT). Ogni scan = nuova riga. Nessun limite per utente.

### View `profiles_con_eventi`
Vista per export CSV dei profili con gli eventi a cui hanno partecipato:
```sql
SELECT p.*, string_agg(DISTINCT e.id || ' – ' || e.name, ' | ') AS eventi_partecipati
FROM profiles p
INNER JOIN attendances a ON a.user_id = p.id
INNER JOIN events e ON e.id = a.event_id
GROUP BY p.id, ...
```
Solo profili con almeno una scansione. Esportabile da Supabase SQL Editor → Download CSV.

---

## RLS e Sicurezza

- **`auth_is_admin()`** — funzione SECURITY DEFINER che legge `profiles.is_admin` senza recursione RLS
- **profiles**: ogni utente vede solo il proprio profilo; admin vede tutto
- **attendances**: ogni utente vede solo le proprie; admin vede tutto
- **events**: tutti gli autenticati possono leggere; solo admin può inserire/modificare

---

## Flusso Registrazione

1. Form → `supabase.auth.signUp({ email, password, options: { data: { first_name, last_name, school, dob } } })`
2. Trigger `on_auth_user_created` crea riga in `profiles` leggendo `raw_user_meta_data`
3. App fa `profiles.upsert(...)` come backup/aggiornamento
4. Se email già registrata → messaggio "Hai già un account, effettua il login"

---

## Flusso Check-in

1. Utente loggato → apre scanner → scansiona QR fisico affisso all'evento
2. Client parsa il formato: `JUMPIN|{event_id}|{tipo}`
3. Client verifica su Supabase che l'evento esista
4. Controlla che la data odierna sia nel range `[event_date, event_end]`
   - Se evento non trovato → "QR code non valido"
   - Se fuori range → "Evento scaduto" / "Evento non ancora iniziato"
5. INSERT in `attendances` + UPDATE `profiles.last_checkin`

---

## Formato QR Code

```
JUMPIN|{event_id}|{tipo}
```
Esempi:
- `JUMPIN|jumpin_2026_05|ingresso`
- `JUMPIN|jumpin_2026_05|uscita`

I QR vengono generati dall'admin in `/admin` (client-side, libreria `qrcode`) e scaricati come PNG.

---

## Dashboard Admin (`/admin`)

### Accesso
- Colonna `profiles.is_admin = true` (impostata manualmente via SQL)
- Gli utenti admin vedono il bottone ⚙️ nella Dashboard → link a `/admin`
- Navigazione diretta: `jumpindeploy.vercel.app/admin`
- Non loggato → "Login richiesto"; loggato ma non admin → "Accesso negato"

### Funzionalità
- **Crea evento**: ID, Data Inizio, Data Fine (opzionale), Nome, Location
- **QR codes**: generati client-side per ogni evento (ingresso + uscita), scaricabili come PNG
- **Export CSV**: per ogni evento, scarica `presenze_{event_id}.csv` con tutti i dati degli utenti

### Schema CSV Export
```
Nome,Cognome,Email,Scuola,DataNascita,Tipo,DataOra
Mario,Rossi,mario@example.com,Liceo Einstein,2006-01-01,ingresso,08/05/2026 21:30:00
```

### Nuovo evento — procedura
1. Vai su `/admin`
2. Compila il form (ID univoco, data inizio, data fine opzionale, nome, location)
3. Clicca "Crea Evento" → i QR vengono generati automaticamente

> Non serve aggiornare env var su Vercel per ogni nuovo evento.

---

## Struttura File Chiave

```
App.tsx                     # Router: /admin → AdminPage, * → AuthApp (login/register/dashboard)
pages/
  AdminPage.tsx             # Dashboard admin: crea eventi, QR, CSV
components/
  Dashboard.tsx             # Profilo utente + scanner QR + check-in
  QRScanner.tsx             # Overlay camera html5-qrcode
  GlassCard.tsx             # Card glassmorphism riusabile
lib/
  supabase.ts               # Client Supabase (usa __SUPABASE_URL__ / __SUPABASE_KEY__ da Vite)
constants.ts                # Lista scuole Rimini (RIMINI_SCHOOLS)
types.ts                    # UserProfile, JumpInEvent, Attendance, AuthState
index.tsx                   # Entry point React
index.html                  # Font, Tailwind CDN, importmap ESM
vite.config.ts              # Legge VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY → define
vercel.json                 # SPA rewrites: tutte le rotte → index.html
.gitignore                  # Esclude: node_modules, dist, .env.local, .claude/settings.local.json
supabase/
  admin_setup.sql           # Migration di riferimento (già applicata via MCP)
```

---

## Migrazioni Supabase Applicate

| Nome | Descrizione |
|---|---|
| `admin_setup` | Colonna `is_admin`, funzione `auth_is_admin()`, RLS su events/attendances/profiles |
| `make_profile_columns_nullable` | `first_name`, `last_name`, `school`, `dob` → nullable |
| `fix_handle_new_user_idempotent` | Trigger `ON CONFLICT DO UPDATE` — idempotente al re-signup |
| `add_event_end_to_events` | Colonna `event_end date` nullable su `events` |
| `create_view_profiles_con_eventi` | View per CSV profili + eventi partecipati |

---

## MCP Server Configurati (globali — `~/.claude.json`)

| Server | Pacchetto | Scope |
|---|---|---|
| `supabase` | `@supabase/mcp-server-supabase` | user |
| `github` | `@modelcontextprotocol/server-github` | user |
| `vercel` | `vercel-mcp` | user |

---

## Note Operative

- **Nuovo evento**: solo tramite `/admin` — nessuna modifica a env var o codice necessaria
- **Nuovo admin**: `UPDATE public.profiles SET is_admin = true WHERE email = 'your@email.com'`
- **Export presenze con eventi**: `SELECT * FROM profiles_con_eventi` su Supabase SQL Editor
- **Le scansioni si accodano**: ogni scan = nuova riga in `attendances`
- **QR scaduti**: la scansione è bloccata client-side se la data corrente è fuori dal range dell'evento
- **QR non validi**: format check + verifica esistenza evento su DB prima di ogni insert
