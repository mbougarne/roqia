import React, {useCallback, useContext, useEffect, useState} from 'react';
import {
  Alert,
  Pressable,
  Vibration,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  Disclosure,
  Segments,
  Group,
  Toggle,
  rtlRow,
} from '../design/components';
import {tasbihatData} from '../data';
import {tasbihatRepeatContext, themeContext} from '../store';
import {
  AppText,
  AppIcon,
  Button,
  IconButton,
  Page,
  Sheet,
  usePalette,
} from '../design/ui';
import {useFormat} from '../design/useFormat';
import {ReadingCard} from '../features/devotional/ReadingCard';
import {useConfirmReset} from '../features/devotional/ResetConfirmation';
import {useBookmarks, reloadBookmarks} from '../features/devotional/bookmarks';
import {itemTitle} from '../features/devotional/discovery';
import {useScreenAudioPlayback} from '../hooks/useScreenAudioPlayback';
import {readRecord, saveRecord} from '../repositories/database';
import {
  TasbihArch,
  TasbihRing,
  TasbihTouch,
  TasbihVibration,
} from './TasbihArtwork';

const quickChoices = [
  {value: 'devotional.tasbih.0001', label: 'سبحان الله'},
  {value: 'devotional.tasbih.0007', label: 'الحمد لله'},
  {value: 'devotional.tasbih.0013', label: 'الله أكبر'},
];

export function TasbihatScreen({navigation}: any) {
  const {number} = useFormat();
  const confirmReset = useConfirmReset();
  const {fontScale, width} = useWindowDimensions();
  const {mode, uiScale} = useContext(themeContext);
  const [id, setId] = useState(tasbihatData[0].id);
  const [choosing, setChoosing] = useState(false);
  const [vibration, setVibration] = useState(false);
  const [vibrationReady, setVibrationReady] = useState(false);
  const [vibrationError, setVibrationError] = useState(false);
  const loadVibration = useCallback(() => {
    setVibrationReady(false);
    void readRecord<{schemaVersion: number; enabled: boolean}>(
      'tasbih-vibration',
      'singleton',
    )
      .then(value => {
        if (
          value &&
          (value.schemaVersion !== 1 || typeof value.enabled !== 'boolean')
        )
          throw Error('invalid_tasbih_vibration');
        setVibration(value?.enabled ?? false);
        setVibrationError(false);
      })
      .catch(() => setVibrationError(true))
      .finally(() => setVibrationReady(true));
  }, []);
  useEffect(loadVibration, [loadVibration]);
  const changeVibration = (enabled: boolean) => {
    setVibrationReady(false);
    void saveRecord('tasbih-vibration', 'singleton', {
      schemaVersion: 1,
      enabled,
    })
      .then(() => setVibration(enabled))
      .catch(() => Alert.alert('تعذر حفظ تفضيل الاهتزاز', 'أعد المحاولة.'))
      .finally(() => setVibrationReady(true));
  };
  const state = useContext(tasbihatRepeatContext);
  const saved = useBookmarks();
  const audio = useScreenAudioPlayback(tasbihatData);
  const p = usePalette();
  const dark = mode === 'dark';
  const largeType = fontScale * uiScale > 1.2;
  const index = tasbihatData.findIndex(i => i.id === id);
  const item = tasbihatData[index];
  const count = state.repeatCounts[id] ?? item.repeat ?? 0;
  const max = item.repeat ?? 0;
  const size = Math.min(dark ? 300 : 240, width - 72);
  const outsideText = largeType || (item.content?.length ?? 0) > 40;
  const activeAudio =
    audio.activeAudioFile === item.audioFile && !audio.isAudioPaused;
  return (
    <Page
      title="التسبيحات"
      onBack={() => navigation.goBack()}
      actions={
        <IconButton
          name="search"
          label="البحث في المحتوى"
          onPress={() => navigation.navigate('Search')}
        />
      }>
      <Segments value={id} options={quickChoices} onChange={setId} />
      <View
        style={{
          backgroundColor: dark ? 'transparent' : p.surface,
          borderRadius: 16,
          paddingTop: dark ? 16 : 48,
          paddingBottom: 16,
          paddingHorizontal: 8,
          alignItems: 'center',
          gap: 12,
          overflow: 'hidden',
        }}>
        {!dark && <TasbihArch />}
        {outsideText && (
          <AppText
            role="devotional"
            selectable
            style={{textAlign: 'center', paddingHorizontal: 16}}>
            {item.content}
          </AppText>
        )}
        <TasbihRing
          size={size}
          progress={max ? (max - count) / max : 0}
          dark={dark}>
          <View style={{width: size * 0.7, alignItems: 'center', gap: 4}}>
            {!outsideText && (
              <AppText
                role="devotional"
                selectable
                style={{textAlign: 'center'}}>
                {item.content}
              </AppText>
            )}
            {dark && !outsideText && (
              <View style={{...rtlRow, gap: 4, marginVertical: 4}}>
                <View
                  style={{width: 28, height: 0.5, backgroundColor: p.accent}}
                />
                <AppIcon name="medallion" color={p.accent} size={16} />
                <View
                  style={{width: 28, height: 0.5, backgroundColor: p.accent}}
                />
              </View>
            )}
            <AppText
              role="counter"
              accessibilityLiveRegion="polite"
              accessibilityLabel={`المتبقي ${number(count)} من ${number(max)}`}
              style={{
                textAlign: 'center',
                fontSize: (largeType ? 44 : 56) * uiScale,
                lineHeight: (largeType ? 62 : 76) * uiScale,
              }}>
              {number(count)}
            </AppText>
            <AppText
              role="caption"
              style={{
                textAlign: 'center',
                color: p.textSecondary,
              }}>{`المتبقي من ${number(max)}`}</AppText>
          </View>
        </TasbihRing>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={count ? 'اضغط للتسبيح' : 'اكتمل التسبيح'}
          accessibilityState={{disabled: count === 0}}
          disabled={count === 0}
          onPress={() => {
            state.decrementRepeat(id);
            if (vibration && vibrationReady && !vibrationError)
              Vibration.vibrate(20);
          }}
          style={({pressed}) => ({
            minWidth: dark ? 128 : 96,
            minHeight: dark ? 128 : 96,
            borderRadius: 80,
            borderWidth: dark ? 1 : 7,
            borderColor: dark ? p.accent : p.surfaceMuted,
            padding: 14,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            backgroundColor: count ? p.actionPrimary : p.disabledSurface,
            opacity: pressed ? 0.75 : 1,
          })}>
          <TasbihTouch color={count ? p.textOnAction : p.disabledText} />
          {dark && (
            <AppText
              role="label"
              style={{
                color: count ? p.textOnAction : p.disabledText,
                textAlign: 'center',
              }}>
              {count ? 'اضغط للتسبيح' : 'اكتمل'}
            </AppText>
          )}
        </Pressable>
        {!dark && (
          <AppText role="label" style={{textAlign: 'center'}}>
            {count ? 'اضغط للتسبيح' : 'اكتمل التسبيح'}
          </AppText>
        )}
      </View>
      <Group>
        <View
          style={{
            ...rtlRow,
            paddingHorizontal: 14,
            paddingVertical: 4,
            minHeight: 56,
            borderBottomWidth: 0.5,
            borderColor: p.borderSubtle,
          }}>
          <TasbihVibration color={p.accent} />
          <AppText role="label" style={{flex: 1}}>
            اهتزاز
          </AppText>
          <Toggle
            label="اهتزاز"
            value={vibration}
            disabled={!vibrationReady || vibrationError}
            onChange={changeVibration}
          />
        </View>
        <View style={{...rtlRow, paddingHorizontal: 14, minHeight: 56}}>
          <AppIcon name="tasbih" color={p.accent} />
          <AppText role="label" style={{flex: 1}}>
            الهدف
          </AppText>
          <AppText role="bodyStrong">{number(max)}</AppText>
        </View>
      </Group>
      {vibrationError && (
        <Button
          secondary
          label="إعادة تحميل تفضيل الاهتزاز"
          onPress={loadVibration}
        />
      )}
      <Button
        secondary
        icon="reset"
        label="إعادة العداد"
        onPress={() =>
          confirmReset('إعادة عداد هذا التسبيح؟', () =>
            state.resetRepeats({[id]: max}),
          )
        }
      />
      <Button
        secondary
        icon="chevron-right"
        label="عرض جميع التسبيحات"
        onPress={() => setChoosing(true)}
      />
      {item.audioFile && (
        <Button
          secondary
          icon={activeAudio ? 'pause' : 'volume'}
          label={activeAudio ? 'إيقاف مؤقت' : 'استماع إلى هذا التسبيح'}
          onPress={() => void audio.onAudioPress(item.audioFile!)}
        />
      )}
      {audio.error && (
        <AppText accessibilityRole="alert">
          تعذر تشغيل الصوت. أعد المحاولة من زر الاستماع.
        </AppText>
      )}
      {saved.error && (
        <Button
          secondary
          label="إعادة تحميل المحفوظات"
          onPress={() => void reloadBookmarks().catch(() => undefined)}
        />
      )}
      <Disclosure title="النص والمحفوظات">
        <ReadingCard
          item={item}
          index={index}
          count={count}
          hideCounter
          bookmarkReady={saved.loaded && !saved.error}
          saved={saved.items.some(
            b => b.kind === 'devotional' && b.contentId === id,
          )}
          audio={audio}
          onCount={() => state.decrementRepeat(id)}
          onReset={() => state.resetRepeats({[id]: max})}
        />
      </Disclosure>
      <Button
        secondary
        label="إعادة عدادات هذه الصفحة"
        onPress={() =>
          confirmReset('إعادة جميع عدادات التسبيح؟', () =>
            state.resetRepeats(
              Object.fromEntries(tasbihatData.map(i => [i.id, i.repeat ?? 0])),
            ),
          )
        }
      />
      <Sheet
        title="اختيار التسبيح"
        visible={choosing}
        onClose={() => setChoosing(false)}>
        {tasbihatData.map(i => (
          <Button
            key={i.id}
            label={itemTitle(i)}
            secondary={i.id !== id}
            selected={i.id === id}
            onPress={() => {
              setId(i.id);
              setChoosing(false);
            }}
          />
        ))}
      </Sheet>
    </Page>
  );
}
