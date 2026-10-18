import {chapters, editionById, validateChapter, type Chapter} from './domain';
import {type SourcePreparation} from '../downloads/types';

// Container conversion only: preserve every source string, including spaces and ornaments.
export function parseOriginalSource(
  preparation: SourcePreparation,
  raw: string,
  openings: Record<string, string> = {},
): Chapter[] {
  const edition = editionById(preparation.editionId);
  const result: Chapter[] = chapters.map(c => ({
    surah: c.number,
    verses: [],
    editionId: edition.id,
    numberingScheme: edition.numbering,
    sourceNotice: preparation.notice,
    ...(openings[c.number] !== undefined ? {opening: openings[c.number]} : {}),
  }));
  if (edition.riwaya === 'warsh') {
    const rows = JSON.parse(raw);
    if (!Array.isArray(rows) || rows.length !== 6214)
      throw Error('source_record_count');
    let previous = 1;
    rows.forEach((r, i) => {
      if (
        r.id !== i + 1 ||
        !Number.isInteger(r.sura_no) ||
        r.sura_no < 1 ||
        r.sura_no > 114 ||
        ![previous, previous + 1].includes(r.sura_no)
      )
        throw Error('source_order');
      const c = result[r.sura_no - 1];
      if (
        r.aya_no !== c.verses.length + 1 ||
        typeof r.aya_text !== 'string' ||
        !r.aya_text
      )
        throw Error('source_verse');
      c.verses.push({
        number: r.aya_no,
        text: r.aya_text,
        sourceId: String(r.id),
      });
      previous = r.sura_no;
    });
    if (
      Object.keys(openings).length !== 113 ||
      openings[9] !== undefined ||
      chapters.some(
        c =>
          c.number !== 9 &&
          (typeof openings[c.number] !== 'string' ||
            !openings[c.number].startsWith('بِسْمِ')),
      )
    )
      throw Error('source_openings');
  } else {
    const marker = '# PLEASE DO NOT REMOVE OR CHANGE THIS COPYRIGHT BLOCK';
    const parts = raw.split(marker);
    if (
      parts.length !== 2 ||
      !parts[1].includes('Tanzil Quran Text (Uthmani, Version 1.1)') ||
      Object.keys(openings).length
    )
      throw Error('source_notice');
    const lines = parts[0].split(/\r?\n/).filter(Boolean);
    let cursor = 0;
    for (const c of result) {
      for (
        let number = 1;
        number <= chapters[c.surah - 1].hafsVerses;
        number++
      ) {
        const line = lines[cursor++],
          prefix = `${c.surah}|${number}|`;
        if (!line?.startsWith(prefix) || line.length === prefix.length)
          throw Error('source_order');
        c.verses.push({number, text: line.slice(prefix.length)});
      }
    }
    if (cursor !== lines.length) throw Error('source_record_count');
  }
  return result.map(c => validateChapter(c, edition, c.surah));
}
