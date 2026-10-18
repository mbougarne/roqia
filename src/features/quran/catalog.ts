import {type QuranCatalog} from './domain';
import data from './catalog.data.json';
// Metadata only. Originals download on demand and are verified/imported on the phone.
// Manual Arabic reading review is explicitly deferred in each source record.
export const quranCatalog = data as QuranCatalog;
