// One-off: creates the "Dayaar Website Leads" Google Sheet and prints its ID.
// Needs GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REFRESH_TOKEN in backend/.env.
// Usage (from backend/): npm run create:lead-sheet
require('dotenv').config();
const { createLeadSheet } = require('../services/googleSheets');

const missing = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN'].filter((key) => !process.env[key]);
if (missing.length) {
  console.error('Missing in backend/.env: ' + missing.join(', '));
  process.exit(1);
}

createLeadSheet('Dayaar Website Leads')
  .then(({ id, url }) => {
    console.log('Created: ' + url);
    console.log('Add this to backend/.env and Render:  GOOGLE_SHEET_ID=' + id);
  })
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
