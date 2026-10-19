import {type Location, type Preferences, validateLocation} from './domain';

export function gpsLocation(
  fix: Pick<Location, 'latitude' | 'longitude' | 'accuracy' | 'acquiredAt'> & {
    name?: string;
  },
  zone: string,
): Location {
  return validateLocation({
    cityId: null,
    name: fix.name || 'موقعي المحفوظ',
    latitude: fix.latitude,
    longitude: fix.longitude,
    accuracy: fix.accuracy,
    acquiredAt: fix.acquiredAt,
    source: 'gps',
    zone,
  });
}

export function preferencesForLocation(
  prefs: Preferences,
  location: Location,
): Preferences {
  // An official city table cannot be used as if it describes arbitrary coordinates.
  return {
    ...prefs,
    location: validateLocation(location),
    method:
      prefs.method === 'habous' && !location.cityId
        ? 'MuslimWorldLeague'
        : prefs.method,
  };
}

export function liveHeading(
  heading: {at: number; accuracy: number} | null,
  now: number,
) {
  return (
    !!heading &&
    now >= heading.at &&
    now - heading.at < 2500 &&
    heading.accuracy >= 2
  );
}

export function cityMatches(name: string, query: string) {
  const normalize = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f\u064b-\u065f\u0670]/g, '')
      .replace(/[أإآ]/g, 'ا')
      .toLowerCase()
      .trim();
  return (
    normalize(name).includes(normalize(query)) ||
    (name === 'بني ملال' &&
      normalize('beni mellal beni melal بني ملال').includes(normalize(query)))
  );
}

export function qiblaAligned(
  target: number,
  heading: number,
  wasAligned: boolean,
): boolean {
  const delta = Math.abs(((heading - target + 540) % 360) - 180);
  return delta <= (wasAligned ? 8 : 5);
}
