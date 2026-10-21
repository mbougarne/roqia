require('../foundation/register.cjs');
const {test} = require('node:test'),
  assert = require('node:assert/strict'),
  Module = require('node:module'),
  fs = require('node:fs'),
  os = require('node:os'),
  path = require('node:path'),
  crypto = require('node:crypto'),
  {DatabaseSync} = require('node:sqlite');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roqia-quran-')),
  db = new DatabaseSync(':memory:');
const execute = async (q, a = []) => ({rows: db.prepare(q).all(...a)}),
  adapter = {
    execute,
    transaction: async fn => {
      db.exec('BEGIN');
      try {
        await fn({execute});
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
  };
let settings = {preferredEditionId: null, wifiOnly: true},
  enqueued = [];
let installed = [];
const downloads = {
  listInstalled: () => installed,
  enqueue: async (...args) => enqueued.push(args),
};
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const verify = async (relative, asset) => {
  const bytes = fs.readFileSync(path.join(root, 'roqia', relative));
  if (bytes.length !== asset.bytes || sha(bytes) !== asset.sha256)
    throw Error('integrity_failed');
};
const load = Module._load;
const readerNative = {loadFont: async () => 'verified-test-font'};
Module._load = function (name, parent, isMain) {
  if (name === '@op-engineering/op-sqlite') return {open: () => adapter};
  if (name === 'react-native')
    return {
      Platform: {OS: 'android'},
      NativeModules: {
        RoqiaReader: readerNative,
      },
    };
  if (name === 'react-native-file-access')
    return {
      Dirs: {DocumentDir: root},
      FileSystem: {readFile: async p => fs.readFileSync(p, 'utf8')},
    };
  if (name.endsWith('services/persistence'))
    return {
      getSettings: async () => settings,
      updateSettings: async p => {
        settings = {...settings, ...p};
      },
    };
  if (name.endsWith('downloads/native'))
    return {
      downloads,
      nativeDownloadPorts: {verify},
      startDownloadServices: async () => {},
    };
  return load.call(this, name, parent, isMain);
};
const {
    QuranRuntime,
    validateReaderPreferences,
    readerDefaults,
    keepAwake,
    supportsKeepAwake,
  } = require('../../src/features/quran/runtime.ts'),
  d = require('../../src/features/quran/domain.ts');
require('../../src/repositories/database.ts');

const runtime = new QuranRuntime(
  {texts: [], translations: [], recordings: []},
  downloads,
  async () => {},
);
const location = e => ({
  editionId: e.id,
  numberingScheme: e.numbering,
  surah: 1,
  verse: 2,
  packVersion: 'v1',
});
test('a reader adapter without keep-awake support remains safe; available support is used', () => {
  assert.equal(supportsKeepAwake(), false);
  assert.doesNotThrow(() => keepAwake(false));
  const calls = [];
  readerNative.keepAwake = enabled => calls.push(enabled);
  assert.equal(supportsKeepAwake(), true);
  keepAwake(true);
  keepAwake(false);
  assert.deepEqual(calls, [true, false]);
  delete readerNative.keepAwake;
});
test('edition changes never download/delete and keep independent bookmarks and restart positions', async () => {
  for (const e of d.editions) {
    await runtime.remember(location(e));
    await runtime.toggleBookmark(location(e));
    await runtime.select(e.id);
  }
  assert.equal(enqueued.length, 0);
  assert.equal((await runtime.bookmarks()).length, 2);
  const reopened = new QuranRuntime(
    {texts: [], translations: [], recordings: []},
    downloads,
    async () => {},
  );
  for (const e of d.editions)
    assert.deepEqual(await reopened.resume(e.id), location(e));
  await reopened.toggleBookmark(location(d.editions[0]));
  assert.equal((await reopened.bookmarks()).length, 1);
  assert.deepEqual(
    await reopened.resume(d.editions[0].id),
    location(d.editions[0]),
  );
});
test('installed membership and hash checks precede JSON parsing; corrupt and missing files fail closed', async () => {
  const c = {
    editionId: d.editions[1].id,
    numberingScheme: d.editions[1].numbering,
    surah: 1,
    sourceNotice: 'test-only',
    verses: Array.from({length: 7}, (_, i) => ({
      number: i + 1,
      text: 'TEST ONLY',
    })),
  };
  const bytes = Buffer.from(JSON.stringify(c)),
    asset = {
      id: 'chapter',
      file: '001.json',
      bytes: bytes.length,
      sha256: sha(bytes),
      mime: 'application/json',
    };
  const pack = {
      id: 'test',
      version: 'v1',
      manifestHash: 'a'.repeat(64),
      assets: [asset],
    },
    text = {editionId: c.editionId, pack, chapterAssets: {1: 'chapter'}};
  const dir = 'packs/test/v1',
    file = `${dir}/001.json`;
  fs.mkdirSync(path.join(root, 'roqia', dir), {recursive: true});
  fs.writeFileSync(path.join(root, 'roqia', file), bytes);
  installed = [
    {
      packId: pack.id,
      version: pack.version,
      manifestHash: pack.manifestHash,
      state: 'ready',
      files: [file],
      relativeDirectory: dir,
    },
  ];
  assert.deepEqual(await runtime.chapter(text, 1), c);
  fs.writeFileSync(path.join(root, 'roqia', file), '{}');
  await assert.rejects(runtime.chapter(text, 1), /integrity_failed/);
  installed = [];
  await assert.rejects(runtime.chapter(text, 1), /missing_pack/);
});
test('translation mapping refuses wrong edition and version before file access', async () => {
  const t = {
    editionId: d.editions[1].id,
    numberingScheme: d.editions[1].numbering,
    textVersion: 'v2',
  };
  await assert.rejects(
    runtime.translation(
      t,
      {editionId: d.editions[0].id},
      {pack: {version: 'v2'}},
    ),
    /translation_mismatch/,
  );
  await assert.rejects(
    runtime.translation(
      t,
      {editionId: t.editionId, numberingScheme: t.numberingScheme},
      {pack: {version: 'v1'}},
    ),
    /translation_mismatch/,
  );
});
test('reader preferences are bounded, edition scoped, and independent of UI preferences', async () => {
  const p = {...readerDefaults, size: 34, keepAwake: true};
  await runtime.savePreferences(d.editions[0].id, p);
  assert.deepEqual(await runtime.preferences(d.editions[0].id), p);
  assert.deepEqual(await runtime.preferences(d.editions[1].id), readerDefaults);
  assert.throws(() => validateReaderPreferences({...p, size: 200}));
  assert.throws(() => validateReaderPreferences({...p, lineHeight: 0.5}));
});
test('recent search is local, deduplicated, bounded and clearable', async () => {
  for (let i = 0; i < 12; i++) await runtime.saveQuery('query ' + i);
  await runtime.saveQuery('query 11');
  assert.equal((await runtime.recent()).length, 8);
  assert.equal((await runtime.recent())[0], 'query 11');
  await runtime.clearQueries();
  assert.deepEqual(await runtime.recent(), []);
});
test('search cancels before reading content and never returns derived text', async () => {
  let reads = 0;
  runtime.font = async () => 'verified-test-font';
  runtime.chapter = async (_t, _s) => {
    reads++;
    return {
      verses: [{number: 1, text: 'TEST ONLY Café'}],
      numberingScheme: d.editions[1].numbering,
    };
  };
  const text = {editionId: d.editions[1].id, pack: {version: 'v1'}};
  assert.deepEqual(await runtime.search(text, 'cafe', () => true), []);
  assert.equal(reads, 0);
  const results = await runtime.search(text, 'cafe', () => false);
  assert.equal(results.length, 50);
  assert.equal(reads, 50);
  assert.equal(results[0].text, 'TEST ONLY Café');
});
test('translation reader checks saved file identity, chapter, version and complete verse order', async () => {
  const e = d.editions[1],
    chapter = {
      editionId: e.id,
      numberingScheme: e.numbering,
      surah: 1,
      verses: Array.from({length: 7}, (_, i) => ({
        number: i + 1,
        text: 'ARABIC TEST ONLY',
      })),
    };
  const value = {
    translationId: 'test-fr',
    editionId: e.id,
    numberingScheme: e.numbering,
    textVersion: 'v1',
    surah: 1,
    verses: chapter.verses.map(v => ({
      number: v.number,
      text: 'TEST ONLY Café',
    })),
  };
  const dir = 'packs/test-fr/v1',
    file = dir + '/001.json';
  fs.mkdirSync(path.join(root, 'roqia', dir), {recursive: true});
  const t = {
      id: 'test-fr',
      editionId: e.id,
      numberingScheme: e.numbering,
      textVersion: 'v1',
      chapterAssets: {1: 'chapter'},
      pack: {
        id: 'test-fr',
        version: 'v1',
        manifestHash: 'b'.repeat(64),
        assets: [],
      },
    },
    text = {pack: {version: 'v1'}};
  const install = v => {
    const bytes = Buffer.from(JSON.stringify(v));
    fs.writeFileSync(path.join(root, 'roqia', file), bytes);
    t.pack.assets = [
      {
        id: 'chapter',
        file: '001.json',
        bytes: bytes.length,
        sha256: sha(bytes),
      },
    ];
    installed = [
      {
        packId: t.pack.id,
        version: 'v1',
        manifestHash: t.pack.manifestHash,
        state: 'ready',
        files: [file],
        relativeDirectory: dir,
      },
    ];
  };
  install(value);
  assert.deepEqual(await runtime.translation(t, chapter, text), value.verses);
  for (const patch of [
    v => (v.translationId = 'different'),
    v => (v.editionId = d.editions[0].id),
    v => (v.textVersion = 'v2'),
    v => (v.surah = 2),
    v => v.verses.pop(),
    v => (v.verses[1].number = 1),
    v => (v.verses[0].text = '  '),
  ]) {
    const v = structuredClone(value);
    patch(v);
    install(v);
    await assert.rejects(
      runtime.translation(t, chapter, text),
      /translation_mismatch/,
    );
  }
  install(value);
  fs.writeFileSync(path.join(root, 'roqia', file), '{}');
  await assert.rejects(
    runtime.translation(t, chapter, text),
    /integrity_failed/,
  );
  install(value);
  installed = [];
  await assert.rejects(runtime.translation(t, chapter, text), /missing_pack/);
});
test('pinned Hafs-source translation serves Warsh through passage alignment and preserves source guards', async () => {
  const e = d.editionById(d.legacyHafsEditionId),
    w = d.editions[0];
  const value = {
    translationId: 'test-en',
    editionId: e.id,
    numberingScheme: e.numbering,
    textVersion: 'source-1',
    surah: 1,
    verses: Array.from({length: 7}, (_, i) => ({
      number: i + 1,
      text: `Meaning ${i + 1}`,
    })),
  };
  const dir = 'packs/test-en/source-1',
    file = dir + '/001.json',
    bytes = Buffer.from(JSON.stringify(value));
  fs.mkdirSync(path.join(root, 'roqia', dir), {recursive: true});
  fs.writeFileSync(path.join(root, 'roqia', file), bytes);
  const t = {
    id: 'test-en',
    editionId: e.id,
    numberingScheme: e.numbering,
    textVersion: 'source-1',
    chapterAssets: {1: 'chapter'},
    pack: {
      id: 'test-en',
      version: 'source-1',
      manifestHash: 'c'.repeat(64),
      assets: [
        {
          id: 'chapter',
          file: '001.json',
          bytes: bytes.length,
          sha256: sha(bytes),
        },
      ],
    },
  };
  installed = [
    {
      packId: t.pack.id,
      version: 'source-1',
      manifestHash: t.pack.manifestHash,
      state: 'ready',
      files: [file],
      relativeDirectory: dir,
    },
  ];
  const chapter = {editionId: w.id, numberingScheme: w.numbering, surah: 1},
    text = {editionId: w.id, pack: {version: 'source-1'}};
  const result = await runtime.translation(t, chapter, text);
  assert.equal(result[0].text, 'Meaning 2');
  assert.equal(result[6].warshStart, 6);
  assert.equal(result.find(v => v.number === 0).text, 'Meaning 1');
  for (const patch of [
    {textVersion: 'future'},
    {numberingScheme: 'wrong'},
    {editionId: w.id},
  ])
    await assert.rejects(
      runtime.translation({...t, ...patch}, chapter, text),
      /translation_mismatch/,
    );
});

test('iPhone Hafs upgrade preserves old settings, resume position and bookmark records', async () => {
  const {
    saveRecord,
    readRecord,
  } = require('../../src/repositories/database.ts');
  const catalog = require('../../src/features/quran/catalog.ts').quranCatalog;
  const ios = new QuranRuntime(
    catalog,
    downloads,
    async () => {},
    'upgrade-test',
  );
  const old = {
    ...location(d.editionById(d.legacyHafsEditionId)),
    packVersion: 'source-1',
    surah: 4,
    verse: 1,
  };
  const preferences = {...readerDefaults, size: 30, view: 'continuous'};
  await saveRecord('upgrade-test-preferences', old.editionId, preferences);
  await saveRecord('upgrade-test-positions', old.editionId, old);
  const key = d.locatorKey(old);
  const mark = {...old, kind: 'quran-verse', bookmarkId: key, createdAt: 123};
  await saveRecord('bookmarks', key, mark);
  settings.preferredEditionId = old.editionId;
  assert.equal((await ios.preferred()).id, d.hafsEditionId);
  assert.deepEqual(await ios.preferences(d.hafsEditionId), preferences);
  assert.deepEqual(
    await ios.resume(d.hafsEditionId),
    d.currentHafsLocator(old),
  );
  const mapped = (await ios.bookmarks()).find(b => b.bookmarkId === key);
  assert.equal(mapped.editionId, d.hafsEditionId);
  assert.deepEqual(await readRecord('bookmarks', key), mark);
  assert.deepEqual(
    await readRecord('upgrade-test-positions', old.editionId),
    old,
  );
  await ios.toggleBookmark(d.currentHafsLocator(old));
  assert.equal(await readRecord('bookmarks', key), null);
  await ios.toggleBookmark(d.currentHafsLocator(old));
  assert.equal((await ios.bookmarks()).filter(b => b.surah === 4).length, 1);
});
