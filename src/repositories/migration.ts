import {defaultSettings} from './models';
import {clampCount, defaultCounts} from './content';
import legacyMap from './legacy-counter-map.json';

export const legacyKeys = [
  '@roqia/app-state',
  '@roqia/walkthrough-seen',
  '@roqia/intro-note-seen',
] as const;
export function prepareMigration(raw: Record<string, string | null>) {
  const input = raw[legacyKeys[0]];
  if (input && input.length > 2 * 1024 * 1024)
    throw new Error('legacy_state_too_large');
  const parsed = input ? JSON.parse(input) : {};
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    throw new Error('invalid_legacy_state');
  if (
    parsed.repeatCounts !== undefined &&
    (!parsed.repeatCounts ||
      typeof parsed.repeatCounts !== 'object' ||
      Array.isArray(parsed.repeatCounts))
  )
    throw new Error('invalid_legacy_counters');
  const settings = {...defaultSettings, updatedAt: Date.now()};
  if (parsed.mode === 'light' || parsed.mode === 'dark')
    settings.themePreference = parsed.mode;
  settings.onboardingVersion = raw[legacyKeys[1]] === '1' ? 1 : 0;
  settings.guidanceSeen = raw[legacyKeys[2]] === '1';
  const defaults = defaultCounts(),
    counts = {...defaults},
    seen = new Set<string>();
  const aliases: Record<string, string> = legacyMap;
  let unmappedCount = 0;
  for (const [key, value] of Object.entries(parsed.repeatCounts ?? {})) {
    const id = aliases[key];
    if (!id || counts[id] === undefined) {
      unmappedCount++;
      continue;
    }
    // Multiple proven aliases: keep the furthest progress; retain every raw value in backup.
    const remaining = clampCount(value, defaults[id]);
    counts[id] = seen.has(id) ? Math.min(counts[id], remaining) : remaining;
    seen.add(id);
  }
  const reminders = [
    ['adhkar-morning-0600', 'Morning', '06:00'],
    ['adhkar-night-1800', 'Night', '18:00'],
    ['adhkar-before-sleep-2230', 'BeforeSleep', '22:30'],
  ].map(([reminderId, category, localTimeHHmm]) => ({
    reminderId,
    category,
    localTimeHHmm,
    enabled: input !== null && input !== undefined,
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    soundId: 'default',
    zonePolicy: 'device' as const,
    updatedAt: Date.now(),
  }));
  return {settings, counts, reminders, unmappedCount};
}
