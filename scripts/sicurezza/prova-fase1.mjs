// Prova completa della Fase 1 (A, B, C) su Development o Production (vedi docs/piano-lavori.md).
// Per ogni voce: ATTACCO (deve essere rifiutato) e USO NORMALE (deve funzionare).
// Lascia i dati come li ha trovati.
import { readFileSync } from 'node:fs';

const repo = process.argv[2];
const env = (file) => Object.fromEntries(
  readFileSync(`${repo}/${file}`, 'utf8').split('\n')
    .map(l => l.trim()).filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, '')]; })
);
// Uso: node prova-fase1.mjs <repo> dev   |   node prova-fase1.mjs <repo> prod <bundle.js>
const modo = process.argv[3] || 'dev';
let URL, ANON, EMAIL, PASSWORD;
if (modo === 'prod') {
  const js = readFileSync(process.argv[4], 'utf8');
  URL = js.match(/https:\/\/[a-z0-9]+\.supabase\.co/)[0];
  ANON = js.match(/eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/)[0];
  ({ TEST_STUDENT_EMAIL: EMAIL, TEST_STUDENT_PASSWORD: PASSWORD } = env('.env.prod-test.local'));
  if (!URL.includes('rneifgkgpabasmzfhkfg')) { console.error('STOP: il sito non punta a Production.'); process.exit(1); }
} else {
  ({ VITE_SUPABASE_URL: URL, VITE_SUPABASE_ANON_KEY: ANON } = env('.env.local'));
  ({ TEST_STUDENT_EMAIL: EMAIL, TEST_STUDENT_PASSWORD: PASSWORD } = env('.env.test.local'));
  if (!URL.includes('mdybkor')) { console.error('STOP: non è Development.'); process.exit(1); }
}
console.log(`Ambiente: ${modo === 'prod' ? 'PRODUCTION' : 'Development'}`);

const login = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
  method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
}).then(r => r.json());
if (!login.access_token) { console.error('Login fallito'); process.exit(1); }
const uid = login.user.id;
const h0 = { apikey: ANON, Authorization: `Bearer ${login.access_token}` };
const me = await fetch(`${URL}/rest/v1/profiles?id=eq.${uid}&select=is_admin`, { headers: h0 }).then(r => r.json());
if (me[0]?.is_admin !== false) { console.error('STOP: l\'account di prova non è uno studente normale.'); process.exit(1); }

const studente = { apikey: ANON, Authorization: `Bearer ${login.access_token}`, 'Content-Type': 'application/json' };
const anonimo  = { apikey: ANON, 'Content-Type': 'application/json' };
const call = async (who, path, opts = {}) => {
  const r = await fetch(`${URL}/${path}`, { ...opts, headers: { ...who, ...(opts.headers || {}) } });
  const text = await r.text();
  if (r.status === 401 && text.includes('API key')) throw new Error('TEST NON VALIDO: richiesta senza chiave');
  let body; try { body = JSON.parse(text); } catch { body = text; }
  return { status: r.status, ok: r.ok, body };
};
const rows = (r) => Array.isArray(r.body) ? r.body.length : 0;

let errori = 0;
const esito = (nome, superato, dettaglio) => {
  if (!superato) errori++;
  console.log(`${superato ? '✅' : '❌'} ${nome}  [${dettaglio}]`);
};

// ---------------- A ----------------
console.log('\n--- A. Profilo ---');
const att = await call(studente, `rest/v1/profiles?id=eq.${uid}`, {
  method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ is_admin: true }) });
const adminDopo = (await call(studente, `rest/v1/profiles?id=eq.${uid}&select=is_admin`)).body[0]?.is_admin;
esito('ATTACCO: diventare admin → rifiutato', adminDopo === false && !att.ok, `HTTP ${att.status}, is_admin=${adminDopo}`);
if (adminDopo === true) await call(studente, `rest/v1/profiles?id=eq.${uid}`, { method: 'PATCH', body: JSON.stringify({ is_admin: false }) });

const vis = await call(studente, 'rest/v1/profiles?select=id');
esito('Profili leggibili dallo studente = 1 (solo il suo)', rows(vis) === 1, `${rows(vis)}`);

const bioOrig = (await call(studente, `rest/v1/profiles?id=eq.${uid}&select=bio`)).body[0]?.bio ?? null;
const modBio = await call(studente, `rest/v1/profiles?id=eq.${uid}`, {
  method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ bio: 'prova fase 1' }) });
esito('USO NORMALE: modificare la propria bio → funziona', modBio.ok && rows(modBio) === 1, `HTTP ${modBio.status}`);
await call(studente, `rest/v1/profiles?id=eq.${uid}`, { method: 'PATCH', body: JSON.stringify({ bio: bioOrig }) });

const modCheckin = await call(studente, `rest/v1/profiles?id=eq.${uid}`, {
  method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ interests: modBio.body?.[0]?.interests ?? [] }) });
esito('USO NORMALE: salvare gli interessi → funziona', modCheckin.ok, `HTTP ${modCheckin.status}`);

// ---------------- B ----------------
console.log('\n--- B. Iscrizioni ---');
const mie = (await call(studente, `rest/v1/iscrizioni_eventi?user_id=eq.${uid}&select=event_id`)).body.map(r => r.event_id);
const eventi = (await call(studente, 'rest/v1/events?select=id&stato=eq.pubblicato')).body.map(e => e.id);
const libero = eventi.find(id => !mie.includes(id));
if (!libero) {
  console.log('⚠️  Lo studente di prova è già iscritto a tutti gli eventi: prove B saltate.');
} else {
  const forzata = await call(studente, 'rest/v1/iscrizioni_eventi', {
    method: 'POST', headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ event_id: libero, user_id: uid, stato: 'accettata' }) });
  esito('ATTACCO: iscriversi già "accettata" → rifiutato', !forzata.ok, `HTTP ${forzata.status}`);
  if (forzata.ok) await call(studente, `rest/v1/iscrizioni_eventi?event_id=eq.${libero}&user_id=eq.${uid}`, { method: 'DELETE' });

  const normale = await call(studente, 'rest/v1/iscrizioni_eventi', {
    method: 'POST', headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ event_id: libero, user_id: uid, stato: 'in_attesa' }) });
  esito('USO NORMALE: iscriversi "in attesa" → funziona', normale.ok, `HTTP ${normale.status}`);

  const auto = await call(studente, `rest/v1/iscrizioni_eventi?event_id=eq.${libero}&user_id=eq.${uid}`, {
    method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ stato: 'accettata' }) });
  const statoDopo = (await call(studente, `rest/v1/iscrizioni_eventi?event_id=eq.${libero}&user_id=eq.${uid}&select=stato`)).body[0]?.stato;
  esito('ATTACCO: auto-accettarsi l\'iscrizione → rifiutato', statoDopo === 'in_attesa', `HTTP ${auto.status}, stato=${statoDopo}`);

  const annulla = await call(studente, `rest/v1/iscrizioni_eventi?event_id=eq.${libero}&user_id=eq.${uid}`, {
    method: 'DELETE', headers: { Prefer: 'return=representation' } });
  esito('USO NORMALE: annullare l\'iscrizione → funziona', annulla.ok && rows(annulla) === 1, `HTTP ${annulla.status}`);
}

// ---------------- C ----------------
console.log('\n--- C. Portale aziende e funzioni ---');
const anonTalent = await call(anonimo, 'rest/v1/rpc/get_all_talent_profiles', {
  method: 'POST', body: JSON.stringify({ p_company_id: '00000000-0000-0000-0000-000000000000' }) });
esito('ATTACCO da anonimo: elenco studenti (get_all_talent_profiles) → rifiutato', !anonTalent.ok, `HTTP ${anonTalent.status}`);

const studTalent = await call(studente, 'rest/v1/rpc/get_all_talent_profiles', {
  method: 'POST', body: JSON.stringify({ p_company_id: '00000000-0000-0000-0000-000000000000' }) });
esito('ATTACCO da studente: elenco studenti → rifiutato', !studTalent.ok, `HTTP ${studTalent.status}`);

const anonContact = await call(anonimo, 'rest/v1/rpc/contact_student', {
  method: 'POST', body: JSON.stringify({ p_company_id: '00000000-0000-0000-0000-000000000000', p_company_name: 'x', p_student_id: uid, p_message: 'x' }) });
esito('ATTACCO da anonimo: messaggio finto a uno studente → rifiutato', !anonContact.ok, `HTTP ${anonContact.status}`);

const altrui = await call(studente, 'rest/v1/rpc/notify_profile_completed', {
  method: 'POST', body: JSON.stringify({ p_user_id: '00000000-0000-0000-0000-000000000000' }) });
esito('ATTACCO: notifica a nome di un altro utente → rifiutato', !altrui.ok, `HTTP ${altrui.status}`);

const anonSaved = await call(anonimo, 'rest/v1/saved_profiles?select=*');
esito('ATTACCO da anonimo: leggere i profili salvati dalle aziende → nessuna riga', rows(anonSaved) === 0, `HTTP ${anonSaved.status}, righe=${rows(anonSaved)}`);

const interessi = await call(studente, `rest/v1/company_interests?select=company_id&student_id=eq.${uid}`);
esito('USO NORMALE: pagina Aziende legge i propri interessi → funziona', interessi.ok, `HTTP ${interessi.status}`);

const partner = await call(studente, 'rest/v1/aziende?select=id,name&stato=eq.attivo&mostra_partner=eq.true');
esito('USO NORMALE: pagina Aziende legge i partner → funziona', partner.ok, `HTTP ${partner.status}, aziende=${rows(partner)}`);

console.log(`\n${errori === 0 ? 'TUTTE LE PROVE SUPERATE' : `PROVE FALLITE: ${errori}`}`);
process.exit(errori ? 1 : 0);
