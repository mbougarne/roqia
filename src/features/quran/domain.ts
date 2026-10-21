import chapters from './chapters.json';
import {type Pack} from '../downloads/types';

export {chapters};

export const hafsEditionId = 'hafs-kfgqpc-v2.0-update13';

export const legacyHafsEditionId = 'hafs-tanzil-uthmani-1.1';

export const hafsPackVersion = 'kfgqpc-2.0-update13';

export type EditionId =
  | 'warsh-kfgqpc-v2.1-update6'
  | typeof hafsEditionId
  | typeof legacyHafsEditionId;

export type Edition = {
  id: EditionId;
  title: string;
  riwaya: 'warsh' | 'hafs';
  numbering: string;
  publisher: string;
  url: string;
  recommended: boolean;
  requiredFontSha256?: string;
  sourceVerseMarkers?: boolean;
};

export const editions: Edition[] = [
  {
    id: 'warsh-kfgqpc-v2.1-update6',
    sourceVerseMarkers: true,
    requiredFontSha256:
      'b436fb89e1d26f827cd6a3c4d632fb68a49cc954c4ac90699a9502da25555230',
    title: 'ورش عن نافع',
    riwaya: 'warsh',
    numbering: 'kfgqpc-warsh-v2.1',
    publisher: 'مجمع الملك فهد لطباعة المصحف الشريف',
    url: 'https://qurancomplex.gov.sa/en/techquran/dev/',
    recommended: true,
  },
  {
    id: hafsEditionId,
    sourceVerseMarkers: true,
    requiredFontSha256:
      'd560bbbc7a90a4f4d416d206a5ac48bd8a1ad00273d64d232f16ca54941bd041',
    title: 'حفص عن عاصم',
    riwaya: 'hafs',
    numbering: 'kfgqpc-madina-hafs',
    publisher: 'مجمع الملك فهد لطباعة المصحف الشريف',
    url: 'https://qurancomplex.gov.sa/en/techquran/dev/',
    recommended: false,
  },
];

// Historical identities remain valid for saved data and translation originals.
const legacyHafsEdition: Edition = {
  id: legacyHafsEditionId,
  title: 'حفص عن عاصم',
  riwaya: 'hafs',
  numbering: 'tanzil-madina-hafs',
  publisher: 'Tanzil Project',
  url: 'https://tanzil.net/docs/Text_License',
  recommended: false,
};

export const editionById = (id: string) => {
  const edition = [...editions, legacyHafsEdition].find(e => e.id === id);
  if (!edition) throw Error('unknown_edition');
  return edition;
};

export type ReaderSection = {kind: 'surah' | 'juz' | 'hizb'; number: number};

export type Locator = {
  editionId: EditionId;
  numberingScheme: string;
  surah: number;
  verse: number;
  packVersion: string;
  section?: ReaderSection;
};

export function validateLocator(l: Locator) {
  const e = editionById(l.editionId),
    c = chapters[l.surah - 1];
  if (
    e.numbering !== l.numberingScheme ||
    !Number.isInteger(l.surah) ||
    !c ||
    !Number.isInteger(l.verse) ||
    l.verse < 1 ||
    l.verse > (e.riwaya === 'warsh' ? c.warshVerses : c.hafsVerses) ||
    !/^[\w.-]+$/.test(l.packVersion)
  )
    throw Error('invalid_locator');
  return l;
}

export const locatorKey = (l: Locator) => {
  validateLocator(l);
  return `quran:${l.editionId}:${l.numberingScheme}:${l.surah}:${l.verse}:${l.packVersion}`;
};

// Both Hafs sources use the same 114-surah, 6236-verse Madinah numbering.
// Only this exact historical version is mapped; Warsh is never mapped by number.
export function currentHafsLocator(l: Locator): Locator {
  validateLocator(l);
  return l.editionId === legacyHafsEditionId && l.packVersion === 'source-1'
    ? {
        ...l,
        editionId: hafsEditionId,
        numberingScheme: editionById(hafsEditionId).numbering,
        packVersion: hafsPackVersion,
      }
    : l;
}

export const isLegacyHafsReference = (t: TranslationPack) =>
  t.editionId === legacyHafsEditionId &&
  t.numberingScheme === legacyHafsEdition.numbering &&
  t.textVersion === 'source-1';

export type Verse = {number: number; text: string; sourceId?: string};

export type Chapter = {
  editionId: EditionId;
  numberingScheme: string;
  surah: number;
  verses: Verse[];
  sourceNotice: string;
  opening?: string;
};

export function validateChapter(
  value: Chapter,
  edition: Edition,
  surah: number,
) {
  const c = chapters[surah - 1],
    count = c && (edition.riwaya === 'warsh' ? c.warshVerses : c.hafsVerses);
  if (
    !value ||
    value.editionId !== edition.id ||
    value.numberingScheme !== edition.numbering ||
    value.surah !== surah ||
    !Array.isArray(value.verses) ||
    value.verses.length !== count ||
    !value.sourceNotice
  )
    throw Error('chapter_mismatch');
  value.verses.forEach((v, i) => {
    if (v.number !== i + 1 || typeof v.text !== 'string' || !v.text.trim())
      throw Error('invalid_verse');
  });
  return value; // Never normalize, split basmala, remove ornaments or synthesize text here.
}

export type TextPack = {
  editionId: EditionId;
  pack: Pack;
  chapterAssets: Record<number, string>;
  fontAssetId: string;
  notice: string;
  basmalaPolicy: 'source-verbatim';
};

export type TranslationPack = {
  id: string;
  title: string;
  language: 'fr' | 'en';
  editionId: EditionId;
  numberingScheme: string;
  textVersion: string;
  pack: Pack;
  chapterAssets: Record<number, string>;
  notice: string;
};

export type Recording = {
  id: string;
  title: string;
  riwaya: 'warsh' | 'hafs';
  tariq: string | null;
  quality: string;
  notice: string;
  chapters: {surah: number; pack: Pack; assetId: string; durationMs?: number}[];
};

export type QuranCatalog = {
  texts: TextPack[];
  translations: TranslationPack[];
  recordings: Recording[];
};

export function validateQuranCatalog(catalog: QuranCatalog) {
  const identities = new Set<string>();
  for (const t of catalog.texts) {
    const e = editionById(t.editionId),
      key = `${e.id}@${t.pack.version}`,
      assets = [...t.pack.assets, ...(t.pack.derivedAssets ?? [])];
    if (
      identities.has(key) ||
      t.basmalaPolicy !== 'source-verbatim' ||
      !t.notice ||
      !t.pack.capabilities.includes('quran-text') ||
      !assets.some(a => a.id === t.fontAssetId && a.mime === 'font/ttf')
    )
      throw Error('invalid_text_pack');
    if (
      e.requiredFontSha256 &&
      assets.find(a => a.id === t.fontAssetId)?.sha256 !== e.requiredFontSha256
    )
      throw Error('edition_font_mismatch');
    identities.add(key);
    for (const c of chapters)
      if (
        !assets.some(
          a =>
            a.id === t.chapterAssets[c.number] && a.mime === 'application/json',
        )
      )
        throw Error('missing_chapter_asset');
    if (new Set(Object.values(t.chapterAssets)).size !== 114)
      throw Error('duplicate_chapter_asset');
  }
  for (const t of catalog.translations) {
    const e = editionById(t.editionId);
    // No reviewed Warsh correspondence exists. Numeric equality is not alignment.
    if (
      e.riwaya !== 'hafs' ||
      e.numbering !== t.numberingScheme ||
      !t.notice ||
      !['fr', 'en'].includes(t.language) ||
      !catalog.texts.some(
        p =>
          (p.editionId === t.editionId && p.pack.version === t.textVersion) ||
          (p.editionId === hafsEditionId &&
            p.pack.version === hafsPackVersion &&
            isLegacyHafsReference(t)),
      )
    )
      throw Error('unreviewed_translation_mapping');
    const identity = `translation:${t.id}`;
    const preparation = t.pack.preparation;
    if (
      !t.id ||
      identities.has(identity) ||
      !t.title ||
      !t.pack.capabilities.includes('translation') ||
      new Set(Object.values(t.chapterAssets)).size !== 114 ||
      (preparation &&
        (preparation.kind !== 'translation-source-v1' ||
          preparation.translationId !== t.id ||
          preparation.editionId !== t.editionId ||
          preparation.numberingScheme !== t.numberingScheme ||
          preparation.textVersion !== t.textVersion ||
          preparation.notice !== t.notice))
    )
      throw Error('invalid_translation_pack');
    identities.add(identity);
    const assets = [...t.pack.assets, ...(t.pack.derivedAssets ?? [])];
    for (const c of chapters)
      if (
        !assets.some(
          a =>
            a.id === t.chapterAssets[c.number] && a.mime === 'application/json',
        )
      )
        throw Error('missing_translation_asset');
  }
  for (const r of catalog.recordings) {
    if (
      !r.id ||
      !r.notice ||
      !r.quality ||
      !['warsh', 'hafs'].includes(r.riwaya) ||
      new Set(r.chapters.map(c => c.surah)).size !== r.chapters.length
    )
      throw Error('invalid_recording');
    for (const c of r.chapters)
      if (
        !Number.isInteger(c.surah) ||
        !chapters[c.surah - 1] ||
        !c.pack.capabilities.includes('audio') ||
        !c.pack.assets.some(a => a.id === c.assetId && a.mime === 'audio/mpeg')
      )
        throw Error('invalid_recording_chapter');
  }
}

export const normalizeSearch = (s: string) =>
  s
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g,
      '',
    )
    .replace(/[أإآٱ]/g, 'ا')
    .toLowerCase()
    .trim();

export function searchChapters(query: string) {
  const q = normalizeSearch(query);
  return chapters.filter(c =>
    [c.name, c.english, c.transliteration, String(c.number)].some(x =>
      normalizeSearch(x).includes(q),
    ),
  );
}

export function selectedAudio(r: Recording, selected: number[]) {
  const requested = new Set(selected);
  if ([...requested].some(n => !r.chapters.some(c => c.surah === n)))
    throw Error('unavailable_audio_chapter');
  const rows = r.chapters
    .filter(c => requested.has(c.surah))
    .sort((a, b) => a.surah - b.surah);
  return {
    rows,
    bytes: rows.reduce(
      (n, c) => n + c.pack.assets.reduce((s, a) => s + a.bytes, 0),
      0,
    ),
    complete: r.chapters.length === 114,
  };
}
