export type ThemePreference = 'light' | 'dark' | 'system';
export type DigitStyle = 'western' | 'eastern';
export type Settings = {
  schemaVersion: 2;
  themePreference: ThemePreference;
  uiScale: number;
  digitStyle: DigitStyle;
  readerSizeSp: number;
  readerLineHeightRatio: number;
  wifiOnly: boolean;
  preferredEditionId: string | null;
  translationId: string | null;
  onboardingVersion: number;
  guidanceSeen: boolean;
  updatedAt: number;
};
export const defaultSettings: Settings = {
  schemaVersion: 2,
  themePreference: 'system',
  uiScale: 1,
  digitStyle: 'western',
  readerSizeSp: 21,
  readerLineHeightRatio: 1.8,
  wifiOnly: true,
  preferredEditionId: null,
  translationId: null,
  onboardingVersion: 0,
  guidanceSeen: false,
  updatedAt: 0,
};
export type Bookmark = {bookmarkId: string; createdAt: number} & (
  | {kind: 'devotional'; contentId: string}
  | {
      kind: 'quran-verse';
      editionId: string;
      numberingScheme: string;
      surah: number;
      verse: number;
      packVersion: string;
    }
  | {kind: 'quran-page'; editionId: string; pageId: string; packVersion: string}
);
export type Reminder = {
  reminderId: string;
  category: string;
  enabled: boolean;
  localTimeHHmm: string;
  weekdays: number[];
  soundId: string;
  zonePolicy: 'device';
  updatedAt: number;
};
export type MigrationReceipt = {
  migrationId: string;
  fromVersion: number;
  toVersion: number;
  inputHash: string;
  legacyBackupPath: string;
  committedAt: number;
  unmappedCount: number;
};
