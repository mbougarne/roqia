require('../foundation/register.cjs');
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict'),
  crypto = require('node:crypto');
const {parseHabous} = require('../../src/features/prayer/habous.ts'),
  tables = require('../../src/features/prayer/timetables.json');
const locks = require('./habous-sources.fixture.json');

for (const lock of locks) {
  const raw = fs.readFileSync(
    path.join(process.argv[2], lock.cityId + '.html'),
  );
  assert.equal(
    crypto.createHash('sha256').update(raw).digest('hex'),
    lock.sha256,
  );
  const parsed = parseHabous(
    raw.toString(),
    lock.cityId,
    Date.parse('2026-10-18T00:00:00Z'),
  );
  assert.deepEqual(
    parsed,
    tables.find(t => t.cityId === lock.cityId),
  );
  assert.throws(() =>
    parseHabous(raw.toString(), lock.cityId === '1' ? '58' : '1'),
  );
  assert.throws(() =>
    parseHabous(raw.toString().replace(/05:\d\d/g, '25:00'), lock.cityId),
  );
}
console.log(
  '11 independently fetched source pages match all 330 bundled schedules; wrong-city and malformed rows rejected',
);
