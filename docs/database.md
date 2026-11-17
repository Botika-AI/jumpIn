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

## Attenzione a supabase/migrations/

La cartella `supabase/migrations/` contiene **solo 3 migration** e **non rappresenta lo schema reale**. I file `schema.sql` e `schema_complete.sql` sono vecchie istantanee. La fonte di verità è il DB in produzione + i ~25 script in `supabase/*.sql`.

---

## Tabelle

### `profiles`
| Colonna | Note |
|---|---|
| `id` | uuid PK, FK → `auth.users.id` |
| `email`, `first_name`, `last_name`, `school`, `dob` | dati base |
| `is_admin` | boolean, default false — imposta a mano via SQL |
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
Attestato sbloccato se: evento concluso **E** studente ha ingresso+uscita, oppure assegnazione manuale da admin.
> Questi oggetti sono usati dal codice ma **assenti dagli script** in `supabase/`.

### `job_positions`
`stato`: `bozza | attivo | chiuso`

### `job_applications`
`stato` mai gestito dal codice (vedi problemi-noti.md).

### `aziende`
`stato`: `attivo | disattivo`. `piano`: `free | premium`. `mostra_partner`: boolean. `password_temp`: password in chiaro per il portale aziende.

### `notifiche`
`user_id NULL` = broadcast a tutti. Tipi: `evento | sistema | badge | profilo | connessione`.

### `homepage_sections`
Ordine delle sezioni nella home studente.

### `homepage_evidenza`
Eventi scelti dall'admin da mostrare in evidenza.

### `access_logs`
Scritto ad ogni login.

### Portale aziende
`saved_profiles`, `company_interests`, `company_contacts`, `company_searches` (inutilizzata), `sponsorizzazioni_eventi`.

---

## RPC usate dal codice

| RPC | Chiamata da |
|---|---|
| `notify_profile_completed` | `ProfileSettingsPage` |
| `delete_user` | `ProfileSettingsPage` (eliminazione account studente) |
| `admin_delete_student` | `StudenteModal` |
| `count_badge_eligible_students` | `AssegnazioneBadge` |
| `assign_badge_by_event_threshold` | `AssegnazioneBadge` |
| `verify_azienda_login` | `AziendaApp` (portale aziende) |
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

> I bucket e le relative policy sono usati dal codice ma **assenti dagli script** in `supabase/`.

---

## Sicurezza RLS

- `auth_is_admin()` — funzione `SECURITY DEFINER` che legge `profiles.is_admin` senza ricorsione RLS. Protegge tutte le scritture admin.
- Studenti accedono solo alle proprie righe (`profiles`, `attendances`, `iscrizioni_eventi`).
- Vista `profiles_con_eventi`: `security_invoker = true`.
- Policy `anon FOR ALL USING (true)` sulle tabelle del portale aziende — da sistemare (vedi problemi-noti.md).
