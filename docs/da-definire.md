# docs/da-definire.md

Questioni aperte e funzioni da progettare: decisioni di prodotto non ancora prese.
- I problemi presenti nel codice vanno in [problemi-noti.md](problemi-noti.md), non qui.
- Quando una questione viene decisa o realizzata, toglila da questo elenco (e aggiorna [GLOSSARY.md](../GLOSSARY.md) se cambia un termine).

---

## Partecipazione completata negli eventi di più giorni

Oggi basta una scansione di ingresso e una di uscita in tutto l'evento, in qualsiasi giorno. Da decidere se negli eventi di più giorni servano ingresso e uscita per ogni giorno, o una percentuale minima di giorni.

## Lista d'attesa

A posti esauriti oggi non ci si può iscrivere. Idea: permettere l'iscrizione "in attesa" anche a evento pieno, fino alla scadenza, così l'admin ha già chi far entrare se rimuove qualcuno.

## Link esterni nei materiali

I materiali possono contenere link che portano fuori dall'app. Da definire come presentarli e che regole seguono.

## Questionario post-evento

Idea: collegare a un evento un questionario (anche esterno) da compilare dopo la partecipazione. Il vecchio campo "Link a form esterna" degli eventi è stato tolto perché bypassava l'iscrizione nell'app.

## QR code dinamico

Un QR che cambia ogni pochi minuti, mostrato su uno schermo all'evento, per impedire la scansione da una foto (vedi [problemi-noti.md](problemi-noti.md), "Validità del QR").

## Sezione pubblica

Oggi l'app è solo per studenti registrati: senza login non si vede nulla. Idea: una sezione pubblica, simile a quella studenti, con eventi dedicati. Il vecchio campo "visibilità" degli eventi (solo studenti / pubblico / sfocato) è stato tolto perché non aveva alcun effetto.

## Portale aziende

Il portale `/azienda` è stato disattivato (novembre 2026): le sue funzioni e tabelle esponevano i dati degli studenti a chiunque. Le password delle aziende (`aziende.password_temp`, salvate in chiaro) sono state svuotate e non sono recuperabili. Per riattivarlo serve un login vero (Supabase Auth per le aziende) e policy dedicate alle aziende autenticate.
