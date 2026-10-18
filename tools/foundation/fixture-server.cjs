// Only serves synthetic JSON and one existing bundled recording on loopback.
const http = require('node:http'),
  fs = require('node:fs'),
  path = require('node:path'),
  {createHash} = require('node:crypto');
const payload = Buffer.from(
  JSON.stringify({
    schemaVersion: 1,
    fixture: 'non-religious-test-data',
    padding: 'x'.repeat(2 * 1024 * 1024),
  }),
);
const audio = fs.readFileSync(
  path.join(__dirname, '../../src/assets/audio/roqia-01.mp3'),
);
http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost'),
      body = url.pathname === '/audio' ? audio : payload;
    if (url.pathname === '/manifest')
      return res.end(
        JSON.stringify({
          bytes: payload.length,
          sha256: createHash('sha256').update(payload).digest('hex'),
          audioBytes: audio.length,
          audioHash: createHash('sha256').update(audio).digest('hex'),
        }),
      );
    if (!['/file', '/audio'].includes(url.pathname)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, {
      'Content-Type':
        url.pathname === '/audio' ? 'audio/mpeg' : 'application/json',
      'Content-Length': body.length,
    });
    let n = 0;
    const interval = setInterval(() => {
      const end = Math.min(n + 32768, body.length);
      res.write(body.subarray(n, end));
      n = end;
      if (n === body.length) {
        clearInterval(interval);
        res.end();
      }
    }, 50);
    res.on('close', () => clearInterval(interval));
  })
  .listen(8083, '127.0.0.1', () =>
    console.log('Foundation fixtures on 127.0.0.1:8083'),
  );
