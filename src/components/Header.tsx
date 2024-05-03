import React, {FC, useContext} from 'react';
import {View, StyleSheet, ImageBackground, Pressable} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {StyledText} from './StyledText';
import {Themes, themeContext, themes} from '../store';

type Props = {
  icon: string;
  modeText: string;
};

export const Header: FC<Props> = ({icon, modeText}) => {
  const {mode, toggleMode} = useContext(themeContext);

  const style = styles(themes[mode]);

  const onIconPress = () => toggleMode();

  return (
    <ImageBackground
      source={require('../assets/images/arabesque.png')}
      style={style.backgroundContainer}
      imageStyle={style.backgroundStyle}>
      <View style={style.container}>
        <Pressable onPress={onIconPress} style={style.icon}>
          <Icon name={icon} size={24} color={themes[mode].tertiaryColor}>
            <StyledText customStyle={style.changeMode}>{modeText}</StyledText>
          </Icon>
        </Pressable>
        <StyledText customStyle={style.headline}>الرقية الشرعية</StyledText>
      </View>
    </ImageBackground>
  );
};

const styles = (theme: Themes['dark' | 'light']) =>
  StyleSheet.create({
    backgroundContainer: {
      flex: 1,
      backgroundColor: theme.secondaryBg,
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
      fontSize: 56,
      fontWeight: '900',
      textAlign: 'center',
      color: theme.tertiaryColor,
    },
    icon: {
      position: 'absolute',
      top: 10,
      right: 10,
    },
    changeMode: {
      marginVertical: 5,
      fontSize: 12,
      fontWeight: '700',
      color: theme.tertiaryColor,
    },
  });
