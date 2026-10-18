import {chapters} from './domain';
import {type TranslationPreparation} from '../downloads/types';

// Import a pinned original, retaining every translation string and its source footer.
// Only the reviewed Hafs numbering is supported; Warsh ordinals are not equivalent.
export function parseTranslationSource(p: TranslationPreparation, raw: string) {
  if (
    p.editionId !== 'hafs-tanzil-uthmani-1.1' ||
    p.numberingScheme !== 'tanzil-madina-hafs' ||
    p.textVersion !== 'source-1' ||
    !['fr.hamidullah', 'en.pickthall'].includes(p.translationId)
  )
    throw Error('translation_source_mapping');
  const footerAt = raw.indexOf('#');
  if (
    footerAt < 0 ||
    raw.slice(footerAt) !== p.sourceFooter ||
    !p.sourceFooter.includes(`#  ID: ${p.translationId}\n`) ||
    !p.notice.includes(p.sourceFooter)
  )
    throw Error('translation_source_notice');
  const lines = raw.slice(0, footerAt).split(/\r?\n/);
  // Tanzil separates the footer with blank lines. Interior blank records are errors.
  while (lines.at(-1) === '') lines.pop();
  let cursor = 0;
  const result = chapters.map(c => ({
    translationId: p.translationId,
    editionId: p.editionId,
    numberingScheme: p.numberingScheme,
    textVersion: p.textVersion,
    surah: c.number,
    verses: Array.from({length: c.hafsVerses}, (_, i) => {
      const number = i + 1,
        prefix = `${c.number}|${number}|`,
        line = lines[cursor++];
      if (!line?.startsWith(prefix) || !line.slice(prefix.length).trim())
        throw Error('translation_source_order');
      return {number, text: line.slice(prefix.length)};
    }),
    sourceNotice: p.notice,
  }));
  if (cursor !== lines.length) throw Error('translation_source_count');
  return result;
}
