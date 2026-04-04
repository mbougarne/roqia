import React, {useState} from 'react';
import {ImageBackground, StyleSheet} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';

import {MainTabNavigation} from './navigation/MainTabNavigation';
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
  const [mode, setMode] = useState<Mode>('light');
  const [repeatCounts, setRepeatCounts] = useState(createInitialRepeatCounts);
  const theme = themes[mode];

  const toggleMode = () => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  };

  const decrementRepeat = (key: string) => {
    setRepeatCounts(currentCounts => ({
      ...currentCounts,
      [key]: currentCounts[key] === 0 ? 0 : currentCounts[key] - 1,
    }));
  };

  return (
    <SafeAreaProvider>
      <ThemeProvider value={{mode, toggleMode}}>
        <RepeatProvider value={{repeatCounts, decrementRepeat}}>
        <ImageBackground
          source={require('./assets/images/arabesque.png')}
          style={[styles.backgroundContainer, {backgroundColor: theme.secondaryBg}]}
          imageStyle={styles.backgroundStyle}>
          <SafeAreaView
            style={styles.safeArea}>
            <MainTabNavigation />
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
