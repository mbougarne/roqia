import {data, adkarData, duaaData, tasbihatData} from '../data';
export const contentGroups = {
  data,
  adkar: adkarData,
  duaa: duaaData,
  tasbihat: tasbihatData,
};
export const contentItems = Object.values(contentGroups).flat();
export const contentById = new Map(contentItems.map(item => [item.id, item]));
export const defaultCounts = () =>
  Object.fromEntries(contentItems.map(item => [item.id, item.repeat ?? 0]));
export function clampCount(value: unknown, maximum: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(maximum, Math.floor(value)))
    : maximum;
}
