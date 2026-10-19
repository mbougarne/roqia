import mapping from './warsh-translation-map.json';
import {chapters} from './domain';
export type DisplayTranslation = {
  number: number;
  text: string;
  warshStart?: number;
  sourceStart?: number;
  sourceEnd?: number;
};
// The translation remains a Hafs-source meaning reference. Group complete source
// verses across differing boundaries; never split or rewrite a translator's text.
export function alignWarshTranslation(
  surah: number,
  verses: {number: number; text: string}[],
): DisplayTranslation[] {
  const chapter = chapters[surah - 1];
  const groups = (
    mapping.chapters as Record<string, {warsh: number[]; hafs: number[]}[]>
  )[surah];
  if (
    !chapter ||
    !groups ||
    verses.length !== chapter.hafsVerses ||
    verses.some((v, i) => v.number !== i + 1 || !v.text.trim())
  )
    throw Error('translation_alignment_source');
  const result: DisplayTranslation[] = Array.from(
    {length: chapter.warshVerses},
    (_, i) => ({number: i + 1, text: ''}),
  );
  let warshNext = 1,
    hafsNext = surah === 1 ? 2 : 1;
  for (const group of groups) {
    const [ws, we] = group.warsh,
      [hs, he] = group.hafs;
    if (
      ws !== warshNext ||
      hs !== hafsNext ||
      we < ws ||
      he < hs ||
      we > result.length ||
      he > verses.length
    )
      throw Error('translation_alignment_gap');
    result[we - 1] = {
      number: we,
      text: verses
        .slice(hs - 1, he)
        .map(v => v.text)
        .join('\n\n'),
      warshStart: ws,
      sourceStart: hs,
      sourceEnd: he,
    };
    warshNext = we + 1;
    hafsNext = he + 1;
  }
  if (warshNext !== result.length + 1 || hafsNext !== verses.length + 1)
    throw Error('translation_alignment_count');
  if (surah === 1) result.push({number: 0, text: verses[0].text});
  return result;
}
