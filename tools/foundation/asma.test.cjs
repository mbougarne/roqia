require('./register.cjs');
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const {names, source} = require('../../src/features/asma/content.ts');
const supplied = require('../../src/features/asma/1792441861026.json');
const fs = require('node:fs');
const path = require('node:path');
const {resolveLink} = require('../../src/navigation/routes.ts');

test('bundled names preserve the supplied source selection, spelling and order', () => {
  assert.equal(names.length, 99);
  assert.equal(new Set(names.map(n => n.name)).size, 99);
  // Pinned from the source page's numbered entries 1–99, reviewed 2026-10-19.
  // Its later compound-name and Sunnah lists are outside this selection.
  assert.equal(
    createHash('sha256')
      .update(names.map(n => n.name).join('\n'))
      .digest('hex'),
    '83674c312e42049b7cd1f86390731323b5016b63621283c8ec4ebd3827c811ec',
  );
});

test('every full meaning matches the supplied JSON verbatim, including quotations and source numbers', () => {
  assert.deepEqual(
    names,
    supplied.map(row => ({name: row['الاسم'], meaning: row['المعنى']})),
  );
  assert.equal(
    source.inputSHA256,
    createHash('sha256')
      .update(
        fs.readFileSync(
          path.join(__dirname, '../../src/features/asma/1792441861026.json'),
        ),
      )
      .digest('hex'),
  );
  for (const {name, meaning} of names) {
    assert.match(name, /^[\p{Script_Extensions=Arabic}\s]+$/u);
    assert.ok(meaning.trim().length > 0, name);
    assert.doesNotMatch(meaning, /[A-Za-z<>]/);
    assert.equal(
      (meaning.match(/﴿/g) ?? []).length,
      (meaning.match(/﴾/g) ?? []).length,
      name,
    );
  }
});

test('the feature route resolves and attribution retains the supplied HTTPS page', () => {
  assert.deepEqual(resolveLink('roqia://asma'), {screen: 'Asma'});
  assert.equal(source.title, 'أسماء الله الحسنى');
  assert.equal(
    source.url,
    'https://surahquran.com/99-Names-of-Allah-with-Meaning.html',
  );
});
