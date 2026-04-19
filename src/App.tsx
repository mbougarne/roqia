import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ImageBackground, StyleSheet, useColorScheme} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';

import {MainTabNavigation} from './navigation/MainTabNavigation';
import {SplashScreen} from './screens';
import {initializeDailyReminders} from './services/notifications';
import {loadPersistedAppState, persistAppState} from './services/persistence';
import {
  adkarData,
  data,
  duaaData,
  tasbihatData,
} from './data';
import {
  createRepeatCountsForItems,
  type Mode,
  type RepeatCounts,
  adkarRepeatContext,
  duaaRepeatContext,
  homeRepeatContext,
  tasbihatRepeatContext,
  themeContext,
  themes,
} from './store';

const {Provider: ThemeProvider} = themeContext;
const {Provider: HomeRepeatProvider} = homeRepeatContext;
const {Provider: AdkarRepeatProvider} = adkarRepeatContext;
const {Provider: DuaaRepeatProvider} = duaaRepeatContext;
const {Provider: TasbihatRepeatProvider} = tasbihatRepeatContext;

const splitCountsByScope = (flat: RepeatCounts, scope: string): RepeatCounts =>
  Object.fromEntries(Object.entries(flat).filter(([k]) => k.startsWith(scope + '::')));

export default function App(): JSX.Element {
  const deviceColorScheme = useColorScheme();
  const defaultMode: Mode = deviceColorScheme === 'dark' ? 'dark' : 'light';
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [homeCounts, setHomeCounts] = useState(() => createRepeatCountsForItems(data, 'data'));
  const [adkarCounts, setAdkarCounts] = useState(() => createRepeatCountsForItems(adkarData, 'adkar'));
  const [duaaCounts, setDuaaCounts] = useState(() => createRepeatCountsForItems(duaaData, 'duaa'));
  const [tasbihatCounts, setTasbihatCounts] = useState(() => createRepeatCountsForItems(tasbihatData, 'tasbihat'));
  const [isStateHydrated, setIsStateHydrated] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const theme = themes[mode];

  useEffect(() => {
    initializeDailyReminders();
  }, []);

  useEffect(() => {
    const hydrateState = async () => {
      const persisted = await loadPersistedAppState();

      if (persisted.mode) {
        setMode(persisted.mode);
      }

      const flat = persisted.repeatCounts;
      setHomeCounts(prev => ({...prev, ...splitCountsByScope(flat, 'data')}));
      setAdkarCounts(prev => ({...prev, ...splitCountsByScope(flat, 'adkar')}));
      setDuaaCounts(prev => ({...prev, ...splitCountsByScope(flat, 'duaa')}));
      setTasbihatCounts(prev => ({...prev, ...splitCountsByScope(flat, 'tasbihat')}));
      setIsStateHydrated(true);
    };

    hydrateState();
  }, []);

  useEffect(() => {
    if (!isStateHydrated) {
      return;
    }

    const allCounts = {...homeCounts, ...adkarCounts, ...duaaCounts, ...tasbihatCounts};
    persistAppState(mode, allCounts);
  }, [isStateHydrated, mode, homeCounts, adkarCounts, duaaCounts, tasbihatCounts]);

  const toggleMode = useCallback(() => {
    setMode(currentMode => (currentMode === 'dark' ? 'light' : 'dark'));
  }, []);

  const resetAllRepeats = useCallback(() => {
    setHomeCounts(createRepeatCountsForItems(data, 'data'));
    setAdkarCounts(createRepeatCountsForItems(adkarData, 'adkar'));
    setDuaaCounts(createRepeatCountsForItems(duaaData, 'duaa'));
    setTasbihatCounts(createRepeatCountsForItems(tasbihatData, 'tasbihat'));
  }, []);

  const decrementHome = useCallback((key: string) => {
    setHomeCounts(c => ({...c, [key]: Math.max(0, (c[key] ?? 0) - 1)}));
  }, []);
  const resetHome = useCallback((next: RepeatCounts) => {
    setHomeCounts(c => ({...c, ...next}));
  }, []);

  const decrementAdkar = useCallback((key: string) => {
    setAdkarCounts(c => ({...c, [key]: Math.max(0, (c[key] ?? 0) - 1)}));
  }, []);
  const resetAdkar = useCallback((next: RepeatCounts) => {
    setAdkarCounts(c => ({...c, ...next}));
  }, []);

  const decrementDuaa = useCallback((key: string) => {
    setDuaaCounts(c => ({...c, [key]: Math.max(0, (c[key] ?? 0) - 1)}));
  }, []);
  const resetDuaa = useCallback((next: RepeatCounts) => {
    setDuaaCounts(c => ({...c, ...next}));
  }, []);

  const decrementTasbihat = useCallback((key: string) => {
    setTasbihatCounts(c => ({...c, [key]: Math.max(0, (c[key] ?? 0) - 1)}));
  }, []);
  const resetTasbihat = useCallback((next: RepeatCounts) => {
    setTasbihatCounts(c => ({...c, ...next}));
  }, []);

  const themeValue = useMemo(() => ({mode, toggleMode}), [mode, toggleMode]);

  const homeValue = useMemo(() => ({
    repeatCounts: homeCounts,
    decrementRepeat: decrementHome,
    resetRepeats: resetHome,
    resetAllRepeats,
  }), [homeCounts, decrementHome, resetHome, resetAllRepeats]);

  const adkarValue = useMemo(() => ({
    repeatCounts: adkarCounts,
    decrementRepeat: decrementAdkar,
    resetRepeats: resetAdkar,
    resetAllRepeats,
  }), [adkarCounts, decrementAdkar, resetAdkar, resetAllRepeats]);

  const duaaValue = useMemo(() => ({
    repeatCounts: duaaCounts,
    decrementRepeat: decrementDuaa,
    resetRepeats: resetDuaa,
    resetAllRepeats,
  }), [duaaCounts, decrementDuaa, resetDuaa, resetAllRepeats]);

  const tasbihatValue = useMemo(() => ({
    repeatCounts: tasbihatCounts,
    decrementRepeat: decrementTasbihat,
    resetRepeats: resetTasbihat,
    resetAllRepeats,
  }), [tasbihatCounts, decrementTasbihat, resetTasbihat, resetAllRepeats]);

  return (
    <SafeAreaProvider>
      <ThemeProvider value={themeValue}>
        <HomeRepeatProvider value={homeValue}>
          <AdkarRepeatProvider value={adkarValue}>
            <DuaaRepeatProvider value={duaaValue}>
              <TasbihatRepeatProvider value={tasbihatValue}>
                <ImageBackground
                  source={require('./assets/images/arabesque.png')}
                  style={[styles.backgroundContainer, {backgroundColor: theme.secondaryBg}]}
                  imageStyle={styles.backgroundStyle}>
                  <SafeAreaView
                    style={styles.safeArea}>
                    {showSplash ? (
                      <SplashScreen onFinish={() => setShowSplash(false)} />
                    ) : (
                      <MainTabNavigation />
                    )}
                  </SafeAreaView>
                </ImageBackground>
              </TasbihatRepeatProvider>
            </DuaaRepeatProvider>
          </AdkarRepeatProvider>
        </HomeRepeatProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backgroundContainer: {
    flex: 1,
  },
  backgroundStyle: {
    resizeMode: 'repeat',
  },
});
