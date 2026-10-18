import {type DataProps} from '../../data';
export const groupLabels = {
  ruqya: 'الرقية',
  adhkar: 'الأذكار',
  dua: 'الأدعية',
  tasbih: 'التسبيح',
};
export type DevotionalGroup = keyof typeof groupLabels;
export const groupOf = (id: string) => id.split('.')[1] as DevotionalGroup;
// Normalize only the search index, never the displayed or copied canonical text.
export const searchKey = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u064b-\u065f\u0670\u0640\u0300-\u036f]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .toLocaleLowerCase()
    .trim();
export function matches(
  item: DataProps,
  query: string,
  group: DevotionalGroup | 'all',
) {
  return (
    (group === 'all' || groupOf(item.id) === group) &&
    searchKey(
      [item.caption, item.content, item.note].filter(Boolean).join(' '),
    ).includes(searchKey(query))
  );
}
export function itemTitle(item: DataProps) {
  const text =
    item.content?.trim().replace(/\s+/g, ' ') ||
    item.caption ||
    groupLabels[groupOf(item.id)];
  return text.length > 100 ? text.slice(0, 100) + '…' : text;
}
