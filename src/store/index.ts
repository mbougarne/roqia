import {createContext} from 'react';

import {data} from '../data';

export type Mode = 'dark' | 'light';
export type Themes = typeof themes;
export type ContextState = {
  mode: Mode;
  toggleMode: () => void;
};

export type RepeatCounts = Record<string, number>;

export type RepeatContextState = {
  repeatCounts: RepeatCounts;
  decrementRepeat: (key: string) => void;
};

export const themes = {
  dark: {
    bg: '#222',
    secondaryBg: '#282828',
    activeBg: '#353535',
    color: '#F5EFE6',
    secondaryColor: '#F5EFE6',
    tertiaryColor: '#F5EFE6',
  },
  light: {
    bg: '#fff',
    secondaryBg: '#E8DFCA',
    activeBg: '#1A4D2E',
    color: '#17202A',
    secondaryColor: '#F5EFE6',
    tertiaryColor: '#1A4D2E',
  },
};

const initialContextState: ContextState = {
  mode: 'light',
  toggleMode: () => undefined,
};

export const getRepeatItemKey = (content?: string, index?: number) =>
  content ?? String(index);

export const createInitialRepeatCounts = (): RepeatCounts =>
  data.reduce<RepeatCounts>((acc, item, index) => {
    acc[getRepeatItemKey(item.content, index)] = item.repeat ?? 0;
    return acc;
  }, {});

const initialRepeatContextState: RepeatContextState = {
  repeatCounts: createInitialRepeatCounts(),
  decrementRepeat: () => undefined,
};

export const themeContext = createContext<ContextState>(initialContextState);
export const repeatContext =
  createContext<RepeatContextState>(initialRepeatContextState);
