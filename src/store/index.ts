import {createContext} from 'react';

import {adkarData, type DataProps, data} from '../data';

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
  resetRepeats: (nextCounts: RepeatCounts) => void;
  resetAllRepeats: () => void;
};

export const themes = {
  dark: {
    bg: '#161A18',
    secondaryBg: '#202621',
    activeBg: '#234232',
    color: '#B8C3B6',
    secondaryColor: '#F5EFE6',
    tertiaryColor: '#8FBF9A',
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

export const getRepeatItemKey = (
  item: Pick<DataProps, 'audioFile' | 'caption' | 'category' | 'content'>,
  index: number,
  scope = 'default',
) =>
  [
    scope,
    item.category ?? 'NoCategory',
    item.caption ?? 'NoCaption',
    item.audioFile ?? 'NoAudio',
    item.content ?? String(index),
    String(index),
  ].join('::');

export const createInitialRepeatCounts = (): RepeatCounts => {
  const homeCounts = createRepeatCountsForItems(data, 'data');
  const adkarCounts = createRepeatCountsForItems(adkarData, 'adkar');

  return {
    ...homeCounts,
    ...adkarCounts,
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
export const repeatContext =
  createContext<RepeatContextState>(initialRepeatContextState);
