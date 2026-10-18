import {type Pack} from './types';
import {quranCatalog} from '../quran/catalog';
// Approved runtime descriptors only. The source gate currently keeps these lists empty.
export const catalog: Pack[] = [
  ...quranCatalog.texts.map(t => t.pack),
  ...quranCatalog.translations.map(t => t.pack),
  ...quranCatalog.recordings.flatMap(r => r.chapters.map(c => c.pack)),
];
