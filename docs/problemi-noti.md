# docs/problemi-noti.md

Quando risolvi un problema, toglilo da questo elenco.

---

## Logica duplicata

- **"Evento completato"** (ingresso + uscita in `attendances`) è ricalcolato indipendentemente in: `HomeDashboard`, `ProfileSettingsPage`, `AdminBadge`, `EsperienzePage`, `IMieiPage`.
- **Sblocco attestato** è ricalcolato sia in `EsperienzePage` sia in `IMieiPage`.
- **Formattazione date** (es. `toLocaleDateString` con opzioni specifiche) è copiata in più file.
- **Accetta/rifiuta iscrizioni**: in `AdminEventi` senza controllo posti; in `AdminCandidature` con controllo posti.
- **`generatePassword`**: funzione duplicata in più punti.

---

## Regole incoerenti

- Il **badge automatico** conta qualsiasi presenza (anche solo ingresso o solo uscita).
- **Attestati** e **progressi studente** richiedono ingresso + uscita.

---

## Regole applicate solo lato client (non validate dal DB)

- **Posti massimi** degli eventi: il DB non ha vincoli; controllato solo in `AdminCandidature`.
- **Validità del QR**: non verifica che lo studente sia iscritto e accettato; non blocca doppie scansioni dello stesso tipo.
- **Visibilità degli eventi** (`visibilita`): non applicata a livello RLS.
- **Scadenza iscrizioni** (`scadenza_candidature`): mai applicata.

---

## Valori fissi nel codice

- Obiettivi progressi studente: **5 badge** e **3 eventi** — hardcoded in `HomeDashboard`.
- Messaggio "Feedback Champion" mostrato nella UI, ma il badge corrispondente non viene mai assegnato.
- Richieste form aziende: dati finti (`MOCK_RICHIESTE`) in `AziendaModal`.

---

## Bug date

Alcune parti del codice usano UTC (`toISOString`), altre l'ora locale. Possono non coincidere vicino alla mezzanotte.

---

## Canale realtime non chiuso

Il canale realtime su `iscrizioni_eventi` aperto in `EsperienzePage` non viene chiuso allo smontaggio del componente — potenziale memory leak e comportamenti inattesi.

---

## Dati scritti ma mai letti (e viceversa)

| Campo / tabella | Problema |
|---|---|
| `profiles.goals` | Scritto nell'onboarding, mai letto in nessun componente |
| `company_interests` | Letto da `AziendePage` (area studente), mai scritto da nessuna parte |
| `job_applications.stato` | Mai gestito da nessuna parte |
| "Salva" offerta lavoro | L'azione di salvataggio non persiste i dati |

---

## Sicurezza da sistemare

- Policy `anon FOR ALL USING (true)` sulle tabelle del portale aziende: chiunque può leggere e scrivere senza autenticazione.
- **Password aziende in chiaro** in `aziende.password_temp`.
- La policy `profiles_update_own` non limita le colonne modificabili: verificare che uno studente non possa impostare `is_admin = true` su se stesso.

---

## File troppo grandi (al 17/11/2026)

| File | Righe |
|---|---|
| `pages/admin/AdminEventi.tsx` | ~1560 |
| `components/ProfileSettingsPage.tsx` | ~1017 |
| `components/IMieiPage.tsx` | ~877 |
| `pages/admin/AdminCandidature.tsx` | ~728 |
| `components/EsperienzePage.tsx` | ~721 |

Non aggiungere codice a questi file senza prima estrarre componenti.
