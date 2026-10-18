import {type Reminder} from '../../../repositories/models';
export const reminderDefaults: Reminder[] = [
  ['adhkar-morning-0600', 'Morning', '06:00'],
  ['adhkar-night-1800', 'Night', '18:00'],
  ['adhkar-before-sleep-2230', 'BeforeSleep', '22:30'],
].map(([reminderId, category, localTimeHHmm]) => ({
  reminderId,
  category,
  localTimeHHmm,
  enabled: false,
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  soundId: 'default',
  zonePolicy: 'device',
  updatedAt: 0,
}));
export const reminderLabels: Record<string, string> = {
  Morning: 'أذكار الصباح',
  Night: 'أذكار المساء',
  BeforeSleep: 'أذكار قبل النوم',
};
export const reminderLinks: Record<string, string> = {
  Morning: 'roqia://adkar/morning',
  Night: 'roqia://adkar/night',
  BeforeSleep: 'roqia://adkar/before-sleep',
};
export const reminderPrefix = 'roqia-reminder:';
export const isOwnedReminder = (id: string) =>
  id.startsWith(reminderPrefix) ||
  reminderDefaults.some(r => r.reminderId === id);
export function validateReminders(rows: Reminder[]) {
  if (
    rows.length !== reminderDefaults.length ||
    new Set(rows.map(r => r.reminderId)).size !== rows.length
  )
    throw new Error('invalid_reminders');
  for (const r of rows) {
    const original = reminderDefaults.find(d => d.reminderId === r.reminderId);
    if (
      !original ||
      original.category !== r.category ||
      typeof r.enabled !== 'boolean' ||
      !/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(r.localTimeHHmm) ||
      !Array.isArray(r.weekdays) ||
      !r.weekdays.length ||
      r.weekdays.some(d => !Number.isInteger(d) || d < 0 || d > 6) ||
      new Set(r.weekdays).size !== r.weekdays.length ||
      r.soundId !== 'default' ||
      r.zonePolicy !== 'device'
    )
      throw new Error('invalid_reminder');
  }
}
export function reminderPlan(rows: Reminder[], now = new Date()) {
  validateReminders(rows);
  return rows
    .filter(r => r.enabled)
    .flatMap(r =>
      r.weekdays.map(day => {
        const [hour, minute] = r.localTimeHHmm.split(':').map(Number);
        const next = new Date(now);
        next.setDate(next.getDate() + ((day - next.getDay() + 7) % 7));
        next.setHours(hour, minute, 0, 0);
        if (next.getTime() <= now.getTime()) {
          next.setDate(next.getDate() + 7);
          next.setHours(hour, minute, 0, 0);
        }
        return {
          id: `${reminderPrefix}${r.reminderId}:${day}`,
          timestamp: next.getTime(),
          category: r.category,
        };
      }),
    );
}
export function reminderSignature(rows: Reminder[], now = new Date()) {
  return JSON.stringify([
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    now.getTimezoneOffset(),
    rows.map(r => [
      r.reminderId,
      r.enabled,
      r.localTimeHHmm,
      [...r.weekdays].sort(),
      r.soundId,
    ]),
  ]);
}
