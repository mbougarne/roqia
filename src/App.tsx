import React, {useState} from 'react';
import {ImageBackground, StyleSheet} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';

import {MainTabNavigation} from './navigation/MainTabNavigation';
import {type Mode, themeContext, themes} from './store';

const {Provider} = themeContext;

export default function App(): JSX.Element {
  const [mode, setMode] = useState<Mode>('light');
  const theme = themes[mode];

  const toggleMode = () => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  };

  return (
    <SafeAreaProvider>
      <Provider value={{mode, toggleMode}}>
        <ImageBackground
          source={require('./assets/images/arabesque.png')}
          style={[styles.backgroundContainer, {backgroundColor: theme.secondaryBg}]}
          imageStyle={styles.backgroundStyle}>
          <SafeAreaView
            style={styles.safeArea}>
            <MainTabNavigation />
          </SafeAreaView>
        </ImageBackground>
      </Provider>
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
