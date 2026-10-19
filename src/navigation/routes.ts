import {type NavigatorScreenParams} from '@react-navigation/native';

import {
  type EditionId,
  editionById,
  validateLocator,
} from '../features/quran/domain';

export type Tabs = {
  Home: undefined;
  Adkar: undefined;
  Quran: undefined;
  Prayer: undefined;
  More: undefined;
};

export type RootRoutes = {
  MainTabs: NavigatorScreenParams<Tabs> | undefined;
  Morning: undefined;
  Night: undefined;
  BeforeSleep: undefined;
  Duaa: undefined;
  Tasbihat: undefined;
  Asma: undefined;
  About: undefined;
  Settings: undefined;
  Storage: undefined;
  Downloads: undefined;
  Player: undefined;
  Bookmarks: undefined;
  Search: undefined;
  Guide: undefined;
  Guidance: undefined;
  Privacy: undefined;
  Terms: undefined;
  Sources: undefined;
  Reminders: undefined;
  PrayerLocation: undefined;
  Qibla: undefined;
  QiblaCalibration: undefined;
  PrayerCalculation: undefined;
  PrayerAdhan: undefined;
  PrayerSounds: undefined;
  PrayerSources: undefined;

  QuranEditions: undefined;
  QuranDownload: {editionId: EditionId};
  QuranReader: {
    editionId: EditionId;
    surah: number;
    verse?: number;
    packVersion?: string;
    numberingScheme?: string;
  };
  QuranPreferences: {editionId: EditionId};
  QuranTranslations: {editionId: EditionId};
  QuranSearch: undefined;
  QuranBookmarks: undefined;
  QuranSource: {
    editionId: EditionId;
    surah?: number;
    verse?: number;
    packVersion?: string;
  };
  QuranAudio: {editionId?: EditionId; surah?: number} | undefined;
  QuranPlayer: {
    editionId: EditionId;
    surah: number;
    verse?: number;
    recordingId?: string;
  };
  QuranOfflineAudio: undefined;
  Content: {contentId: string};
  ExternalLink: {title: string; url: string};
  Recovery: {reason: 'invalid-link' | 'missing-pack'};
};

export type LinkTarget =
  | {tab: keyof Tabs}
  | {
      screen: Exclude<
        keyof RootRoutes,
        | 'MainTabs'
        | 'Recovery'
        | 'Content'
        | 'ExternalLink'
        | 'QuranDownload'
        | 'QuranReader'
        | 'QuranPreferences'
        | 'QuranTranslations'
        | 'QuranSource'
      >;
    }
  | {reader: RootRoutes['QuranReader']}
  | {recovery: 'invalid-link' | 'missing-pack'};

export function resolveLink(url: string): LinkTarget {
  if (!url.startsWith('roqia://') || url.length > 2048)
    return {recovery: 'invalid-link'};
  const path = url.slice(8).replace(/\/$/, '');
  const aliases: Record<string, LinkTarget> = {
    home: {tab: 'Home'},
    ruqya: {tab: 'Home'},
    adkar: {tab: 'Adkar'},
    adhkar: {tab: 'Adkar'},
    'adkar/morning': {screen: 'Morning'},
    'adhkar/morning': {screen: 'Morning'},
    'adkar/night': {screen: 'Night'},
    'adhkar/evening': {screen: 'Night'},
    'adkar/before-sleep': {screen: 'BeforeSleep'},
    'adhkar/before-sleep': {screen: 'BeforeSleep'},
    duaa: {screen: 'Duaa'},
    dua: {screen: 'Duaa'},
    tasbihat: {screen: 'Tasbihat'},
    tasbih: {screen: 'Tasbihat'},
    asma: {screen: 'Asma'},
    about: {screen: 'About'},
    more: {tab: 'More'},
    quran: {tab: 'Quran'},
    'quran/editions': {screen: 'QuranEditions'},
    'quran/search': {screen: 'QuranSearch'},
    'quran/bookmarks': {screen: 'QuranBookmarks'},
    'quran/audio': {screen: 'QuranAudio'},
    'quran/offline-audio': {screen: 'QuranOfflineAudio'},
    prayer: {tab: 'Prayer'},
    'prayer/location': {screen: 'PrayerLocation'},
    qibla: {screen: 'Qibla'},
    'qibla/calibration': {screen: 'QiblaCalibration'},
    'prayer/calculation': {screen: 'PrayerCalculation'},
    'prayer/adhan': {screen: 'PrayerAdhan'},
    'prayer/sounds': {screen: 'PrayerSounds'},
    'prayer/sources': {screen: 'PrayerSources'},

    settings: {screen: 'Settings'},
    storage: {screen: 'Storage'},
    downloads: {screen: 'Downloads'},
    player: {screen: 'Player'},
    bookmarks: {screen: 'Bookmarks'},
    search: {screen: 'Search'},
    guide: {screen: 'Guide'},
    guidance: {screen: 'Guidance'},
    privacy: {screen: 'Privacy'},
    terms: {screen: 'Terms'},
    sources: {screen: 'Sources'},
    reminders: {screen: 'Reminders'},
  };
  if (aliases[path]) return aliases[path];
  const match =
    /^quran\/([a-z0-9.-]+)\/([1-9][0-9]{0,2})(?:\/([1-9][0-9]{0,2}))?$/.exec(
      path,
    );
  if (match) {
    if (['warsh', 'hafs'].includes(match[1])) return {recovery: 'missing-pack'};
    try {
      const e = editionById(match[1]),
        surah = Number(match[2]),
        verse = Number(match[3] ?? 1);
      validateLocator({
        editionId: e.id,
        numberingScheme: e.numbering,
        surah,
        verse,
        packVersion: 'link',
      });
      return {reader: {editionId: e.id, surah, verse}};
    } catch {
      return {recovery: 'invalid-link'};
    }
  }
  return {recovery: 'invalid-link'};
}
