import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  StatusBar,
  NativeModules,
  Alert,
  AppState,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';

import {adkarData, data, duaaData, tasbihatData} from './data';
import {StateView} from './design/ui';
import {ResetConfirmationProvider} from './features/devotional/ResetConfirmation';
import {onPrayerTimeChanged} from './features/prayer/native';
import {reconcilePrayer} from './features/prayer/service';
import {useQuran} from './features/quran/context';
import {reconcileReminders} from './features/settings/reminders/service';
import {MainTabNavigation} from './navigation/MainTabNavigation';
import {contentGroups, defaultCounts} from './repositories/content';
import {decrementCounter, resetCounters} from './repositories/counters';
import {type DigitStyle, type ThemePreference} from './repositories/models';
import {Guide, Guidance, HydrationScreen} from './screens/EducationScreens';
import {
  getSettings,
  updateSettings,
  loadIntroNoteSeen,
  loadPersistedAppState,
  loadWalkthroughSeen,
  persistIntroNoteSeen,
  persistWalkthroughSeen,
} from './services/persistence';
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
  const quranRuntime = useQuran();
  const deviceColorScheme = useColorScheme();
  const defaultMode: Mode = deviceColorScheme === 'dark' ? 'dark' : 'light';
  const [uiScale, setScale] = useState(1);
  const [digitStyle, setDigits] = useState<DigitStyle>('western');
  const setDigitStyle = useCallback(async (style: DigitStyle) => {
    await updateSettings({digitStyle: style});
    setDigits((await getSettings()).digitStyle);
  }, []);
  const setUiScale = useCallback(async (scale: number) => {
    await updateSettings({uiScale: scale});
    setScale((await getSettings()).uiScale);
  }, []);
  const [preference, setPreference] = useState<ThemePreference>(
    NativeModules.RoqiaAppearance?.initialPreference ?? 'system',
  );
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
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [showIntroNote, setShowIntroNote] = useState(false);
  const [introNoteSeen, setIntroNoteSeen] = useState(false);
  const theme = themes[mode];
  const statusBarStyle = mode === 'dark' ? 'light-content' : 'dark-content';

  useEffect(() => {
    const hydrateState = async () => {
      const [persisted, walkthroughSeen, loadedIntroNoteSeen, settings] =
        await Promise.all([
          loadPersistedAppState(),
          loadWalkthroughSeen(),
          loadIntroNoteSeen(),
          getSettings(),
        ]);

      if (persisted.mode) {
        setPreference(persisted.mode);
      }

      setScale(settings.uiScale);
      setDigits(settings.digitStyle);
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
      void quranRuntime.initialize().catch(() => undefined);
    };

    setStorageError(false);
    void hydrateState().catch(() => setStorageError(true));
  }, [hydrationAttempt, quranRuntime]);

  useEffect(() => {
    if (!isStateHydrated) return;
    void updateSettings({themePreference: preference})
      .then(() => getSettings())
      .then(settings =>
        NativeModules.RoqiaAppearance?.sync(settings.themePreference),
      )
      .catch(() => setStorageError(true));
  }, [isStateHydrated, preference]);

  useEffect(() => {
    if (!isStateHydrated) return;
    // No permission request here. Retry saved schedules after restart/zone changes.
    const reconcile = () => {
      void reconcileReminders()
        .catch(() => undefined)
        .then(() => reconcilePrayer())
        .catch(() => undefined);
    };
    reconcile();
    const removeTimeListener = onPrayerTimeChanged(reconcile);
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') reconcile();
    });
    return () => {
      sub.remove();
      removeTimeListener();
    };
  }, [isStateHydrated]);

  const toggleMode = useCallback(() => {
    setPreference(mode === 'dark' ? 'light' : 'dark');
  }, [mode]);

  const counterCommand = useCallback((operation: () => Promise<void>) => {
    const run = () => {
      void operation().catch(() =>
        Alert.alert(
          'تعذر حفظ التقدم',
          'لم يتم حفظ هذا التغيير. أعد المحاولة لحفظ تقدمك على جهازك.',
          [
            {text: 'إلغاء', style: 'cancel'},
            {text: 'إعادة المحاولة', onPress: run},
          ],
        ),
      );
    };
    run();
  }, []);
  const resetAllRepeats = useCallback(
    () =>
      counterCommand(async () => {
        const counts = await resetCounters(defaultCounts());
        setHomeCounts(splitCountsByScope(counts, 'data'));
        setAdkarCounts(splitCountsByScope(counts, 'adkar'));
        setDuaaCounts(splitCountsByScope(counts, 'duaa'));
        setTasbihatCounts(splitCountsByScope(counts, 'tasbihat'));
      }),
    [counterCommand],
  );

  const decrementHome = useCallback(
    (key: string) =>
      counterCommand(async () => {
        const remaining = await decrementCounter(key);
        setHomeCounts(counts => ({...counts, [key]: remaining}));
      }),
    [counterCommand],
  );
  const resetHome = useCallback(
    (next: RepeatCounts) =>
      counterCommand(async () => {
        const saved = await resetCounters(next);
        setHomeCounts(counts => ({...counts, ...saved}));
      }),
    [counterCommand],
  );

  const decrementAdkar = useCallback(
    (key: string) =>
      counterCommand(async () => {
        const remaining = await decrementCounter(key);
        setAdkarCounts(counts => ({...counts, [key]: remaining}));
      }),
    [counterCommand],
  );
  const resetAdkar = useCallback(
    (next: RepeatCounts) =>
      counterCommand(async () => {
        const saved = await resetCounters(next);
        setAdkarCounts(counts => ({...counts, ...saved}));
      }),
    [counterCommand],
  );

  const decrementDuaa = useCallback(
    (key: string) =>
      counterCommand(async () => {
        const remaining = await decrementCounter(key);
        setDuaaCounts(counts => ({...counts, [key]: remaining}));
      }),
    [counterCommand],
  );
  const resetDuaa = useCallback(
    (next: RepeatCounts) =>
      counterCommand(async () => {
        const saved = await resetCounters(next);
        setDuaaCounts(counts => ({...counts, ...saved}));
      }),
    [counterCommand],
  );

  const decrementTasbihat = useCallback(
    (key: string) =>
      counterCommand(async () => {
        const remaining = await decrementCounter(key);
        setTasbihatCounts(counts => ({...counts, [key]: remaining}));
      }),
    [counterCommand],
  );
  const resetTasbihat = useCallback(
    (next: RepeatCounts) =>
      counterCommand(async () => {
        const saved = await resetCounters(next);
        setTasbihatCounts(counts => ({...counts, ...saved}));
      }),
    [counterCommand],
  );

  const themeValue = useMemo(
    () => ({
      mode,
      toggleMode,
      preference,
      setPreference,
      uiScale,
      setUiScale,
      digitStyle,
      setDigitStyle,
    }),
    [
      mode,
      toggleMode,
      preference,
      uiScale,
      setUiScale,
      digitStyle,
      setDigitStyle,
    ],
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
        <ResetConfirmationProvider>
          <HomeRepeatProvider value={homeValue}>
            <AdkarRepeatProvider value={adkarValue}>
              <DuaaRepeatProvider value={duaaValue}>
                <TasbihatRepeatProvider value={tasbihatValue}>
                  <StatusBar barStyle={statusBarStyle} translucent={false} />
                  <View
                    style={[
                      styles.backgroundContainer,
                      {backgroundColor: theme.bg},
                    ]}>
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
                                  void updateSettings({
                                    themePreference: preference,
                                  })
                                    .then(() => getSettings())
                                    .then(settings =>
                                      NativeModules.RoqiaAppearance?.sync(
                                        settings.themePreference,
                                      ),
                                    )
                                    .then(() => setStorageError(false))
                                    .catch(() => setStorageError(true));
                                } else setHydrationAttempt(n => n + 1);
                              },
                            }}
                          />
                        </View>
                      ) : !isStateHydrated ? (
                        <HydrationScreen />
                      ) : showWalkthrough ? (
                        <Guide onFinish={onWalkthroughFinish} />
                      ) : showIntroNote ? (
                        <Guidance onFinish={onIntroNoteClose} />
                      ) : (
                        <MainTabNavigation />
                      )}
                    </SafeAreaView>
                  </View>
                </TasbihatRepeatProvider>
              </DuaaRepeatProvider>
            </AdkarRepeatProvider>
          </HomeRepeatProvider>
        </ResetConfirmationProvider>
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
});
