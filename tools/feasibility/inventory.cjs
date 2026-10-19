// Read trusted repository data without starting React Native or changing content IDs.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const {createHash} = require('node:crypto');
const ts = require('typescript');

const root = path.resolve(__dirname, '../..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const source = fs.readFileSync(path.join(root, 'src/data/index.ts'), 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: {module: ts.ModuleKind.CommonJS},
}).outputText;
const sandbox = {exports: {}};
vm.runInNewContext(js, sandbox, {timeout: 1000});
const groups = ['data', 'adkarData', 'tasbihatData', 'duaaData'];
const records = groups.flatMap(group =>
  sandbox.exports[group].map((row, index) => ({
    legacyGroup: group,
    legacyIndex: index,
    canonicalFieldsSha256: sha(JSON.stringify(row)),
    category: row.category || null,
    repeat: row.repeat || null,
    audio: [
      row.audioFile,
      ...(row.audioArray || []).map(a => a.fileName),
    ].filter(Boolean),
    provenanceReview: 'pending',
  })),
);
const audioDir = path.join(root, 'src/assets/audio');
const audio = fs
  .readdirSync(audioDir)
  .filter(f => f.endsWith('.mp3'))
  .sort()
  .map(file => {
    const bytes = fs.readFileSync(path.join(audioDir, file));
    return {file, bytes: bytes.length, sha256: sha(bytes)};
  });
const missing = records
  .flatMap(r => r.audio)
  .filter(file => !audio.some(a => a.file === file));
if (missing.length) throw Error(`Missing bundled audio: ${missing.join(', ')}`);
console.log(
  JSON.stringify(
    {
      schemaVersion: 1,
      source: 'src/data/index.ts',
      sourceSha256: sha(source),
      groups: Object.fromEntries(
        groups.map(g => [g, sandbox.exports[g].length]),
      ),
      audioFiles: audio.length,
      audioBytes: audio.reduce((sum, f) => sum + f.bytes, 0),
      missingAudioReferences: missing,
      records,
      audio,
    },
    null,
    2,
  ),
);
