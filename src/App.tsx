import React, {useEffect, useState} from 'react';
import {ImageBackground, StyleSheet, useColorScheme} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';

import {MainTabNavigation} from './navigation/MainTabNavigation';
import {SplashScreen} from './screens';
import {initializeDailyReminders} from './services/notifications';
import {loadPersistedAppState, persistAppState} from './services/persistence';
import {
  createInitialRepeatCounts,
  type Mode,
  repeatContext,
  themeContext,
  themes,
} from './store';

const {Provider: ThemeProvider} = themeContext;
const {Provider: RepeatProvider} = repeatContext;

export default function App(): JSX.Element {
  const deviceColorScheme = useColorScheme();
  const defaultMode: Mode = deviceColorScheme === 'dark' ? 'dark' : 'light';
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [repeatCounts, setRepeatCounts] = useState(createInitialRepeatCounts);
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

      setRepeatCounts(persisted.repeatCounts);
      setIsStateHydrated(true);
    };

    hydrateState();
  }, []);

  useEffect(() => {
    if (!isStateHydrated) {
      return;
    }

    persistAppState(mode, repeatCounts);
  }, [isStateHydrated, mode, repeatCounts]);

  const toggleMode = () => {
    setMode(currentMode => (currentMode === 'dark' ? 'light' : 'dark'));
  };

  const decrementRepeat = (key: string) => {
    setRepeatCounts(currentCounts => ({
      ...currentCounts,
      [key]: Math.max(0, (currentCounts[key] ?? 0) - 1),
    }));
  };

  const resetRepeats = (nextCounts: Record<string, number>) => {
    setRepeatCounts(currentCounts => ({
      ...currentCounts,
      ...nextCounts,
    }));
  };

  const resetAllRepeats = () => {
    setRepeatCounts(createInitialRepeatCounts());
  };

  return (
    <SafeAreaProvider>
      <ThemeProvider value={{mode, toggleMode}}>
        <RepeatProvider value={{repeatCounts, decrementRepeat, resetRepeats, resetAllRepeats}}>
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
        </RepeatProvider>
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
