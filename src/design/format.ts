import {type DigitStyle} from '../repositories/models';

const numberingSystem = (style: DigitStyle) =>
  style === 'eastern' ? 'arab' : 'latn';

export const number = (
  value: number,
  options: Intl.NumberFormatOptions = {},
  locale = 'ar-MA',
  style: DigitStyle = 'western',
) =>
  new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
    ...options,
    numberingSystem: numberingSystem(style),
  }).format(value);
export const time = (
  date: Date,
  options: Intl.DateTimeFormatOptions = {},
  locale = 'ar-MA',
  style: DigitStyle = 'western',
) =>
  new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...options,
    numberingSystem: numberingSystem(style),
  }).format(date);
export function bytes(value: number, style: DigitStyle = 'western') {
  const units = ['B', 'KB', 'MB', 'GB'];
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${number(value, {maximumFractionDigits: unit ? 1 : 0}, 'ar-MA', style)} ${units[unit]}`;
}
// Use only for generated interface values, never source Quran text or IDs.
export const digits = (value: string, style: DigitStyle = 'western') =>
  style === 'eastern'
    ? value.replace(/[0-9]/g, digit => '٠١٢٣٤٥٦٧٨٩'[Number(digit)])
    : value;

export const normalizeDigits = (value: string) =>
  value.replace(/[٠-٩۰-۹]/g, digit =>
    String(digit.charCodeAt(0) - (digit >= '۰' ? 0x06f0 : 0x0660)),
  );

export const createFormatters = (style: DigitStyle) => ({
  number: (
    value: number,
    options: Intl.NumberFormatOptions = {},
    locale = 'ar-MA',
  ) => number(value, options, locale, style),
  time: (
    value: Date,
    options: Intl.DateTimeFormatOptions = {},
    locale = 'ar-MA',
  ) => time(value, options, locale, style),
  date: (
    value: Date,
    options: Intl.DateTimeFormatOptions = {},
    locale = 'ar-MA',
  ) =>
    new Intl.DateTimeFormat(locale, {
      ...options,
      numberingSystem: numberingSystem(style),
    }).format(value),
  bytes: (value: number) => bytes(value, style),
  digits: (value: string) => digits(value, style),
  duration: (seconds: number) => {
    const safe = Number.isFinite(seconds)
      ? Math.max(0, Math.floor(seconds))
      : 0;
    return digits(
      `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`,
      style,
    );
  },
});
export const ltr = (value: string) => `\u2066${value}\u2069`;
export const arabicPlural = (
  value: number,
  forms: Record<Intl.LDMLPluralRule, string>,
) => forms[new Intl.PluralRules('ar').select(value)];
