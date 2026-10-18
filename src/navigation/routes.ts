import {type NavigatorScreenParams} from '@react-navigation/native';
export type Tabs = {
  Home: undefined;
  Adkar: undefined;
  Quran: undefined;
  Prayer: undefined;
  More: undefined;
};
export type RootRoutes = {
  MainTabs: NavigatorScreenParams<Tabs> | undefined;
  Morning: undefined;
  Night: undefined;
  BeforeSleep: undefined;
  Duaa: undefined;
  Tasbihat: undefined;
  About: undefined;
  Settings: undefined;
  Storage: undefined;
  Downloads: undefined;
  Player: undefined;
  Recovery: {reason: 'invalid-link' | 'missing-pack'};
};
export type LinkTarget =
  | {tab: keyof Tabs}
  | {screen: Exclude<keyof RootRoutes, 'MainTabs' | 'Recovery'>}
  | {recovery: 'invalid-link' | 'missing-pack'};
export function resolveLink(url: string): LinkTarget {
  if (!url.startsWith('roqia://') || url.length > 2048)
    return {recovery: 'invalid-link'};
  const path = url.slice(8).replace(/\/$/, '');
  const aliases: Record<string, LinkTarget> = {
    home: {tab: 'Home'},
    ruqya: {tab: 'Home'},
    adkar: {tab: 'Adkar'},
    adhkar: {tab: 'Adkar'},
    'adkar/morning': {screen: 'Morning'},
    'adhkar/morning': {screen: 'Morning'},
    'adkar/night': {screen: 'Night'},
    'adhkar/evening': {screen: 'Night'},
    'adkar/before-sleep': {screen: 'BeforeSleep'},
    'adhkar/before-sleep': {screen: 'BeforeSleep'},
    duaa: {screen: 'Duaa'},
    dua: {screen: 'Duaa'},
    tasbihat: {screen: 'Tasbihat'},
    tasbih: {screen: 'Tasbihat'},
    about: {screen: 'About'},
    more: {tab: 'More'},
    quran: {tab: 'Quran'},
    prayer: {tab: 'Prayer'},
    settings: {screen: 'Settings'},
    storage: {screen: 'Storage'},
    downloads: {screen: 'Downloads'},
    player: {screen: 'Player'},
  };
  if (aliases[path]) return aliases[path];
  if (/^quran\/[a-z0-9-]+\/[1-9][0-9]{0,2}(\/[1-9][0-9]{0,2})?$/.test(path))
    return {recovery: 'missing-pack'};
  return {recovery: 'invalid-link'};
}
