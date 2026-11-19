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
- **Fase 2** (regole del glossario) in preparazione: stato in [piano-lavori.md](piano-lavori.md).
  - Voce 0 (`supabase/fase2_voce0_iscrizioni_storiche*.sql`, **solo Production**, solo dati, nessuna modifica di schema): iscrizioni accettate per i 12 studenti di "Start-up Weekend" (15–17/05/2026), che avevano solo scansioni. Applicata e verificata in Production il 19/11/2026 (su Development si ferma da sola, come previsto).
  - Voce 1 (`supabase/fase2_voce1_scansione_valida*.sql`, Development e Production): la policy `attendances_insert_own` accetta una Scansione solo con Iscrizione accettata, nei giorni dell'evento (ora italiana) e con `scanned_at = now()`. Applicata e verificata su Development (8/8 prove) e Production il 19/11/2026.
  - Voci 2 e 3 (`supabase/fase2_voce2_badge_automatico*.sql`, Development e Production): crea `badge_studenti_idonei` (regola interna, non eseguibile dall'app), `count_badge_eligible_students` e `assign_badge_by_event_threshold` (solo admin). Contano le Partecipazioni completate a Eventi pubblicati e conclusi in ora italiana, esclusi gli admin; sostituiscono `badge_auto_rules.sql`, mai applicato. ⏸ **Rinviate, non applicare**: per ora i badge sono solo manuali (vedi da-definire.md).
  - Voce 4 (`supabase/fase2_voce4_posti*.sql`, Development e Production): trigger `iscrizioni_controlla_posti` su `iscrizioni_eventi`. A posti esauriti rifiuta nuove Iscrizioni e nuove accettazioni (errore 23514 "Posti esauriti per questo evento"); `max_partecipanti` vuoto = nessun limite. Applicata e verificata su Development (11/11 prove) e Production il 19/11/2026.
  - Voci 5 e 6 (`supabase/fase2_voce5_6_iscrizioni_date*.sql`, Development e Production): lo studente crea un'Iscrizione solo fino al giorno prima di `scadenza_candidature` (senza scadenza: fino al giorno prima di `event_date`) e la annulla solo prima di `event_date`; ora italiana. Applicate e verificate su Development (12/12 prove) e Production il 19/11/2026.
  - Voce 10 in due tempi. 10a (`fase2_voce10a_conteggio_posti.sql`): funzione `posti_accettati()`, solo numeri per evento pubblicato, eseguibile solo da autenticati. Applicata su Development e Production il 19/11/2026 (verificato: anonimo rifiutato, studente legge solo i numeri). 10b (`fase2_voce10b_togli_lettura_accettate.sql`): toglie la policy "Tutti leggono iscrizioni accettate per conteggio posti"; **solo dopo** che il codice di `EsperienzePage`/`HomeDashboard` usa `posti_accettati()` ed è online.
  - Voci 7, 8, 9 (`supabase/fase2_voce7_8_9_materiali_bozze*.sql`): Materiali leggibili solo con Iscrizione accettata; nuovo spazio privato `materiali` (percorso `{event_id}/{file}`, lettura admin o accettati, scrittura solo admin; il codice va ancora aggiornato); studenti vedono solo eventi `pubblicato`. Applicate e verificate su Development (10/10 prove) e Production il 19/11/2026.
- **Bug profilo e account** (`supabase/bug_profilo_admin_elimina_account*.sql`): policy `profiles_update_admin` (l'admin modifica i profili, colonne limitate come per tutti) e RPC `delete_user()` (lo studente elimina solo il proprio account; rifiutata ad admin e anonimi). Applicato e verificato su Development (9/9 prove) e Production il 19/11/2026.

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
| `visibilita` | **Non più usata** dall'app (scelta tolta il 19/11/2026, Q23); colonna rimasta nel DB |
| `form_esterno` | **Non più usata** dall'app (tolta il 19/11/2026, Q13): "Partecipa" crea sempre l'Iscrizione; colonna rimasta nel DB |
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
Ogni scansione = nuova riga. `type`: `ingresso | uscita`. Nessun vincolo di unicità (scansioni ripetute permesse).
Inserimento (policy `attendances_insert_own`): solo per sé, con Iscrizione `accettata`, oggi (ora italiana) tra `event_date` ed `event_end`, e `scanned_at = now()` (l'app non invia `scanned_at`).

### `materiali_eventi`
`tipo`: `link | file`. Studenti leggono solo i Materiali degli Eventi con Iscrizione accettata (policy `materiali_select_accettati`); admin tutto.

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
| `delete_user` | `ProfileSettingsPage` (eliminazione account studente) — cancella solo l'account di chi chiama, a cascata; rifiutata ad admin e anonimi |
| `admin_delete_student` | `StudenteModal` |
| `count_badge_eligible_students` | `AssegnazioneBadge` — **non esiste nel DB**: badge automatico rinviato, script pronto `fase2_voce2_badge_automatico.sql` |
| `assign_badge_by_event_threshold` | `AssegnazioneBadge` — **non esiste nel DB**: come sopra |
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
- `materiali/<eventId>/` — file allegati agli eventi caricati finora dal codice con link pubblico permanente (0 file su Dev e Prod al 19/11/2026); da sostituire con il bucket `materiali`
- `aziende/` — loghi aziende

Bucket `materiali` (**privato**, creato il 19/11/2026):
- `<eventId>/<file>` — file dei Materiali, da aprire con link temporanei (`createSignedUrl`)
- Lettura: admin o studenti con Iscrizione accettata all'evento della cartella; caricamento, modifica e cancellazione solo admin
- Il codice non lo usa ancora (vedi piano-lavori.md)

Bucket `badge-icon`:
- `badges/` — icone badge
- `certificati/` — template attestati
- Lettura pubblica; caricamento, modifica e cancellazione solo admin

> I bucket e le relative policy sono usati dal codice ma **assenti dagli script** in `supabase/`.

---

## Sicurezza RLS

- `auth_is_admin()` — funzione `SECURITY DEFINER` che legge `profiles.is_admin` senza ricorsione RLS. Protegge tutte le scritture admin.
- Studenti accedono solo alle proprie righe (`profiles`, `attendances`, `iscrizioni_eventi`).
- `profiles`: l'admin legge e modifica tutti i profili (policy `profiles_update_admin`), con le stesse colonne autorizzate.
- `profiles`: gli utenti possono modificare **solo** le colonne `first_name, last_name, school, dob, bio, citta, interests, goals, profile_completed_at, last_checkin` (permessi per colonna). Una nuova colonna modificabile dall'app va aggiunta con `GRANT UPDATE (colonna) ON public.profiles TO authenticated`.
- `iscrizioni_eventi` (studente): legge le proprie; le crea solo `in_attesa` e fino al giorno prima della scadenza (senza scadenza: prima dell'inizio dell'evento); le annulla solo se in attesa o accettate e prima dell'inizio dell'evento; nessuna modifica. Trigger `iscrizioni_controlla_posti`: posti mai superati, per tutti.
- Vista `profiles_con_eventi`: `security_invoker = true`.
- **Nuove funzioni**: Supabase concede in automatico l'esecuzione ad `anon` e `authenticated`. Ogni nuova funzione `SECURITY DEFINER` deve controllare chi la chiama e, se non serve all'app, va chiusa con `REVOKE EXECUTE ON FUNCTION ... FROM PUBLIC, anon, authenticated`.
