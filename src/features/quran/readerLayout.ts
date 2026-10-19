import {type Verse} from './domain';
// Bounded paragraphs keep long chapters virtualized without making each verse a row.
// Original verse strings, including the publisher's end markers, remain untouched.
export function readerPassages(
  verses: Verse[],
  continuous: boolean,
): Verse[][] {
  if (!continuous) return verses.map(v => [v]);
  const result: Verse[][] = [];
  let group: Verse[] = [],
    length = 0;
  for (const verse of verses) {
    if (length >= 1600) {
      result.push(group);
      group = [];
      length = 0;
    }
    group.push(verse);
    length += verse.text.length;
  }
  if (group.length) result.push(group);
  return result;
}
