// Appends website leads to the Dayaar Google Sheet using an OAuth refresh token
// (same Google account and client as the SalesXAi lead worker).
// Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, GOOGLE_SHEET_ID.

const SHEET_TAB = 'Leads';
const HEADERS = [
  'Submitted At (IST)', 'Name', 'Phone', 'Budget', 'Profession',
  'BHK', 'Preferred Location', 'Requirement', 'Interested Zone', 'Lead ID',
];

const timedFetch = (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(10_000) });

let cachedToken = null;

async function accessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const response = await timedFetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  if (!response.ok) throw new Error('Google token refresh failed: ' + response.status);
  const data = await response.json();
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

async function google(url, method, payload) {
  const response = await timedFetch(url, {
    method,
    headers: { Authorization: 'Bearer ' + await accessToken(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(method + ' ' + new URL(url).pathname + ' failed: ' + response.status);
  return response.json();
}

const isConfigured = () => ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'GOOGLE_SHEET_ID']
  .every((key) => process.env[key]);

const istTimestamp = (date) => new Date(date).toLocaleString('en-IN', {
  timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short',
});

async function appendLead(lead) {
  if (!isConfigured()) return;
  const range = encodeURIComponent(`'${SHEET_TAB}'!A:J`);
  const url = 'https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(process.env.GOOGLE_SHEET_ID)
    + '/values/' + range + ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS';
  // RAW keeps user input as plain text, so values like "=SUM(...)" are never evaluated as formulas.
  await google(url, 'POST', {
    values: [[
      istTimestamp(lead.createdAt || Date.now()),
      lead.name,
      '+91 ' + lead.phone,
      lead.budget,
      lead.profession,
      lead.bhk,
      lead.locationPreferred,
      lead.specificRequirement,
      lead.interestedZone || '',
      String(lead._id || ''),
    ]],
  });
}

async function createLeadSheet(title) {
  const sheet = await google('https://sheets.googleapis.com/v4/spreadsheets', 'POST', {
    properties: { title, timeZone: 'Asia/Kolkata' },
    sheets: [{
      properties: { title: SHEET_TAB, gridProperties: { frozenRowCount: 1 } },
      data: [{ startRow: 0, startColumn: 0, rowData: [{
        values: HEADERS.map((text) => ({
          userEnteredValue: { stringValue: text },
          userEnteredFormat: { textFormat: { bold: true } },
        })),
      }] }],
    }],
  });
  return { id: sheet.spreadsheetId, url: sheet.spreadsheetUrl };
}

module.exports = { appendLead, createLeadSheet, isConfigured };
