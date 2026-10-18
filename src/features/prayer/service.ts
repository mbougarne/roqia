import notifee, {
  AndroidImportance,
  AuthorizationStatus,
  TriggerType,
} from '@notifee/react-native';
import {Platform, NativeModules} from 'react-native';
import {readRecord, saveRecord, listRecords} from '../../repositories/database';
import {
  defaults,
  validatePreferences,
  notificationPlan,
  labels,
  type Preferences,
  type Timetable,
} from './domain';
import {parseHabous, sourceUrl} from './habous';
import {civilDate, clock} from './time';
import bundled from './timetables.json';
import cities from './cities.json';
import {adhanCapability, adhanNative} from './sounds';
export const CHANNEL = 'prayer-notifications';
export const owned = (id: string) => id.startsWith('roqia-prayer:');
export const loadPreferences = async () =>
  validatePreferences(
    (await readRecord<Preferences>('prayer', 'preferences')) ?? defaults(),
  );
export async function loadTables(): Promise<Timetable[]> {
  const cached = await listRecords<Timetable>('prayer-timetables');
  return bundled.map(t => cached.find(c => c.cityId === t.cityId) ?? t);
}
export async function permission() {
  const settings = await notifee.getNotificationSettings(),
    channel =
      Platform.OS === 'android' ? await notifee.getChannel(CHANNEL) : undefined;
  return {
    authorized: settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED,
    blocked:
      !!channel?.blocked || channel?.importance === AndroidImportance.NONE,
  };
}
let tail: Promise<unknown> = Promise.resolve();
function serial<T>(action: () => Promise<T>) {
  const next = tail.then(action);
  tail = next.catch(() => undefined);
  return next;
}
export type Coverage = {
  coveredUntil: number;
  scheduled: number;
  authorized: boolean;
  blocked: boolean;
  signature: string;
  refreshedAt: number;
  fullAdhan?: number;
  exact?: boolean;
  fullFallback?: number;
  backgroundRenewal?: boolean;
};
async function reconcile(): Promise<Coverage> {
  const p = await loadPreferences(),
    status = await permission(),
    ids = await notifee.getTriggerNotificationIds(),
    others = ids.filter(id => !owned(id)),
    now = Date.now();
  const {plan, coveredUntil} = notificationPlan(
    p,
    now,
    await loadTables(),
    others.length,
  );
  const native = adhanNative();
  const backgroundRenewal = !!native?.configureRenewal;
  if (backgroundRenewal)
    await native.configureRenewal(
      !!p.location && Object.values(p.modes).some(mode => mode !== 'off'),
    );
  const capability = await adhanCapability();
  const effective = status.authorized && !status.blocked ? plan : [];
  const full = effective.flatMap(e => {
    const sound = e.name === 'fajr' ? capability.fajr : capability.normal;
    return !e.pre &&
      p.modes[e.name] === 'full' &&
      capability.exact &&
      capability.notifications &&
      sound
      ? [{...e, ...sound, title: `حان وقت ${labels[e.name]} · ${sound.title}`}]
      : [];
  });
  const notifications = effective.filter(e => !full.some(f => f.id === e.id));
  const signature = JSON.stringify([
    p.revision,
    status,
    [
      capability.exact,
      capability.notifications,
      capability.normal,
      capability.fajr,
    ],
    full,
    effective.map(e => [e.id, e.at]),
  ]);
  const previous = await readRecord<Coverage>('prayer', 'coverage'),
    existing = ids.filter(owned);
  const unchanged =
    previous?.signature === signature &&
    previous?.backgroundRenewal === backgroundRenewal &&
    existing.length === notifications.length &&
    notifications.every(e => existing.includes(e.id)) &&
    capability.events.length === full.length &&
    full.every(e => capability.events.some(f => f.id === e.id));
  // Native scheduling verifies local files again. On failure, preserve desired full
  // mode but deliver an ordinary notification and expose the fallback count.
  let deliveredFull = full;
  if (adhanNative()?.scheduleAdhan) {
    try {
      await adhanNative().scheduleAdhan(JSON.stringify(full));
    } catch {
      await adhanNative().scheduleAdhan('[]');
      deliveredFull = [];
    }
  }
  // A force-stop can clear AlarmManager while the persisted desired IDs survive.
  // Reinstall native alarms even when the JS/Notifee signature is unchanged.
  if (unchanged && deliveredFull.length === full.length) return previous!;
  const notificationEvents = effective.filter(
    e => !deliveredFull.some(f => f.id === e.id),
  );
  // Persist desired prefs before this reconciliation; failure leaves the signature stale.
  if (existing.length) await notifee.cancelTriggerNotifications(existing);
  if (effective.length && Platform.OS === 'android')
    await notifee.createChannel({
      id: CHANNEL,
      name: 'تنبيهات الصلاة',
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });
  for (const e of notificationEvents) {
    const at = clock(p.location!.zone, e.at, p.format);
    await notifee.createTriggerNotification(
      {
        id: e.id,
        title: e.pre
          ? `اقترب وقت ${labels[e.name]}`
          : `حان وقت ${labels[e.name]}`,
        body: `${p.location!.name} · ${civilDate(p.location!.zone, e.at)} · ${at}`,
        data: {deepLink: 'roqia://prayer'},
        android: {
          channelId: CHANNEL,
          pressAction: {id: 'default'},
          timeoutAfter: 60000,
        },
        ios: {sound: 'default'},
      },
      {type: TriggerType.TIMESTAMP, timestamp: e.at},
    );
  }
  const result = {
    coveredUntil: effective.length ? coveredUntil : now,
    backgroundRenewal,
    scheduled: effective.length,
    fullAdhan: deliveredFull.length,
    exact: capability.exact,
    fullFallback:
      effective.filter(e => !e.pre && p.modes[e.name] === 'full').length -
      deliveredFull.length,
    ...status,
    signature,
    refreshedAt: now,
  };
  await saveRecord('prayer', 'coverage', result);
  return result;
}
export const reconcilePrayer = () => serial(reconcile);
export const savePreferences = (value: Preferences) =>
  serial(async () => {
    const previous = await loadPreferences(),
      next = validatePreferences({...value, revision: previous.revision + 1});
    await saveRecord('prayer', 'preferences', next);
    await reconcile();
    return next;
  });
export const refreshTable = (cityId: string) =>
  serial(async () => {
    if (!cities.some(c => c.cityId === cityId)) throw Error('unknown_city');
    const controller = new AbortController(),
      timeout = setTimeout(() => controller.abort(), 15000);
    try {
      let html: string;
      if (Platform.OS === 'android' && NativeModules?.RoqiaPrayer) {
        html = await NativeModules.RoqiaPrayer.fetchTimetable(cityId);
      } else {
        const result = await fetch(sourceUrl(cityId), {
          signal: controller.signal,
        });
        if (!result.ok) throw Error('source_unavailable');
        html = await result.text();
      }
      const table = parseHabous(html, cityId),
        today = civilDate('Africa/Casablanca');
      if (!table.dates[today]) throw Error('stale_timetable');
      await saveRecord('prayer-timetables', cityId, table);
      const p = await loadPreferences();
      await saveRecord('prayer', 'preferences', {
        ...p,
        revision: p.revision + 1,
      });
      await reconcile();
      return table;
    } catch (error) {
      // Source/parser failures contain no location coordinates or user data.
      console.warn('prayer_refresh_failed', String(error));
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  });
export const requestPrayerPermission = () => notifee.requestPermission();
export const openPrayerSettings = () =>
  notifee.openNotificationSettings(CHANNEL);
export async function testPrayerNotification() {
  const status = await permission();
  if (!status.authorized || status.blocked) throw Error('permission_denied');
  await notifee.createChannel({
    id: CHANNEL,
    name: 'تنبيهات الصلاة',
    importance: AndroidImportance.HIGH,
    sound: 'default',
  });
  await notifee.displayNotification({
    id: 'roqia-prayer-test',
    title: 'تجربة تنبيه الصلاة',
    body: 'هذا تنبيه تجريبي، وليس أذانا كاملا.',
    data: {deepLink: 'roqia://prayer'},
    android: {
      channelId: CHANNEL,
      pressAction: {id: 'default'},
      timeoutAfter: 60000,
    },
  });
}
