import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.ALPACA_API_KEY || '';
const apiSecret = process.env.ALPACA_API_SECRET || '';
const apiUrl = process.env.ALPACA_API_URL || 'https://paper-api.alpaca.markets';

console.log('API Key length:', apiKey.length);
console.log('API Secret length:', apiSecret.length);
console.log('API URL:', apiUrl);

// Normalize base URL to have /v2
const baseUrl = apiUrl.endsWith('/v2') ? apiUrl : `${apiUrl.replace(/\/$/, '')}/v2`;
console.log('Using Base URL:', baseUrl);

async function test() {
  try {
    const res = await fetch(`${baseUrl}/account`, {
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': apiSecret,
        'Content-Type': 'application/json',
      },
    });
    console.log('Response Status:', res.status, res.statusText);
    const text = await res.text();
    console.log('Response Body:', text);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

test();
