import {type Pack} from './types';

// Exact versions shipped as unchanged originals under bundled-content/roqia-offline.
const versions: Record<string, string> = {
  'quran-warsh': 'source-1',
  'quran-hafs': 'kfgqpc-2.0-update13',
  'translation-fr.hamidullah': 'source-1',
  'translation-en.pickthall': 'source-1',
};

export const isBundledPack = (pack: Pack) => versions[pack.id] === pack.version;
