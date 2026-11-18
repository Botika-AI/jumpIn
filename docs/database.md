# docs/database.md

Aggiorna questo file quando cambi lo schema.

---

## Due progetti Supabase

| | Development | Production |
|---|---|---|
| Ref | `mdybkor…` | `rneifgkgpabasmzfhkfg` |
| Usato da | locale (`.env.local`) | Vercel |

Tieni i due progetti **sempre allineati**. Ogni modifica di schema va:
1. Scritta come file `.sql` in `supabase/`
2. Eseguita a mano nel SQL Editor su **entrambi** i progetti
3. Verificata confrontando schema, policy, funzioni, trigger, viste e bucket

Query di verifica utile:
```sql
-- Confronta colonne tra i due DB (eseguila su entrambi e confronta)
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, column_name;
```

---

## Modifiche recenti e in corso

- **Fase 1 sicurezza** (`supabase/sicurezza_fase1*.sql`) applicata su Development e Production il 18/11/2026: vedi "Sicurezza RLS" sotto.
- **Fase 2** (regole del glossario) in preparazione: stato in [piano-modifiche-db.md](piano-modifiche-db.md).

---

## Attenzione a supabase/migrations/

La cartella `supabase/migrations/` contiene **solo 3 migration** e **non rappresenta lo schema reale**. I file `schema.sql` e `schema_complete.sql` sono vecchie istantanee. La fonte di verità è il DB in produzione + i ~25 script in `supabase/*.sql`.

---

## Tabelle

### `profiles`
| Colonna | Note |
|---|---|
| `id` | uuid PK, FK → `auth.users.id` |
| `email`, `first_name`, `last_name`, `school`, `dob` | dati base |
| `is_admin` | boolean, default false — si imposta **solo** dal SQL Editor: il trigger `profiles_proteggi_is_admin` blocca ogni modifica fatta dall'app |
| `last_checkin` | timestamp ultima scansione QR |
| `bio`, `citta` | profilo esteso |
| `interests` | array interessi (compilato in onboarding) |
| `goals` | array obiettivi (scritto in onboarding, mai letto — vedi problemi-noti.md) |
| `profile_completed_at` | impostato dal client (`ProfileSettingsPage`) quando bio, città e almeno un interesse sono compilati; subito dopo viene chiamata la RPC `notify_profile_completed` per la notifica |

### `events`
| Colonna | Note |
|---|---|
| `id` | text PK slug — es. `jumpin_2026_05` |
| `stato` | `bozza` oppure `pubblicato` (NULL = pubblicato) |
| `visibilita` | `solo_studenti | pubblico | studenti_sfocato` |
| `form_esterno` | URL — se presente, "Partecipa" apre il link esterno |
| `max_partecipanti` | nullable; i posti contano solo iscrizioni `accettate` |
| `scadenza_candidature` | nullable |
| `azienda_id` | FK → `aziende.id`, nullable |
| `event_date`, `event_end` | range date; "Concluso" è calcolato lato client |

### `iscrizioni_eventi`
| Colonna | Note |
|---|---|
| `stato` | `in_attesa | accettata | rifiutata` |
| — | Posti disponibili: conta solo le righe `accettata` |
| — | Realtime attivo su questa tabella |

### `attendances`
Ogni scansione = nuova riga. `type`: `ingresso | uscita`. Nessun vincolo di unicità.

### `materiali_eventi`
`tipo`: `link | file`

### `feedback_eventi`
`rating`: 1–5

### `badges`
`visibilita`: `studenti | interno | bozza`

### `badge_assegnazioni`
Un trigger genera una notifica quando viene assegnato un badge.

### `certificati` + `certificati_assegnazioni`
Attestato sbloccato se l'evento è concluso **E** (studente ha ingresso+uscita **oppure** assegnazione manuale da admin). Anche l'assegnazione manuale vale solo a evento concluso.
> Questi oggetti sono usati dal codice ma **assenti dagli script** in `supabase/`.

### `job_positions`
`stato`: `bozza | attivo | chiuso`

### `job_applications`
`stato` mai gestito dal codice (vedi problemi-noti.md).

### `aziende`
`stato`: `attivo | disattivo`. `piano`: `free | premium`. `mostra_partner`: boolean. `password_temp`: **svuotata il 18/11/2026 e da non usare** (era in chiaro e leggibile dagli studenti).

### `notifiche`
`user_id NULL` = broadcast a tutti. Tipi: `evento | sistema | badge | profilo | connessione`.

### `homepage_sections`
Ordine delle sezioni nella home studente.

### `homepage_evidenza`
Eventi scelti dall'admin da mostrare in evidenza.

### `access_logs`
Scritto ad ogni login.

### Portale aziende (disattivato)
`saved_profiles`, `company_interests`, `company_contacts`, `company_searches` (inutilizzata), `sponsorizzazioni_eventi`: accesso **solo admin**. Eccezione: lo studente legge le proprie righe di `company_interests`.

---

## RPC usate dal codice

| RPC | Chiamata da |
|---|---|
| `notify_profile_completed` | `ProfileSettingsPage` — solo per sé stessi (`p_user_id = auth.uid()`) |
| `delete_user` | `ProfileSettingsPage` (eliminazione account studente) — **non esiste nel DB**: il pulsante va in errore |
| `admin_delete_student` | `StudenteModal` |
| `count_badge_eligible_students` | `AssegnazioneBadge` — **non esiste nel DB** (script mai applicato) |
| `assign_badge_by_event_threshold` | `AssegnazioneBadge` — **non esiste nel DB** (script mai applicato) |
| `verify_azienda_login` | `AziendaApp` (portale aziende) — le funzioni del portale non sono più eseguibili da `anon`/`authenticated` |
| `update_azienda_referente` | portale aziende |
| `get_company_dashboard_stats` | portale aziende |
| `get_suggested_profiles` | portale aziende |
| `contact_student` | portale aziende |
| `toggle_save_profile` | portale aziende |
| `get_all_talent_profiles` | portale aziende |
| `get_published_events_for_company` | portale aziende |
| `request_event_sponsorship` | portale aziende |

---

## Storage

Bucket `logos`:
- `eventi/` — copertine eventi
- `materiali/<eventId>/` — file allegati agli eventi
- `aziende/` — loghi aziende

Bucket `badge-icon`:
- `badges/` — icone badge
- `certificati/` — template attestati
- Lettura pubblica; caricamento, modifica e cancellazione solo admin

> I bucket e le relative policy sono usati dal codice ma **assenti dagli script** in `supabase/`.

---

## Sicurezza RLS

- `auth_is_admin()` — funzione `SECURITY DEFINER` che legge `profiles.is_admin` senza ricorsione RLS. Protegge tutte le scritture admin.
- Studenti accedono solo alle proprie righe (`profiles`, `attendances`, `iscrizioni_eventi`).
- `profiles`: gli utenti possono modificare **solo** le colonne `first_name, last_name, school, dob, bio, citta, interests, goals, profile_completed_at, last_checkin` (permessi per colonna). Una nuova colonna modificabile dall'app va aggiunta con `GRANT UPDATE (colonna) ON public.profiles TO authenticated`.
- `iscrizioni_eventi` (studente): legge le proprie, le crea solo `in_attesa`, le annulla solo se non `rifiutata`; nessuna modifica.
- Vista `profiles_con_eventi`: `security_invoker = true`.
- **Nuove funzioni**: Supabase concede in automatico l'esecuzione ad `anon` e `authenticated`. Ogni nuova funzione `SECURITY DEFINER` deve controllare chi la chiama e, se non serve all'app, va chiusa con `REVOKE EXECUTE ON FUNCTION ... FROM PUBLIC, anon, authenticated`.
