# JumpIn

Piattaforma di orientamento con cui Fattor Comune accompagna gli studenti delle superiori di Rimini e provincia attraverso eventi, attestati, badge e offerte di lavoro di aziende partner.

## Eventi e partecipazione

**Evento**:
Un'attività di orientamento organizzata da Fattor Comune, con una data di inizio e una eventuale data di fine, a cui gli studenti possono iscriversi.
_Avoid_: Esperienza (resta solo come etichetta nell'interfaccia studente)

**Evento pubblicato**:
Un Evento visibile agli studenti. Finché non è pubblicato, un Evento è una bozza visibile solo all'admin.

**Evento concluso**:
Un Evento il cui ultimo giorno è passato; lo diventa dal giorno successivo, secondo l'ora italiana.
_Avoid_: Evento terminato, evento passato

**Iscrizione**:
La richiesta di uno studente di partecipare a un Evento; può essere in attesa, accettata o rifiutata dall'admin. Uno studente rimosso da un Evento ha l'Iscrizione rifiutata.
_Avoid_: Candidatura (riservato alle offerte di lavoro)

**Scadenza iscrizioni**:
Il momento dopo il quale non si possono più creare nuove Iscrizioni a un Evento.
_Avoid_: Scadenza candidature

**Posti**:
Il numero massimo di Iscrizioni accettate per un Evento; non può mai essere superato. A posti esauriti non si possono creare nuove Iscrizioni, e l'admin accetta un nuovo studente solo dopo averne rimosso un altro.
_Avoid_: Capienza, max partecipanti

**Scansione**:
La lettura del QR code di ingresso o di uscita di un Evento da parte di uno studente.
_Avoid_: Presenza, check-in, timbratura

**Partecipazione completata**:
La presenza di uno studente con Iscrizione accettata a un Evento, dimostrata da almeno una Scansione di ingresso e almeno una di uscita, in qualsiasi ordine e giorno dell'Evento.
_Avoid_: Evento completato, presenza

**Materiale**:
Un file o un link che l'admin collega a un Evento, riservato agli studenti con Iscrizione accettata a quell'Evento.

## Riconoscimenti

**Attestato**:
Il documento che certifica la partecipazione di uno studente a uno specifico Evento; si ottiene dopo che l'Evento è concluso, con una Partecipazione completata oppure per assegnazione manuale dell'admin.
_Avoid_: Certificato

**Badge**:
Un riconoscimento assegnato a uno studente dall'admin, a mano oppure in automatico al raggiungimento di un numero minimo di Partecipazioni completate.

## Lavoro

**Azienda**:
Un'organizzazione registrata sulla piattaforma che pubblica Offerte di lavoro.

**Azienda partner**:
Un'Azienda che Fattor Comune mostra pubblicamente come partner.

**Offerta di lavoro**:
Un annuncio di lavoro pubblicato da un'Azienda e rivolto agli studenti.
_Avoid_: Job, posizione (“Job” resta solo come etichetta della sezione nell'interfaccia)

**Candidatura**:
La risposta di uno studente a un'Offerta di lavoro.
_Avoid_: Iscrizione, application
