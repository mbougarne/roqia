// Loopback-only deterministic HTTP fixtures. No external files or credentials are served.
const http = require('node:http');
const {createHash} = require('node:crypto');

const SIZE = 8 * 1024 * 1024;
const a = Buffer.alloc(SIZE);
const b = Buffer.alloc(SIZE);
for (let i = 0; i < SIZE; i++) {
  a[i] = (i * 31 + (i >> 8)) % 251;
  b[i] = (a[i] + 71) % 251;
}
const sha = value => createHash('sha256').update(value).digest('hex');
const cases = [
  'stable',
  'range200',
  'changed',
  'wrong206',
  'range416',
  'unknown',
  'recovery',
];

function createServer() {
  return http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const scenario = url.searchParams.get('case') || 'stable';
    if (!cases.includes(scenario)) {
      response.writeHead(400).end();
      return;
    }
    if (url.pathname === '/manifest') {
      response.setHeader('Content-Type', 'application/json');
      response.end(
        JSON.stringify({
          scenario,
          bytes: SIZE,
          sha256: sha(a),
          etag: '"fixture-a"',
        }),
      );
      return;
    }
    if (url.pathname !== '/file') {
      response.writeHead(404).end();
      return;
    }
    const range = request.headers.range;
    let start = 0;
    let status = 200;
    let data = a;
    if (range) {
      const match = /^bytes=(\d+)-$/.exec(range);
      if (!match || Number(match[1]) >= SIZE || scenario === 'range416') {
        response.writeHead(416, {'Content-Range': `bytes */${SIZE}`}).end();
        return;
      }
      start = Number(match[1]);
      status = 206;
      if (scenario === 'changed') data = b;
      const etag = data === a ? '"fixture-a"' : '"fixture-b"';
      if (
        scenario === 'range200' ||
        (request.headers['if-range'] && request.headers['if-range'] !== etag)
      ) {
        status = 200;
        start = 0;
      }
      if (scenario === 'wrong206') start = 0; // Deliberately wrong response for adapter-integrity proof.
    }
    response.setHeader('Content-Type', 'application/octet-stream');
    response.setHeader('ETag', data === a ? '"fixture-a"' : '"fixture-b"');
    response.setHeader('Accept-Ranges', 'bytes');
    if (scenario !== 'unknown')
      response.setHeader('Content-Length', SIZE - start);
    if (status === 206)
      response.setHeader('Content-Range', `bytes ${start}-${SIZE - 1}/${SIZE}`);
    response.writeHead(status);
    console.log(
      JSON.stringify({
        case: scenario,
        range: range || null,
        ifRange: request.headers['if-range'] || null,
        status,
        start,
      }),
    );
    let cursor = start;
    const timer = setInterval(() => {
      const end = Math.min(cursor + 32768, SIZE);
      response.write(data.subarray(cursor, end));
      cursor = end;
      if (cursor === SIZE) {
        clearInterval(timer);
        response.end();
      }
    }, 20);
    response.on('close', () => clearInterval(timer));
  });
}
module.exports = {createServer};
if (require.main === module)
  createServer().listen(8082, '127.0.0.1', () =>
    console.log('Roqia fixtures: 127.0.0.1:8082'),
  );
