import data from './timezones.json';

const zones = data.zones as Record<string, number[][]>;

export const zoneNames = Object.keys(zones);

export const tzVersion = data.version;

export function offsetAt(zone: string, instant: number) {
  const rows = zones[zone],
    t = Math.floor(instant / 1000);
  if (!rows || !Number.isFinite(t) || t < data.from || t >= data.until)
    throw Error('timezone_unavailable');
  let lo = 0,
    hi = rows.length;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >>> 1;
    if (rows[mid][0] <= t) lo = mid;
    else hi = mid;
  }
  return rows[lo][1] * 1000;
}

export function civilDate(zone: string, instant = Date.now()) {
  return new Date(instant + offsetAt(zone, instant)).toISOString().slice(0, 10);
}

export function nextDate(date: string, days = 1) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw Error('invalid_date');
  const t = Date.parse(date + 'T12:00:00Z');
  if (!Number.isFinite(t) || new Date(t).toISOString().slice(0, 10) !== date)
    throw Error('invalid_date');
  return new Date(t + days * 86400000).toISOString().slice(0, 10);
}

export function clock(
  zone: string,
  instant: number,
  format: '12' | '24' = '24',
) {
  const d = new Date(instant + offsetAt(zone, instant)),
    h = d.getUTCHours(),
    m = String(d.getUTCMinutes()).padStart(2, '0');
  return format === '24'
    ? `${String(h).padStart(2, '0')}:${m}`
    : `${h % 12 || 12}:${m} ${h < 12 ? 'ص' : 'م'}`;
}

export function localInstant(zone: string, date: string, hhmm: string) {
  nextDate(date, 0);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hhmm) || !zones[zone])
    throw Error('invalid_time');
  const naive = Date.parse(`${date}T${hhmm}:00Z`);
  const matches = [...new Set(zones[zone].map(r => r[1]))]
    .map(s => naive - s * 1000)
    .filter(t => {
      try {
        return civilDate(zone, t) === date && clock(zone, t) === hhmm;
      } catch {
        return false;
      }
    });
  // Prayer timetable rows must identify one instant, not an ambiguous/gap wall time.
  if (matches.length !== 1) throw Error('ambiguous_local_time');
  return matches[0];
}
