import React, {useContext} from 'react';
import {
  ActivityIndicator,
  I18nManager,
  KeyboardAvoidingView,
  Platform,
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
  type StyleProp,
  type ViewStyle,
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
  strokeWidth = 1.35,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const p = usePalette();
  return (
    <SvgXml
      xml={
        name === 'medallion'
          ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-width="1.3">' +
            Array.from(
              {length: 8},
              (_, i) =>
                '<path d="M24 3L30 10L27 19L21 19L18 10Z" transform="rotate(' +
                i * 45 +
                ' 24 24)"/>',
            ).join('') +
            '<path d="M24 18L30 24L24 30L18 24Z"/></g></svg>'
          : strokeWidth === undefined
            ? icons[name]
            : icons[name].replace(
                /stroke-width="[^"]+"/g,
                `stroke-width="${strokeWidth}"`,
              )
      }
      width={size}
      height={size}
      color={color ?? p.iconPrimary}
      accessible={false}
    />
  );
}
export function IconBadge({name, size = 36}: {name: IconName; size?: number}) {
  const p = usePalette();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: p.surfaceMuted,
      }}>
      <AppIcon name={name} size={size * 0.6} color={p.iconPrimary} />
    </View>
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
  danger = false,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  disabled?: boolean;
  secondary?: boolean;
  selected?: boolean;
  compact?: boolean;
  danger?: boolean;
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
        {borderWidth: secondary ? 1 : 0, borderColor: p.borderControl},
        {
          backgroundColor: disabled
            ? p.disabledSurface
            : danger
              ? p.danger
              : secondary
                ? 'transparent'
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
  selected,
  color,
}: {
  label: string;
  name: IconName;
  onPress: () => void;
  disabled?: boolean;
  selected?: boolean;
  color?: string;
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
        styles.iconButton,
        {
          opacity: pressed ? 0.65 : 1,
          backgroundColor: selected ? p.surfaceMuted : undefined,
          borderWidth: selected ? 1 : 0,
          borderColor: p.borderControl,
          borderRadius: 12,
        },
      ]}>
      <AppIcon
        name={name}
        color={disabled ? p.disabledText : (color ?? p.iconPrimary)}
      />
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
      {icon && <IconBadge name={icon} />}
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
  contentStyle,
  actions,
  subtitle,
  footer,
}: {
  title: string;
  children: React.ReactNode;
  onBack?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
  actions?: React.ReactNode;
  subtitle?: string;
  footer?: React.ReactNode;
}) {
  const p = usePalette();
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{flex: 1, backgroundColor: p.background}}>
      <View style={styles.header}>
        {onBack && (
          <IconButton label="رجوع" name="chevron-right" onPress={onBack} />
        )}
        <View style={{flex: 1}}>
          <AppText
            accessibilityRole="header"
            role="screenTitle"
            style={{textAlign: 'center'}}>
            {title}
          </AppText>
          {subtitle && (
            <AppText
              role="caption"
              style={{textAlign: 'center', color: p.textSecondary}}>
              {subtitle}
            </AppText>
          )}
        </View>
        {actions ?? (onBack && <View style={{width: 48}} />)}
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.page, contentStyle]}>
        {children}
      </ScrollView>
      {footer && (
        <View
          style={{
            padding: 12,
            gap: 6,
            borderTopWidth: 1,
            borderColor: p.borderSubtle,
            backgroundColor: p.surface,
          }}>
          {footer}
        </View>
      )}
    </KeyboardAvoidingView>
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
  centered = false,
  visible,
  title,
  onClose,
  children,
}: {
  centered?: boolean;
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
      <View
        style={[
          styles.scrim,
          {backgroundColor: p.scrim},
          centered && {justifyContent: 'center', padding: 24},
        ]}>
        <View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {backgroundColor: p.surface},
            centered && {borderRadius: 16},
          ]}>
          {!centered && (
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                alignSelf: 'center',
                backgroundColor: p.borderControl,
              }}
            />
          )}
          <View style={styles.header}>
            <IconButton label="إغلاق" name="close" onPress={onClose} />
            <AppText role="sectionTitle" style={{flex: 1, textAlign: 'center'}}>
              {title}
            </AppText>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{gap: 16}}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  page: {
    padding: 16,
    paddingTop: 8,
    gap: 12,
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
    borderRadius: 8,
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
  card: {padding: 16, gap: 12, borderRadius: 12, borderWidth: 0.5},
  row: {
    minHeight: 68,
    borderWidth: 0.5,
    borderRadius: 12,
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

export function Input({
  label,
  hideLabel = false,
  ...props
}: TextInputProps & {label: string; hideLabel?: boolean}) {
  const p = usePalette(),
    {uiScale} = useContext(themeContext);
  return (
    <View style={{gap: 8}}>
      {!hideLabel && <AppText role="label">{label}</AppText>}
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
