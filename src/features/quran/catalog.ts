import durations from './audio-durations.data.json';
import data from './catalog.data.json';
import {type QuranCatalog} from './domain';
import legacyHafs from './legacy-hafs.data.json';
import recordings from './recordings.data.json';
import translations from './translations.data.json';

// Metadata only. Warsh and both translations import bundled originals; other packs download on demand.
// Manual Arabic reading review is explicitly deferred in each source record.
export const quranCatalog = {
  ...data,
  // Keep Android's existing source until its separate validation/release.
  texts: [data.texts[0], legacyHafs],
  translations,
  recordings: recordings.map(r => ({
    ...r,
    chapters: r.chapters.map(c => ({
      ...c,
      durationMs: (durations as Record<string, number>)[c.pack.id],
    })),
  })),
} as QuranCatalog;
