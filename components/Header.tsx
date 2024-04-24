import React, {FC} from 'react';
import {View, Text, StyleSheet, ImageBackground} from 'react-native';

export const Header: FC = () => {
  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('./images/moshaf.jpg')}
        style={styles.background}
        imageStyle={styles.cover}>
        <Text style={styles.headline}>الرقية الشرعية</Text>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  background: {
    paddingBottom: 40,
    paddingTop: 64,
    alignItems: 'flex-start',
  },
  cover: {
    height: 225,
    marginTop: -25,
  },
  container: {
    flex: 1,
    paddingTop: 25,
    paddingBottom: 96,
    justifyContent: 'center',
    minHeight: 175,
  },
  headline: {
    fontSize: 32,
    fontWeight: '600',
    color: '#FF5733',
    textAlign: 'center',
  },
});
