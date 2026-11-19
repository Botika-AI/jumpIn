# docs/architettura.md

Aggiorna questo file quando aggiungi, sposti o elimini file o pagine.

---

## App.tsx — macchina a stati auth

Stati: `loading | login | register | onboarding | dashboard | reset | set-password`

- **login**: mostra form login. Al submit richiede accettazione normativa privacy e scrive `access_logs`.
- **register**: form registrazione → `auth.signUp` con metadati → trigger `handle_new_user` crea `profiles` → `upsert` profilo come backup → poi **onboarding**.
- **onboarding**: raccoglie interessi e obiettivi. Solo subito dopo la registrazione, non riapribile.
- **dashboard**: se `profiles.is_admin = true` → `AdminShell`, altrimenti `AppShell`.

---

## Area studente — `components/AppShell.tsx`

Navigazione a stati interni, mobile-first.

| Componente | Descrizione |
|---|---|
| `HomeDashboard.tsx` | Esperienze in evidenza (da `homepage_evidenza`), "Da non perdere" (prossimi 2 eventi pubblicati), progressi (badge X/5 e eventi completati X/3 — obiettivi fissi nel codice), ordine sezioni da `homepage_sections` |
| `EsperienzePage.tsx` | Catalogo eventi pubblicati, ricerca, dettaglio (Dettagli + Materiali), "Partecipa" (o link esterno se `events.form_esterno`), annullamento iscrizione, download attestato |
| `IMieiPage.tsx` | Iscrizioni per stato (In attesa / Confermata / Completato), scanner QR (`QRScanner.tsx`), registro presenze, feedback dopo evento, download attestato |
| `JobPage.tsx` | Offerte attive; "Mi interessa" = candidatura (secondo clic la ritira); apre `AziendePage` |
| `AziendePage.tsx` | Dettaglio azienda — aperta solo da `JobPage` |
| `BadgeSection.tsx` | Badge ottenuti dello studente |
| `BadgeModal.tsx` | Dettaglio badge |
| `ProfileSettingsPage.tsx` | Schede: Account (imposta `profile_completed_at` e chiama RPC `notify_profile_completed` quando bio, città e almeno un interesse sono compilati), Attività, Sicurezza, Visibilità e Privacy (export CSV, eliminazione account via RPC `delete_user`) |
| `OnboardingInterests.tsx` | Selezione interessi e obiettivi — solo subito dopo la registrazione |
| `QRScanner.tsx` | Overlay camera con `html5-qrcode` |
| `CoverImage.tsx` | Copertina mostrata sempre intera (nessun ritaglio) su uno sfondo sfocato della stessa immagine; il contenitore deve avere dimensioni definite (es. `aspect-video`) |
| `GlassCard.tsx` | Card glassmorphism riusabile |

---

## Area admin — `pages/AdminShell.tsx`

Navigazione a stati interni.

| File | Descrizione |
|---|---|
| `pages/admin/AdminDashboard.tsx` | KPI, partecipazioni recenti, grafico accessi 90 giorni, ultimi utenti |
| `pages/admin/AdminFeedbackList.tsx` | Lista feedback (usato da AdminDashboard) |
| `pages/admin/AdminStudenti.tsx` | Lista studenti |
| `pages/admin/StudenteModal.tsx` | Scheda studente: dati, esperienze completate, registro accessi, feedback; modifica ed eliminazione (RPC `admin_delete_student`) |
| `pages/admin/AdminAziende.tsx` | Lista aziende |
| `pages/admin/AggiungiAzienda.tsx` | Form nuova azienda: anagrafica, piano, stato, logo e copertina, credenziali portale |
| `pages/admin/AziendaModal.tsx` | Dettaglio azienda (schede Account, Dati Aziendali, Richieste form, Accesso). Le "Richieste form" sono dati finti (`MOCK_RICHIESTE`) |
| `pages/admin/AdminEventi.tsx` | Lista eventi (clic sul titolo → modale QR ingresso/uscita in PNG), `EventoForm` (riusato da AdminHomepage), materiali, notifiche broadcast, gestione iscrizioni e attività QR, export CSV |
| `pages/admin/AdminCandidature.tsx` | Iscrizioni eventi (con controllo posti) e candidature lavoro (sola lettura) |
| `pages/admin/AdminJobPost.tsx` | Lista job post |
| `pages/admin/JobPostForm.tsx` | Form crea/modifica offerta lavoro |
| `pages/admin/AdminBadge.tsx` | Lista badge e attestati |
| `pages/admin/CreaBadgeForm.tsx` | Form nuovo badge |
| `pages/admin/CreaAttestatoForm.tsx` | Form nuovo attestato |
| `pages/admin/AssegnazioneBadge.tsx` | Assegnazione badge: manuale o automatica (soglia 3 eventi) |
| `pages/admin/AssegnazioneAttestato.tsx` | Assegnazione attestato |
| `pages/admin/AdminHomepage.tsx` | Ordine sezioni home studente + eventi in evidenza |

---

## Portale aziende — SVILUPPO FERMO

`pages/AziendaApp.tsx` → rotta `/azienda`. Non modificare senza richiesta esplicita.

Login via RPC `verify_azienda_login` con password in chiaro in `aziende.password_temp`. Sessione in `localStorage`. Nessun link nell'interfaccia principale.

| File | Descrizione |
|---|---|
| `pages/azienda/AziendaDashboard.tsx` | Dashboard azienda |
| `pages/azienda/TalentiDiDomani.tsx` | Profili studenti disponibili |
| `pages/azienda/EsperienzeAzienda.tsx` | Esperienze disponibili |
| `pages/azienda/ProfileCard.tsx` | Card profilo studente |

Tutte le chiamate al DB usano RPC con `p_company_id`. Job Post, Candidature e Impostazioni sono segnaposto vuoti.

---

## lib/

| File | Descrizione |
|---|---|
| `lib/supabase.ts` | Client Supabase principale — importato da tutto il codice attivo |
| `lib/imageUtils.ts` | `resizeImage()` → webp |
| `lib/certificateGenerator.ts` | Genera PDF attestati con `jspdf`/`pdf-lib`; placeholder: `{{nome_studente}}`, `{{cognome_studente}}`, `{{nome_scuola}}`, `{{nome_evento}}`, `{{data_emissione}}` |

---

## Struttura completa cartelle

```
App.tsx                          # Macchina a stati auth + router principale
index.tsx                        # Entry point React
index.html                       # Font (Inter, Montserrat), Tailwind CDN, importmap ESM
types.ts                         # Tipi condivisi: UserProfile, JumpInEvent, Attendance, AuthState…
constants.ts                     # RIMINI_SCHOOLS
vercel.json                      # SPA rewrites: tutto → index.html
vite.config.ts                   # VITE_SUPABASE_URL/ANON_KEY → __SUPABASE_URL__/__SUPABASE_KEY__

components/
  AppShell.tsx                   # Shell area studente: navigazione, notifiche (stato letto in localStorage)
  HomeDashboard.tsx              # Home studente
  EsperienzePage.tsx             # Catalogo e dettaglio esperienze
  IMieiPage.tsx                  # Le mie iscrizioni + scanner QR
  JobPage.tsx                    # Offerte lavoro
  AziendePage.tsx                # Dettaglio azienda (aperta da JobPage)
  BadgeSection.tsx               # Badge ottenuti
  BadgeModal.tsx                 # Dettaglio badge
  ProfileSettingsPage.tsx        # Impostazioni profilo studente
  OnboardingInterests.tsx        # Interessi e obiettivi (solo primo accesso)
  QRScanner.tsx                  # Overlay camera html5-qrcode
  CoverImage.tsx                 # Copertina evento 16:9 con fallback
  GlassCard.tsx                  # Card glassmorphism riusabile

pages/
  AdminShell.tsx                 # Shell area admin
  AziendaApp.tsx                 # Entry point portale aziende (/azienda) — FERMO
  admin/
    AdminDashboard.tsx
    AdminFeedbackList.tsx
    AdminStudenti.tsx
    StudenteModal.tsx
    AdminAziende.tsx
    AggiungiAzienda.tsx
    AziendaModal.tsx
    AdminEventi.tsx
    AdminCandidature.tsx
    AdminJobPost.tsx
    JobPostForm.tsx
    AdminBadge.tsx
    CreaBadgeForm.tsx
    CreaAttestatoForm.tsx
    AssegnazioneBadge.tsx
    AssegnazioneAttestato.tsx
    AdminHomepage.tsx
  azienda/                       # Portale aziende — FERMO
    AziendaDashboard.tsx
    TalentiDiDomani.tsx
    EsperienzeAzienda.tsx
    ProfileCard.tsx

lib/
  supabase.ts                    # Client attivo
  imageUtils.ts                  # resizeImage → webp
  certificateGenerator.ts        # Generatore PDF attestati

supabase/
  *.sql                          # ~25 script manuali applicati a mano
  migrations/                    # Solo 3 migration — NON rappresenta lo schema reale
  schema.sql                     # Vecchia istantanea — non aggiornare
  schema_complete.sql            # Vecchia istantanea — non aggiornare

public/
  logo.png

scripts/sicurezza/
  prova-fase1.mjs                # Prove di sicurezza Fase 1 (attacchi + uso normale) — vedi docs/piano-lavori.md
  prova-fase1-storage.mjs        # Prove sul bucket badge-icon (solo Development)
  prova-fase2-voce1.mjs          # Prove Fase 2 voce 1: scansione valida (solo Development)
  prova-fase2-voce2.sql          # Prove Fase 2 voci 2-3: badge automatico, da SQL Editor (solo Development, annulla tutto)
  prova-bug-profilo-account.sql  # Prove: modifica profilo da admin + eliminazione account (solo Development, annulla tutto)
  prova-fase2-voce7-8-9.mjs      # Prove Fase 2 voci 7-9: materiali, spazio privato, bozze (solo Development)
  prova-fase2-voce5-6.mjs        # Prove Fase 2 voci 5-6: date delle iscrizioni (solo Development)
  prova-fase2-voce4.sql          # Prove Fase 2 voce 4: posti, da SQL Editor (solo Development, annulla tutto)

.githooks/
  check-docs.sh                  # Controlla che docs/ sia aggiornato quando cambiano struttura o SQL
  pre-commit                     # Hook git che usa check-docs.sh (attivo con: git config core.hooksPath .githooks)
                                 # check-docs.sh è usato anche dallo Stop hook di Claude Code in .claude/settings.json
```

---

## Codice morto — non modificare, non prendere come esempio

```
# Componenti rimpiazzati
components/Dashboard.tsx         # Vecchia dashboard studente
components/AuthController.tsx    # Vecchio controller auth
components/LoginForm.tsx         # Vecchio form login
components/RegisterForm.tsx      # Vecchio form registrazione

# Pagine admin rimpiazzate
pages/AdminPage.tsx              # Vecchia pagina admin monolitica
pages/admin/BadgeAssignmentMethod.tsx  # Non importato

# Lib non usate
lib/admin.ts
lib/googleSheets.ts
lib/schools.ts                   # Rimpiazzato da constants.ts
lib/supabase/                    # Client Next.js SSR — non usati dall'app Vite
  client.ts
  middleware.ts
  server.ts
  service.ts

# Residui Next.js (mai usati dall'app Vite)
app/                             # Next.js App Router con API routes
next.config.mjs
middleware.ts
.next/                           # Tracciata per errore su git

# Config inutili
tailwind.config.js               # Tailwind è solo CDN — questo file non ha effetto
postcss.config.mjs
metadata.json                    # Template Google AI Studio
README.md                        # Template Google AI Studio
```

> **Nota**: `tsconfig.json` non ha `include`, quindi `tsc` analizza anche `app/` e fallisce per i moduli Next.js mancanti.
