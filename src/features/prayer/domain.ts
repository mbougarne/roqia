import {
  CalculationMethod,
  Coordinates,
  HighLatitudeRule,
  Madhab,
  PrayerTimes,
  Qibla,
} from 'adhan';

import cities from './cities.json';
import {civilDate, nextDate, localInstant, zoneNames} from './time';

export const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

export const events = [
  'fajr',
  'sunrise',
  'dhuhr',
  'asr',
  'maghrib',
  'isha',
] as const;

export type Prayer = (typeof prayers)[number];

export type EventName = (typeof events)[number];

export const labels: Record<EventName, string> = {
  fajr: 'الفجر',
  sunrise: 'الشروق',
  dhuhr: 'الظهر',
  asr: 'العصر',
  maghrib: 'المغرب',
  isha: 'العشاء',
};

export const methods = {
  habous: 'حصة وزارة الأوقاف المغربية',
  MuslimWorldLeague: 'رابطة العالم الإسلامي',
  Egyptian: 'الهيئة المصرية للمساحة',
  UmmAlQura: 'أم القرى',
  NorthAmerica: 'أمريكا الشمالية',
};

export type Location = {
  cityId: string | null;
  name: string;
  latitude: number;
  longitude: number;
  zone: string;
  source: 'city' | 'manual' | 'gps';
  acquiredAt: number;
  accuracy?: number;
};

export type Preferences = {
  location: Location | null;
  method: keyof typeof methods;
  asr: 'shafi' | 'hanafi';
  highLatitude: 'middle' | 'seventh' | 'angle';
  offsets: Record<EventName, number>;
  format: '12' | '24';
  modes: Record<Prayer, 'off' | 'notification' | 'full'>;
  preMinutes: number;
  revision: number;
};

export const defaults = (): Preferences => ({
  location: null,
  method: 'habous',
  asr: 'shafi',
  highLatitude: 'middle',
  offsets: {fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0},
  format: '24',
  modes: {fajr: 'off', dhuhr: 'off', asr: 'off', maghrib: 'off', isha: 'off'},
  preMinutes: 0,
  revision: 0,
});

export function validateLocation(l: Location) {
  if (
    !l.name.trim() ||
    l.name.length > 100 ||
    !Number.isFinite(l.latitude) ||
    Math.abs(l.latitude) > 90 ||
    !Number.isFinite(l.longitude) ||
    Math.abs(l.longitude) > 180 ||
    !zoneNames.includes(l.zone) ||
    !['city', 'manual', 'gps'].includes(l.source) ||
    !Number.isFinite(l.acquiredAt)
  )
    throw Error('invalid_location');
  if (
    l.source === 'gps' &&
    (!Number.isFinite(l.accuracy) || l.accuracy! < 0 || l.accuracy! > 1000)
  )
    throw Error('invalid_location');
  if (l.cityId !== null) {
    const city = cities.find(c => c.cityId === l.cityId);
    if (
      !city ||
      l.source !== 'city' ||
      city.latitude !== l.latitude ||
      city.longitude !== l.longitude ||
      city.zone !== l.zone
    )
      throw Error('invalid_city_binding');
  }
  return l;
}

export function validatePreferences(p: Preferences) {
  if (p.location) validateLocation(p.location);
  if (
    !(p.method in methods) ||
    !['shafi', 'hanafi'].includes(p.asr) ||
    !['middle', 'seventh', 'angle'].includes(p.highLatitude) ||
    !['12', '24'].includes(p.format) ||
    !Number.isInteger(p.revision) ||
    p.revision < 0 ||
    !Number.isInteger(p.preMinutes) ||
    p.preMinutes < 0 ||
    p.preMinutes > 30
  )
    throw Error('invalid_preferences');
  for (const n of events)
    if (!Number.isInteger(p.offsets[n]) || Math.abs(p.offsets[n]) > 30)
      throw Error('invalid_offset');
  for (const n of prayers)
    if (!['off', 'notification', 'full'].includes(p.modes[n]))
      throw Error('invalid_mode');
  if (Object.keys(p.modes).some(n => !prayers.includes(n as Prayer)))
    throw Error('invalid_mode');
  return p;
}

export type Timetable = {
  cityId: string;
  sourceUrl: string;
  retrievedAt: number;
  dates: Record<string, string[]>;
};

export type Day = {
  date: string;
  source: string;
  rows: {name: EventName; raw: number; at: number}[];
};

export function day(p: Preferences, date: string, table?: Timetable): Day {
  validatePreferences(p);
  nextDate(date, 0);
  const l = p.location;
  if (!l) throw Error('location_required');
  let raw: number[], source: string;
  if (p.method === 'habous') {
    if (!l.cityId || table?.cityId !== l.cityId || !table.dates[date])
      throw Error('timetable_unavailable');
    raw = table.dates[date].map(t => localInstant(l.zone, date, t));
    source = table.sourceUrl;
  } else {
    const params = CalculationMethod[p.method]();
    params.madhab = p.asr === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
    params.highLatitudeRule = {
      middle: HighLatitudeRule.MiddleOfTheNight,
      seventh: HighLatitudeRule.SeventhOfTheNight,
      angle: HighLatitudeRule.TwilightAngle,
    }[p.highLatitude];
    const [y, m, d] = date.split('-').map(Number),
      times = new PrayerTimes(
        new Coordinates(l.latitude, l.longitude),
        new Date(y, m - 1, d, 12),
        params,
      );
    raw = events.map(n => times[n].getTime());
    source = `Adhan 4.4.6 · ${methods[p.method]}`;
  }
  const rows = events.map((name, i) => ({
    name,
    raw: raw[i],
    at: raw[i] + p.offsets[name] * 60000,
  }));
  if (
    rows.some(
      (r, i) =>
        !Number.isFinite(r.at) ||
        civilDate(l.zone, r.at) !== date ||
        (i > 0 && r.at <= rows[i - 1].at),
    )
  )
    throw Error('undefined_prayer_times');
  return {date, source, rows};
}

export function bearing(l: Pick<Location, 'latitude' | 'longitude'>) {
  if (
    !Number.isFinite(l.latitude) ||
    Math.abs(l.latitude) > 90 ||
    !Number.isFinite(l.longitude) ||
    Math.abs(l.longitude) > 180
  )
    throw Error('invalid_location');
  if (
    Math.abs(l.latitude - 21.4225241) < 0.0001 &&
    Math.abs(l.longitude - 39.8261818) < 0.0001
  )
    throw Error('at_kaaba');
  return Qibla(new Coordinates(l.latitude, l.longitude));
}

export const normalize = (n: number) => ((n % 360) + 360) % 360;

export const smoothHeading = (previous: number, next: number) =>
  normalize(previous + 0.2 * (normalize(next - previous + 180) - 180));

export type Planned = {id: string; at: number; name: Prayer; pre: boolean};

export function notificationPlan(
  p: Preferences,
  now: number,
  tables: Timetable[],
  otherCount: number,
) {
  validatePreferences(p);
  const plan: Planned[] = [];
  let coveredUntil = now;
  if (!p.location) return {plan, coveredUntil};
  const table = tables.find(t => t.cityId === p.location!.cityId),
    date = civilDate(p.location.zone, now),
    budget = Math.max(0, Math.min(27, 48 - otherCount));
  for (let i = 0; i < 3; i++) {
    const current = nextDate(date, i);
    let schedule: Day;
    try {
      schedule = day(p, current, table);
    } catch {
      break;
    }
    for (const row of schedule.rows) {
      if (row.name === 'sunrise' || p.modes[row.name] === 'off') continue;
      for (const pre of p.preMinutes > 0 ? [true, false] : [false]) {
        const at = row.at - (pre ? p.preMinutes * 60000 : 0);
        if (at <= now) continue;
        plan.push({
          id: `roqia-prayer:${p.revision}:${current}:${row.name}:${pre ? 'pre' : 'at'}`,
          at,
          name: row.name,
          pre,
        });
      }
    }
    coveredUntil = localInstant(p.location.zone, nextDate(current), '00:00');
  }
  plan.sort((a, b) => a.at - b.at);
  if (plan.length > budget)
    coveredUntil = Math.min(coveredUntil, plan[budget].at);
  return {plan: plan.slice(0, budget), coveredUntil};
}
