import React, {useState} from 'react';
import {Platform} from 'react-native';
import {AppText, Button, Page, IconButton} from '../../design/ui';
import {
  Banner,
  Group,
  SettingRow,
  RadioRow,
  Segments,
} from '../../design/components';
import {useFormat} from '../../design/useFormat';
import {useOnFocus} from '../quran/context';
import {
  sounds,
  selectedSounds,
  selectSound,
  localSound,
  adhanNative,
  bundledSoundAvailable,
  type SoundSelection,
  type AdhanSound,
} from './sounds';
import {reconcilePrayer, requestPrayerPermission} from './service';
import {playback} from '../audio/controller';
export function SoundsScreen({navigation}: any) {
  const {number} = useFormat();
  const [variant, setVariant] = useState<keyof SoundSelection>('normal');
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
  const preview = async (sound: AdhanSound) => {
    await requestPrayerPermission();
    const local = await localSound(sound),
      native = adhanNative();
    if (!local || !native?.previewAdhan) throw Error('audio_unavailable');
    const status = await native.adhanStatus();
    if (!status.notifications) throw Error('notification_permission_required');
    await playback.pause();
    await native.previewAdhan(
      JSON.stringify({
        ...local,
        id: 'roqia-prayer:test',
        at: Date.now(),
        title: sound.title,
      }),
    );
    setMessage('زر الإيقاف متاح هنا وفي الإشعار.');
  };
  return (
    <Page title="أصوات الأذان" onBack={() => navigation.goBack()}>
      <AppText role="caption">
        التسجيلات المرفقة متاحة دون تنزيل، مع اختيار مستقل لأذان الفجر.
      </AppText>
      <Segments
        value={variant}
        options={[
          {value: 'normal', label: 'باقي الصلوات'},
          {value: 'fajr', label: 'الفجر'},
        ]}
        onChange={setVariant}
      />
      {!sounds.some(sound => sound.id === selected[variant]) && (
        <AppText role="caption">اختر صوت الأذان لهذه الصلوات.</AppText>
      )}
      {!!message && <AppText>{message}</AppText>}
      {sounds.map(sound => {
        const installed = bundledSoundAvailable(sound),
          chosen = selected[variant] === sound.id;
        return (
          <Group key={sound.id}>
            <RadioRow
              title={sound.title}
              detail={
                installed
                  ? (sound.kind === 'short' ? 'أذان قصير' : 'أذان كامل') +
                    ' · ' +
                    number(Math.round(sound.bundled.duration)) +
                    ' ثانية'
                  : 'غير متاح على هذا الجهاز'
              }
              icon="mosque"
              selected={chosen}
              disabled={busy || !installed}
              onPress={() => {
                if (!busy)
                  void act(async () => {
                    await selectSound(sound, variant);
                    setSelected(await selectedSounds());
                    await reconcilePrayer();
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
      <Banner
        text="نتبع مستوى صوت المنبه وعدم الإزعاج في الجهاز. معاينة الأذان لا تفعّل تنبيهات الصلاة."
        icon="volume"
      />
    </Page>
  );
}
