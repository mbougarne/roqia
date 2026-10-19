import React, {useEffect, useState} from 'react';
import {Pressable, View} from 'react-native';

import {useLibrary} from './context';
import {chapters} from './domain';
import {act} from './LibraryScreens';
import {
  Banner,
  Group,
  NumberBadge,
  SettingRow,
  rtlRow,
} from '../../design/components';
import {
  AppIcon,
  AppText,
  Button,
  Page,
  Row,
  StateView,
  usePalette,
} from '../../design/ui';
import {useFormat} from '../../design/useFormat';
import {playback} from '../audio/controller';

// Keep existing links and library entry points on the same listening flow.
export function QuranAudioScreen({route, navigation}: any) {
  const {runtime, ready, error, retry} = useLibrary();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!ready || error) return;
    let current = true;
    void runtime
      .preferred()
      .then(edition => {
        if (current)
          navigation.replace('QuranPlayer', {
            editionId: route.params?.editionId ?? edition.id,
            surah: route.params?.surah ?? 1,
          });
      })
      .catch(() => {
        if (current) setFailed(true);
      });
    return () => {
      current = false;
    };
  }, [
    ready,
    error,
    runtime,
    navigation,
    route.params?.editionId,
    route.params?.surah,
    attempt,
  ]);
  return (
    <Page title="الاستماع" onBack={() => navigation.goBack()}>
      <StateView
        title={error || failed ? 'تعذر فتح المشغل' : 'جارٍ فتح المشغل'}
        busy={!error && !failed}
        action={
          error || failed
            ? {
                label: 'إعادة المحاولة',
                onPress: () => {
                  setFailed(false);
                  setAttempt(n => n + 1);
                  retry();
                },
              }
            : undefined
        }
      />
    </Page>
  );
}

export function OfflineAudioScreen({navigation}: any) {
  const {number} = useFormat();
  const {runtime, error, retry} = useLibrary(),
    p = usePalette();
  const recordings = runtime.catalog.recordings
    .map(r => ({
      ...r,
      chapters: r.chapters.filter(c => runtime.installed(c.pack)),
    }))
    .filter(r => r.chapters.length);
  const play = (r: (typeof recordings)[number], selected = r.chapters) =>
    act(
      playback
        .downloaded(
          selected.map(c => ({
            packId: c.pack.id,
            version: c.pack.version,
            assetId: c.assetId,
            title: r.title + ' · ' + chapters[c.surah - 1].name,
          })),
        )
        .then(started => {
          if (started) navigation.navigate('Player');
        }),
    );
  return (
    <Page title="مكتبتي الصوتية" onBack={() => navigation.goBack()}>
      <Banner icon="offline" text="التلاوات المحفوظة متاحة دون اتصال" />
      {error && (
        <StateView
          title="تعذر قراءة المكتبة"
          action={{label: 'إعادة المحاولة', onPress: retry}}
        />
      )}
      {!recordings.length && (
        <StateView
          title="لا توجد تلاوات محفوظة"
          action={{
            label: 'اختيار قارئ',
            onPress: () => navigation.navigate('QuranAudio'),
          }}
        />
      )}
      {recordings.map(r => (
        <Group key={r.id}>
          <SettingRow
            title={r.title}
            detail={
              (r.riwaya === 'warsh' ? 'ورش عن نافع' : 'حفص عن عاصم') +
              ' · ' +
              number(r.chapters.length) +
              ' سورة'
            }
            icon="headphones"
            onPress={() => play(r)}
          />
          {r.chapters.map(c => (
            <View
              key={c.surah}
              style={{
                ...rtlRow,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderTopWidth: 0.5,
                borderColor: p.borderSubtle,
              }}>
              <NumberBadge value={c.surah} />
              <AppText role="bodyStrong" style={{flex: 1}}>
                {chapters[c.surah - 1].name}
              </AppText>
              <AppIcon name="check" size={18} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={'استماع إلى ' + chapters[c.surah - 1].name}
                onPress={() =>
                  navigation.navigate('QuranPlayer', {
                    editionId:
                      r.riwaya === 'warsh'
                        ? 'warsh-kfgqpc-v2.1-update6'
                        : 'hafs-tanzil-uthmani-1.1',
                    surah: c.surah,
                    recordingId: r.id,
                  })
                }
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: p.actionPrimary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <AppIcon name="play" color={p.textOnAction} />
              </Pressable>
            </View>
          ))}
          <Button
            secondary
            label="استماع إلى السور المحفوظة"
            onPress={() => play(r)}
          />
        </Group>
      ))}
      <Button
        icon="plus"
        label="إضافة تلاوات"
        onPress={() => navigation.navigate('QuranAudio')}
      />
      <Row
        title="إدارة التخزين"
        icon="storage"
        onPress={() => navigation.navigate('Storage')}
      />
    </Page>
  );
}
