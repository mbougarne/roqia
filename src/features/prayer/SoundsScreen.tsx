import React, {useState} from 'react';
import {Linking, Platform} from 'react-native';
import {AppText, Button, Page, IconButton} from '../../design/ui';
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
import {useQuran, useOnFocus} from '../quran/context';
import {
  sounds,
  selectedSounds,
  selectSound,
  localSound,
  adhanNative,
  bundledSoundAvailable,
  soundSource,
  type SoundSelection,
  type AdhanSound,
} from './sounds';
import {reconcilePrayer, requestPrayerPermission} from './service';
import {playback} from '../audio/controller';
export function SoundsScreen({navigation}: any) {
  const {number} = useFormat();
  const runtime = useQuran();
  const [selected, setSelected] = useState<SoundSelection>({
    normal: null,
    fajr: null,
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useOnFocus(() => {
    void selectedSounds()
      .then(setSelected)
      .catch(() =>
        setMessage(
          'تعذر استرجاع الصوت المختار. أعد فتح الصفحة للمحاولة مجددا.',
        ),
      );
  }, []);
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setMessage('');
    try {
      await fn();
    } catch {
      setMessage(
        'تعذر إكمال العملية. تحقق من المساحة وإذن الإشعارات والمنبهات، ثم أعد المحاولة.',
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
      setMessage(
        `سيبدأ الأذان التجريبي بعد ${number(10)} ثوان. يمكنك قفل الشاشة.`,
      );
    } else {
      await playback.pause();
      await native.previewAdhan(JSON.stringify(event));
      setMessage('تشغيل تجريبي. زر الإيقاف متاح هنا وفي الإشعار.');
    }
  };
  return (
    <Page title="أصوات الأذان" onBack={() => navigation.goBack()}>
      <AppText role="caption">
        التسجيلات المرفقة متاحة دون تنزيل، مع اختيار مستقل لأذان الفجر.
      </AppText>
      {!!message && <AppText>{message}</AppText>}
      {sounds.map(sound => {
        const installed =
            bundledSoundAvailable(sound) ||
            !!(sound.pack && runtime.installed(sound.pack)),
          source = soundSource(sound),
          chosen = selected[sound.variant] === sound.id;
        return (
          <Group key={sound.id}>
            <RadioRow
              title={sound.title}
              detail={
                (sound.variant === 'fajr' ? 'نسخة الفجر' : 'باقي الصلوات') +
                ' · ' +
                (installed
                  ? (sound.kind === 'short' ? 'قراءة قصيرة' : 'أذان كامل') +
                    ' · متاح دون اتصال' +
                    (sound.bundled
                      ? ' · ' +
                        number(Math.round(sound.bundled.duration)) +
                        ' ثانية'
                      : '')
                  : sound.pack
                    ? number(sound.pack.assets[0].bytes / 1048576, {
                        maximumFractionDigits: 1,
                      }) + ' MB'
                    : 'غير متاح على هذا الجهاز')
              }
              icon="mosque"
              selected={chosen}
              disabled={busy || (!installed && !sound.pack)}
              onPress={() => {
                if (!busy)
                  void act(async () => {
                    if (!installed) {
                      if (!sound.pack) throw Error('bundled_adhan_unavailable');
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
              <AppText role="caption">{source.publisher}</AppText>
              <AppText role="caption">{source.rights}</AppText>
              <AppText role="caption" selectable>
                {source.sourceUrl}
              </AppText>
              <AppText role="caption" selectable>
                {source.rightsUrl}
              </AppText>
              <Button
                secondary
                label={'مصدر ' + sound.title}
                onPress={() => void Linking.openURL(source.sourceUrl)}
              />
              <Button
                secondary
                label={'حقوق استخدام ' + sound.title}
                onPress={() => void Linking.openURL(source.rightsUrl)}
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
