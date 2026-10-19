import {NativeModules, Platform} from 'react-native';
import {FileSystem} from 'react-native-file-access';

import {quranCatalog} from './catalog';
import {
  chapters,
  type Chapter,
  type EditionId,
  type Locator,
  type QuranCatalog,
  type TextPack,
  type TranslationPack,
  editionById,
  validateChapter,
  validateLocator,
  locatorKey,
  validateQuranCatalog,
  normalizeSearch,
  type Recording,
} from './domain';
import {alignWarshTranslation} from './translationAlignment';
import {privatePath} from '../../platform/files';
import {
  readRecord,
  saveRecord,
  listRecords,
  write,
  putRecord,
  removeRecord,
} from '../../repositories/database';
import {type Bookmark} from '../../repositories/models';
import {getSettings, updateSettings} from '../../services/persistence';
import {type DownloadCoordinator} from '../downloads/coordinator';
import {
  downloads,
  nativeDownloadPorts,
  startDownloadServices,
} from '../downloads/native';
import {type Pack, type InstalledPack} from '../downloads/types';

export type ReaderPreferences = {
  size: number;
  lineHeight: number;
  view: 'verses' | 'continuous';
  translationId: string | null;
  keepAwake: boolean;
};

export const readerDefaults: ReaderPreferences = {
  size: 26,
  lineHeight: 1.9,
  view: 'verses',
  translationId: null,
  keepAwake: false,
};

export function validateReaderPreferences(p: ReaderPreferences) {
  if (
    ![22, 26, 30, 34].includes(p.size) ||
    ![1.7, 1.9, 2.2].includes(p.lineHeight) ||
    !['verses', 'continuous'].includes(p.view) ||
    typeof p.keepAwake !== 'boolean' ||
    (p.translationId !== null && typeof p.translationId !== 'string')
  )
    throw Error('invalid_reader_preferences');
  return p;
}

export class QuranRuntime {
  private audioTail: Promise<unknown> = Promise.resolve();
  constructor(
    public catalog: QuranCatalog,
    public downloads: DownloadCoordinator,
    public initialize: () => Promise<void>,
    public namespace = 'quran',
  ) {
    validateQuranCatalog(catalog);
  }
  private collection(key: string) {
    return `${this.namespace}-${key}`;
  }
  async preferred() {
    const id = (await getSettings()).preferredEditionId;
    return editionById(
      id &&
        ['warsh-kfgqpc-v2.1-update6', 'hafs-tanzil-uthmani-1.1'].includes(id)
        ? id
        : 'warsh-kfgqpc-v2.1-update6',
    );
  }
  async select(id: string) {
    editionById(id);
    await updateSettings({preferredEditionId: id});
  } // Selection never enqueues or deletes.
  text(id: string, version?: string) {
    const candidates = this.catalog.texts.filter(
      t => t.editionId === id && (!version || t.pack.version === version),
    );
    return (
      candidates.find(t => this.installed(t.pack)?.active) ??
      candidates[candidates.length - 1]
    );
  }
  installed(pack: Pack): InstalledPack | undefined {
    return this.downloads
      .listInstalled()
      .find(
        p =>
          p.packId === pack.id &&
          p.version === pack.version &&
          p.state === 'ready' &&
          p.manifestHash === pack.manifestHash,
      );
  }
  async asset(pack: Pack, id: string) {
    const a = [...pack.assets, ...(pack.derivedAssets ?? [])].find(
        a => a.id === id,
      ),
      p = this.installed(pack);
    if (!a || !p) throw Error('missing_pack');
    const relative = `${p.relativeDirectory}/${a.file}`;
    if (!p.files.includes(relative)) throw Error('missing_asset');
    const job = a.pinAfterDownload
      ? this.downloads
          .listJobs()
          .find(
            j =>
              j.packId === pack.id &&
              j.version === pack.version &&
              j.assetId === id,
          )
      : undefined;
    await nativeDownloadPorts.verify(
      relative,
      a.pinAfterDownload && job ? {...a, sha256: job.expectedHash} : a,
    );
    return privatePath(relative);
  }
  async chapter(t: TextPack, surah: number) {
    const path = await this.asset(t.pack, t.chapterAssets[surah]);
    return validateChapter(
      JSON.parse(await FileSystem.readFile(path, 'utf8')),
      editionById(t.editionId),
      surah,
    );
  }
  async font(t: TextPack, chapter: Chapter) {
    const path = await this.asset(t.pack, t.fontAssetId),
      a = [...t.pack.assets, ...(t.pack.derivedAssets ?? [])].find(
        a => a.id === t.fontAssetId,
      )!;
    const expected = editionById(t.editionId).requiredFontSha256;
    if (expected && a.sha256 !== expected) throw Error('edition_font_mismatch');
    if (!NativeModules.RoqiaReader?.loadFont)
      throw Error('font_platform_unavailable');
    // The native adapter verifies the hash again and rejects fallback glyphs.
    return NativeModules.RoqiaReader.loadFont(path, a.sha256, [
      ...(chapter.opening ? [chapter.opening] : []),
      ...chapter.verses.map(v => v.text),
    ]) as Promise<string>;
  }
  async translation(t: TranslationPack, chapter: Chapter, text: TextPack) {
    const isWarsh = chapter.editionId === 'warsh-kfgqpc-v2.1-update6';
    if (
      !isWarsh &&
      (t.editionId !== chapter.editionId ||
        t.numberingScheme !== chapter.numberingScheme ||
        t.textVersion !== text.pack.version ||
        editionById(t.editionId).riwaya !== 'hafs')
    )
      throw Error('translation_mismatch');
    if (isWarsh) {
      if (
        text.pack.version !== 'source-1' ||
        chapter.numberingScheme !== 'kfgqpc-warsh-v2.1' ||
        t.editionId !== 'hafs-tanzil-uthmani-1.1' ||
        t.numberingScheme !== 'tanzil-madina-hafs' ||
        text.editionId !== chapter.editionId ||
        t.textVersion !== 'source-1'
      )
        throw Error('translation_mismatch');
    }
    const value = JSON.parse(
      await FileSystem.readFile(
        await this.asset(t.pack, t.chapterAssets[chapter.surah]),
        'utf8',
      ),
    );
    if (
      value.translationId !== t.id ||
      value.editionId !== t.editionId ||
      value.numberingScheme !== t.numberingScheme ||
      value.textVersion !== t.textVersion ||
      value.surah !== chapter.surah ||
      !Array.isArray(value.verses) ||
      value.verses.length !== chapters[chapter.surah - 1].hafsVerses
    )
      throw Error('translation_mismatch');
    value.verses.forEach((v: any, i: number) => {
      if (v.number !== i + 1 || typeof v.text !== 'string' || !v.text.trim())
        throw Error('translation_mismatch');
    });
    if (isWarsh) return alignWarshTranslation(chapter.surah, value.verses);
    return value.verses as {number: number; text: string}[];
  }
  async preferences(id: EditionId) {
    return validateReaderPreferences({
      ...readerDefaults,
      ...(await readRecord<ReaderPreferences>(
        this.collection('preferences'),
        id,
      )),
    });
  }
  async savePreferences(id: EditionId, p: ReaderPreferences) {
    editionById(id);
    validateReaderPreferences(p);
    await saveRecord(this.collection('preferences'), id, p);
  }
  async resume(id: EditionId) {
    const l = await readRecord<Locator>(this.collection('positions'), id);
    return l ? validateLocator(l) : null;
  }
  async remember(l: Locator) {
    validateLocator(l);
    await saveRecord(this.collection('positions'), l.editionId, l);
  }
  async bookmarks() {
    return (await listRecords<Bookmark>('bookmarks')).filter(
      b => b.kind === 'quran-verse',
    );
  }
  async toggleBookmark(l: Locator) {
    const key = locatorKey(l);
    await write(async tx => {
      const rows = (
        await tx.execute('SELECT id FROM records WHERE collection=? AND id=?', [
          'bookmarks',
          key,
        ])
      ).rows;
      if (rows.length)
        await tx.execute('DELETE FROM records WHERE collection=? AND id=?', [
          'bookmarks',
          key,
        ]);
      else
        await putRecord(tx, 'bookmarks', key, {
          ...l,
          kind: 'quran-verse',
          bookmarkId: key,
          createdAt: Date.now(),
        });
    });
  }
  async recent() {
    return (
      (await readRecord<string[]>(this.collection('search'), 'recent')) ?? []
    );
  }
  async saveQuery(q: string) {
    const value = q.trim().slice(0, 100);
    if (value)
      await saveRecord(
        this.collection('search'),
        'recent',
        [value, ...(await this.recent()).filter(x => x !== value)].slice(0, 8),
      );
  }
  clearQueries() {
    return removeRecord(this.collection('search'), 'recent');
  }
  async search(t: TextPack, query: string, cancelled: () => boolean) {
    const q = normalizeSearch(query);
    if (q.length < 2) return [];
    const results: {locator: Locator; text: string; fontFamily: string}[] = [];
    // Bound memory to one chapter, results to 50, and yield between chapters.
    for (let surah = 1; surah <= 114; surah++) {
      if (cancelled()) return [];
      const c = await this.chapter(t, surah);
      let fontFamily: string | undefined;
      for (const v of c.verses)
        if (normalizeSearch(v.text).includes(q)) {
          fontFamily ??= await this.font(t, c);
          results.push({
            fontFamily,
            locator: {
              editionId: t.editionId,
              numberingScheme: c.numberingScheme,
              surah,
              verse: v.number,
              packVersion: t.pack.version,
            },
            text: v.text,
          });
          if (results.length === 50) return results;
        }
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
    return results;
  }
  async download(pack: Pack) {
    await this.initialize();
    if (await this.downloads.installBundled(pack.id, pack.version)) return;
    await this.downloads.enqueue(
      pack.id,
      pack.version,
      (await getSettings()).wifiOnly,
    );
  }
  registerRecording(recording: Recording) {
    const task = this.audioTail.then(async () => {
      const index = this.catalog.recordings.findIndex(
        r => r.id === recording.id,
      );
      const previous = this.catalog.recordings[index];
      const merged = {
        ...recording,
        chapters: [
          ...(previous?.chapters ?? []).filter(
            c => !recording.chapters.some(n => n.surah === c.surah),
          ),
          ...recording.chapters,
        ].sort((a, b) => a.surah - b.surah),
      };
      validateQuranCatalog({texts: [], translations: [], recordings: [merged]});
      for (const chapter of merged.chapters)
        await this.downloads.register(chapter.pack);
      await saveRecord('quran-audio-recordings', merged.id, merged);
      if (index < 0) this.catalog.recordings.push(merged);
      else this.catalog.recordings[index] = merged;
    });
    this.audioTail = task.catch(() => undefined);
    return task;
  }
  async recordingDuration(recording: Recording, surah: number) {
    const chapter = recording.chapters.find(c => c.surah === surah);
    if (!chapter) throw Error('recording_mismatch');
    if (chapter.durationMs) return chapter.durationMs;
    const path = await this.asset(chapter.pack, chapter.assetId);
    const duration = await NativeModules.RoqiaAudio?.audioDuration(path);
    if (!Number.isSafeInteger(duration) || duration <= 0)
      throw Error('audio_duration_unavailable');
    chapter.durationMs = duration;
    await saveRecord('quran-audio-recordings', recording.id, recording);
    return duration as number;
  }
}

export const quran = new QuranRuntime(
  quranCatalog,
  downloads,
  startDownloadServices,
);

export const supportsKeepAwake = () =>
  Platform.OS === 'android' && !!NativeModules.RoqiaReader?.keepAwake;

export const keepAwake = (enabled: boolean) =>
  NativeModules.RoqiaReader?.keepAwake(enabled);
