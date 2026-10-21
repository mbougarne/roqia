import durations from './audio-durations.data.json';
import data from './catalog.data.json';
import {type QuranCatalog} from './domain';
import recordings from './recordings.data.json';
import translations from './translations.data.json';

// Both mushafs and translations import bundled originals; audio downloads on demand.
// Manual Arabic reading review is explicitly deferred in each source record.
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
