require('../foundation/register.cjs');
const {test} = require('node:test'),
  assert = require('node:assert/strict'),
  Module = require('node:module');
let prefs,
  tables,
  refreshes = 0,
  reconciles = 0,
  fail = false,
  saved = [],
  completed = [];
const load = Module._load;
Module._load = function (name, parent, isMain) {
  if (name === 'react-native')
    return {
      NativeModules: {
        RoqiaPrayer: {completeRenewal: (...args) => completed.push(args)},
      },
    };
  if (name === './service' && parent.filename.endsWith('/renewal.ts'))
    return {
      loadPreferences: async () => prefs,
      loadTables: async () => tables,
      refreshTable: async id => {
        refreshes++;
        assert.equal(id, '58');
        if (fail) throw Error('offline');
      },
      reconcilePrayer: async () => {
        reconciles++;
        return {coveredUntil: 100};
      },
    };
  if (name.endsWith('repositories/database'))
    return {saveRecord: async (...args) => saved.push(args)};
  return load.call(this, name, parent, isMain);
};
const {
  renewPrayerCoverage,
  default: task,
} = require('../../src/features/prayer/renewal.ts');
const {defaults} = require('../../src/features/prayer/domain.ts');
Date.now = () => Date.parse('2026-10-18T12:00:00Z');
function setup() {
  prefs = {
    ...defaults(),
    location: {cityId: '58', zone: 'Africa/Casablanca'},
    modes: {...defaults().modes, fajr: 'full'},
  };
  tables = [
    {
      cityId: '58',
      dates: Object.fromEntries(
        [18, 19, 20, 21].map(n => [`2026-10-${n}`, []]),
      ),
    },
  ];
  refreshes = 0;
  reconciles = 0;
  fail = false;
  saved = [];
  completed = [];
}
test('valid official horizon renews offline without network fetch', async () => {
  setup();
  const r = await renewPrayerCoverage();
  assert.equal(refreshes, 0);
  assert.equal(reconciles, 1);
  assert.equal(r.refresh, 'not-needed');
  assert.equal(saved[0][2].coveredUntil, 100);
});
test('near expiry fetches selected city before replenishing; source failure still reconciles remaining coverage', async () => {
  setup();
  delete tables[0].dates['2026-10-21'];
  await renewPrayerCoverage();
  assert.equal(refreshes, 1);
  fail = true;
  const r = await renewPrayerCoverage();
  assert.equal(r.refresh, 'unavailable');
  assert.equal(reconciles, 2);
  assert.equal(prefs.method, 'habous');
});
test('disabled prayers and named calculation methods never fetch a Ministry city table', async () => {
  setup();
  tables = [];
  prefs.modes = defaults().modes;
  await renewPrayerCoverage();
  prefs.modes.fajr = 'full';
  prefs.method = 'MuslimWorldLeague';
  await renewPrayerCoverage();
  assert.equal(refreshes, 0);
  assert.equal(reconciles, 2);
});
test('headless task reports completion to its own native worker token', async () => {
  setup();
  await task({token: 'job-one'});
  assert.deepEqual(completed, [['job-one', true]]);
  prefs = null;
  await assert.rejects(task({token: 'job-two'}));
  assert.deepEqual(completed[1], ['job-two', false]);
});
