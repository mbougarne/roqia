import React, {useContext, useEffect, useRef} from 'react';
import {Animated, Image, StyleSheet, View} from 'react-native';

import {StyledText} from '../components';
import {themeContext, themes} from '../store';

type Props = {
  onFinish: () => void;
};

export const SplashScreen = ({onFinish}: Props) => {
  const {mode} = useContext(themeContext);
  const theme = themes[mode];
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.delay(500),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onFinish();
    });
  }, [onFinish, opacity]);

  return (
    <Animated.View style={[styles.container, {opacity}]}> 
      <Image
        source={require('../assets/images/splash.png')}
        style={styles.image}
        resizeMode="contain"
      />
      <StyledText customStyle={[styles.title, {color: theme.tertiaryColor}]}> 
        الرقية الشرعية
      </StyledText>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  image: {
    width: 220,
    height: 220,
  },
  title: {
    marginTop: 20,
    fontSize: 28,
    fontWeight: '900',
  },
});