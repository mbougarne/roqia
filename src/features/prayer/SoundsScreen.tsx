import React, {useState} from 'react';
import {Linking, Platform, View} from 'react-native';
import {
  AppText,
  Button,
  Card,
  Page,
  StateView,
  IconButton,
} from '../../design/ui';
import {
  Banner,
  Disclosure,
  Group,
  SettingRow,
  RadioRow,
  Ornament,
  rtlRow,
} from '../../design/components';
import {useFormat} from '../../design/useFormat';
import {useLibrary, useOnFocus} from '../quran/context';
import {
  sounds,
  selectedSounds,
  selectSound,
  localSound,
  adhanNative,
  type SoundSelection,
  type AdhanSound,
} from './sounds';
import {reconcilePrayer, requestPrayerPermission} from './service';
import {playback} from '../audio/controller';
export function SoundsScreen({navigation}: any) {
  const {number} = useFormat();
  const {runtime, ready, error, retry} = useLibrary();
  const [selected, setSelected] = useState<SoundSelection>({
    normal: null,
    fajr: null,
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useOnFocus(() => {
    void selectedSounds().then(setSelected);
  }, []);
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setMessage('');
    try {
      await fn();
    } catch {
      setMessage(
        'تعذر إكمال العملية. تحقق من التنزيل وإذن الإشعارات والمنبهات، ثم أعد المحاولة.',
      );
    } finally {
      setBusy(false);
    }
  };
  const preview = async (sound: AdhanSound, delayed = false) => {
    await requestPrayerPermission();
    const local = await localSound(sound),
      native = adhanNative();
    if (!local || !native?.previewAdhan) throw Error('audio_unavailable');
    const status = await native.adhanStatus();
    if (!status.notifications) throw Error('notification_permission_required');
    const event = {
      ...local,
      id: 'roqia-prayer:test',
      at: Date.now() + 10000,
      title: `تجربة الأذان · ${sound.title}`,
    };
    if (delayed) {
      if (!status.exact) throw Error('exact_alarm_permission_required');
      await native.testAdhan(JSON.stringify(event));
      setMessage('سيبدأ الأذان التجريبي بعد 10 ثوان. يمكنك قفل الشاشة.');
    } else {
      await playback.pause();
      await native.previewAdhan(JSON.stringify(event));
      setMessage('تشغيل تجريبي. زر الإيقاف متاح هنا وفي الإشعار.');
    }
  };
  return (
    <Page title="أصوات الأذان" onBack={() => navigation.goBack()}>
      <AppText role="caption">
        اختر تسجيلا محفوظا، ونسخة مستقلة لأذان الفجر.
      </AppText>
      {(!ready || error) && (
        <StateView
          title={error ? 'تعذر تحميل التنزيلات' : 'جار تحميل التنزيلات'}
          action={error ? {label: 'إعادة المحاولة', onPress: retry} : undefined}
        />
      )}
      {!!message && <AppText>{message}</AppText>}
      {sounds.map(sound => {
        const installed = !!runtime.installed(sound.pack),
          chosen = selected[sound.variant] === sound.id;
        return (
          <Group key={sound.id}>
            <RadioRow
              title={sound.title}
              detail={
                (sound.variant === 'fajr' ? 'نسخة الفجر' : 'باقي الصلوات') +
                ' · ' +
                (installed
                  ? 'متاح دون اتصال'
                  : number(sound.pack.assets[0].bytes / 1048576, {
                      maximumFractionDigits: 1,
                    }) + ' MB')
              }
              icon="mosque"
              selected={chosen}
              onPress={() => {
                if (!busy)
                  void act(async () => {
                    if (!installed) {
                      await runtime.download(sound.pack);
                      navigation.navigate('Downloads');
                    } else {
                      await selectSound(sound);
                      setSelected(await selectedSounds());
                      await reconcilePrayer();
                    }
                  });
              }}
            />
            {installed && (
              <SettingRow title={'معاينة ' + sound.title} icon="headphones">
                <IconButton
                  name="play"
                  label={'استماع: ' + sound.title}
                  disabled={busy || Platform.OS !== 'android'}
                  onPress={() => void act(() => preview(sound))}
                />
                <IconButton
                  name="stop"
                  label="إيقاف الأذان"
                  onPress={() => adhanNative()?.stopAdhan()}
                />
              </SettingRow>
            )}
            <Disclosure title={'معلومات ' + sound.title}>
              <AppText role="caption">{sound.notice}</AppText>
              <Button
                secondary
                label={'مصدر ' + sound.title}
                onPress={() =>
                  void Linking.openURL(sound.pack.sourceMetadata.sourceUrl)
                }
              />
              <Button
                secondary
                label={'حقوق استخدام ' + sound.title}
                onPress={() =>
                  void Linking.openURL(sound.pack.sourceMetadata.rightsUrl)
                }
              />
              {installed && (
                <Button
                  secondary
                  label={'تجربة بعد ' + number(10) + ' ثوان: ' + sound.title}
                  disabled={busy || Platform.OS !== 'android'}
                  onPress={() => void act(() => preview(sound, true))}
                />
              )}
            </Disclosure>
          </Group>
        );
      })}
      <Button
        secondary
        label="إيقاف الأذان"
        onPress={() => {
          adhanNative()?.stopAdhan();
          void act(async () => {
            await reconcilePrayer();
            setMessage('تم إيقاف التشغيل وإلغاء التجربة.');
          });
        }}
      />
      <Button
        secondary
        label="إذن المنبهات والتذكيرات"
        onPress={() => void act(() => adhanNative()?.openAdhanAlarms())}
      />
      <Button
        secondary
        label="إدارة التنزيلات والمساحة"
        onPress={() => navigation.navigate('Storage')}
      />
      <Banner
        text="نتبع مستوى صوت المنبه وعدم الإزعاج في الجهاز. معاينة الأذان لا تفعّل تنبيهات الصلاة."
        icon="volume"
      />
    </Page>
  );
}
