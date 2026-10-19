import {type Verse} from './domain';

// Keep source strings and publisher markers intact in one continuous paragraph.
export function readerPassages(
  verses: Verse[],
  continuous: boolean,
): Verse[][] {
  return continuous ? (verses.length ? [verses] : []) : verses.map(v => [v]);
}

export function verseAtOffset(lengths: number[], offset: number): number {
  let end = 0;
  for (let i = 0; i < lengths.length; i++) {
    end += lengths[i];
    if (offset < end) return i;
  }
  return Math.max(0, lengths.length - 1);
}
