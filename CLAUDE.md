# CLAUDE.md

Guida operativa per Claude Code.

> **Lavori in corso (dal 18/11/2026)**: revisione completa sul branch `refactor/review-architettura`. Prima di tutto leggi [docs/piano-lavori.md](docs/piano-lavori.md). Termini del dominio: [GLOSSARY.md](GLOSSARY.md).

## Cos'è JumpIn

Piattaforma di orientamento per studenti delle superiori di Rimini e provincia, gestita da Fattor Comune. Gli studenti scoprono esperienze, si iscrivono (con approvazione admin), fanno check-in con QR, ricevono badge e attestati PDF, vedono offerte lavoro di aziende partner, ricevono notifiche.
SPA Vite + React 19 + TypeScript. Supabase (Auth, Postgres, Storage) chiamato direttamente dal browser — nessun backend. Deploy su Vercel.

## Flusso principale (studente)

1. Lo studente si registra alla piattaforma e da quel momento vede le esperienze a cui può partecipare.
2. Si iscrive all'esperienza che gli interessa; l'admin conferma l'iscrizione (lo studente riceve una notifica).
3. Durante l'evento la partecipazione è verificata con i QR code di ingresso e di uscita, generati dall'admin per quello specifico evento.
4. Lo studente che ha scansionato almeno una volta sia il QR di ingresso sia quello di uscita può ricevere l'attestato di partecipazione e i badge. Attestati e badge compaiono sul suo profilo e sono visibili all'admin.
5. In parallelo, nella sezione Job lo studente vede le offerte di lavoro, si candida e da ogni offerta apre la pagina dell'azienda che l'ha pubblicata.

## Ruoli

- **Studente**: account personale; esperienze, iscrizioni, check-in QR, attestati, badge, offerte di lavoro, profilo.
- **Admin** (`profiles.is_admin = true`): crea e pubblica le esperienze, conferma o rifiuta le iscrizioni e genera i QR di ogni evento; monitora presenze e feedback.
  Crea i badge e gli attestati e li assegna agli studenti (a mano o con la regola automatica "almeno N eventi"); gestisce studenti, aziende partner e offerte di lavoro.
  Decide cosa compare nella home degli studenti (sezioni ed esperienze in evidenza) e può inviare notifiche a tutti.
- **Azienda**: pubblica offerte tramite l'admin e ha una pagina pubblica; il portale aziende `/azienda` è fermo.

## Infrastruttura

- **GitHub**: `Botika-AI/jumpIn`, branch `main`. Ogni push su `main` va in produzione automaticamente.
- **Vercel**: progetto `jumpindeploy` — https://jumpindeploy.vercel.app
- **Supabase**: due progetti separati.
  - **Development**: usato in locale via `.env.local`
  - **Production**: usato da Vercel
  - Variabili: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, iniettate da `vite.config.ts` come `__SUPABASE_URL__` / `__SUPABASE_KEY__`.

## Comandi

```bash
git config core.hooksPath .githooks   # una volta per clone: attiva il controllo docs al commit
npm install       # node_modules non è nel repo
npm run dev       # porta 3000 (Vite)
npm run build     # esegui sempre prima di un push
```

Non esistono test, lint o typecheck configurati. Prima di ogni push verifica almeno che `npm run build` passi.

## Navigazione e aree

La navigazione interna usa `useState`, non URL (tranne `/azienda`).

- **App.tsx**: macchina a stati — `loading | login | register | onboarding | dashboard | reset | set-password`. Al login scrive `access_logs` e richiede accettazione normativa privacy. Subito dopo la registrazione passa per `onboarding` (interessi e obiettivi).
- Se `profiles.is_admin = true` → **area admin** (`pages/AdminShell.tsx`).
- Altrimenti → **area studente** (`components/AppShell.tsx`).
- Non esiste una rotta `/admin`: l'area si sceglie solo in base a `is_admin`. Un admin non vede l'area studente.
- **Portale aziende**: `/azienda` → `pages/AziendaApp.tsx`. Sviluppo **FERMO** — non modificare senza richiesta esplicita.

## Termini chiave

- **Esperienza** (studente) = **Evento** (admin) = tabella `events`. "Concluso" è calcolato dalle date, non è uno stato nel DB.
- **Iscrizione** = riga in `iscrizioni_eventi` (stati: `in_attesa | accettata | rifiutata`). In admin si chiama "candidatura".
- **Evento completato** (ai fini di attestato e progressi) = studente con sia `ingresso` sia `uscita` in `attendances`. Il badge automatico invece conta qualsiasi presenza.
- **Nominare admin**: `UPDATE public.profiles SET is_admin = true WHERE email = '...';`

## Check-in QR

- **Formato**: `JUMPIN|{event_id}|ingresso` oppure `JUMPIN|{event_id}|uscita`.
- **Generazione**: Admin → Eventi → clic sul titolo dell'evento → QR di ingresso e uscita, generati lato client (libreria `qrcode`) e scaricabili in PNG. Un nuovo evento non richiede modifiche a codice o variabili d'ambiente.
- **Scansione**: Studente → Miei eventi → evento con iscrizione confermata e non concluso → scanner (`components/QRScanner.tsx`, `html5-qrcode`).
- **Validazione** (`processQrScan` in `components/IMieiPage.tsx`): formato corretto, evento esistente, data odierna compresa tra `event_date` ed `event_end`. Poi INSERT in `attendances` e UPDATE di `profiles.last_checkin`.
- **Regola nel database** (policy `attendances_insert_own`): la scansione è accettata solo con Iscrizione `accettata` e nei giorni dell'evento in ora italiana. Ogni scansione valida aggiunge una riga, senza limiti.

## Database

Prima di toccare il database leggi [docs/database.md](docs/database.md).
Il browser parla direttamente con Supabase con la chiave pubblica: **la sicurezza dipende interamente dalle policy RLS**. Non proporre mai modifiche che le aggirino o le allarghino (es. policy `USING (true)`, funzioni `SECURITY DEFINER` senza controlli); i controlli fatti solo nell'interfaccia non proteggono nulla.
Ogni modifica di schema va eseguita **a mano** nel SQL Editor su **entrambi** i progetti (Development e Production) e salvata come script in `supabase/`.

## Struttura e codice morto

Prima di navigare nei file leggi [docs/architettura.md](docs/architettura.md): il repo contiene molto codice morto (residui Next.js, vecchie versioni), non prenderlo come esempio.

- Nuove pagine studente → `components/`
- Nuove pagine admin → `pages/admin/`
- Quando aggiungi, sposti o elimini file, aggiorna `docs/architettura.md` nello stesso commit.

## Stile

- Interfaccia in italiano.
- Tailwind da CDN in `index.html` — nessun build Tailwind. Il `tailwind.config.js` nella root è codice morto.
- Font: Inter (testo), Montserrat (titoli, `.font-montserrat`).
- Colori: studente `orange-500`; admin titoli `#1F2430`, bottoni `#F0813C`, sfondo `#F5F6F8`.
- Componenti: `export const X: React.FC`; chiamate Supabase direttamente nei componenti; icone `lucide-react`.
- Immagini: usa `resizeImage` da `lib/imageUtils.ts` (output webp). Copertine evento 16:9 con `components/CoverImage.tsx`. Mostra sempre gli errori di upload all'utente.

## Regole operative

- Non far crescere i file già enormi (`AdminEventi.tsx`, `ProfileSettingsPage.tsx`, `IMieiPage.tsx`): estrai componenti.
- Prima di duplicare logica (calcolo "evento completato", sblocco attestato, formattazione date) cerca se esiste già. Vedi [docs/problemi-noti.md](docs/problemi-noti.md).
- Non usare Playwright MCP per caricare file a mano (blocca il selettore file). Usalo liberamente per navigare e testare.
- Quando cambi lo schema del database, aggiorna `docs/database.md` nello stesso commit.
- `docs/problemi-noti.md` contiene solo problemi **noti e ricorrenti** (difetti strutturali, incoerenze, limiti di sicurezza che restano nel codice e condizionano il lavoro futuro). Un bug puntuale si corregge, non si elenca. Proponi una nuova voce solo per un problema di questo tipo che non viene risolto subito, e chiedi conferma all'utente prima di aggiungerla. Quando un problema viene risolto, togli la voce.
