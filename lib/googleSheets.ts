import { google } from 'googleapis';

export interface CheckInPayload {
  nome: string;
  cognome: string;
  email: string;
  scuola: string;
  dataOra: string;       // Italian formatted datetime string from client
  decodedText: string;   // raw QR content — tipo resolved server-side
}

const HEADERS = ['Nome', 'Cognome', 'Email', 'Scuola', 'Data e Ora', 'Tipo'];

function getSheetsClient() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable is not set');
  }
  const credentials = JSON.parse(raw);
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

async function ensureHeaders(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string
): Promise<void> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'A1:F1',
  });
  if (!res.data.values || res.data.values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'A1:F1',
      valueInputOption: 'RAW',
      requestBody: { values: [HEADERS] },
    });
  }
}

export async function appendCheckin(payload: CheckInPayload): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SPREADSHEET_ID environment variable is not set');
  }

  const sheets = getSheetsClient();

  let tipo: string;
  if (payload.decodedText === process.env.ENTRANCE_QR_VALUE) {
    tipo = 'Entrata';
  } else if (payload.decodedText === process.env.EXIT_QR_VALUE) {
    tipo = 'Uscita';
  } else {
    console.log('[checkin] unknown QR value:', payload.decodedText);
    tipo = 'Entrata';
  }

  await ensureHeaders(sheets, spreadsheetId);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'A:F',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[payload.nome, payload.cognome, payload.email, payload.scuola, payload.dataOra, tipo]],
    },
  });
}
