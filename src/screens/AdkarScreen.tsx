import React, {useContext} from 'react';
import {StyleSheet, View} from 'react-native';

import {StyledText} from '../components/StyledText';
import {themeContext, themes} from '../store';

export const AdkarScreen = () => {
  const {mode} = useContext(themeContext);
  const theme = themes[mode];

  return (
    <View style={[styles.container, {backgroundColor: theme.bg}]}> 
      <View style={styles.content}>
        <StyledText customStyle={[styles.heading, {color: theme.tertiaryColor}]}>
          Hello
        </StyledText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 25,
  },
  heading: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
