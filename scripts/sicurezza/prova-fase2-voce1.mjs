// Prova della Fase 2 / voce 1 (Scansione valida) — SOLO Development.
// Uso: node scripts/sicurezza/prova-fase2-voce1.mjs "$PWD"
//
// Preparazione (da admin, su Development), con lo studente di prova di .env.test.local:
//   - evento A: pubblicato, oggi compreso nelle date, studente ACCETTATO
//   - evento B: pubblicato, oggi compreso nelle date, studente NON accettato (nessuna iscrizione o in attesa)
//   - evento C: pubblicato, date passate o future, studente ACCETTATO
// Lo script trova da solo gli eventi A, B, C tra quelli visibili allo studente.
//
// Lo studente non può cancellare le proprie scansioni: alla fine lo script stampa
// la query per eliminare quelle create dalla prova (da eseguire nel SQL Editor di Development).
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
const anonimo  = { apikey: ANON, 'Content-Type': 'application/json' };

const call = async (who, path, opts = {}) => {
  const r = await fetch(`${URL}/${path}`, { ...opts, headers: { ...who, ...(opts.headers || {}) } });
  const text = await r.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  return { status: r.status, ok: r.ok, body };
};

const me = (await call(studente, `rest/v1/profiles?id=eq.${uid}&select=is_admin`)).body;
if (me[0]?.is_admin !== false) { console.error('STOP: l\'account di prova non è uno studente normale.'); process.exit(1); }

// Oggi in ora italiana (YYYY-MM-DD)
const oggi = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date());
const inCorso = (e) => e.event_date && oggi >= e.event_date && oggi <= (e.event_end || e.event_date);

const eventi = (await call(studente, 'rest/v1/events?select=id,name,event_date,event_end,stato&stato=eq.pubblicato')).body;
const iscr = (await call(studente, `rest/v1/iscrizioni_eventi?select=event_id,stato&user_id=eq.${uid}`)).body;
const accettato = (e) => iscr.some(i => i.event_id === e.id && i.stato === 'accettata');

const A = eventi.find(e => inCorso(e) && accettato(e));
const B = eventi.find(e => inCorso(e) && !accettato(e));
const C = eventi.find(e => !inCorso(e) && accettato(e));
console.log(`Oggi (Italia): ${oggi}`);
console.log(`A (in corso, accettato):     ${A ? `${A.id} — ${A.name}` : 'MANCANTE'}`);
console.log(`B (in corso, non accettato): ${B ? `${B.id} — ${B.name}` : 'MANCANTE'}`);
console.log(`C (non in corso, accettato): ${C ? `${C.id} — ${C.name}` : 'MANCANTE'}`);
if (!A || !B || !C) { console.error('\nSTOP: prepara gli eventi A, B, C come descritto in cima al file.'); process.exit(1); }

let errori = 0;
const esito = (nome, superato, dettaglio) => {
  if (!superato) errori++;
  console.log(`${superato ? '✅' : '❌'} ${nome}  [${dettaglio}]`);
};
const creati = [];
const scansione = async (who, riga) => {
  const r = await call(who, 'rest/v1/attendances', {
    method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(riga) });
  if (r.ok && Array.isArray(r.body)) creati.push(...r.body.map(x => x.id));
  return r;
};

console.log('\n--- Voce 1. Scansione valida ---');
let r = await scansione(studente, { user_id: uid, event_id: A.id, type: 'ingresso' });
esito('USO NORMALE: ingresso su evento A (accettato, in corso) → ok', r.ok, `HTTP ${r.status}`);
r = await scansione(studente, { user_id: uid, event_id: A.id, type: 'uscita' });
esito('USO NORMALE: uscita su evento A → ok', r.ok, `HTTP ${r.status}`);
r = await scansione(studente, { user_id: uid, event_id: A.id, type: 'ingresso' });
esito('USO NORMALE: scansione ripetuta su evento A → ok', r.ok, `HTTP ${r.status}`);
r = await scansione(studente, { user_id: uid, event_id: B.id, type: 'ingresso' });
esito('ATTACCO: evento B senza iscrizione accettata → rifiutato', !r.ok, `HTTP ${r.status}`);
r = await scansione(studente, { user_id: uid, event_id: C.id, type: 'ingresso' });
esito('ATTACCO: evento C fuori dalle date → rifiutato', !r.ok, `HTTP ${r.status}`);
r = await scansione(studente, { user_id: uid, event_id: A.id, type: 'ingresso', scanned_at: '2020-01-01T10:00:00Z' });
esito('ATTACCO: ora della scansione inventata → rifiutato', !r.ok, `HTTP ${r.status}`);
r = await scansione(studente, { user_id: uid, event_id: A.id, type: 'ingresso', scanned_at: null });
esito('ATTACCO: ora della scansione vuota → rifiutato', !r.ok, `HTTP ${r.status}`);
r = await scansione(anonimo, { user_id: uid, event_id: A.id, type: 'ingresso' });
esito('ATTACCO: scansione da anonimo → rifiutato', !r.ok, `HTTP ${r.status}`);

console.log(`\n${errori === 0 ? 'TUTTE LE PROVE SUPERATE' : `${errori} PROVE FALLITE`}`);
if (creati.length) {
  console.log('\nPulizia: esegui nel SQL Editor di DEVELOPMENT:');
  console.log(`DELETE FROM public.attendances WHERE id IN (${creati.map(id => `'${id}'`).join(', ')});`);
}
process.exit(errori === 0 ? 0 : 1);
