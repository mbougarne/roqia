import {createContext} from 'react';

export type Mode = 'dark' | 'light';
export type Themes = typeof themes;
export type ContextState = {
  mode: Mode;
  toggleMode: () => void;
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

export const themeContext = createContext<ContextState>(initialContextState);
