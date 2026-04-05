import React, {type FC, useContext} from 'react';
import {View, StyleSheet, ImageBackground, Pressable} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {StyledText} from './StyledText';
import {themeContext, themes} from '../store';

type Props = {
  onBackPress?: () => void;
  showBackButton?: boolean;
  title?: string;
};

export const Header: FC<Props> = ({
  onBackPress,
  showBackButton = false,
  title = 'الرقية الشرعية',
}) => {
  const {mode, toggleMode} = useContext(themeContext);

  const theme = themes[mode];
  const icon = mode === 'light' ? 'nightlight-round' : 'sunny';
  const modeText = mode === 'light' ? 'وضع ليلي' : 'وضع نهاري';
  const onIconPress = () => toggleMode();

  return (
    <ImageBackground
      source={require('../assets/images/arabesque.png')}
      style={[styles.backgroundContainer, {backgroundColor: theme.secondaryBg}]}
      imageStyle={styles.backgroundStyle}>
      <View style={styles.container}>
        <View style={styles.iconsContainer}>
          <View style={styles.iconsInnerContainer}>
            {showBackButton ? (
              <Pressable onPress={onBackPress} style={styles.backButton}>
                <Icon name="arrow-back" size={24} color={themes[mode].tertiaryColor} />
                <StyledText
                  customStyle={[
                    styles.backText,
                    {color: theme.tertiaryColor},
                  ]}>
                  رجوع
                </StyledText>
              </Pressable>
            ) : (
              <View style={styles.sideSpacer} />
            )}
            <Pressable onPress={onIconPress} style={styles.modeButton}>
              <Icon name={icon} size={24} color={themes[mode].tertiaryColor}>
              </Icon>
              <StyledText
                customStyle={[
                  styles.changeMode,
                  {color: theme.tertiaryColor},
                ]}>
                {modeText}
              </StyledText>
            </Pressable>
          </View>
        </View>
        <StyledText
          customStyle={[styles.headline, {color: theme.tertiaryColor}]}>
          {title}
        </StyledText>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundContainer: {
    marginBottom: 25,
  },
  backgroundStyle: {
    resizeMode: 'repeat',
  },
  container: {
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
  sideSpacer: {
    width: 48,
  },
  modeButton: {
    alignItems: 'center',
  },
  backButton: {
    alignItems: 'center',
  },
  backText: {
    marginVertical: 5,
    fontSize: 12,
    fontWeight: '700',
  },
  changeMode: {
    marginVertical: 5,
    fontSize: 12,
    fontWeight: '700',
  },
});
