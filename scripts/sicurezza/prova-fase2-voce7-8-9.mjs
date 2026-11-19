// Prova della Fase 2 / voci 7, 8, 9 (materiali, spazio privato, bozze) — SOLO Development.
// Uso: node scripts/sicurezza/prova-fase2-voce7-8-9.mjs "$PWD"
//
// PRIMA, nel SQL Editor di Development, eseguire la preparazione qui sotto.
// DOPO la prova: DELETE FROM public.events WHERE id LIKE 'prova-v789-%';
//
// Il link temporaneo a un file vero si prova nella parte di codice, quando
// l'admin potrà caricare file nello spazio "materiali" dall'app.
//
// BEGIN;
// DO $$
// DECLARE oggi date := (now() AT TIME ZONE 'Europe/Rome')::date; stud uuid;
// BEGIN
//   IF EXISTS (SELECT 1 FROM public.events WHERE id = 'start-up_weekend') THEN RAISE EXCEPTION 'STOP: questo è Production'; END IF;
//   SELECT id INTO stud FROM public.profiles WHERE lower(email) = 'danielegazzositest@gmail.com';
//   IF stud IS NULL THEN RAISE EXCEPTION 'Studente di prova non trovato'; END IF;
//   INSERT INTO public.events (id, name, event_date, event_end, stato) VALUES
//     ('prova-v789-acc',   'PROVA v789 pubblicato, accettato',     oggi + 10, oggi + 10, 'pubblicato'),
//     ('prova-v789-no',    'PROVA v789 pubblicato, non iscritto',  oggi + 10, oggi + 10, 'pubblicato'),
//     ('prova-v789-bozza', 'PROVA v789 bozza',                     oggi + 10, oggi + 10, 'bozza'),
//     ('prova-v789-null',  'PROVA v789 senza stato',               oggi + 10, oggi + 10, NULL);
//   INSERT INTO public.iscrizioni_eventi (event_id, user_id, stato) VALUES ('prova-v789-acc', stud, 'accettata');
//   INSERT INTO public.materiali_eventi (event_id, titolo, tipo, url) VALUES
//     ('prova-v789-acc', 'PROVA materiale accettato',   'link', 'https://example.com/a'),
//     ('prova-v789-no',  'PROVA materiale non iscritto', 'link', 'https://example.com/b');
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
const studente = { apikey: ANON, Authorization: `Bearer ${login.access_token}` };
const anonimo  = { apikey: ANON };

const call = async (who, path, opts = {}) => {
  const r = await fetch(`${URL}/${path}`, { ...opts, headers: { ...who, ...(opts.headers || {}) } });
  const text = await r.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  return { status: r.status, ok: r.ok, body };
};
const righe = (r) => Array.isArray(r.body) ? r.body.length : -1;

const me = (await call(studente, `rest/v1/profiles?id=eq.${uid}&select=is_admin`)).body;
if (me[0]?.is_admin !== false) { console.error('STOP: l\'account di prova non è uno studente normale.'); process.exit(1); }

let errori = 0;
const esito = (nome, superato, dettaglio) => {
  if (!superato) errori++;
  console.log(`${superato ? '✅' : '❌'} ${nome}  [${dettaglio}]`);
};

console.log('\n--- Voce 9. Eventi visibili ---');
let r = await call(studente, 'rest/v1/events?select=id&id=eq.prova-v789-acc');
esito('USO NORMALE: evento pubblicato visibile', righe(r) === 1, `${righe(r)} righe`);
if (righe(r) !== 1) { console.error('STOP: esegui la preparazione.'); process.exit(1); }
r = await call(studente, 'rest/v1/events?select=id&id=eq.prova-v789-bozza');
esito('REGOLA: evento in bozza nascosto', righe(r) === 0, `${righe(r)} righe`);
r = await call(studente, 'rest/v1/events?select=id&id=eq.prova-v789-null');
esito('REGOLA: evento senza stato nascosto', righe(r) === 0, `${righe(r)} righe`);

console.log('\n--- Voce 7. Materiali ---');
r = await call(studente, 'rest/v1/materiali_eventi?select=id&event_id=eq.prova-v789-acc');
esito('USO NORMALE: materiali dell\'evento con iscrizione accettata visibili', righe(r) === 1, `${righe(r)} righe`);
r = await call(studente, 'rest/v1/materiali_eventi?select=id&event_id=eq.prova-v789-no');
esito('REGOLA: materiali di un evento senza iscrizione nascosti', righe(r) === 0, `${righe(r)} righe`);
r = await call(anonimo, 'rest/v1/materiali_eventi?select=id&event_id=like.prova-v789-*');
esito('REGOLA: materiali nascosti agli anonimi', righe(r) <= 0, `HTTP ${r.status}, ${righe(r)} righe`);
r = await call(studente, 'rest/v1/materiali_eventi', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
  body: JSON.stringify({ event_id: 'prova-v789-acc', titolo: 'ATTACCO', tipo: 'link', url: 'https://example.com/x' }) });
esito('ATTACCO: studente aggiunge un materiale → rifiutato', !r.ok, `HTTP ${r.status}`);

console.log('\n--- Voce 8. Spazio privato "materiali" ---');
const carica = (who, path) => call(who, `storage/v1/object/materiali/${path}`, {
  method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'prova' });
r = await carica(studente, 'prova-v789-acc/attacco.txt');
esito('ATTACCO: studente carica un file nello spazio materiali → rifiutato', !r.ok, `HTTP ${r.status}`);
r = await carica(anonimo, 'prova-v789-acc/attacco.txt');
esito('ATTACCO: anonimo carica un file nello spazio materiali → rifiutato', !r.ok, `HTTP ${r.status}`);
r = await call(anonimo, 'storage/v1/object/public/materiali/prova-v789-acc/qualsiasi.txt');
esito('REGOLA: nessun link pubblico allo spazio materiali', !r.ok, `HTTP ${r.status}`);

console.log(`\n${errori === 0 ? 'TUTTE LE PROVE SUPERATE' : `${errori} PROVE FALLITE`}`);
console.log('\nPulizia: esegui nel SQL Editor di DEVELOPMENT:');
console.log("DELETE FROM public.events WHERE id LIKE 'prova-v789-%';");
process.exit(errori === 0 ? 0 : 1);
