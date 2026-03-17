export interface CheckInPayload {
  nome: string;
  cognome: string;
  email: string;
  scuola: string;
  dataOra: string;       // Italian formatted datetime string from client
  decodedText: string;   // raw QR content — tipo resolved server-side
}

export async function appendCheckin(payload: CheckInPayload): Promise<void> {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (!url) {
    throw new Error('GOOGLE_APPS_SCRIPT_URL environment variable is not set');
  }

  let tipo: string;
  if (payload.decodedText === process.env.ENTRANCE_QR_VALUE) {
    tipo = 'Entrata';
  } else if (payload.decodedText === process.env.EXIT_QR_VALUE) {
    tipo = 'Uscita';
  } else {
    console.log('[checkin] unknown QR value:', payload.decodedText);
    tipo = 'Entrata';
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: payload.nome,
      cognome: payload.cognome,
      email: payload.email,
      scuola: payload.scuola,
      dataOra: payload.dataOra,
      tipo,
    }),
    redirect: 'follow',
  });

  if (!res.ok) {
    throw new Error(`Apps Script returned ${res.status}`);
  }
}
