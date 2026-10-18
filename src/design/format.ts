export const number = (
  value: number,
  options: Intl.NumberFormatOptions = {},
  locale = 'ar-MA',
) =>
  new Intl.NumberFormat(`${locale}-u-nu-latn`, {
    maximumFractionDigits: 0,
    ...options,
    numberingSystem: 'latn',
  }).format(value);
export const time = (
  date: Date,
  options: Intl.DateTimeFormatOptions = {},
  locale = 'ar-MA',
) =>
  new Intl.DateTimeFormat(`${locale}-u-nu-latn`, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...options,
    numberingSystem: 'latn',
  }).format(date);
export function bytes(value: number) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${number(value, {maximumFractionDigits: unit ? 1 : 0})} ${units[unit]}`;
}
export const ltr = (value: string) => `\u2066${value}\u2069`;
export const arabicPlural = (
  value: number,
  forms: Record<Intl.LDMLPluralRule, string>,
) => forms[new Intl.PluralRules('ar').select(value)];
