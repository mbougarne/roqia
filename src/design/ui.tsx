import React, {useContext} from 'react';
import {
  ActivityIndicator,
  I18nManager,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type TextProps,
  type ViewProps,
} from 'react-native';
import {SvgXml} from 'react-native-svg';
import {themeContext} from '../store';
import {layout, palettes, typography} from './tokens';
import icons from './icons.json';
export const usePalette = () => palettes[useContext(themeContext).mode];
export type IconName = keyof typeof icons;
export function AppIcon({
  name,
  size = 24,
  color,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const p = usePalette();
  return (
    <SvgXml
      xml={icons[name]}
      width={size}
      height={size}
      color={color ?? p.iconPrimary}
      accessible={false}
    />
  );
}
export function AppText({
  role = 'body',
  style,
  ...props
}: Omit<TextProps, 'role'> & {role?: keyof typeof typography.roles}) {
  const p = usePalette(),
    t = typography.roles[role];
  const {uiScale} = useContext(themeContext);
  const scale = ['devotional', 'quran', 'translation'].includes(role)
    ? 1
    : uiScale;
  return (
    <Text
      {...props}
      allowFontScaling
      style={[
        {
          fontFamily: `RoqiaArabic${t.weight}`,
          fontSize: t.size * scale,
          lineHeight: t.lineHeight * scale,
          fontWeight: 'normal',
          color: p.textPrimary,
          textAlign: 'right',
          writingDirection: 'rtl',
        },
        style,
      ]}
    />
  );
}
export function Button({
  label,
  onPress,
  icon,
  disabled = false,
  secondary = false,
  selected,
  compact = false,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  disabled?: boolean;
  secondary?: boolean;
  selected?: boolean;
  compact?: boolean;
}) {
  const p = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{disabled, selected}}
      disabled={disabled}
      onPress={onPress}
      style={({pressed}) => [
        styles.button,
        {
          backgroundColor: disabled
            ? p.disabledSurface
            : secondary
              ? p.surfaceMuted
              : pressed
                ? p.actionPressed
                : p.actionPrimary,
        },
      ]}>
      {icon && (
        <AppIcon
          name={icon}
          color={secondary ? p.iconPrimary : p.textOnAction}
        />
      )}
      <AppText
        role="button"
        style={{
          flexShrink: 1,
          flex: compact ? undefined : 1,
          textAlign: 'center',
          color: disabled
            ? p.disabledText
            : secondary
              ? p.textPrimary
              : p.textOnAction,
        }}>
        {label}
      </AppText>
    </Pressable>
  );
}
export function IconButton({
  label,
  name,
  onPress,
  disabled = false,
}: {
  label: string;
  name: IconName;
  onPress: () => void;
  disabled?: boolean;
}) {
  const p = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{disabled}}
      disabled={disabled}
      onPress={onPress}
      style={({pressed}) => [styles.iconButton, {opacity: pressed ? 0.65 : 1}]}>
      <AppIcon name={name} color={disabled ? p.disabledText : p.iconPrimary} />
    </Pressable>
  );
}
export function Card({style, ...props}: ViewProps) {
  const p = usePalette();
  return (
    <View
      {...props}
      style={[
        styles.card,
        {backgroundColor: p.surface, borderColor: p.borderSubtle},
        style,
      ]}
    />
  );
}
export function Row({
  title,
  detail,
  icon,
  onPress,
}: {
  title: string;
  detail?: string;
  icon?: IconName;
  onPress: () => void;
}) {
  const p = usePalette();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[title, detail].filter(Boolean).join('. ')}
      style={({pressed}) => [
        styles.row,
        {
          backgroundColor: pressed ? p.surfaceMuted : p.surface,
          borderColor: p.borderSubtle,
        },
      ]}>
      {icon && <AppIcon name={icon} />}
      <View style={{flex: 1}}>
        <AppText role="bodyStrong">{title}</AppText>
        {detail && (
          <AppText role="caption" style={{color: p.textSecondary}}>
            {detail}
          </AppText>
        )}
      </View>
      <AppIcon name="chevron-left" />
    </Pressable>
  );
}
export function Page({
  title,
  children,
  onBack,
}: {
  title: string;
  children: React.ReactNode;
  onBack?: () => void;
}) {
  const p = usePalette();
  return (
    <View style={{flex: 1, backgroundColor: p.background}}>
      <View style={styles.header}>
        {onBack && (
          <IconButton label="رجوع" name="chevron-right" onPress={onBack} />
        )}
        <AppText
          accessibilityRole="header"
          role="screenTitle"
          style={{flex: 1}}>
          {title}
        </AppText>
      </View>
      <ScrollView contentContainerStyle={styles.page}>{children}</ScrollView>
    </View>
  );
}
export function StateView({
  title,
  description,
  busy = false,
  action,
}: {
  title: string;
  description?: string;
  busy?: boolean;
  action?: {label: string; onPress: () => void};
}) {
  const p = usePalette();
  return (
    <Card>
      {busy && <ActivityIndicator color={p.actionPrimary} />}
      <AppText role="sectionTitle">{title}</AppText>
      {description && <AppText>{description}</AppText>}
      {action && <Button {...action} />}
    </Card>
  );
}
export function Sheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const p = usePalette();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}>
      <View style={[styles.scrim, {backgroundColor: p.scrim}]}>
        <View
          accessibilityViewIsModal
          style={[styles.sheet, {backgroundColor: p.surface}]}>
          <View style={styles.header}>
            <IconButton label="إغلاق" name="close" onPress={onClose} />
            <AppText role="sectionTitle" style={{flex: 1}}>
              {title}
            </AppText>
          </View>
          <ScrollView contentContainerStyle={{gap: 16}}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  page: {
    padding: layout.spacing.xl,
    gap: 16,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 32,
  },
  header: {
    minHeight: 56,
    paddingHorizontal: 16,
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  button: {
    minHeight: 48,
    padding: 12,
    borderRadius: 12,
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconButton: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {padding: 16, gap: 12, borderRadius: 16, borderWidth: 1},
  row: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
  },
  scrim: {flex: 1, justifyContent: 'flex-end'},
  sheet: {
    maxHeight: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
});

export function Input({label, ...props}: TextInputProps & {label: string}) {
  const p = usePalette(),
    {uiScale} = useContext(themeContext);
  return (
    <View style={{gap: 8}}>
      <AppText role="label">{label}</AppText>
      <TextInput
        {...props}
        accessibilityLabel={label}
        allowFontScaling
        placeholderTextColor={p.textSecondary}
        style={[
          {
            minHeight: 48,
            borderWidth: 1,
            borderColor: p.borderControl,
            borderRadius: 12,
            padding: 12,
            color: p.textPrimary,
            backgroundColor: p.surface,
            textAlign: 'right',
            fontFamily: 'RoqiaArabic400',
            fontSize: 14 * uiScale,
          },
          props.style,
        ]}
      />
    </View>
  );
}
