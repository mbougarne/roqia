import React, {type FC, useContext} from 'react';
import {View, StyleSheet, ImageBackground, Pressable} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {StyledText} from './StyledText';
import {themeContext, themes} from '../store';

type Props = {
  onBackPress?: () => void;
  onResetAllPress?: () => void;
  onResetScreenPress?: () => void;
  compact?: boolean;
  showBackButton?: boolean;
  showResetActions?: boolean;
  title?: string;
};

export const Header: FC<Props> = ({
  onBackPress,
  onResetAllPress,
  onResetScreenPress,
  compact = false,
  showBackButton = false,
  showResetActions = false,
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
      style={[
        styles.backgroundContainer,
        compact && styles.compactBackgroundContainer,
        {backgroundColor: theme.secondaryBg},
      ]}
      imageStyle={styles.backgroundStyle}>
      <View style={[styles.container, compact && styles.compactContainer]}>
        <View style={[styles.iconsContainer, compact && styles.compactIconsContainer]}>
          <View style={styles.iconsInnerContainer}>
            {showBackButton ? (
              <Pressable
                accessibilityHint="ينقلك إلى الصفحة السابقة"
                accessibilityLabel="زر الرجوع"
                accessibilityRole="button"
                onPress={onBackPress}
                style={styles.backButton}>
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
            <View style={styles.actionsContainer}>
              {showResetActions ? (
                <Pressable
                  accessibilityHint="يعيد عدادات الصفحة الحالية إلى القيم الأصلية"
                  accessibilityLabel="إعادة عداد الصفحة"
                  accessibilityRole="button"
                  onPress={onResetScreenPress}
                  style={styles.actionButton}>
                  <Icon name="restart-alt" size={24} color={theme.tertiaryColor} />
                  <StyledText
                    customStyle={[
                      styles.actionText,
                      {color: theme.tertiaryColor},
                    ]}>
                    إعادة
                  </StyledText>
                </Pressable>
              ) : null}
              {showResetActions ? (
                <Pressable
                  accessibilityHint="يعيد جميع العدادات في التطبيق إلى القيم الأصلية"
                  accessibilityLabel="إعادة جميع العدادات"
                  accessibilityRole="button"
                  onPress={onResetAllPress}
                  style={styles.actionButton}>
                  <Icon name="restore-page" size={24} color={theme.tertiaryColor} />
                  <StyledText
                    customStyle={[
                      styles.actionText,
                      {color: theme.tertiaryColor},
                    ]}>
                    الكل
                  </StyledText>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityHint="يبدل بين الوضع النهاري والوضع الليلي"
                accessibilityLabel={mode === 'light' ? 'تفعيل الوضع الليلي' : 'تفعيل الوضع النهاري'}
                accessibilityRole="button"
                onPress={onIconPress}
                style={styles.modeButton}>
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
        </View>
        {!compact ? (
          <StyledText
            accessibilityRole="header"
            customStyle={[styles.headline, {color: theme.tertiaryColor}]}>
            {title}
          </StyledText>
        ) : null}
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundContainer: {
    marginBottom: 25,
  },
  compactBackgroundContainer: {
    marginBottom: 0,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.12,
    shadowRadius: 1.2,
    elevation: 2,
  },
  backgroundStyle: {
    resizeMode: 'repeat',
  },
  container: {
    justifyContent: 'center',
    paddingTop: 25,
    minHeight: 175,
  },
  compactContainer: {
    minHeight: 66,
    paddingTop: 0,
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
  compactIconsContainer: {
    position: 'relative',
    top: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  iconsInnerContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sideSpacer: {
    width: 48,
  },
  actionsContainer: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: 14,
  },
  actionButton: {
    alignItems: 'center',
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
  actionText: {
    marginVertical: 5,
    fontSize: 12,
    fontWeight: '700',
  },
});
