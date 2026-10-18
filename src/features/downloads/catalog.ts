import {type Pack} from './types';
import {quranCatalog} from '../quran/catalog';
import soundData from '../prayer/sounds.data.json';
// Only source-verified, immutable descriptors are installable.
export const catalog: Pack[] = [
  ...soundData.map(s => s.pack as Pack),
  ...quranCatalog.texts.map(t => t.pack),
  ...quranCatalog.translations.map(t => t.pack),
  ...quranCatalog.recordings.flatMap(r => r.chapters.map(c => c.pack)),
];
