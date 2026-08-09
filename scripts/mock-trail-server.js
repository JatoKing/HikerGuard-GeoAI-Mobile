#!/usr/bin/env node

/**
 * Minimal local stand-in for the application backend's mobile-facing trail
 * endpoints (Section 8), so HttpTrailRepository can be exercised manually
 * before a real backend exists (Section 18: JEJAK's own API only exposes
 * GET /health today).
 *
 * Serves the same fixtures FixtureTrailRepository uses, over HTTP, with
 * names suffixed "(via HTTP mock)" so it's visually obvious in the app
 * which source answered.
 *
 * Usage:
 *   node scripts/mock-trail-server.js [port]
 *
 * Then point the app at it via .env:
 *   EXPO_PUBLIC_TRAIL_API_BASE_URL=http://<your-LAN-IP>:<port>
 *
 * A physical device running Expo Go cannot reach "localhost" — it needs
 * your computer's LAN IP (same Wi-Fi network). This script prints it on
 * startup for convenience.
 */
const http = require('http');
const os = require('os');
const path = require('path');

const PORT = Number(process.argv[2]) || 4000;
const FIXTURES_DIR = path.join(__dirname, '..', 'src', 'repositories', 'fixtures');

const summaries = require(path.join(FIXTURES_DIR, 'trail-summaries.fixture.json'));

const PACKS_BY_TRAIL_ID = {
  'gunung-batu-putih': 'gunung-batu-putih.trail-pack.json',
  'gopeng-ultra-trail-gua-tempurung': 'gopeng-ultra-trail-gua-tempurung.trail-pack.json',
  'bukit-wawasan-puchong': 'bukit-wawasan-puchong.trail-pack.json',
  'gunung-panti': 'gunung-panti.trail-pack.json',
  'gunung-korbu': 'gunung-korbu.trail-pack.json',
  'bukit-tabur': 'bukit-tabur.trail-pack.json',
};

function findLanAddress() {
  const nets = os.networkInterfaces();
  for (const interfaceEntries of Object.values(nets)) {
    for (const net of interfaceEntries) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return '127.0.0.1';
}

function sendJson(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(json),
  });
  res.end(json);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  console.log(`[mock-trail-server] ${req.method} ${url.pathname}`);

  if (url.pathname === '/trails') {
    const withMockLabel = summaries.map((s) => ({ ...s, name: `${s.name} (via HTTP mock)` }));
    return sendJson(res, 200, withMockLabel);
  }

  const packMatch = url.pathname.match(/^\/trails\/([^/]+)\/pack$/);
  if (packMatch) {
    const trailId = decodeURIComponent(packMatch[1]);
    const fileName = PACKS_BY_TRAIL_ID[trailId];
    if (!fileName) {
      return sendJson(res, 404, { error: `Unknown trail_id "${trailId}"` });
    }
    const pack = require(path.join(FIXTURES_DIR, fileName));
    return sendJson(res, 200, { ...pack, name: `${pack.name} (via HTTP mock)` });
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  const lanAddress = findLanAddress();
  console.log(`[mock-trail-server] listening on http://${lanAddress}:${PORT}`);
  console.log('[mock-trail-server] add to .env:');
  console.log(`  EXPO_PUBLIC_TRAIL_API_BASE_URL=http://${lanAddress}:${PORT}`);
});
