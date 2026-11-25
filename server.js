const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'raffle-data.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Default initial state
const freshState = () => ({
  employees: [],
  winners: [],
  allowed: [],
  pending: [],
  ids: {},
  rounds: [],
  live: null,
  log: [],
  evInfo: {},
  lastUpdated: new Date().toISOString()
});

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(content);
      return {
        employees: Array.isArray(parsed.employees) ? parsed.employees : [],
        winners: Array.isArray(parsed.winners) ? parsed.winners : [],
        allowed: Array.isArray(parsed.allowed) ? parsed.allowed : [],
        pending: Array.isArray(parsed.pending) ? parsed.pending : [],
        ids: parsed.ids && typeof parsed.ids === 'object' ? parsed.ids : {},
        rounds: Array.isArray(parsed.rounds) ? parsed.rounds : [],
        live: parsed.live || null,
        log: Array.isArray(parsed.log) ? parsed.log : [],
        evInfo: parsed.evInfo && typeof parsed.evInfo === 'object' ? parsed.evInfo : {},
        lastUpdated: parsed.lastUpdated || new Date().toISOString()
      };
    }
  } catch (err) {
    console.error('[MHC Raffle Server] Error reading data file:', err.message);
  }
  const init = freshState();
  saveData(init);
  return init;
}

function saveData(data) {
  try {
    const tempFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempFile, DATA_FILE);
    return true;
  } catch (err) {
    console.error('[MHC Raffle Server] Error writing data file:', err.message);
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (e) {
      console.error('[MHC Raffle Server] Direct write fallback error:', e.message);
      return false;
    }
  }
}

// Merge state
function mergeRaffleData(serverState, incoming) {
  if (!incoming || typeof incoming !== 'object') return serverState;

  const result = { ...serverState };

  // 1. Employees (registered attendees)
  if (Array.isArray(incoming.employees)) {
    const empMap = new Map();
    serverState.employees.forEach(e => { if (e && e.id) empMap.set(String(e.id).trim().toLowerCase(), e); });
    incoming.employees.forEach(e => {
      if (e && e.id) {
        empMap.set(String(e.id).trim().toLowerCase(), e);
      }
    });
    result.employees = Array.from(empMap.values());
  }

  // 2. Allowed list
  if (Array.isArray(incoming.allowed)) {
    const allowMap = new Map();
    serverState.allowed.forEach(a => { if (a && a.id) allowMap.set(String(a.id).trim().toLowerCase(), a); });
    incoming.allowed.forEach(a => { if (a && a.id) allowMap.set(String(a.id).trim().toLowerCase(), a); });
    result.allowed = Array.from(allowMap.values());
  }

  // 3. Pending manual entries
  if (Array.isArray(incoming.pending)) {
    const allowedIds = new Set(result.allowed.map(a => a && a.id ? String(a.id).trim().toLowerCase() : ''));
    const empIds = new Set(result.employees.map(e => e && e.id ? String(e.id).trim().toLowerCase() : ''));
    result.pending = incoming.pending.filter(p => p && p.id && !allowedIds.has(String(p.id).trim().toLowerCase()) && !empIds.has(String(p.id).trim().toLowerCase()));
  }

  // 4. Winners
  if (Array.isArray(incoming.winners)) {
    result.winners = incoming.winners;
  }

  // 5. Rounds
  if (Array.isArray(incoming.rounds)) {
    result.rounds = incoming.rounds;
  }

  // 6. Security IDs
  if (incoming.ids && typeof incoming.ids === 'object') {
    result.ids = { ...serverState.ids, ...incoming.ids };
  }

  // 7. Live Real-Time Draw Event
  if (incoming.live !== undefined) {
    result.live = incoming.live;
  }

  // 8. Draw Log
  if (Array.isArray(incoming.log)) {
    result.log = incoming.log;
  }

  // 9. Event Info
  if (incoming.evInfo && typeof incoming.evInfo === 'object') {
    result.evInfo = incoming.evInfo;
  }

  result.lastUpdated = new Date().toISOString();
  return result;
}

// MIME types dictionary
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.csv': 'text/csv; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer((req, res) => {
  // Global CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Health check endpoint
  if (pathname === '/health' || pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: 'ok',
      service: 'MHC Christmas Party Registration & Raffle Draw',
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }));
  }

  // GET /api/data -> Retrieve full raffle data
  if (pathname === '/api/data' && req.method === 'GET') {
    const data = loadData();
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    return res.end(JSON.stringify(data));
  }

  // POST /api/sync -> Sync raffle data
  if (pathname === '/api/sync' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      // Safeguard max payload 15MB
      if (body.length > 15 * 1024 * 1024) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload too large' }));
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const currentState = loadData();
        const mergedState = mergeRaffleData(currentState, payload);

        const success = saveData(mergedState);
        if (success) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: true,
            data: mergedState,
            lastUpdated: mergedState.lastUpdated
          }));
        } else {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Failed to write data on server' }));
        }
      } catch (err) {
        console.error('[MHC Raffle Server] JSON parse error on sync:', err.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Malformed JSON payload' }));
      }
    });
    return;
  }

  // Static File Serving
  if (req.method === 'GET' || req.method === 'HEAD') {
    if (pathname === '/' || pathname === '') {
      pathname = '/index.html';
    }

    const safePath = path.normalize(path.join(__dirname, pathname));

    if (!safePath.startsWith(__dirname)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      return res.end('Forbidden');
    }

    fs.stat(safePath, (err, stats) => {
      if (err || !stats.isFile()) {
        const indexPath = path.join(__dirname, 'index.html');
        if (fs.existsSync(indexPath)) {
          const ext = path.extname(indexPath).toLowerCase();
          const contentType = MIME_TYPES[ext] || 'application/octet-stream';
          res.writeHead(200, { 'Content-Type': contentType });
          return fs.createReadStream(indexPath).pipe(res);
        }
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('File Not Found');
      }

      const ext = path.extname(safePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(safePath).pipe(res);
    });
    return;
  }

  res.writeHead(405, { 'Content-Type': 'text/plain' });
  res.end('Method Not Allowed');
});

server.listen(PORT, () => {
  console.log(`[MHC Raffle Server] May Harvest Christmas Party Registration System live on http://localhost:${PORT}`);
  console.log(`[MHC Raffle Server] Storage: ${DATA_FILE}`);
});
