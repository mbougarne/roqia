import React, {type FC, useContext} from 'react';
import {I18nManager, View} from 'react-native';

import {AppText, IconButton, usePalette} from '../design/ui';
import {themeContext} from '../store';

type Props = {
  onBackPress?: () => void;
  onMenuPress?: () => void;
  onPlayAllPress?: () => void;
  onResetAllPress?: () => void;
  onResetScreenPress?: () => void;
  compact?: boolean;
  showBackButton?: boolean;
  showMenuButton?: boolean;
  showPlayAllAction?: boolean;
  showResetActions?: boolean;
  isPlayAllActive?: boolean;
  isPlayAllPaused?: boolean;
  title?: string;
};

export const Header: FC<Props> = ({
  onBackPress,
  onMenuPress,
  onPlayAllPress,
  onResetAllPress,
  onResetScreenPress,
  showBackButton,
  showMenuButton,
  showPlayAllAction,
  showResetActions,
  isPlayAllActive,
  isPlayAllPaused,
  title = 'الرقية الشرعية',
}) => {
  const p = usePalette(),
    {mode, toggleMode} = useContext(themeContext);
  return (
    <View
      style={{
        backgroundColor: p.background,
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 4,
      }}>
      <View
        style={{
          minHeight: 48,
          flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
          alignItems: 'center',
          gap: 8,
        }}>
        {showBackButton && onBackPress && (
          <IconButton label="رجوع" name="chevron-right" onPress={onBackPress} />
        )}
        <AppText
          accessibilityRole="header"
          role="screenTitle"
          style={{flex: 1}}>
          {title}
        </AppText>
        {showMenuButton && onMenuPress && (
          <IconButton label="المزيد" name="more" onPress={onMenuPress} />
        )}
      </View>
      <View
        style={{
          flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
          flexWrap: 'wrap',
          justifyContent: 'flex-start',
        }}>
        {showPlayAllAction && onPlayAllPress && (
          <IconButton
            label={
              isPlayAllActive && !isPlayAllPaused ? 'إيقاف مؤقت' : 'تشغيل الكل'
            }
            name={isPlayAllActive && !isPlayAllPaused ? 'pause' : 'play'}
            onPress={onPlayAllPress}
          />
        )}
        {showResetActions && onResetScreenPress && (
          <IconButton
            label="إعادة عدادات الصفحة"
            name="reset"
            onPress={onResetScreenPress}
          />
        )}
        {showResetActions && onResetAllPress && (
          <IconButton
            label="إعادة جميع العدادات"
            name="repeat"
            onPress={onResetAllPress}
          />
        )}
        <IconButton
          label={
            mode === 'light' ? 'تفعيل الوضع الليلي' : 'تفعيل الوضع النهاري'
          }
          name={mode === 'light' ? 'moon' : 'sun'}
          onPress={toggleMode}
        />
      </View>
    </View>
  );
};
