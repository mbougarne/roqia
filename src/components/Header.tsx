import React, {FC} from 'react';
import {View, Text, StyleSheet, ImageBackground} from 'react-native';

export const Header: FC = () => {
  return (
    <ImageBackground
      source={require('../assets/images/arabesque.png')}
      style={styles.backgroundContainer}
      imageStyle={styles.backgroundStyle}>
      <View style={styles.container}>
        <Text style={styles.headline}>الرقية الشرعية</Text>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundContainer: {
    flex: 1,
    backgroundColor: '#E8DFCA',
    marginBottom: 25,
  },
  backgroundStyle: {
    resizeMode: 'repeat',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 25,
    minHeight: 175,
  },
  headline: {
    fontFamily: 'NotoSansArabic',
    fontSize: 56,
    fontWeight: '900',
    textAlign: 'center',
    color: '#1A4D2E',
  },
});
