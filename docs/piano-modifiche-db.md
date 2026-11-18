# docs/piano-modifiche-db.md

Piano di lavoro **temporaneo** per le modifiche al database decise il 18/11/2026 (branch `refactor/review-architettura`).
Quando tutte le voci sono applicate su Development e Production, questo file va eliminato e i contenuti stabili riportati in [database.md](database.md).

> ⚠️ Contiene la descrizione di vulnerabilità ancora aperte: **non fare push** di questo file finché la Fase 1 non è applicata in Production.

## Stato

**Nessuna modifica applicata.** Finora solo query di sola lettura:
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
| C | Funzioni `SECURITY DEFINER` del portale aziende eseguibili da anonimi: espongono i dati di tutti gli studenti (`get_all_talent_profiles`, …) e permettono messaggi falsi (`contact_student`); tabelle del portale con policy `USING (true)` | Revocare l'esecuzione (anche da `PUBLIC`) e togliere le policy aperte. Il portale `/azienda` smette di funzionare (non usato) — **in attesa di conferma utente** |
| D | Bucket `badge-icon`: chiunque può caricare/cancellare file | Scrittura solo admin |
| E | Gli studenti leggono `aziende.password_temp` delle aziende partner | Escludere la colonna dalla lettura degli studenti |
| — | Verifica: nessun admin non autorizzato in Production | Query di sola lettura su `profiles.is_admin` |

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

- Rinominare la sezione admin "Candidature" in "Iscrizioni" (Q2)
- Togliere "Link a form esterna" dall'admin e dal pulsante "Partecipa" dello studente; togliere il riquadro "quiz/survey" (Q13)
- Togliere la scelta della "visibilità" degli eventi (Q23)
- Rimozione di uno studente accettato → stato `rifiutata` con messaggio dedicato (Q14)
