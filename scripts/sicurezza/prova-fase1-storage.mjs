// Prova D: bucket badge-icon su Development.
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

const login = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
  method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
}).then(r => r.json());
if (!login.access_token) { console.error('Login fallito'); process.exit(1); }

const chi = {
  anonimo:  { apikey: ANON, Authorization: `Bearer ${ANON}` },
  studente: { apikey: ANON, Authorization: `Bearer ${login.access_token}` },
};
let errori = 0;
const esito = (nome, ok, det) => { if (!ok) errori++; console.log(`${ok ? '✅' : '❌'} ${nome}  [${det}]`); };

for (const [nome, h] of Object.entries(chi)) {
  const path = `badges/prova-sicurezza-${nome}-${Date.now()}.txt`;
  const up = await fetch(`${URL}/storage/v1/object/badge-icon/${path}`, {
    method: 'POST', headers: { ...h, 'Content-Type': 'text/plain', 'x-upsert': 'true' }, body: 'prova',
  });
  const t = await up.text();
  if (t.includes('API key')) throw new Error('TEST NON VALIDO: richiesta senza chiave');
  esito(`ATTACCO da ${nome}: caricare un file in badge-icon → rifiutato`, !up.ok, `HTTP ${up.status} ${t.slice(0, 90)}`);
  if (up.ok) console.log(`   ⚠️ file caricato: badge-icon/${path} — va rimosso da admin`);
}

const lista = await fetch(`${URL}/storage/v1/object/list/badge-icon`, {
  method: 'POST', headers: { ...chi.studente, 'Content-Type': 'application/json' },
  body: JSON.stringify({ prefix: 'badges', limit: 5 }),
});
const elenco = await lista.json().catch(() => []);
esito('USO NORMALE: elenco icone leggibile', lista.ok, `HTTP ${lista.status}, file visti=${Array.isArray(elenco) ? elenco.length : '?'}`);

const primo = Array.isArray(elenco) ? elenco.find(f => f.id) : null;
if (primo) {
  const pub = await fetch(`${URL}/storage/v1/object/public/badge-icon/badges/${primo.name}`);
  esito('USO NORMALE: icona visibile tramite link pubblico', pub.ok, `HTTP ${pub.status}`);
} else {
  console.log('ℹ️  Nessuna icona presente su Development: prova del link pubblico saltata.');
}
console.log(`\n${errori === 0 ? 'TUTTE LE PROVE SUPERATE' : `PROVE FALLITE: ${errori}`}`);
