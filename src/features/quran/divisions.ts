import data from './division-index.json';
import {
  chapters,
  editionById,
  type Locator,
  type ReaderSection,
  validateLocator,
} from './domain';

export type IndexKind = ReaderSection['kind'];

export type Coordinate = {surah: number; verse: number};

export const indexOptions: {value: IndexKind; label: string}[] = [
  {value: 'surah', label: 'السور'},
  {value: 'juz', label: 'الأجزاء'},
  {value: 'hizb', label: 'الأحزاب'},
];

export const sectionWord = (kind: IndexKind) =>
  kind === 'juz' ? 'الجزء' : kind === 'hizb' ? 'الحزب' : 'سورة';

export const sectionNavigationLabel = (kind: IndexKind, next: boolean) =>
  `${kind === 'surah' ? 'السورة' : sectionWord(kind)} ${kind === 'surah' ? (next ? 'التالية' : 'السابقة') : next ? 'التالي' : 'السابق'}`;

export const verseCount = (editionId: string, surah: number) => {
  const c = chapters[surah - 1];
  if (!c) throw Error('invalid_surah');
  return editionById(editionId).riwaya === 'warsh'
    ? c.warshVerses
    : c.hafsVerses;
};
const before = (a: Coordinate, b: Coordinate) =>
  a.surah < b.surah || (a.surah === b.surah && a.verse < b.verse);

export function sectionStarts(
  editionId: string,
  kind: IndexKind,
): Coordinate[] {
  if (!indexOptions.some(option => option.value === kind))
    throw Error('invalid_index_kind');
  if (kind === 'surah') return chapters.map(c => ({surah: c.number, verse: 1}));
  const all = data[editionById(editionId).riwaya];
  return all
    .filter((_, i) => kind === 'hizb' || i % 2 === 0)
    .map(([surah, verse]) => ({surah, verse}));
}

export function sectionRange(editionId: string, section: ReaderSection) {
  const starts = sectionStarts(editionId, section.kind);
  if (!Number.isInteger(section.number) || !starts[section.number - 1])
    throw Error('invalid_reader_section');
  const start = starts[section.number - 1],
    next = starts[section.number];
  const end = next
    ? next.verse === 1
      ? {surah: next.surah - 1, verse: verseCount(editionId, next.surah - 1)}
      : {surah: next.surah, verse: next.verse - 1}
    : {surah: 114, verse: verseCount(editionId, 114)};
  return {start, end};
}

export function containsCoordinate(
  range: {start: Coordinate; end: Coordinate},
  c: Coordinate,
) {
  return !before(c, range.start) && !before(range.end, c);
}

export function sectionAt(
  editionId: string,
  kind: IndexKind,
  coordinate: Coordinate,
): ReaderSection {
  const starts = sectionStarts(editionId, kind);
  const next = starts.findIndex(start => before(coordinate, start));
  return {kind, number: next < 0 ? starts.length : next};
}

export function sectionChapter(
  editionId: string,
  section: ReaderSection,
  surah: number,
) {
  const range = sectionRange(editionId, section);
  if (surah < range.start.surah || surah > range.end.surah)
    throw Error('chapter_outside_reader_section');
  return {
    first: surah === range.start.surah ? range.start.verse : 1,
    last:
      surah === range.end.surah
        ? range.end.verse
        : verseCount(editionId, surah),
    firstSurah: range.start.surah,
    lastSurah: range.end.surah,
  };
}

export function sectionTarget(
  editionId: Locator['editionId'],
  packVersion: string,
  section: ReaderSection,
  coordinate?: Coordinate,
): Locator {
  const range = sectionRange(editionId, section);
  const destination = coordinate ?? range.start;
  validateLocator({
    editionId,
    packVersion,
    numberingScheme: editionById(editionId).numbering,
    ...destination,
  });
  if (!containsCoordinate(range, destination))
    throw Error('locator_outside_reader_section');
  return {
    editionId,
    packVersion,
    numberingScheme: editionById(editionId).numbering,
    ...destination,
    section,
  };
}
