import {type QuranCatalog} from './domain';
// Source acquisition != publication approval. Only reviewed immutable packs belong here.
// Private Android fixtures are injected into a separate runtime by the debug harness.
export const quranCatalog: QuranCatalog = {
  texts: [],
  translations: [],
  recordings: [],
};
