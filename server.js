const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

const PORT    = 3000;
const ROOT    = __dirname;
const IGNORED = new Set(['.git', '.cursor', 'node_modules', 'assets', 'agent-transcripts', 'mcps', 'terminals']);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
};

function json(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function err(res, msg, status = 400) {
  json(res, { error: msg }, status);
}

function getGameDirs() {
  return fs.readdirSync(ROOT, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('.') && !IGNORED.has(d.name))
    .map(d => d.name)
    .sort();
}

function extractTimestamp(name) {
  const m = name.match(/_(\d{12})\./);
  return m ? m[1] : '';
}

function getXlsxFiles(gameName) {
  const dir = path.join(ROOT, gameName);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => /\.xlsx$/i.test(f) && !f.startsWith('~$'))
    .sort((a, b) => {
      const ta = extractTimestamp(a);
      const tb = extractTimestamp(b);
      if (tb && ta) return tb.localeCompare(ta);
      if (tb) return 1;
      if (ta) return -1;
      return a.localeCompare(b);
    });
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const parsed  = url.parse(req.url, true);
  const pn      = decodeURIComponent(parsed.pathname);

  // ── API routes ──────────────────────────────
  if (pn === '/api/games' && req.method === 'GET') {
    return json(res, getGameDirs());
  }

  const matchFiles  = pn.match(/^\/api\/games\/([^/]+)\/files$/);
  if (matchFiles && req.method === 'GET') {
    const name = matchFiles[1];
    return json(res, getXlsxFiles(name));
  }

  const matchLatest = pn.match(/^\/api\/games\/([^/]+)\/latest$/);
  if (matchLatest && req.method === 'GET') {
    const name  = matchLatest[1];
    const files = getXlsxFiles(name);
    if (files.length === 0) return err(res, 'No xlsx found', 404);
    const fp = path.join(ROOT, name, files[0]);
    const stat = fs.statSync(fp);
    res.writeHead(200, {
      'Content-Type': MIME['.xlsx'],
      'Content-Length': stat.size,
      'X-Filename': encodeURIComponent(files[0]),
    });
    fs.createReadStream(fp).pipe(res);
    return;
  }

  const matchSave = pn.match(/^\/api\/games\/([^/]+)\/save$/);
  if (matchSave && req.method === 'POST') {
    const name     = matchSave[1];
    const filename = parsed.query.filename;
    if (!filename || !/\.xlsx$/i.test(filename)) return err(res, 'Invalid filename');
    const dir = path.join(ROOT, name);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const body = await collectBody(req);
    fs.writeFileSync(path.join(dir, filename), body);
    console.log(`Saved: ${name}/${filename} (${body.length} bytes)`);
    return json(res, { ok: true, path: `${name}/${filename}` });
  }

  // ── Static files ────────────────────────────
  let filePath = pn === '/' ? '/rtp_tool.html' : pn;
  filePath = path.join(ROOT, filePath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404); res.end('Not Found'); return;
  }
  const ext  = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  const data = fs.readFileSync(filePath);
  res.writeHead(200, { 'Content-Type': mime, 'Content-Length': data.length });
  res.end(data);
});

server.listen(PORT, () => {
  console.log(`RTP Tool Server running at http://localhost:${PORT}`);
});
