// Research harness only. No Morocco profile is approved for production by this spike.
const {CalculationMethod, Coordinates, Madhab, PrayerTimes} = require('adhan');
const {checkMoroccoTimeZoneData} = require('./timezone.cjs');

const PRAYERS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
const candidate = Object.freeze({
  id: 'morocco-research-19-17',
  status: 'unverified',
  fajrAngle: 19,
  ishaAngle: 17,
  provenance:
    'Research hypothesis only; authoritative parameter and seasonal validation pending.',
});

function civilParts(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw Error('Expected a civil YYYY-MM-DD date');
  const [y, m, d] = date.split('-').map(Number);
  if (
    y < 1900 ||
    y > 2100 ||
    new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10) !== date
  )
    throw Error('Invalid civil date');
  return [y, m, d];
}

function nextCivilDate(date) {
  const [y, m, d] = civilParts(date);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

function calculate({
  date,
  latitude,
  longitude,
  timeZone,
  offsets = {},
  profile = candidate,
  research = false,
}) {
  if (profile.status !== 'approved' && !research)
    throw Error('Unverified profile is research-only');
  if (
    !Number.isFinite(latitude) ||
    Math.abs(latitude) > 90 ||
    !Number.isFinite(longitude) ||
    Math.abs(longitude) > 180
  )
    throw Error('Invalid coordinates');
  for (const [key, value] of Object.entries(offsets)) {
    if (
      !PRAYERS.includes(key) ||
      !Number.isInteger(value) ||
      Math.abs(value) > 60
    )
      throw Error('Invalid minute adjustment');
  }
  if (timeZone === 'Africa/Casablanca' && !checkMoroccoTimeZoneData().supported)
    throw Error(
      'Stale Morocco time-zone rules; use reviewed bundled tzdata before calculating local times',
    );
  const formatter = new Intl.DateTimeFormat('en-GB-u-nu-latn', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const [y, m, d] = civilParts(date);
  const parameters = CalculationMethod.Other();
  parameters.fajrAngle = profile.fajrAngle;
  parameters.ishaAngle = profile.ishaAngle;
  parameters.madhab = Madhab.Shafi;
  // Adhan consumes local date components, not the input Date's instant.
  const times = new PrayerTimes(
    new Coordinates(latitude, longitude),
    new Date(y, m - 1, d, 12),
    parameters,
  );
  return {
    date,
    timeZone,
    profileId: profile.id,
    profileStatus: profile.status,
    events: PRAYERS.map(name => {
      const raw = times[name].getTime();
      if (!Number.isFinite(raw))
        return {name, status: 'unavailable', utc: null, local: null};
      const adjusted = raw + (offsets[name] || 0) * 60000;
      return {
        name,
        status: 'calculated',
        rawUtc: new Date(raw).toISOString(),
        utc: new Date(adjusted).toISOString(),
        local: formatter.format(adjusted),
      };
    }),
  };
}

function nextPrayer(input, now) {
  const instant = new Date(now).getTime();
  if (!Number.isFinite(instant)) throw Error('Invalid current instant');
  return (
    [input.date, nextCivilDate(input.date)]
      .flatMap(date => calculate({...input, date}).events)
      .filter(e => e.name !== 'sunrise' && e.utc && Date.parse(e.utc) > instant)
      .sort((a, b) => Date.parse(a.utc) - Date.parse(b.utc))[0] || null
  );
}
module.exports = {calculate, nextCivilDate, nextPrayer, candidate, PRAYERS};
if (require.main === module) {
  console.log(
    JSON.stringify(
      calculate({
        date: process.argv[2] || '2026-10-18',
        latitude: 33.5731,
        longitude: -7.5898,
        timeZone: 'Africa/Casablanca',
        research: true,
      }),
      null,
      2,
    ),
  );
}
