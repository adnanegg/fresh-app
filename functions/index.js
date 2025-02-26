const functions = require('@google-cloud/functions-framework');
const { google } = require('googleapis');

functions.http('submitScore', async (req, res) => {
  // Set CORS headers for all responses
  res.set('Access-Control-Allow-Origin', '*'); // Allow all origins (or specify your frontend URL)
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS'); // Allow POST and OPTIONS
  res.set('Access-Control-Allow-Headers', 'Content-Type'); // Allow Content-Type header

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(204).send(''); // No content for preflight
  }

  // Only proceed for POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  const { timestamp, type, nickname, score, message } = req.body;
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: '1GBaiL1LooacoktkqJTSK6t6pd2hhOMbZPnxySi_XVfQ',
      range: 'Sheet1!A:E',
      valueInputOption: 'RAW',
      resource: {
        values: [[timestamp, type, nickname, score, message]],
      },
    });
    res.status(200).json({ message: 'Score submitted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error submitting score' });
  }
});