# docs/piano-modifiche-db.md

Piano di lavoro **temporaneo** per le modifiche al database decise il 18/11/2026 (branch `refactor/review-architettura`).
Quando tutte le voci sono applicate su Development e Production, questo file va eliminato e i contenuti stabili riportati in [database.md](database.md).

> ⚠️ Contiene la descrizione di vulnerabilità ancora aperte: **non fare push** di questo file finché la Fase 1 non è applicata in Production.

## Stato

- **Development**: `sicurezza_fase1.sql` (A, B, C) **applicato il 18/11/2026**; verifica SQL ok; 15/15 prove di attacco e uso normale superate; app provata a mano (studente) ok.
- **Development**: `sicurezza_fase1_storage.sql` (D) **applicato il 18/11/2026**; 4/4 prove superate. Admin: creazione badge con icona e assegnazione ok.
- **Development**: `sicurezza_fase1_password_aziende.sql` (E) **applicato il 18/11/2026**; password rimaste: 0.
- **Fase 1 completa su Development.**
- **Production**: nessuna modifica applicata.

Letture fatte prima di iniziare:
- Development e Production verificati identici (policy, funzioni, trigger, vincoli, colonne, viste, bucket, RLS)
- impatto delle nuove regole misurato in Production
- backup delle definizioni attuali salvato (CSV fuori dal repo, in Download)

## Procedura (per ogni fase)

1. Script di modifica transazionale (tutto o niente) + script di ripristino, salvati in `supabase/`
2. Applicazione e prove su **Development**
3. Nuovo confronto impronte Dev/Prod subito prima di Production
4. Applicazione su **Production**, senza eventi in corso, con il ripristino pronto
5. Aggiornamento di [database.md](database.md) e [problemi-noti.md](problemi-noti.md)

---

## Fase 1 — Sicurezza (priorità assoluta)

| # | Problema | Correzione prevista |
|---|---|---|
| A | Uno studente può impostare `is_admin = true` sul proprio profilo (`profiles_update_own` non limita le colonne) | Impedire la modifica di `is_admin` a chi non è admin |
| B | Uno studente può accettarsi da solo l'iscrizione (policy `ALL` su `iscrizioni_eventi`) | Separare le policy: lo studente legge, crea (solo `in_attesa`) e annulla; non modifica |
| C | Funzioni `SECURITY DEFINER` del portale aziende eseguibili da anonimi: espongono i dati di tutti gli studenti (`get_all_talent_profiles`, …) e permettono messaggi falsi (`contact_student`); tabelle del portale con policy `USING (true)` | Revocare l'esecuzione (anche da `PUBLIC`) e sostituire le policy aperte con policy solo admin. **Deciso (Q27):** il portale `/azienda` smette di funzionare (non usato) |
| D | Bucket `badge-icon`: chiunque può caricare/cancellare file | Scrittura solo admin |
| E | Gli studenti leggono `aziende.password_temp` delle aziende partner | **Deciso (Q29):** svuotare tutte le `password_temp` (operazione irreversibile, password perse) e togliere il campo password dall'admin |
| — | Verifica: nessun admin non autorizzato in Production | Query di sola lettura su `profiles.is_admin` |

Note di progetto emerse dall'analisi del codice:
- A: lo studente modifica solo `first_name, last_name, bio, citta, interests, goals, profile_completed_at, last_checkin`; l'admin (StudenteModal) anche `school, dob`.
- C: lo studente legge `company_interests` (solo le proprie righe) in `AziendePage`: va mantenuta una policy di lettura delle proprie righe. Le funzioni trigger (`handle_new_user`, `notify_badge_assigned`) non si possono chiamare via API: non vanno toccate. `auth_is_admin` deve restare eseguibile da tutti (la usano le policy).
- D: l'admin carica con `upsert: true` → servono INSERT e UPDATE (oltre a SELECT) per l'admin.
- E: l'admin legge `aziende` con `select('*')` in `AziendaModal`: togliere la colonna con i permessi romperebbe la pagina.
- Supabase concede in automatico l'esecuzione delle **nuove** funzioni ad `anon` e `authenticated`: da documentare in database.md come regola per il futuro.

## Bug trovati durante l'analisi (da correggere)

- **Eliminazione account studente rotta**: `ProfileSettingsPage` chiama la RPC `delete_user`, che **non esiste** nel DB → il pulsante va in errore.
- **Modifica profilo studente da admin non salvata**: `StudenteModal` aggiorna `profiles`, ma non esiste una policy UPDATE per l'admin → l'aggiornamento tocca 0 righe senza errore; l'interfaccia mostra i dati cambiati, il DB no.

## Fase 2 — Regole decise nel glossario

| # | Regola | Origine |
|---|---|---|
| 0 | Creare una tantum le iscrizioni accettate per i 13 studenti dell'evento storico (prima delle altre regole) | Q24 |
| 1 | Scansione accettata solo con Iscrizione accettata e nei giorni dell'evento (ora italiana) | Q4, Q17 |
| 2 | Badge automatico: conta solo le Partecipazioni completate. Le funzioni `assign_badge_by_event_threshold` e `count_badge_eligible_students` **non esistono nel DB**: vanno create | Q5 |
| 3 | Le stesse funzioni usano l'ora italiana (il DB è in UTC) | Q7 |
| 4 | Un'iscrizione si accetta o si crea solo se ci sono posti liberi (nessun limite se `max_partecipanti` è vuoto) | Q9, Q16 |
| 5 | Nessuna nuova Iscrizione dopo la scadenza | Q10 |
| 6 | Lo studente annulla solo un'iscrizione in attesa o accettata, prima dell'inizio dell'evento | Q15 |
| 7 | Materiali visibili solo con Iscrizione accettata | Q19 |
| 8 | File dei materiali in uno spazio privato con link temporanei (in Production non ci sono file da spostare) | Q19 |
| 9 | Studenti vedono solo eventi pubblicati (togliere `OR stato IS NULL`) | Q22 |
| 10 | Conteggio posti tramite funzione che restituisce solo il numero, al posto della policy che mostra a tutti gli accettati | Q28 |

## Modifiche solo all'interfaccia (codice)

- Togliere il campo password delle aziende da `AggiungiAzienda` e `AziendaModal` (Q29)

- Rinominare la sezione admin "Candidature" in "Iscrizioni" (Q2)
- Togliere "Link a form esterna" dall'admin e dal pulsante "Partecipa" dello studente; togliere il riquadro "quiz/survey" (Q13)
- Togliere la scelta della "visibilità" degli eventi (Q23)
- Rimozione di uno studente accettato → stato `rifiutata` con messaggio dedicato (Q14)
