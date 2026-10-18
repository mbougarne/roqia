import {NativeModules} from 'react-native';
import {
  loadPreferences,
  loadTables,
  reconcilePrayer,
  refreshTable,
} from './service';
import {civilDate, nextDate} from './time';
import {saveRecord} from '../../repositories/database';

export async function renewPrayerCoverage() {
  const prefs = await loadPreferences();
  let refresh: 'not-needed' | 'updated' | 'unavailable' = 'not-needed';
  if (
    prefs.location?.cityId &&
    prefs.method === 'habous' &&
    Object.values(prefs.modes).some(mode => mode !== 'off')
  ) {
    const tables = await loadTables();
    const table = tables.find(t => t.cityId === prefs.location!.cityId);
    const today = civilDate(prefs.location.zone);
    // Fetch before the saved official source runs out. Never invent dates or switch methods.
    if (![0, 1, 2, 3].every(n => table?.dates[nextDate(today, n)])) {
      try {
        await refreshTable(prefs.location.cityId);
        refresh = 'updated';
      } catch {
        refresh = 'unavailable';
      }
    }
  }
  // Offline or source failure still replenishes every valid remaining day.
  const coverage = await reconcilePrayer();
  await saveRecord('prayer', 'renewal', {
    at: Date.now(),
    refresh,
    coveredUntil: coverage.coveredUntil,
  });
  return {coverage, refresh};
}
export default async function prayerRenewalTask({token}: {token: string}) {
  let success = false;
  try {
    await renewPrayerCoverage();
    success = true;
  } finally {
    NativeModules.RoqiaPrayer?.completeRenewal(token, success);
  }
}
