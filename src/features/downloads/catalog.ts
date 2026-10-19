import {type Pack} from './types';
import {quranCatalog} from '../quran/catalog';
// Only source-verified, immutable descriptors are installable.
export const catalog: Pack[] = [
  ...quranCatalog.texts.map(t => t.pack),
  ...quranCatalog.translations.map(t => t.pack),
  ...quranCatalog.recordings.flatMap(r => r.chapters.map(c => c.pack)),
];
