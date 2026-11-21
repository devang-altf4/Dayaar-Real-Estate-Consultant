// One-off: authorises Google Sheets access for website lead sync and saves
// GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REFRESH_TOKEN into backend/.env.
// Usage (from backend/): node scripts/authorizeGoogle.js <path-to-oauth-client.json>
// The OAuth client must allow the redirect http://localhost:5181/callback.
const { createHash, randomBytes } = require('node:crypto');
const { readFileSync, writeFileSync, existsSync } = require('node:fs');
const { createServer } = require('node:http');
const path = require('node:path');

const clientPath = process.argv[2];
if (!clientPath) throw new Error('Supply the OAuth client JSON file path.');
const client = Object.values(JSON.parse(readFileSync(clientPath, 'utf8')))[0];
const redirect = new URL('http://localhost:5181/callback');
if (!client.redirect_uris?.includes(redirect.href)) throw new Error('The OAuth client must allow ' + redirect.href);

const scope = 'https://www.googleapis.com/auth/spreadsheets';
const state = randomBytes(32).toString('base64url');
const verifier = randomBytes(48).toString('base64url');
const authorization = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authorization.search = new URLSearchParams({
  client_id: client.client_id,
  redirect_uri: redirect.href,
  response_type: 'code',
  scope,
  access_type: 'offline',
  prompt: 'consent',
  state,
  code_challenge: createHash('sha256').update(verifier).digest('base64url'),
  code_challenge_method: 'S256',
}).toString();

function saveToEnv(values) {
  const envPath = path.join(__dirname, '..', '.env');
  let text = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
  for (const [key, value] of Object.entries(values)) {
    const line = key + '=' + value;
    const pattern = new RegExp('^' + key + '=.*$', 'm');
    text = pattern.test(text) ? text.replace(pattern, line) : text.replace(/\n?$/, '\n') + line + '\n';
  }
  writeFileSync(envPath, text);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, redirect);
  if (url.pathname === '/') {
    res.writeHead(302, { Location: authorization.href, 'Cache-Control': 'no-store' }).end();
    return;
  }
  if (url.pathname !== redirect.pathname || url.searchParams.get('state') !== state || !url.searchParams.has('code')) {
    res.writeHead(400).end('Google authorization was not completed.');
    return;
  }
  try {
    const exchange = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: client.client_id,
        client_secret: client.client_secret,
        redirect_uri: redirect.href,
        grant_type: 'authorization_code',
        code_verifier: verifier,
        code: url.searchParams.get('code'),
      }),
    });
    if (!exchange.ok) throw new Error('Google token exchange failed: ' + exchange.status);
    const token = await exchange.json();
    if (!token.refresh_token || !token.scope?.split(/\s+/).includes(scope)) {
      throw new Error('Google did not grant offline Google Sheets access. Tick the Sheets permission and try again.');
    }
    saveToEnv({
      GOOGLE_CLIENT_ID: client.client_id,
      GOOGLE_CLIENT_SECRET: client.client_secret,
      GOOGLE_REFRESH_TOKEN: token.refresh_token,
    });
    res.writeHead(200, { 'Cache-Control': 'no-store' }).end('Dayaar Google Sheets access is set up. You can close this tab.');
    console.log('Saved Google Sheets credentials to backend/.env');
    server.close();
  } catch (error) {
    res.writeHead(400, { 'Cache-Control': 'no-store' }).end(error.message);
    console.log(error.message);
  }
});

server.listen(5181, 'localhost', () => console.log('Authorize at http://localhost:5181/'));
