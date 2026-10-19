import {NativeModules} from 'react-native';
import {FileSystem} from 'react-native-file-access';

import {type QuranRuntime} from '../../src/features/quran/runtime';
import {getSettings, updateSettings} from '../../src/services/persistence';

export async function checkRuntime(q: QuranRuntime) {
  const results: object[] = [];
  for (const t of q.catalog.texts) {
    let count = 0;
    for (let surah = 1; surah <= 114; surah++) {
      const c = await q.chapter(t, surah);
      await q.font(t, c);
      count += c.verses.length;
    }
    results.push({
      edition: t.editionId,
      chapters: 114,
      verses: count,
      allChapterHashesAndNativeFontChecks: true,
    });
  }
  for (const t of q.catalog.translations) {
    let count = 0;
    const text = q.catalog.texts.find(p => p.editionId === t.editionId)!;
    for (let surah = 1; surah <= 114; surah++) {
      const c = await q.chapter(text, surah);
      count += (await q.translation(t, c, text)).length;
    }
    results.push({
      translation: t.id,
      chapters: 114,
      records: count,
      exactHafsMapping: true,
    });
  }

  async function rejects(fn: () => Promise<unknown>) {
    let rejected = false;
    try {
      await fn();
    } catch {
      rejected = true;
    }
    if (!rejected) throw Error('failure_did_not_close_reader');
    return rejected;
  }
  const warsh = q.catalog.texts[0],
    hafs = q.catalog.texts[1],
    chapter = await q.chapter(warsh, 1);
  const _other = await q.asset(hafs.pack, hafs.fontAssetId),
    _fontHash = hafs.pack.assets.find(a => a.id === hafs.fontAssetId)!.sha256;
  const mismatchedFont = await rejects(() =>
    q.font({...warsh, pack: hafs.pack, fontAssetId: hafs.fontAssetId}, chapter),
  );
  const font = await q.asset(warsh.pack, warsh.fontAssetId);
  let missingFont: boolean;
  await FileSystem.mv(font, font + '.test-held');
  try {
    missingFont = await rejects(() => q.font(warsh, chapter));
  } finally {
    await FileSystem.mv(font + '.test-held', font);
  }
  const path = await q.asset(warsh.pack, warsh.chapterAssets[1]),
    original = await FileSystem.readFile(path, 'utf8');
  let corruptedText: boolean;
  await FileSystem.writeFile(path, '{}', 'utf8');
  try {
    corruptedText = await rejects(() => q.chapter(warsh, 1));
  } finally {
    await FileSystem.writeFile(path, original, 'utf8');
  }
  await q.chapter(warsh, 1);
  await q.font(warsh, chapter);
  const settings = await getSettings(),
    jobs = q.downloads.listJobs().length,
    installed = q.downloads.listInstalled().length;
  try {
    for (const t of q.catalog.texts) await q.select(t.editionId);
    if (
      q.downloads.listJobs().length !== jobs ||
      q.downloads.listInstalled().length !== installed
    )
      throw Error('selection_changed_downloads');
  } finally {
    await updateSettings({preferredEditionId: settings.preferredEditionId});
  }
  const result = await q.search(warsh, chapter.verses[0].text, () => false);
  if (
    !result.some(
      r =>
        r.locator.surah === 1 &&
        r.locator.verse === 1 &&
        r.text === chapter.verses[0].text,
    )
  )
    throw Error('search_did_not_preserve_source');
  results.push({
    mismatchedFontRejected: mismatchedFont,
    missingFontRejected: missingFont,
    corruptTextRejected: corruptedText,
    originalFilesRestored: true,
    preferenceSwitchDidNotDownloadOrDelete: true,
    canonicalSearchResult: true,
  });
  await NativeModules.RoqiaProbe.record(
    'phase4-full-integrity',
    JSON.stringify({results}),
  );
}
