import React, {type FC, useContext, useState} from 'react';
import {View, StyleSheet, ImageBackground, Pressable} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {type DataProps} from '../data';
import {type ContextState, themeContext, themes} from '../store';
import {StyledText} from './StyledText';

type SectionProp = DataProps;

export const Section: FC<SectionProp> = item => {
  const [count, setCount] = useState<number>(item.repeat!);
  const [isDone, setIsDone] = useState<boolean>(false);
  const {mode} = useContext<ContextState>(themeContext);

  const theme = themes[mode];
  const onPress = () => {
    if (count === 1) {
      setIsDone(true);
    }
    setCount(c => (c === 0 ? 0 : c - 1));
  };

  return (
    <View style={styles.mainContainer}>
      <ImageBackground
        source={require('../assets/images/arabesque.png')}
        style={[
          styles.backgroundContainer,
          {backgroundColor: isDone ? theme.activeBg : theme.bg},
        ]}
        imageStyle={styles.backgroundStyle}>
        <View style={styles.container}>
          <StyledText
            customStyle={[
              styles.content,
              {color: isDone ? theme.secondaryColor : theme.color},
            ]}>
            {item.content}
          </StyledText>
          <StyledText
            customStyle={[
              styles.caption,
              {color: isDone ? theme.secondaryColor : theme.color},
            ]}>
            {item.caption}
          </StyledText>
          <StyledText
            customStyle={[
              styles.repeat,
              {color: isDone ? theme.secondaryColor : theme.color},
            ]}>
            {item.repeatDescription}
          </StyledText>
          <Pressable
            onPress={onPress}
            style={[styles.button, {backgroundColor: theme.activeBg}]}>
            <StyledText
              customStyle={[
                styles.repeatNumber,
                {
                  color: isDone ? theme.secondaryColor : theme.secondaryColor,
                },
              ]}>
              {count}
            </StyledText>
            <Icon name="arrow-left" size={54} color={theme.secondaryColor} />
          </Pressable>
        </View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  backgroundContainer: {
    marginBottom: 50,
    paddingVertical: 25,
    width: 320,
    minHeight: 175,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.16,
    shadowRadius: 1.51,
    elevation: 2,
  },
  backgroundStyle: {
    resizeMode: 'repeat',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignContent: 'center',
    paddingHorizontal: 20,
  },
  content: {
    fontSize: 18,
  },
  caption: {
    marginVertical: 5,
    fontWeight: '200',
  },
  repeat: {
    marginVertical: 5,
    fontSize: 12,
    fontWeight: '700',
  },
  repeatNumber: {
    marginRight: -15,
    fontSize: 14,
    fontWeight: 'bold',
  },
  button: {
    position: 'absolute',
    bottom: -10,
    left: 10,
    width: 50,
    height: 50,
    borderRadius: 50,
    justifyContent: 'flex-end',
    alignItems: 'center',
    flexDirection: 'row',
  },
});
