// Applies the DB-aware /api/health upgrade to D:\GoPratle-Assignment\backend\src\app.js
import fs from 'node:fs';

const file = 'D:\\GoPratle-Assignment\\backend\\src\\app.js';
let src = fs.readFileSync(file, 'utf8');

const oldLine = "app.get('/api/health', (req, res) => res.json({ status: 'ok' }));";
const newBlock = `app.get('/api/health', (req, res) => {
  // mongoose.connection.readyState: 0=disconnected 1=connected 2=connecting 3=disconnecting
  const dbState = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.json({
    status: 'ok',
    service: 'gopratle-api',
    database: dbState[require('mongoose').connection.readyState] || 'unknown',
    environment: process.env.NODE_ENV || 'development',
  });
});`;

if (!src.includes(oldLine)) {
  console.error('ANCHOR NOT FOUND — no changes made');
  process.exit(1);
}
src = src.replace(oldLine, newBlock);
fs.writeFileSync(file, src, 'utf8');
console.log('health endpoint upgraded OK');
