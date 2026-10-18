require('./register.cjs');
const {test} = require('node:test'),
  assert = require('node:assert/strict'),
  {DatabaseSync} = require('node:sqlite'),
  Module = require('node:module'),
  fs = require('node:fs'),
  os = require('node:os'),
  path = require('node:path'),
  crypto = require('node:crypto');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roqia-repository-'));
const sql = new DatabaseSync(path.join(root, 'test.sqlite'));
let failOnce = true,
  counterInserts = 0;
const execute = async (query, args = []) => {
  if (
    query.startsWith('INSERT OR IGNORE INTO counters') &&
    ++counterInserts === 3 &&
    failOnce
  ) {
    failOnce = false;
    throw Error('interrupted_migration');
  }
  return {rows: sql.prepare(query).all(...args)};
};
const adapter = {
  execute,
  transaction: async fn => {
    sql.exec('BEGIN');
    try {
      await fn({execute});
      sql.exec('COMMIT');
    } catch (e) {
      sql.exec('ROLLBACK');
      throw e;
    }
  },
};
const aliases = require('../../src/repositories/legacy-counter-map.json'),
  oldKey = Object.keys(aliases)[0];
const legacy = {
  '@roqia/app-state': JSON.stringify({
    mode: 'dark',
    repeatCounts: {[oldKey]: 1},
  }),
  '@roqia/walkthrough-seen': '1',
  '@roqia/intro-note-seen': '1',
};
const original = Module._load;
Module._load = function (name, parent, isMain) {
  if (name === '@op-engineering/op-sqlite') return {open: () => adapter};
  if (name === '@react-native-async-storage/async-storage')
    return {multiGet: async keys => keys.map(k => [k, legacy[k] ?? null])};
  if (name === 'react-native-file-access')
    return {
      Dirs: {DocumentDir: root},
      FileSystem: {
        mkdir: async p => fs.promises.mkdir(p, {recursive: true}),
        writeFile: async (p, s) => fs.promises.writeFile(p, s),
        hash: async p =>
          crypto
            .createHash('sha256')
            .update(await fs.promises.readFile(p))
            .digest('hex'),
        exists: async p => fs.existsSync(p),
        isDir: async p => fs.statSync(p).isDirectory(),
        unlink: async p => fs.promises.unlink(p),
        mv: async (a, b) => fs.promises.rename(a, b),
      },
    };
  return original.call(this, name, parent, isMain);
};
const persistence = require('../../src/services/persistence.ts');
const {listRecords, readRecord} = require('../../src/repositories/database.ts');
const {defaultCounts} = require('../../src/repositories/content.ts');
test('SQLite migration rollback, retry, backup hash, serialized writes and reset isolation', async () => {
  const before = structuredClone(legacy);
  await assert.rejects(persistence.hydrateStorage(), /interrupted_migration/);
  assert.equal(sql.prepare('SELECT count(*) n FROM counters').get().n, 0);
  assert.equal(await readRecord('migrations', 'legacy-v2'), null);
  const loaded = await persistence.loadPersistedAppState();
  assert.equal(loaded.repeatCounts[aliases[oldKey]], 1);
  assert.equal(loaded.mode, 'dark');
  const receipt = await readRecord('migrations', 'legacy-v2');
  const bytes = fs.readFileSync(
    path.join(root, 'roqia', receipt.legacyBackupPath),
  );
  assert.equal(
    crypto.createHash('sha256').update(bytes).digest('hex'),
    receipt.inputHash,
  );
  assert.deepEqual(JSON.parse(bytes), before);
  assert.deepEqual(legacy, before);
  await persistence.hydrateStorage();
  assert.equal(sql.prepare('SELECT count(*) n FROM counters').get().n, 207);
  assert.equal((await listRecords('migrations')).length, 1);
  await persistence.bookmarks.save({
    bookmarkId: 'keep',
    kind: 'devotional',
    contentId: aliases[oldKey],
    createdAt: 1,
  });
  const one = {...loaded.repeatCounts, [aliases[oldKey]]: 1},
    zero = {...one, [aliases[oldKey]]: 0};
  await Promise.all([
    persistence.persistAppState('dark', one),
    persistence.persistAppState('light', zero),
  ]);
  assert.equal(
    (await persistence.loadPersistedAppState()).repeatCounts[aliases[oldKey]],
    0,
  );
  await persistence.persistAppState('light', defaultCounts());
  assert.equal((await persistence.bookmarks.list()).length, 1);
  assert.equal((await persistence.getSettings()).guidanceSeen, true);
  assert.deepEqual(legacy, before);
  // Rapid snapshots remain ordered and do not rewrite unrelated progress metadata.
  const defaults = defaultCounts();
  const id = Object.keys(defaults).find(key => defaults[key] >= 5);
  sql.exec('UPDATE counters SET updated_at=0');
  await Promise.all(
    [1, 2, 3, 4, 5].map(n =>
      persistence.persistAppState('light', {
        ...defaults,
        [id]: defaults[id] - n,
      }),
    ),
  );
  assert.equal(
    (await persistence.loadPersistedAppState()).repeatCounts[id],
    defaults[id] - 5,
  );
  assert.equal(
    sql
      .prepare(
        'SELECT count(*) n FROM counters WHERE updated_at != 0 AND content_id != ?',
      )
      .get(id).n,
    0,
  );
  await assert.rejects(
    persistence.persistAppState('dark', {'unknown-counter': 0}),
    /unknown_counter/,
  );
  assert.equal((await persistence.getSettings()).themePreference, 'light');
  const {
    decrementCounter,
    resetCounters,
  } = require('../../src/repositories/counters.ts');
  await resetCounters({[id]: 3});
  assert.deepEqual(
    await Promise.all(Array.from({length: 7}, () => decrementCounter(id))),
    [2, 1, 0, 0, 0, 0, 0],
  );
  assert.equal((await persistence.loadPersistedAppState()).repeatCounts[id], 0);
  await assert.rejects(
    resetCounters({[id]: 2, 'unknown-counter': 0}),
    /unknown_counter/,
  );
  assert.equal((await persistence.loadPersistedAppState()).repeatCounts[id], 0);
  await resetCounters({[id]: defaults[id]});
  assert.equal((await persistence.bookmarks.list()).length, 1);
  sql.close();
  fs.rmSync(root, {recursive: true});
});
