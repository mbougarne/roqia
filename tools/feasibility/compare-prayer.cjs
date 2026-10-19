// Keep the source's printed clock and calculated UTC/local clocks separate.
const {calculate} = require('./prayer.cjs');
const fixtures = require('./fixtures/habous-samples.json');

const minutes = clock =>
  Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3, 5));
const results = fixtures.map(source => {
  const calculated = calculate({
    ...source,
    timeZone: 'Africa/Casablanca',
    research: true,
  });
  return {
    ...source,
    profileStatus: calculated.profileStatus,
    events: calculated.events.map(event => ({
      name: event.name,
      printed: source.printedTimes[event.name],
      calculatedLocal: event.local,
      calculatedUTC: event.rawUtc.slice(11, 16),
      localMinusPrintedMinutes:
        minutes(event.local) - minutes(source.printedTimes[event.name]),
      utcMinusPrintedMinutes:
        minutes(event.rawUtc.slice(11, 16)) -
        minutes(source.printedTimes[event.name]),
    })),
  };
});
console.log(
  JSON.stringify(
    {
      decision: 'unapproved',
      reason:
        'Official method parameters and seasonal residuals need review. Current source clocks agree with tzdb 2026c UTC basis; stale Android time-zone data must be handled.',
      runtime: {
        node: process.version,
        icu: process.versions.icu,
        tz: process.versions.tz,
      },
      samples: results,
    },
    null,
    2,
  ),
);
