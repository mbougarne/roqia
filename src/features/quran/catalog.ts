import {type QuranCatalog} from './domain';
import data from './catalog.data.json';
import recordings from './recordings.data.json';
import translations from './translations.data.json';
// Metadata only. Warsh and both translations import bundled originals; other packs download on demand.
// Manual Arabic reading review is explicitly deferred in each source record.
export const quranCatalog = {...data, translations, recordings} as QuranCatalog;
