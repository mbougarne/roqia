// Controlled HTTP behavior only; never used by the production catalog.
const http = require('node:http'),
  crypto = require('node:crypto'),
  fs = require('node:fs');

const bytes = Buffer.from(
  JSON.stringify({fixture: 'phase10', data: '0123456789'.repeat(800000)}),
);
const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
fs.mkdirSync('/private/tmp/roqia-phase10', {recursive: true});
const logs = [];
http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const mode = url.pathname.slice(1);
    if (mode === 'manifest') {
      res.end(JSON.stringify({bytes: bytes.length, sha256}));
      return;
    }
    if (mode === 'requests') {
      res.end(JSON.stringify(logs));
      return;
    }
    const start = Number(
      (req.headers.range ?? '').match(/bytes=(\d+)-/)?.[1] ?? 0,
    );
    let status = start ? 206 : 200,
      offset = start,
      etag = '"phase10-v1"';
    if (mode === 'forbidden') {
      res.writeHead(403);
      res.end('forbidden');
      return;
    }
    if (mode === 'range200') {
      status = 200;
      offset = 0;
    }
    if (mode === 'changed' && start) etag = '"phase10-v2"';
    if (mode === 'wrong206' && start) offset = start + 100;
    if ((mode === 'range416' && start) || start >= bytes.length) {
      status = 416;
      offset = bytes.length;
    }
    const headers = {
      'Content-Type': 'application/json',
      ETag: etag,
      'Accept-Ranges': 'bytes',
    };
    if (mode === 'last-modified') {
      delete headers.ETag;
      headers['Last-Modified'] = 'Sun, 18 Oct 2026 12:00:00 GMT';
    }
    if (mode === 'no-validator') delete headers.ETag;
    if (status === 206)
      headers['Content-Range'] =
        `bytes ${offset}-${bytes.length - 1}/${bytes.length}`;
    if (status === 416) headers['Content-Range'] = `bytes */${bytes.length}`;
    if (mode !== 'unknown')
      headers['Content-Length'] = status === 416 ? 0 : bytes.length - offset;
    logs.push({
      mode,
      range: req.headers.range ?? null,
      ifRange: req.headers['if-range'] ?? null,
      status,
      offset,
      at: Date.now(),
    });
    fs.writeFileSync(
      '/private/tmp/roqia-phase10/requests.json',
      JSON.stringify(logs, null, 2),
    );
    res.writeHead(status, headers);
    if (status === 416) {
      res.end();
      return;
    }
    let position = offset;
    const timer = setInterval(() => {
      if (position >= bytes.length) {
        clearInterval(timer);
        res.end();
        return;
      }
      const end = Math.min(position + 65536, bytes.length);
      const chunk = Buffer.from(bytes.subarray(position, end));
      if (mode === 'corrupt' && position === 0) chunk[1] = 33;
      res.write(chunk);
      position = end;
    }, 25);
    res.on('close', () => clearInterval(timer));
  })
  .listen(8084, '127.0.0.1', () => console.log('Phase 10 fixtures on 8084'));
