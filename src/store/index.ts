import {createContext} from 'react';
import {palettes} from '../design/tokens';
import {type DigitStyle, type ThemePreference} from '../repositories/models';

import {adkarData, type DataProps, data, duaaData, tasbihatData} from '../data';

export type Mode = 'dark' | 'light';
export type Themes = typeof themes;
export type ContextState = {
  mode: Mode;
  uiScale: number;
  setUiScale: (scale: number) => Promise<void>;
  digitStyle: DigitStyle;
  setDigitStyle: (style: DigitStyle) => Promise<void>;
  toggleMode: () => void;
  preference: ThemePreference;
  setPreference: (mode: ThemePreference) => void;
};

export type RepeatCounts = Record<string, number>;

export type RepeatContextState = {
  repeatCounts: RepeatCounts;
  decrementRepeat: (key: string) => void;
  resetRepeats: (nextCounts: RepeatCounts) => void;
  resetAllRepeats: () => void;
};

const makeInitialRepeatContextState = (
  counts: RepeatCounts,
): RepeatContextState => ({
  repeatCounts: counts,
  decrementRepeat: () => undefined,
  resetRepeats: () => undefined,
  resetAllRepeats: () => undefined,
});

const legacyTheme = (p: typeof palettes.light) => ({
  bg: p.background,
  secondaryBg: p.surfaceMuted,
  activeBg: p.actionPrimary,
  color: p.textPrimary,
  secondaryColor: p.textOnAction,
  tertiaryColor: p.iconPrimary,
});
export const themes = {
  light: legacyTheme(palettes.light),
  dark: legacyTheme(palettes.dark),
};

const initialContextState: ContextState = {
  mode: 'light',
  uiScale: 1,
  setUiScale: async () => undefined,
  digitStyle: 'western',
  setDigitStyle: async () => undefined,
  preference: 'system',
  setPreference: () => undefined,
  toggleMode: () => undefined,
};

// Legacy arguments remain temporarily for existing callers; identity comes only from the explicit ID.
export const getRepeatItemKey = (
  item: Pick<DataProps, 'id'>,
  _index?: number,
  _scope?: string,
) => item.id;

export const createInitialRepeatCounts = (): RepeatCounts => {
  const homeCounts = createRepeatCountsForItems(data, 'data');
  const adkarCounts = createRepeatCountsForItems(adkarData, 'adkar');
  const duaaCounts = createRepeatCountsForItems(duaaData, 'duaa');
  const tasbihatCounts = createRepeatCountsForItems(tasbihatData, 'tasbihat');

  return {
    ...homeCounts,
    ...adkarCounts,
    ...duaaCounts,
    ...tasbihatCounts,
  };
};

export const createRepeatCountsForItems = (
  items: DataProps[],
  scope: string,
): RepeatCounts =>
  items.reduce<RepeatCounts>((acc, item, index) => {
    acc[getRepeatItemKey(item, index, scope)] = item.repeat ?? 0;
    return acc;
  }, {});

const initialRepeatContextState: RepeatContextState = {
  repeatCounts: createInitialRepeatCounts(),
  decrementRepeat: () => undefined,
  resetRepeats: () => undefined,
  resetAllRepeats: () => undefined,
};

export const themeContext = createContext<ContextState>(initialContextState);

/** @deprecated Use one of the scoped contexts instead */
export const repeatContext = createContext<RepeatContextState>(
  initialRepeatContextState,
);

export const homeRepeatContext = createContext<RepeatContextState>(
  makeInitialRepeatContextState(createRepeatCountsForItems(data, 'data')),
);
export const adkarRepeatContext = createContext<RepeatContextState>(
  makeInitialRepeatContextState(createRepeatCountsForItems(adkarData, 'adkar')),
);
export const duaaRepeatContext = createContext<RepeatContextState>(
  makeInitialRepeatContextState(createRepeatCountsForItems(duaaData, 'duaa')),
);
export const tasbihatRepeatContext = createContext<RepeatContextState>(
  makeInitialRepeatContextState(
    createRepeatCountsForItems(tasbihatData, 'tasbihat'),
  ),
);
