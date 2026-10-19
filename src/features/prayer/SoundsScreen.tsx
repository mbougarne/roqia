import React, {useState} from 'react';
import {Alert, Platform} from 'react-native';

import {reconcilePrayer, requestPrayerPermission} from './service';
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
import {Banner, Group, SettingRow, RadioRow} from '../../design/components';
import {Page, IconButton, Button} from '../../design/ui';
import {useFormat} from '../../design/useFormat';
import {playback} from '../audio/controller';
import {useOnFocus} from '../quran/context';

export function SoundsScreen({navigation}: any) {
  const {number} = useFormat();
  const [selected, setSelected] = useState<SoundSelection>({
    normal: null,
    fajr: null,
  });
  const [busy, setBusy] = useState(false);
  useOnFocus(() => {
    void selectedSounds()
      .then(setSelected)
      .catch(() =>
        Alert.alert(
          'تعذر استرجاع الصوت المختار',
          'أعد فتح الصفحة للمحاولة مجددا.',
        ),
      );
  }, []);
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } catch {
      Alert.alert(
        'تعذر إكمال العملية',
        'تحقق من المساحة وإذن الإشعارات والمنبهات، ثم أعد المحاولة.',
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
  };
  return (
    <Page title="أصوات الأذان" onBack={() => navigation.goBack()}>
      {sounds.map(sound => {
        const installed = bundledSoundAvailable(sound),
          chosen = selected.normal === sound.id && selected.fajr === sound.id;
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
                    await selectSound(sound, 'all');
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
          void act(() => reconcilePrayer());
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
