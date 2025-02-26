const functions = require('@google-cloud/functions-framework');
const { google } = require('googleapis');

functions.http('submitScore', async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*'); // Enable CORS
  res.set('Access-Control-Allow-Methods', 'POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
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