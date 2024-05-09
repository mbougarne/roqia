import React, {type FC, useContext} from 'react';
import {View, StyleSheet, ImageBackground, Pressable} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {StyledText} from './StyledText';
import {themeContext, themes} from '../store';

type Props = {
  icon: string;
  modeText: string;
  toggleNote: () => void;
};

export const Header: FC<Props> = ({icon, modeText, toggleNote}) => {
  const {mode, toggleMode} = useContext(themeContext);

  const theme = themes[mode];
  const onIconPress = () => toggleMode();
  const onNotePress = () => toggleNote();

  return (
    <ImageBackground
      source={require('../assets/images/arabesque.png')}
      style={[styles.backgroundContainer, {backgroundColor: theme.secondaryBg}]}
      imageStyle={styles.backgroundStyle}>
      <View style={styles.container}>
        <View style={styles.iconsContainer}>
          <View style={styles.iconsInnerContainer}>
            <Pressable onPress={onNotePress}>
              <Icon
                name="speaker-notes"
                size={24}
                color={themes[mode].tertiaryColor}>
                <StyledText
                  customStyle={[
                    styles.changeMode,
                    {color: theme.tertiaryColor},
                  ]}>
                  قبل القراءة
                </StyledText>
              </Icon>
            </Pressable>
            <Pressable onPress={onIconPress}>
              <Icon name={icon} size={24} color={themes[mode].tertiaryColor}>
                <StyledText
                  customStyle={[
                    styles.changeMode,
                    {color: theme.tertiaryColor},
                  ]}>
                  {modeText}
                </StyledText>
              </Icon>
            </Pressable>
          </View>
        </View>
        <StyledText
          customStyle={[styles.headline, {color: theme.tertiaryColor}]}>
          الرقية الشرعية
        </StyledText>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundContainer: {
    flex: 1,
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
  },
  iconsContainer: {
    position: 'absolute',
    top: 10,
    paddingHorizontal: 10,
    width: '100%',
  },
  iconsInnerContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  changeMode: {
    marginVertical: 5,
    fontSize: 12,
    fontWeight: '700',
  },
});
