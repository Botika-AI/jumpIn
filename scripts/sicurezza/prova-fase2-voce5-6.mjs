// Prova della Fase 2 / voci 5 e 6 (date delle Iscrizioni) — SOLO Development.
// Uso: node scripts/sicurezza/prova-fase2-voce5-6.mjs "$PWD"
//
// PRIMA, nel SQL Editor di Development, eseguire la preparazione qui sotto
// (crea eventi "prova-v56-*" e iscrizioni per lo studente di .env.test.local).
// DOPO la prova: DELETE FROM public.events WHERE id LIKE 'prova-v56-%';
//
// BEGIN;
// DO $$
// DECLARE oggi date := (now() AT TIME ZONE 'Europe/Rome')::date; stud uuid;
// BEGIN
//   IF EXISTS (SELECT 1 FROM public.events WHERE id = 'start-up_weekend') THEN RAISE EXCEPTION 'STOP: questo è Production'; END IF;
//   SELECT id INTO stud FROM public.profiles WHERE lower(email) = 'danielegazzositest@gmail.com';
//   IF stud IS NULL THEN RAISE EXCEPTION 'Studente di prova non trovato'; END IF;
//   INSERT INTO public.events (id, name, event_date, event_end, scadenza_candidature, stato) VALUES
//     ('prova-v56-i1', 'PROVA v56 i1 futuro, senza scadenza',     oggi + 10, oggi + 10, NULL,     'pubblicato'),
//     ('prova-v56-i2', 'PROVA v56 i2 futuro, scadenza tra 5 gg',  oggi + 10, oggi + 10, oggi + 5, 'pubblicato'),
//     ('prova-v56-i3', 'PROVA v56 i3 futuro, scadenza oggi',      oggi + 10, oggi + 10, oggi,     'pubblicato'),
//     ('prova-v56-i4', 'PROVA v56 i4 iniziato oggi, senza scad.', oggi,      oggi + 1,  NULL,     'pubblicato'),
//     ('prova-v56-i5', 'PROVA v56 i5 iniziato ieri, scad. +3 gg', oggi - 1,  oggi + 1,  oggi + 3, 'pubblicato'),
//     ('prova-v56-d1', 'PROVA v56 d1 futuro, accettata',          oggi + 10, oggi + 10, NULL,     'pubblicato'),
//     ('prova-v56-d2', 'PROVA v56 d2 futuro, in attesa',          oggi + 10, oggi + 10, NULL,     'pubblicato'),
//     ('prova-v56-d3', 'PROVA v56 d3 iniziato oggi, accettata',   oggi,      oggi + 1,  NULL,     'pubblicato'),
//     ('prova-v56-d4', 'PROVA v56 d4 passato, in attesa',         oggi - 10, oggi - 9,  NULL,     'pubblicato'),
//     ('prova-v56-d5', 'PROVA v56 d5 futuro, rifiutata',          oggi + 10, oggi + 10, NULL,     'pubblicato'),
//     ('prova-v56-d6', 'PROVA v56 d6 inizia domani, accettata',   oggi + 1,  oggi + 1,  NULL,     'pubblicato');
//   INSERT INTO public.iscrizioni_eventi (event_id, user_id, stato) VALUES
//     ('prova-v56-d1', stud, 'accettata'), ('prova-v56-d2', stud, 'in_attesa'),
//     ('prova-v56-d3', stud, 'accettata'), ('prova-v56-d4', stud, 'in_attesa'),
//     ('prova-v56-d5', stud, 'rifiutata'), ('prova-v56-d6', stud, 'accettata');
// END $$;
// COMMIT;
import { readFileSync } from 'node:fs';

const repo = process.argv[2];
const env = (file) => Object.fromEntries(
  readFileSync(`${repo}/${file}`, 'utf8').split('\n')
    .map(l => l.trim()).filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, '')]; })
);
const { VITE_SUPABASE_URL: URL, VITE_SUPABASE_ANON_KEY: ANON } = env('.env.local');
const { TEST_STUDENT_EMAIL: EMAIL, TEST_STUDENT_PASSWORD: PASSWORD } = env('.env.test.local');
if (!URL.includes('mdybkor')) { console.error('STOP: non è Development.'); process.exit(1); }
console.log('Ambiente: Development');

const login = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
  method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
}).then(r => r.json());
if (!login.access_token) { console.error('Login fallito'); process.exit(1); }
const uid = login.user.id;
const studente = { apikey: ANON, Authorization: `Bearer ${login.access_token}`, 'Content-Type': 'application/json' };

const call = async (path, opts = {}) => {
  const r = await fetch(`${URL}/${path}`, { ...opts, headers: { ...studente, ...(opts.headers || {}) } });
  const text = await r.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  return { status: r.status, ok: r.ok, body };
};

const me = (await call(`rest/v1/profiles?id=eq.${uid}&select=is_admin`)).body;
if (me[0]?.is_admin !== false) { console.error('STOP: l\'account di prova non è uno studente normale.'); process.exit(1); }
const eventi = (await call('rest/v1/events?select=id&id=like.prova-v56-*')).body;
if (!Array.isArray(eventi) || eventi.length !== 11) { console.error(`STOP: eventi di prova trovati ${eventi?.length ?? 0} su 11: esegui la preparazione.`); process.exit(1); }

let errori = 0;
const esito = (nome, superato, dettaglio) => {
  if (!superato) errori++;
  console.log(`${superato ? '✅' : '❌'} ${nome}  [${dettaglio}]`);
};
const iscrivi = (ev, stato = 'in_attesa') => call('rest/v1/iscrizioni_eventi', {
  method: 'POST', headers: { Prefer: 'return=representation' },
  body: JSON.stringify({ event_id: ev, user_id: uid, stato }) });
// Una DELETE bloccata dalle RLS non dà errore: cancella 0 righe.
const annulla = async (ev) => {
  const r = await call(`rest/v1/iscrizioni_eventi?event_id=eq.${ev}&user_id=eq.${uid}`, {
    method: 'DELETE', headers: { Prefer: 'return=representation' } });
  return Array.isArray(r.body) ? r.body.length : -1;
};

console.log('\n--- Voce 5. Nuova Iscrizione ---');
let r = await iscrivi('prova-v56-i1', 'accettata');
esito('ATTACCO: iscriversi già "accettata" → rifiutato', !r.ok, `HTTP ${r.status}`);
r = await iscrivi('prova-v56-i1');
esito('USO NORMALE: evento futuro senza scadenza → ok', r.ok, `HTTP ${r.status}`);
r = await iscrivi('prova-v56-i2');
esito('USO NORMALE: scadenza tra 5 giorni → ok', r.ok, `HTTP ${r.status}`);
r = await iscrivi('prova-v56-i3');
esito('REGOLA: scadenza oggi → rifiutato (si chiude il giorno prima)', !r.ok, `HTTP ${r.status}`);
r = await iscrivi('prova-v56-i4');
esito('REGOLA: senza scadenza, evento iniziato oggi → rifiutato', !r.ok, `HTTP ${r.status}`);
r = await iscrivi('prova-v56-i5');
esito('REGOLA: evento iniziato ma scadenza futura → ok (vale la scadenza)', r.ok, `HTTP ${r.status}`);

console.log('\n--- Voce 6. Annullamento ---');
let n = await annulla('prova-v56-d1');
esito('USO NORMALE: annullare accettata, evento futuro → ok', n === 1, `${n} righe`);
n = await annulla('prova-v56-d2');
esito('USO NORMALE: annullare in attesa, evento futuro → ok', n === 1, `${n} righe`);
n = await annulla('prova-v56-d6');
esito('USO NORMALE: annullare il giorno prima dell\'inizio → ok', n === 1, `${n} righe`);
n = await annulla('prova-v56-d3');
esito('REGOLA: annullare il giorno di inizio → rifiutato', n === 0, `${n} righe`);
n = await annulla('prova-v56-d4');
esito('REGOLA: annullare a evento passato → rifiutato', n === 0, `${n} righe`);
n = await annulla('prova-v56-d5');
esito('REGOLA: annullare una rifiutata → rifiutato', n === 0, `${n} righe`);

console.log(`\n${errori === 0 ? 'TUTTE LE PROVE SUPERATE' : `${errori} PROVE FALLITE`}`);
console.log('\nPulizia: esegui nel SQL Editor di DEVELOPMENT:');
console.log("DELETE FROM public.events WHERE id LIKE 'prova-v56-%';");
process.exit(errori === 0 ? 0 : 1);
