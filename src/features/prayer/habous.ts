import {type Timetable, events} from './domain';
import {nextDate} from './time';
export const sourceUrl = (id: string) =>
  `https://www.habous.gov.ma/prieres/index.php?ville=${id}`;
const months: Record<string, number> = {
  يناير: 1,
  فبراير: 2,
  مارس: 3,
  أبريل: 4,
  ابريل: 4,
  ماي: 5,
  يونيو: 6,
  يوليوز: 7,
  غشت: 8,
  شتنبر: 9,
  أكتوبر: 10,
  اكتوبر: 10,
  نونبر: 11,
  دجنبر: 12,
};
const plain = (s: string) =>
  s
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
export function parseHabous(
  html: string,
  cityId: string,
  now = Date.now(),
): Timetable {
  if (html.length > 256000 || !/^\d{1,3}$/.test(cityId))
    throw Error('invalid_timetable');
  const selected = html.match(
    /<option\b([^>]*\bselected\b[^>]*)>([^<]*)<\/option>/i,
  );
  if (
    !selected ||
    (!selected[1].includes(`ville=${cityId}'`) &&
      !selected[1].includes(`ville=${cityId}"`))
  )
    throw Error('wrong_city');
  const header = plain(html.slice(0, html.indexOf('<select'))).match(
    /(يناير|فبراير|مارس|أبريل|ابريل|ماي|يونيو|يوليوز|غشت|شتنبر|أكتوبر|اكتوبر|نونبر|دجنبر)\s*\/\s*(يناير|فبراير|مارس|أبريل|ابريل|ماي|يونيو|يوليوز|غشت|شتنبر|أكتوبر|اكتوبر|نونبر|دجنبر)\s+(20\d{2})/,
  );
  if (!header) throw Error('unknown_calendar_header');
  let month = months[header[1]],
    year = Number(header[3]),
    prevDay = 0,
    previous = '';
  const dates: Record<string, string[]> = {};
  const body = html.match(
    /<table\b[^>]*id=["']horaire["'][^>]*>([\s\S]*?)<\/table>/i,
  )?.[1];
  if (!body) throw Error('missing_table');
  for (const row of body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m =>
      plain(m[1]),
    );
    if (!cells.some(c => /^\d{1,2}$/.test(c))) continue;
    if (
      cells.length !== 9 ||
      !cells.slice(3).every(t => /^([01]\d|2[0-3]):[0-5]\d$/.test(t))
    )
      throw Error('invalid_timetable_row');
    const n = Number(cells[2]);
    if (!Number.isInteger(n) || n < 1 || n > 31) throw Error('invalid_date');
    if (prevDay && n < prevDay) {
      month++;
      if (month === 13) {
        month = 1;
        year++;
      }
      if (month !== months[header[2]]) throw Error('invalid_month');
    }
    const date = `${year}-${String(month).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
    nextDate(date, 0);
    if (previous && nextDate(previous) !== date)
      throw Error('nonconsecutive_timetable');
    const times = cells.slice(3);
    if (
      times.length !== events.length ||
      times.some((t, i) => i > 0 && t <= times[i - 1])
    )
      throw Error('unordered_times');
    dates[date] = times;
    previous = date;
    prevDay = n;
  }
  if (Object.keys(dates).length < 28 || Object.keys(dates).length > 31)
    throw Error('incomplete_timetable');
  return {cityId, sourceUrl: sourceUrl(cityId), retrievedAt: now, dates};
}
