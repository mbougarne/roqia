import Svg, {Path} from 'react-native-svg';
import React, {useState} from 'react';
import {Pressable, View, type ViewProps} from 'react-native';
import {
  AppIcon,
  AppText,
  Card,
  IconButton,
  Input,
  usePalette,
  type IconName,
} from './ui';
import {Illustration} from './Illustration';
import {number} from './format';
export const rtlRow = {
  flexDirection: 'row-reverse' as const,
  direction: 'ltr' as const,
  alignItems: 'center' as const,
  gap: 10,
};
export function Ornament({title}: {title?: string}) {
  const p = usePalette();
  return (
    <View style={{...rtlRow, gap: 8, paddingVertical: 4}}>
      {title && <AppText role="label">{title}</AppText>}
      <View
        style={{flex: 1, height: 0.5, backgroundColor: p.accent, opacity: 0.35}}
      />
      <AppIcon name="medallion" size={18} color={p.accent} />
      {!title && (
        <View
          style={{
            flex: 1,
            height: 0.5,
            backgroundColor: p.accent,
            opacity: 0.35,
          }}
        />
      )}
    </View>
  );
}
export function Group({style, ...props}: ViewProps) {
  return (
    <Card
      {...props}
      style={[{padding: 0, gap: 0, overflow: 'hidden'}, style]}
    />
  );
}
export function SettingRow({
  title,
  detail,
  icon,
  children,
  onPress,
}: {
  title: string;
  detail?: string;
  icon?: IconName;
  children?: React.ReactNode;
  onPress?: () => void;
}) {
  const p = usePalette();
  const content = (
    <>
      <View style={{...rtlRow, flex: 1}}>
        {icon && <AppIcon name={icon} color={p.accent} />}
        <View style={{flex: 1}}>
          <AppText role="label">{title}</AppText>
          {detail && (
            <AppText role="caption" style={{color: p.textSecondary}}>
              {detail}
            </AppText>
          )}
        </View>
      </View>
      {children}
      {onPress && (
        <AppIcon name="chevron-left" size={18} color={p.textPrimary} />
      )}
    </>
  );
  const style = {
    ...rtlRow,
    minHeight: 56,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderColor: p.borderSubtle,
  };
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, detail].filter(Boolean).join('. ')}
      onPress={onPress}
      style={({pressed}) => [
        style,
        {backgroundColor: pressed ? p.surfaceMuted : undefined},
      ]}>
      {content}
    </Pressable>
  ) : (
    <View style={style}>{content}</View>
  );
}
export function Toggle({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const p = usePalette();
  return (
    <View
      style={{
        minWidth: 48,
        minHeight: 48,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
      <Pressable
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{checked: value, disabled}}
        disabled={disabled}
        onPress={() => onChange(!value)}
        style={{
          minWidth: 48,
          minHeight: 48,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : 1,
        }}>
        <View
          pointerEvents="none"
          style={{
            width: 42,
            height: 24,
            borderRadius: 12,
            padding: 2,
            backgroundColor: value ? p.actionPrimary : p.borderControl,
            alignItems: value ? 'flex-end' : 'flex-start',
            direction: 'ltr',
          }}>
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: value ? p.textOnAction : p.surface,
            }}
          />
        </View>
      </Pressable>
    </View>
  );
}
export function Segments<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: readonly {value: T; label: string}[];
  value: T;
  onChange: (value: T) => void;
}) {
  const p = usePalette();
  return (
    <View
      style={{
        ...rtlRow,
        alignItems: 'stretch',
        flexWrap: 'wrap',
        gap: 4,
        padding: 4,
        borderRadius: 12,
        backgroundColor: p.surfaceMuted,
      }}>
      {options.map(o => (
        <Pressable
          key={o.value}
          accessibilityRole="radio"
          accessibilityLabel={o.label}
          accessibilityState={{selected: value === o.value}}
          onPress={() => onChange(o.value)}
          style={({pressed}) => ({
            minWidth: 70,
            flex: 1,
            minHeight: 48,
            paddingHorizontal: 8,
            paddingVertical: 8,
            justifyContent: 'center',
            borderRadius: 8,
            backgroundColor:
              value === o.value ? p.selection : pressed ? p.surface : undefined,
          })}>
          <AppText
            role="label"
            style={{
              textAlign: 'center',
              color: value === o.value ? p.textOnSelection : p.textPrimary,
            }}>
            {o.label}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}
export function RadioRow({
  title,
  detail,
  selected,
  onPress,
  icon = 'book',
  multiple = false,
}: {
  title: string;
  detail?: string;
  selected: boolean;
  multiple?: boolean;
  onPress: () => void;
  icon?: IconName;
}) {
  const p = usePalette();
  return (
    <Pressable
      accessibilityRole={multiple ? 'checkbox' : 'radio'}
      accessibilityLabel={title}
      accessibilityState={multiple ? {checked: selected} : {selected}}
      onPress={onPress}
      style={{
        ...rtlRow,
        minHeight: 64,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: selected ? p.actionPrimary : p.borderSubtle,
        backgroundColor: selected ? p.selection : p.surface,
      }}>
      <AppIcon
        name={icon}
        size={30}
        color={selected ? p.textOnSelection : p.accent}
      />
      <View style={{flex: 1}}>
        <AppText
          role="bodyStrong"
          style={{color: selected ? p.textOnSelection : p.textPrimary}}>
          {title}
        </AppText>
        {detail && (
          <AppText
            role="caption"
            style={{color: selected ? p.textOnSelection : p.textSecondary}}>
            {detail}
          </AppText>
        )}
      </View>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 1,
          borderColor: selected ? p.textOnSelection : p.borderControl,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {selected && (
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: p.textOnSelection,
            }}
          />
        )}
      </View>
    </Pressable>
  );
}
export function NumberBadge({value}: {value: number}) {
  const p = usePalette();
  return (
    <View
      style={{
        width: 42,
        height: 46,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <View style={{position: 'absolute'}}>
        <AppIcon name="medallion" size={42} color={p.accent} />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: p.surface,
        }}
      />
      <AppText
        role="caption"
        style={{writingDirection: 'ltr', textAlign: 'center'}}>
        {number(value)}
      </AppText>
    </View>
  );
}
export function Banner({
  text,
  icon = 'info',
  warning = false,
}: {
  text: string;
  icon?: IconName;
  warning?: boolean;
}) {
  const p = usePalette();
  return (
    <View
      style={{
        ...rtlRow,
        padding: 12,
        gap: 8,
        borderRadius: 10,
        backgroundColor: warning ? p.warningSurface : p.surfaceMuted,
      }}>
      <AppIcon name={icon} size={20} color={warning ? p.warning : p.accent} />
      <AppText
        role="caption"
        style={{flex: 1, color: warning ? p.warning : p.textSecondary}}>
        {text}
      </AppText>
    </View>
  );
}
export function SearchField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const p = usePalette();
  return (
    <View
      style={{
        ...rtlRow,
        backgroundColor: p.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: p.borderSubtle,
        paddingHorizontal: 8,
      }}>
      <AppIcon name="search" size={20} />
      <View style={{flex: 1}}>
        <Input
          label={label}
          hideLabel
          value={value}
          placeholder={label}
          onChangeText={onChange}
          style={{
            borderWidth: 0,
            backgroundColor: 'transparent',
            paddingHorizontal: 0,
          }}
        />
      </View>
      {!!value && (
        <IconButton
          name="close"
          label="مسح البحث"
          onPress={() => onChange('')}
        />
      )}
    </View>
  );
}
export function Progress({value}: {value: number}) {
  const p = usePalette();
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(Math.max(0, Math.min(1, value)) * 100),
      }}
      style={{
        height: 5,
        borderRadius: 4,
        backgroundColor: p.surfaceMuted,
        overflow: 'hidden',
        direction: 'ltr',
      }}>
      <View
        style={{
          height: 5,
          width: `${Math.max(0, Math.min(1, value)) * 100}%`,
          borderRadius: 4,
          backgroundColor: p.actionPrimary,
        }}
      />
    </View>
  );
}
export function Range({
  label,
  hideLabel = false,
  value,
  min,
  max,
  step = 1,
  stops,
  onChange,
}: {
  label: string;
  hideLabel?: boolean;
  value: number;
  min: number;
  max: number;
  step?: number;
  stops?: readonly number[];
  onChange: (v: number) => void;
}) {
  const p = usePalette();
  const [width, setWidth] = useState(1);
  const nearest = (value: number) =>
    stops?.reduce((a, b) =>
      Math.abs(b - value) < Math.abs(a - value) ? b : a,
    ) ?? value;
  const change = (x: number) =>
    onChange(
      nearest(
        Math.max(
          min,
          Math.min(
            max,
            min + Math.round(((x / width) * (max - min)) / step) * step,
          ),
        ),
      ),
    );
  const ratio = (value - min) / (max - min);
  return (
    <View style={{gap: 2}}>
      {!hideLabel && (
        <View style={rtlRow}>
          <AppText role="label" style={{flex: 1}}>
            {label}
          </AppText>
          <AppText role="label" style={{writingDirection: 'ltr'}}>
            {number(value, {maximumFractionDigits: 2})}
          </AppText>
        </View>
      )}
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{min, max, now: value}}
        accessibilityActions={[{name: 'increment'}, {name: 'decrement'}]}
        onAccessibilityAction={e => {
          const direction = e.nativeEvent.actionName === 'increment' ? 1 : -1;
          if (stops?.length) {
            const index = stops.indexOf(nearest(value));
            onChange(
              stops[Math.max(0, Math.min(stops.length - 1, index + direction))],
            );
          } else
            onChange(Math.max(min, Math.min(max, value + direction * step)));
        }}
        onLayout={e => setWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={e => change(e.nativeEvent.locationX)}
        onResponderMove={e => change(e.nativeEvent.locationX)}
        style={{height: 48, justifyContent: 'center', direction: 'ltr'}}>
        <View
          pointerEvents="none"
          style={{height: 5, borderRadius: 3, backgroundColor: p.surfaceMuted}}>
          <View
            style={{
              height: 5,
              width: `${ratio * 100}%`,
              backgroundColor: p.actionPrimary,
              borderRadius: 3,
            }}
          />
        </View>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: `${ratio * 100}%`,
            marginLeft: -8,
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: p.actionPrimary,
            borderWidth: 2,
            borderColor: p.surface,
          }}
        />
      </View>
    </View>
  );
}
export function Disclosure({
  title,
  children,
  icon = 'info',
  initiallyOpen = false,
}: {
  initiallyOpen?: boolean;
  title: string;
  children: React.ReactNode;
  icon?: IconName;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <Group>
      <SettingRow title={title} icon={icon} onPress={() => setOpen(!open)} />
      {open && <View style={{padding: 12, gap: 12}}>{children}</View>}
    </Group>
  );
}
export function FeatureCard({
  title,
  detail,
  art,
  onPress,
  emphasized = false,
  roomy = false,
  tint,
}: {
  tint?: string;
  emphasized?: boolean;
  roomy?: boolean;
  title: string;
  detail: string;
  art: React.ComponentProps<typeof Illustration>['name'];
  onPress?: () => void;
}) {
  const p = usePalette();
  const body = (
    <>
      <View
        pointerEvents="none"
        style={{position: 'absolute', right: -35, top: -30, opacity: 0.16}}>
        <Svg width={140} height={140} viewBox="0 0 100 100">
          <Path
            d={
              Array.from({length: 32}, (_, i) => {
                const angle = (i * Math.PI) / 16,
                  radius = i % 2 ? 36 : 47;
                return (
                  (i ? 'L' : 'M') +
                  (50 + radius * Math.cos(angle)) +
                  ',' +
                  (50 + radius * Math.sin(angle))
                );
              }).join(' ') + 'Z'
            }
            fill="none"
            stroke={emphasized ? '#E0C88C' : p.accent}
            strokeWidth={0.8}
          />
        </Svg>
      </View>
      <View style={{flex: 1, gap: 4}}>
        <AppText
          role="sectionTitle"
          style={{color: emphasized ? p.textOnAction : p.textPrimary}}>
          {title}
        </AppText>
        <AppText
          role="caption"
          style={{color: emphasized ? p.textOnAction : p.textSecondary}}>
          {detail}
        </AppText>
      </View>
      <View style={{width: 100}}>
        <Illustration name={art} height={100} />
      </View>
      {onPress && (
        <AppIcon
          name="chevron-left"
          size={18}
          color={emphasized ? p.textOnAction : p.textPrimary}
        />
      )}
    </>
  );
  const style = {
    ...rtlRow,
    padding: 12,
    minHeight: roomy ? 148 : 112,
    overflow: 'hidden' as const,
    borderRadius: 14,
    backgroundColor: emphasized ? p.actionPrimary : (tint ?? p.surfaceMuted),
    borderWidth: 1,
    borderColor: p.borderSubtle,
  };
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={style}>
      {body}
    </Pressable>
  ) : (
    <View style={style}>{body}</View>
  );
}
