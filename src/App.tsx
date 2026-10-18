import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ImageBackground,
  StatusBar,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';

import {IntroNoteModal, WalkthroughModal} from './components';
import {MainTabNavigation} from './navigation/MainTabNavigation';
import {SplashScreen} from './screens';
import {StateView} from './design/ui';
import {startDownloadServices} from './features/downloads/native';
import {contentGroups} from './repositories/content';
import {type ThemePreference} from './repositories/models';
import {
  loadIntroNoteSeen,
  loadPersistedAppState,
  loadWalkthroughSeen,
  persistIntroNoteSeen,
  persistAppState,
  persistWalkthroughSeen,
} from './services/persistence';
import {adkarData, data, duaaData, tasbihatData} from './data';
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
  Object.fromEntries(
    contentGroups[scope as keyof typeof contentGroups]
      .filter(item => flat[item.id] !== undefined)
      .map(item => [item.id, flat[item.id]]),
  );

export default function App() {
  const deviceColorScheme = useColorScheme();
  const defaultMode: Mode = deviceColorScheme === 'dark' ? 'dark' : 'light';
  const [preference, setPreference] = useState<ThemePreference>('system');
  const mode = preference === 'system' ? defaultMode : preference;
  const [storageError, setStorageError] = useState(false);
  const [hydrationAttempt, setHydrationAttempt] = useState(0);
  const [homeCounts, setHomeCounts] = useState(() =>
    createRepeatCountsForItems(data, 'data'),
  );
  const [adkarCounts, setAdkarCounts] = useState(() =>
    createRepeatCountsForItems(adkarData, 'adkar'),
  );
  const [duaaCounts, setDuaaCounts] = useState(() =>
    createRepeatCountsForItems(duaaData, 'duaa'),
  );
  const [tasbihatCounts, setTasbihatCounts] = useState(() =>
    createRepeatCountsForItems(tasbihatData, 'tasbihat'),
  );
  const [isStateHydrated, setIsStateHydrated] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [showIntroNote, setShowIntroNote] = useState(false);
  const [introNoteSeen, setIntroNoteSeen] = useState(false);
  const theme = themes[mode];
  const statusBarStyle = mode === 'dark' ? 'light-content' : 'dark-content';

  useEffect(() => {
    const hydrateState = async () => {
      const [persisted, walkthroughSeen, loadedIntroNoteSeen] =
        await Promise.all([
          loadPersistedAppState(),
          loadWalkthroughSeen(),
          loadIntroNoteSeen(),
        ]);

      if (persisted.mode) {
        setPreference(persisted.mode);
      }

      const flat = persisted.repeatCounts;
      setHomeCounts(prev => ({...prev, ...splitCountsByScope(flat, 'data')}));
      setAdkarCounts(prev => ({...prev, ...splitCountsByScope(flat, 'adkar')}));
      setDuaaCounts(prev => ({...prev, ...splitCountsByScope(flat, 'duaa')}));
      setTasbihatCounts(prev => ({
        ...prev,
        ...splitCountsByScope(flat, 'tasbihat'),
      }));
      setIntroNoteSeen(loadedIntroNoteSeen);
      setShowWalkthrough(!walkthroughSeen);
      setShowIntroNote(walkthroughSeen && !loadedIntroNoteSeen);
      setIsStateHydrated(true);
      void startDownloadServices().catch(() => undefined);
    };

    setStorageError(false);
    void hydrateState().catch(() => setStorageError(true));
  }, [hydrationAttempt]);

  useEffect(() => {
    if (!isStateHydrated) {
      return;
    }

    const allCounts = {
      ...homeCounts,
      ...adkarCounts,
      ...duaaCounts,
      ...tasbihatCounts,
    };
    void persistAppState(preference, allCounts).catch(() =>
      setStorageError(true),
    );
  }, [
    isStateHydrated,
    preference,
    homeCounts,
    adkarCounts,
    duaaCounts,
    tasbihatCounts,
  ]);

  const toggleMode = useCallback(() => {
    setPreference(mode === 'dark' ? 'light' : 'dark');
  }, [mode]);

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

  const themeValue = useMemo(
    () => ({mode, toggleMode, preference, setPreference}),
    [mode, toggleMode, preference],
  );

  const homeValue = useMemo(
    () => ({
      repeatCounts: homeCounts,
      decrementRepeat: decrementHome,
      resetRepeats: resetHome,
      resetAllRepeats,
    }),
    [homeCounts, decrementHome, resetHome, resetAllRepeats],
  );

  const adkarValue = useMemo(
    () => ({
      repeatCounts: adkarCounts,
      decrementRepeat: decrementAdkar,
      resetRepeats: resetAdkar,
      resetAllRepeats,
    }),
    [adkarCounts, decrementAdkar, resetAdkar, resetAllRepeats],
  );

  const duaaValue = useMemo(
    () => ({
      repeatCounts: duaaCounts,
      decrementRepeat: decrementDuaa,
      resetRepeats: resetDuaa,
      resetAllRepeats,
    }),
    [duaaCounts, decrementDuaa, resetDuaa, resetAllRepeats],
  );

  const tasbihatValue = useMemo(
    () => ({
      repeatCounts: tasbihatCounts,
      decrementRepeat: decrementTasbihat,
      resetRepeats: resetTasbihat,
      resetAllRepeats,
    }),
    [tasbihatCounts, decrementTasbihat, resetTasbihat, resetAllRepeats],
  );

  const onWalkthroughFinish = useCallback(() => {
    void persistWalkthroughSeen()
      .then(() => {
        setShowWalkthrough(false);
        if (!introNoteSeen) setShowIntroNote(true);
      })
      .catch(() => setStorageError(true));
  }, [introNoteSeen]);

  const onIntroNoteClose = useCallback(() => {
    void persistIntroNoteSeen()
      .then(() => {
        setShowIntroNote(false);
        setIntroNoteSeen(true);
      })
      .catch(() => setStorageError(true));
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider value={themeValue}>
        <HomeRepeatProvider value={homeValue}>
          <AdkarRepeatProvider value={adkarValue}>
            <DuaaRepeatProvider value={duaaValue}>
              <TasbihatRepeatProvider value={tasbihatValue}>
                <StatusBar
                  animated
                  barStyle={statusBarStyle}
                  translucent={false}
                />
                <ImageBackground
                  source={require('./assets/images/arabesque.png')}
                  style={[
                    styles.backgroundContainer,
                    {backgroundColor: theme.secondaryBg},
                  ]}
                  imageStyle={styles.backgroundStyle}>
                  <SafeAreaView style={styles.safeArea}>
                    {storageError ? (
                      <View
                        style={{
                          flex: 1,
                          justifyContent: 'center',
                          padding: 20,
                        }}>
                        <StateView
                          title="تعذر حفظ أو استرجاع بياناتك"
                          description="بياناتك السابقة محفوظة. أعد المحاولة للمتابعة بأمان."
                          action={{
                            label: 'إعادة المحاولة',
                            onPress: () => {
                              if (isStateHydrated) {
                                void persistAppState(preference, {
                                  ...homeCounts,
                                  ...adkarCounts,
                                  ...duaaCounts,
                                  ...tasbihatCounts,
                                })
                                  .then(() => setStorageError(false))
                                  .catch(() => setStorageError(true));
                              } else setHydrationAttempt(n => n + 1);
                            },
                          }}
                        />
                      </View>
                    ) : showSplash || !isStateHydrated ? (
                      <SplashScreen onFinish={() => setShowSplash(false)} />
                    ) : !showWalkthrough && !showIntroNote ? (
                      <MainTabNavigation />
                    ) : (
                      <View style={{flex: 1}} />
                    )}
                    <WalkthroughModal
                      onFinish={onWalkthroughFinish}
                      visible={
                        isStateHydrated &&
                        !storageError &&
                        !showSplash &&
                        showWalkthrough
                      }
                    />
                    <IntroNoteModal
                      onClose={onIntroNoteClose}
                      visible={
                        isStateHydrated &&
                        !storageError &&
                        !showSplash &&
                        !showWalkthrough &&
                        showIntroNote
                      }
                    />
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
