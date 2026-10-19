require('../foundation/register.cjs');
const fs = require('node:fs'),
  path = require('node:path');
const {parseHabous} = require('../../src/features/prayer/habous.ts');
const source = process.argv[2],
  cities = require('../../src/features/prayer/cities.json');

const rows = cities.map(c =>
  parseHabous(
    fs.readFileSync(path.join(source, c.cityId + '.html'), 'utf8'),
    c.cityId,
    Date.parse('2026-10-18T00:00:00Z'),
  ),
);
fs.writeFileSync(
  'src/features/prayer/timetables.json',
  JSON.stringify(rows, null, 2) + '\n',
);
fs.copyFileSync(
  path.join(source, 'sources.json'),
  'docs/implementation/phase-6/evidence/habous-sources.json',
);
console.log(
  `${rows.length} city tables, ${rows.reduce((n, t) => n + Object.keys(t.dates).length, 0)} daily schedules`,
);
