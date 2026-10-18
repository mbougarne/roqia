import React, {useState} from 'react';
import {Linking, Platform} from 'react-native';
import {AppText, Button, Card, Page, StateView} from '../../design/ui';
import {number} from '../../design/format';
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
      <AppText>
        نزّل التسجيل الذي تختاره مرة واحدة للاستماع دون اتصال. اختر نسخة الفجر
        بشكل مستقل؛ لا نضيف أي عبارة إلى التسجيل.
      </AppText>
      {(!ready || error) && (
        <StateView
          title={error ? 'تعذر تحميل التنزيلات' : 'جار تحميل التنزيلات'}
          action={error ? {label: 'إعادة المحاولة', onPress: retry} : undefined}
        />
      )}
      {!!message && <AppText>{message}</AppText>}
      <Button
        label="إيقاف الأذان"
        onPress={() => {
          adhanNative()?.stopAdhan();
          void act(async () => {
            await reconcilePrayer();
            setMessage('تم إيقاف التشغيل وإلغاء التجربة.');
          });
        }}
      />
      {sounds.map(sound => {
        const installed = !!runtime.installed(sound.pack),
          chosen = selected[sound.variant] === sound.id;
        return (
          <Card key={sound.id}>
            <AppText role="sectionTitle">{sound.title}</AppText>
            <AppText>
              {sound.variant === 'fajr'
                ? 'نسخة الفجر'
                : 'للظهر والعصر والمغرب والعشاء'}{' '}
              ·{' '}
              {number(sound.pack.assets[0].bytes / 1048576, {
                maximumFractionDigits: 1,
              })}{' '}
              MB
            </AppText>
            <AppText role="caption">{sound.notice}</AppText>
            {!installed ? (
              <Button
                label={`تنزيل ${sound.title}`}
                disabled={!ready || busy}
                onPress={() =>
                  void act(async () => {
                    await runtime.download(sound.pack);
                    navigation.navigate('Downloads');
                  })
                }
              />
            ) : (
              <>
                <Button
                  label={
                    chosen ? `✓ مختار: ${sound.title}` : `اختيار ${sound.title}`
                  }
                  disabled={busy}
                  secondary={!chosen}
                  onPress={() =>
                    void act(async () => {
                      await selectSound(sound);
                      setSelected(await selectedSounds());
                      await reconcilePrayer();
                    })
                  }
                />
                <Button
                  label={`استماع: ${sound.title}`}
                  secondary
                  disabled={busy || Platform.OS !== 'android'}
                  onPress={() => void act(() => preview(sound))}
                />
                <Button
                  label={`تجربة بعد 10 ثوان: ${sound.title}`}
                  secondary
                  disabled={busy || Platform.OS !== 'android'}
                  onPress={() => void act(() => preview(sound, true))}
                />
              </>
            )}
            <Button
              label={`مصدر ${sound.title}`}
              secondary
              onPress={() =>
                void Linking.openURL(sound.pack.sourceMetadata.sourceUrl)
              }
            />
            <Button
              label={`حقوق استخدام ${sound.title}`}
              secondary
              onPress={() =>
                void Linking.openURL(sound.pack.sourceMetadata.rightsUrl)
              }
            />
          </Card>
        );
      })}
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
      <AppText>
        نتبع مستوى صوت المنبه وعدم الإزعاج. لا نرفع الصوت تلقائيا. معاينة الأذان
        لا تفعّل تنبيهات الصلاة.
      </AppText>
    </Page>
  );
}
