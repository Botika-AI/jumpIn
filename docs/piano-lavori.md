# docs/piano-lavori.md

Piano di lavoro **temporaneo** della revisione completa di JumpIn, iniziata il 18/11/2026 sul branch `refactor/review-architettura`.
È il punto di partenza per ogni nuova sessione: leggilo prima di tutto, insieme a [CLAUDE.md](../CLAUDE.md) e [GLOSSARY.md](../GLOSSARY.md).
Quando tutto è concluso, il file va eliminato e i contenuti stabili riportati in [database.md](database.md) e [architettura.md](architettura.md).

---

## Obiettivo

Migliorare l'applicazione con una revisione completa del codice, usando le skill installate in `~/.claude/skills/`:

| Skill | Ruolo nel progetto |
|---|---|
| `/grill-with-docs` (grilling + domain-modeling) | ✅ Fatto: ha prodotto [GLOSSARY.md](../GLOSSARY.md) e le regole di dominio |
| `/improve-codebase-architecture` | Da fare: report HTML dei candidati al refactoring, poi grilling sul candidato scelto |
| `/thermo-nuclear-code-quality-review` | Da fare: review severa del diff di ogni refactoring |
| `/code-review`, `/security-review` | Da fare: bug e sicurezza del diff prima del merge |

Le skill `grill-with-docs`, `improve-codebase-architecture` e `thermo-nuclear-code-quality-review` si avviano **solo** se l'utente scrive il comando.

## Stato al 19/11/2026

- **Branch** `refactor/review-architettura`: pushato su GitHub (non su `main`). `main` e il sito in produzione non contengono ancora nessuna modifica di codice.
- **Database**: Fase 1 (sicurezza) applicata su Development **e** Production. Fase 2: voci 0 e 1 applicate (19/11), voci 2–3 rinviate (badge solo manuali), voci 4–9 e 10a applicate (19/11); 10b al momento del merge. **Fase 2 conclusa lato database** (salvo badge automatico rinviato).
- **Codice dell'app**: non ancora modificato.

---

## Fatto

1. **Glossario e regole di dominio** (sessione di grilling, decisioni Q1–Q30): [GLOSSARY.md](../GLOSSARY.md), [da-definire.md](da-definire.md) (questioni aperte), [problemi-noti.md](problemi-noti.md) aggiornato.
2. **Verifiche del database** (solo lettura): Development e Production erano identici; impatto delle nuove regole misurato; backup delle definizioni salvato dall'utente in un CSV nella cartella Download (fuori dal repo).
3. **Fase 1 — Sicurezza**, applicata e verificata su Development e Production il 18/11/2026 (dettagli sotto).

---

## Prossimi passi, in ordine

0. **Dal 25/11/2026 circa** (dopo qualche giorno di uso normale dell'app in produzione con le correzioni di Fase 1): cancellare `supabase/sicurezza_fase1_ripristino.sql` e il blocco "RIPRISTINO" commentato in fondo a `supabase/sicurezza_fase1_storage.sql`. Eseguiti per errore riaprirebbero le vulnerabilità A–D; restano recuperabili dalla storia di git. Prima chiedere conferma all'utente.
1. **Fase 2 — Regole del glossario** (database): voci 0–10 sotto. Si parte dalle voci 0 e 1, collegate.
2. **Bug** trovati durante l'analisi (sotto).
3. **Modifiche all'interfaccia** (codice) decise nel grilling (sotto).
4. **Codice allineato alle regole**: la logica "Partecipazione completata" e lo sblocco attestato oggi sono duplicati in più file (vedi problemi-noti.md) e vanno allineati alle nuove regole (Iscrizione accettata obbligatoria, ora italiana).
5. **Merge su `main`** = pubblicazione in produzione: solo dopo `npm run build` ok, prove su Development e script di Fase 2 applicati in Production nell'ordine giusto. **Subito dopo il deploy**: applicare in Production `fase2_voce10b_togli_lettura_accettate.sql`.
6. **Revisione dell'architettura**: `/improve-codebase-architecture` (ora con il glossario pronto), poi un candidato alla volta: grilling → refactoring sul branch → `/thermo-nuclear-code-quality-review` + `/code-review` sul diff.

---

## Come applicare le skill (procedimento della revisione)

Le skill sono in `~/.claude/skills/`. Tre si avviano **solo scrivendo il comando** (hanno `disable-model-invocation: true`); le altre tre sono "di base" e vengono richiamate da quelle.

**Skill di base** (non si usano da sole):
- `codebase-design` — vocabolario per progettare moduli "profondi": **modulo**, **interfaccia**, **profondità** (tanta logica dietro un'interfaccia piccola), **seam** (punto in cui cambiare comportamento senza toccare chi chiama), **adapter**, **leverage**, **locality**. Principi: *deletion test* (se cancello il modulo la complessità sparisce o si sparge in N file?), "l'interfaccia è la superficie di test", "un adapter = seam ipotetico, due = seam reale".
- `domain-modeling` — tiene aggiornati `GLOSSARY.md` (solo termini di dominio, niente dettagli tecnici) e `docs/adr/` (decisioni difficili da annullare, sorprendenti e frutto di un vero compromesso: solo se tutte e tre).
- `grilling` — domande a turni, numerate, ciascuna con risposta consigliata; i fatti li cerca Claude nel codice, le decisioni sono dell'utente; si agisce solo quando l'utente conferma che la comprensione è condivisa.

**Procedimento, un giro per ogni candidato:**

| Passo | Comando | Cosa succede | Stato |
|---|---|---|---|
| 0 | — | Lavorare sempre su un branch (push su `main` = produzione) | ✅ `refactor/review-architettura` |
| 1 | `/grill-with-docs` | Intervista sul dominio → `GLOSSARY.md`, regole, questioni aperte | ✅ Fatto (Q1–Q30) |
| 2 | `/improve-codebase-architecture` | Parte dalla storia dei commit (zone che cambiano spesso), esplora il codice con un sub-agente, scrive un **report HTML** in una cartella temporanea (non nel repo) con i **candidati**: file, problema, soluzione, benefici, diagramma prima/dopo, forza (*Strong / Worth exploring / Speculative*) e una raccomandazione finale. Poi chiede quale esplorare | Da fare |
| 3 | (automatico nel passo 2) | **Grilling** sul candidato scelto: forma del nuovo modulo, cosa sta dietro il seam, quali test. Nuovi termini → `GLOSSARY.md`; candidato rifiutato per un motivo importante → ADR, così le review future non lo ripropongono | Da fare |
| 4 | — | Implementazione sul branch, `npm run build`, aggiornamento di `docs/architettura.md` | Da fare |
| 5 | `/thermo-nuclear-code-quality-review` | Review severa **del diff** (non dell'intero repo: su un branch senza modifiche non ha nulla da guardare, oppure le si indicano i file): file oltre 1000 righe, `if` sparsi, astrazioni inutili, logica duplicata, "code judo" | Da fare |
| 6 | `/code-review`, `/security-review` | Bug e sicurezza del diff (`/security-review` obbligatoria se si toccano chiamate Supabase o policy) | Da fare |
| 7 | — | Si torna al passo 3 con il candidato successivo | — |

Candidati probabili (da confermare col report): `AdminEventi.tsx` (~1560 righe), `ProfileSettingsPage.tsx` (~1017), logica "Partecipazione completata" / sblocco attestato duplicata in 5 file, chiamate Supabase sparse nei componenti.

Decisioni che arriveranno nel grilling dell'architettura:
- **Supabase nei componenti**: CLAUDE.md dice "chiamate Supabase direttamente nei componenti", le skill spingeranno verso moduli di accesso ai dati → decidere e registrare come ADR.
- **Test**: il progetto non ne ha; valutare almeno i test della logica pura (Partecipazione completata, sblocco attestato, date in ora italiana).
- Non mischiare con GSD (cartella `.planning/`, installato a giugno).

---

## Metodo per le modifiche al database (concordato con l'utente)

Massima cautela: **mai sperimentare su Production**. Claude non ha accesso a Supabase: scrive le query, l'utente le esegue nel SQL Editor e incolla i risultati.

1. Script **transazionale** (tutto o niente) + script di **ripristino**, salvati in `supabase/`.
2. Applicazione su **Development** (ref `mdybkor…`; l'app in locale `npm run dev` usa Development).
3. Prove con `scripts/sicurezza/` (attacco rifiutato + uso normale funzionante) e prova a mano dell'app.
4. Prima di Production: **query delle impronte** su Production e confronto con Development (vedi sotto).
5. Applicazione su **Production** (ref `rneifgkgpabasmzfhkfg`), senza eventi in corso, con il ripristino pronto.
6. Prove su Production: da anonimo (chiave pubblica letta dal sito) e, se servono, con uno **studente temporaneo** creato sul sito ed eliminato subito dopo da admin.
7. Aggiornare [database.md](database.md), [problemi-noti.md](problemi-noti.md) e questo file.

Note pratiche:
- L'utente crea i file di credenziali di prova (`.env.test.local` per Development, `.env.prod-test.local` per Production) nella cartella principale: attenzione a **spazi finali nel nome** (è successo due volte). Il file di Production va cancellato dopo le prove.
- Una query delle impronte uguale tra Dev e Prod si ottiene anche eseguendola due volte sullo stesso progetto: confermare il progetto con un dato che differisce (conteggi).

### Query delle impronte (sola lettura)

Usare la versione **estesa** (con permessi): categorie colonne, policy, funzioni, trigger (`pg_get_triggerdef`), vincoli, rls_attiva, viste, bucket, permessi_tabelle (`relacl`), permessi_colonne (`attacl`), permessi_funzioni (`proacl`). Risultato al 18/11/2026 dopo la Fase 1, identico su Dev e Prod:

| categoria | impronta |
|---|---|
| funzioni | `1dda48fb8212c5c26088be7f7a79c2a0` |
| permessi_colonne | `9042c1b119f6323fa25fff2b82cb696b` |
| permessi_funzioni | `1e46ab34b0ec7bf458dc0c83c1ba495b` |
| permessi_tabelle | `c9656c552961d1208864d9b790894ba8` |
| policy | `1c4d7465d30eadaf96bbe7488293e6a3` |
| trigger | `6c5cc412e89e11bfdc00d78e4d4ae2c3` |
| colonne / vincoli / viste / bucket / rls_attiva | invariati rispetto a prima della Fase 1 |

### Script di prova

- `scripts/sicurezza/prova-fase1.mjs` — 15 prove (A, B, C). Development: `node scripts/sicurezza/prova-fase1.mjs "$PWD" dev`. Production: scaricare prima il bundle del sito (`curl` di `https://jumpindeploy.vercel.app/` → file `/assets/*.js`) e lanciare `... "$PWD" prod <bundle.js>`. Si ferma se l'ambiente è sbagliato o se l'account non è uno studente normale; rimette a posto i dati.
- `scripts/sicurezza/prova-fase1-storage.mjs` — prove sul bucket `badge-icon` (solo Development).
- Usano solo la chiave pubblica e le credenziali di uno studente di prova, come farebbe un attaccante dal browser.

---

## Fase 1 — Sicurezza ✅ conclusa il 18/11/2026

Script: `supabase/sicurezza_fase1.sql` (+ `_ripristino.sql`), `sicurezza_fase1_storage.sql` (ripristino in fondo al file), `sicurezza_fase1_password_aziende.sql` (irreversibile).

| # | Problema | Correzione |
|---|---|---|
| A | Uno studente poteva impostarsi `is_admin = true` (dimostrato su Development) | Permessi di modifica per colonna su `profiles` + trigger `profiles_proteggi_is_admin` |
| B | Uno studente poteva accettarsi da solo l'iscrizione | Policy separate: legge le proprie, crea solo `in_attesa`, annulla se non `rifiutata`; nessuna modifica |
| C | Funzioni del portale aziende eseguibili da anonimi: dati di tutti gli studenti leggibili da chiunque; tabelle del portale con `USING (true)` | Esecuzione revocata (anche da `PUBLIC`); tabelle solo admin; `notify_profile_completed` solo per sé. **Portale `/azienda` disattivato** (Q27) |
| D | Bucket `badge-icon` scrivibile da chiunque | Lettura pubblica, scrittura solo admin |
| E | Password delle aziende (in chiaro) leggibili dagli studenti | Svuotate (2 in Production), irreversibile (Q29) |

Verifiche in Production: impronte = backup prima di iniziare; verifica SQL ok; prove da anonimo ok; impronte estese = Development; 15/15 prove con studente temporaneo (poi eliminato); app controllata da admin. Nessun admin estraneo trovato.

Azioni consigliate all'utente, fuori dal codice:
- controllare in Supabase Production → Logs → API se ci sono state chiamate anonime a `get_all_talent_profiles` / `get_suggested_profiles` prima della chiusura (dati di minorenni: eventualmente coinvolgere il responsabile privacy);
- avvisare le 2 aziende se potrebbero aver riutilizzato altrove la password del portale.

---

## Fase 2 — Regole del glossario (database) — da fare

| # | Regola | Origine | Note |
|---|---|---|---|
| 0 | Creare una tantum le iscrizioni accettate per i **12 studenti di "Start-up Weekend"** in Production (avevano solo scansioni: allora le iscrizioni non esistevano). Da fare **prima** della voce 1 | Q24 | ✅ **Applicata in Production il 19/11/2026** (`fase2_voce0_iscrizioni_storiche.sql`, verifica: 12 righe `accettata`). Decisioni del 19/11: "Jumper next level" era una prova (esclusa); esclusi Yuri Mondaini (personale) e gazzosidaniele@gmail.com (prova); inclusi anche i 2 studenti con sole uscite. Nessun attestato collegato all'evento (Q25); nessuna notifica generata |
| 1 | Scansione accettata solo con Iscrizione accettata e nei giorni dell'evento (ora italiana) | Q4, Q17 | ✅ **Applicata su Dev e Prod il 19/11/2026** (`fase2_voce1_scansione_valida.sql`, prove `scripts/sicurezza/prova-fase2-voce1.mjs` 8/8). Blocca anche `scanned_at` inventato. Scansioni ripetute permesse |
| 2 | Badge automatico: conta solo le Partecipazioni completate | Q5 | ⏸ **RINVIATA** (decisione del 19/11/2026): per ora i badge si assegnano **solo a mano**. Script pronto e **non applicato**: `fase2_voce2_badge_automatico.sql` (+ ripristino, prova `scripts/sicurezza/prova-fase2-voce2.sql`). Vedi da-definire.md, "Badge automatico" |
| 3 | Le stesse funzioni usano l'ora italiana | Q7 | ⏸ Rinviata con la voce 2 (già inclusa nello stesso script) |
| 4 | Un'iscrizione si accetta o si crea solo se ci sono posti liberi; nessun limite se `max_partecipanti` è vuoto | Q9, Q16 | ✅ **Applicata su Dev e Prod il 19/11/2026** (`fase2_voce4_posti.sql`, trigger `iscrizioni_controlla_posti`; prova `scripts/sicurezza/prova-fase2-voce4.sql` 11/11). Sicura anche con due admin contemporanei |
| 5 | Nessuna nuova Iscrizione dopo la scadenza (`scadenza_candidature`, tipo `date`) | Q10 | Ora italiana. Decisioni del 19/11: ci si iscrive fino al giorno **prima** della scadenza (scadenza 30/11 → ultimo giorno 29/11); **senza scadenza** fino al giorno prima dell'inizio dell'evento. ✅ **Applicata su Dev e Prod il 19/11/2026** (`fase2_voce5_6_iscrizioni_date.sql`, prova `prova-fase2-voce5-6.mjs` 12/12) |
| 6 | Lo studente annulla solo un'iscrizione in attesa o accettata, **prima dell'inizio** dell'evento | Q15 | ✅ **Applicata su Dev e Prod il 19/11/2026** insieme alla voce 5 (si annulla fino al giorno prima di `event_date`) |
| 7 | Materiali visibili solo con Iscrizione accettata | Q19 | ✅ **Applicata su Dev e Prod il 19/11/2026** (`fase2_voce7_8_9_materiali_bozze.sql`, prova `prova-fase2-voce7-8-9.mjs` 10/10) |
| 8 | File dei materiali in uno spazio privato con link temporanei | Q19 | ✅ **Spazio privato `materiali` creato su Dev e Prod il 19/11/2026** con le sue regole; manca il **codice** (vedi modifiche all'interfaccia) |
| 9 | Studenti vedono solo eventi pubblicati | Q22 | ✅ **Applicata su Dev e Prod il 19/11/2026** |
| 10 | Conteggio posti tramite funzione che restituisce solo il numero | Q28 | In due tempi: **10a** `fase2_voce10a_conteggio_posti.sql` crea `posti_accettati()` ✅ **applicata su Dev e Prod il 19/11/2026**; il codice di `EsperienzePage` e `HomeDashboard` deve usarla al posto della lettura di `iscrizioni_eventi`; **10b** `fase2_voce10b_togli_lettura_accettate.sql` toglie la vecchia policy **solo dopo** che il nuovo codice è online (in Production: subito dopo il merge su `main`) |

Dati di Production rilevanti (18/11/2026): 4 eventi, 0 iscrizioni, 54 scansioni, 13 partecipazioni completate (tutte senza iscrizione), 27 studenti. Development: 38 iscrizioni di prova.

## Bug trovati durante l'analisi — da correggere

- ✅ **Corretti il 19/11/2026 su Dev e Prod** (`bug_profilo_admin_elimina_account.sql`): modifica del profilo studente da admin (policy `profiles_update_admin`) ed eliminazione dell'account da parte dello studente (RPC `delete_user`).
- **Scansione rifiutata mostrata come riuscita**: `processQrScan` (`components/IMieiPage.tsx`) non controlla l'errore dell'INSERT in `attendances`. Dopo la voce 1 il DB rifiuta le scansioni non valide, ma lo studente vede comunque "Check-in registrato!" (e `last_checkin` viene aggiornato). Va mostrato l'errore.

## Modifiche all'interfaccia (codice) — da fare

- **Materiali (voci 7–8)**: `AdminEventi` deve caricare i file nel bucket privato `materiali` (percorso `{event_id}/{file}`) e salvare il percorso, non il link pubblico di `logos`; `EsperienzePage`/`IMieiPage` aprono i file con link temporanei (`createSignedUrl`). La sezione Materiali va nascosta agli studenti non accettati (il DB ora restituisce una lista vuota). Provare il link temporaneo con un file vero
- **Conteggio posti (voce 10)**: `EsperienzePage` e `HomeDashboard` usano `rpc('posti_accettati')` invece di leggere `iscrizioni_eventi`; poi 10b al merge
- **Posti esauriti e chiusura delle iscrizioni, anche graficamente** (richiesta dell'utente del 19/11/2026): da progettare insieme. Dopo la voce 4 il DB rifiuta iscrizioni e accettazioni oltre i posti, ma l'app non controlla l'errore: in `AdminEventi` e `AdminCandidature` l'iscrizione risulta "accettata" e parte la notifica allo studente; in `EsperienzePage`/`HomeDashboard` l'iscrizione rifiutata non mostra nulla. `AdminEventi` non controlla nemmeno i posti prima di accettare (singola e "accetta tutti"). **Scadenza delle iscrizioni**: lo studente oggi non la vede mai (`scadenza_candidature` si imposta solo in `AdminEventi`); dopo la voce 5 va mostrato "Iscrizioni aperte fino al …" / "Iscrizioni chiuse" e gestito l'errore del DB. **Annullamento**: dopo la voce 6 il DB rifiuta l'annullamento dal giorno di inizio, ma `EsperienzePage.handleCancel` non controlla l'errore e toglie comunque l'iscrizione dalla schermata (ricompare ricaricando): il pulsante "Annulla" va nascosto dall'inizio dell'evento
- Nascondere l'assegnazione **automatica** dei badge in `AssegnazioneBadge` (badge solo manuali, decisione del 19/11/2026): oggi il pannello chiama due funzioni che non esistono nel DB e non mostra errori
- Rinominare la sezione admin "Candidature" in "Iscrizioni" (Q2)
- Togliere "Link a form esterna" dall'admin **e** il comportamento del pulsante "Partecipa" dello studente; togliere il riquadro "quiz/survey" (Q13)
- Togliere la scelta della "visibilità" degli eventi (Q23)
- Rimozione di uno studente accettato → stato `rifiutata` con messaggio dedicato (Q14)
- Togliere il campo password delle aziende da `AggiungiAzienda` e `AziendaModal` (Q29)

## Decisioni del grilling (riferimento rapido)

Q1 nome ufficiale **Evento** ("Esperienza" solo etichetta) · Q2 **Iscrizione** per eventi, **Candidatura** per offerte di lavoro · Q3 Partecipazione completata = un ingresso + un'uscita in tutto l'evento (provvisoria, vedi da-definire) · Q4 vale solo con Iscrizione accettata · Q5 badge automatico solo su Partecipazioni completate · Q6 Attestato (non "certificato"); anche l'assegnazione manuale vale solo a evento concluso · Q7 Evento concluso dal giorno dopo l'ultimo giorno, ora italiana · Q9 posti mai superati · Q10 nessuna iscrizione dopo la scadenza · Q11 **Scansione** · Q12 Offerta di lavoro / Azienda / Azienda partner ("Job" solo etichetta) · Q13 form esterno tolto · Q14 rimozione = rifiutata · Q15 annullamento solo in attesa/accettata e prima dell'inizio · Q16 a posti esauriti non ci si iscrive (lista d'attesa in da-definire) · Q17 scansione valida solo nei giorni dell'evento · Q18/Q19 Materiali solo agli accettati · Q20 questioni aperte in da-definire.md · Q21 QR fotografato = limite noto (QR dinamico in futuro) · Q22 bozze visibili solo all'admin · Q23 visibilità tolta (sezione pubblica in da-definire) · Q24 iscrizioni storiche per i 13 studenti · Q25 evento storico senza attestato · Q26 prima la sicurezza · Q27 portale aziende disattivato · Q28 conteggio posti senza nomi · Q29 password aziende svuotate · Q30 verifiche in Production con impronte + studente temporaneo.

Nessuna decisione ha richiesto un ADR.
