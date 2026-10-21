import durations from './audio-durations.data.json';
import data from './catalog.data.json';
import {type QuranCatalog} from './domain';
import recordings from './recordings.data.json';
import translations from './translations.data.json';

// Metro selects this catalog only for iPhone. The Hafs text and its font are
// imported together, unchanged, from the Complex's checksum-verified archive.
export const quranCatalog = {
  ...data,
  translations,
  recordings: recordings.map(r => ({
    ...r,
    chapters: r.chapters.map(c => ({
      ...c,
      durationMs: (durations as Record<string, number>)[c.pack.id],
    })),
  })),
} as QuranCatalog;
