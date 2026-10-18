import AsyncStorage from '@react-native-async-storage/async-storage';
import {FileSystem} from 'react-native-file-access';
import {contentById, clampCount} from '../repositories/content';
import {
  database,
  write,
  putRecord,
  readRecord,
  saveRecord,
  listRecords,
  removeRecord,
} from '../repositories/database';
import {legacyKeys, prepareMigration} from '../repositories/migration';
import {
  type Settings,
  type ThemePreference,
  type Bookmark,
  type MigrationReceipt,
} from '../repositories/models';
import {
  ensureDirectory,
  ensurePrivateRoot,
  privatePath,
} from '../platform/files';

let hydration: Promise<void> | undefined;
export function hydrateStorage(): Promise<void> {
  return (hydration ??= (async () => {
    await database();
    if (await readRecord('migrations', 'legacy-v2')) return;
    const raw = Object.fromEntries(
      await AsyncStorage.multiGet([...legacyKeys]),
    );
    await ensurePrivateRoot();
    await ensureDirectory(privatePath('recovery'));
    const temporary = privatePath('recovery/legacy-v2.pending.json');
    await FileSystem.writeFile(temporary, JSON.stringify(raw), 'utf8');
    const hash = await FileSystem.hash(temporary, 'SHA-256');
    const relative = `recovery/legacy-v2-${hash}.json`;
    const backup = privatePath(relative);
    if (await FileSystem.exists(backup)) await FileSystem.unlink(temporary);
    else await FileSystem.mv(temporary, backup);
    if ((await FileSystem.hash(backup, 'SHA-256')) !== hash)
      throw new Error('backup_verification_failed');
    const prepared = prepareMigration(raw);
    await write(async tx => {
      await putRecord(tx, 'settings', 'singleton', prepared.settings);
      for (const [id, remaining] of Object.entries(prepared.counts)) {
        await tx.execute('INSERT OR IGNORE INTO counters VALUES(?,?,?,?,?)', [
          id,
          remaining,
          contentById.get(id)?.repeat ?? 0,
          1,
          Date.now(),
        ]);
      }
      for (const reminder of prepared.reminders)
        await putRecord(tx, 'reminders', reminder.reminderId, reminder);
      const receipt: MigrationReceipt = {
        migrationId: 'legacy-v2',
        fromVersion: 1,
        toVersion: 2,
        inputHash: hash,
        legacyBackupPath: relative,
        committedAt: Date.now(),
        unmappedCount: prepared.unmappedCount,
      };
      await putRecord(tx, 'migrations', 'legacy-v2', receipt);
    });
  })().catch(error => {
    hydration = undefined;
    throw error;
  }));
}
export async function loadPersistedAppState() {
  await hydrateStorage();
  const settings = (await readRecord<Settings>('settings', 'singleton'))!;
  const rows = (
    await (
      await database()
    ).execute('SELECT content_id, remaining FROM counters')
  ).rows;
  return {
    mode: settings.themePreference,
    repeatCounts: Object.fromEntries(
      rows.map(r => [r.content_id as string, r.remaining as number]),
    ),
  };
}
export async function getSettings() {
  await hydrateStorage();
  return (await readRecord<Settings>('settings', 'singleton'))!;
}
export async function updateSettings(
  patch: Partial<Omit<Settings, 'schemaVersion'>>,
) {
  await hydrateStorage();
  await write(async tx => {
    const rows = (
      await tx.execute(
        "SELECT value FROM records WHERE collection='settings' AND id='singleton'",
      )
    ).rows;
    const next = {
      ...JSON.parse(rows[0].value as string),
      ...patch,
      updatedAt: Date.now(),
    };
    if (
      !['system', 'light', 'dark'].includes(next.themePreference) ||
      ![next.uiScale, next.readerSizeSp, next.readerLineHeightRatio].every(
        Number.isFinite,
      ) ||
      typeof next.wifiOnly !== 'boolean' ||
      typeof next.guidanceSeen !== 'boolean' ||
      !Number.isInteger(next.onboardingVersion) ||
      next.onboardingVersion < 0 ||
      next.uiScale < 1 ||
      next.uiScale > 1.5 ||
      next.readerSizeSp < 20 ||
      next.readerSizeSp > 36 ||
      next.readerLineHeightRatio < 1.6 ||
      next.readerLineHeightRatio > 2.2
    )
      throw new Error('invalid_settings');
    await putRecord(tx, 'settings', 'singleton', next);
  });
}
export async function persistAppState(
  mode: ThemePreference,
  repeatCounts: Record<string, number>,
) {
  await hydrateStorage();
  await write(async tx => {
    const rows = (
      await tx.execute(
        "SELECT value FROM records WHERE collection='settings' AND id='singleton'",
      )
    ).rows;
    await putRecord(tx, 'settings', 'singleton', {
      ...JSON.parse(rows[0].value as string),
      themePreference: mode,
      updatedAt: Date.now(),
    });
    for (const [id, value] of Object.entries(repeatCounts)) {
      const item = contentById.get(id);
      if (!item) throw new Error('unknown_counter');
      await tx.execute(
        'UPDATE counters SET remaining=?, updated_at=? WHERE content_id=?',
        [clampCount(value, item.repeat ?? 0), Date.now(), id],
      );
    }
  });
}
export const loadWalkthroughSeen = async () =>
  (await getSettings()).onboardingVersion >= 1;
export const loadIntroNoteSeen = async () => (await getSettings()).guidanceSeen;
export const persistWalkthroughSeen = () =>
  updateSettings({onboardingVersion: 1});
export const persistIntroNoteSeen = () => updateSettings({guidanceSeen: true});
export const bookmarks = {
  list: () => listRecords<Bookmark>('bookmarks'),
  async save(bookmark: Bookmark) {
    if (
      bookmark.kind === 'devotional'
        ? !contentById.has(bookmark.contentId)
        : !bookmark.editionId || !bookmark.packVersion
    )
      throw new Error('invalid_bookmark');
    if (
      bookmark.kind === 'quran-verse' &&
      (!bookmark.numberingScheme ||
        !Number.isInteger(bookmark.surah) ||
        bookmark.surah < 1 ||
        bookmark.surah > 114 ||
        !Number.isInteger(bookmark.verse) ||
        bookmark.verse < 1)
    )
      throw new Error('invalid_locator');
    if (bookmark.kind === 'quran-page' && !bookmark.pageId)
      throw new Error('invalid_locator');
    await saveRecord('bookmarks', bookmark.bookmarkId, bookmark);
  },
  remove: (id: string) => removeRecord('bookmarks', id),
};
