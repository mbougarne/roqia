import React, {useState} from 'react';
import {Pressable, View} from 'react-native';
import {
  AppIcon,
  AppText,
  Button,
  Card,
  IconButton,
  Page,
  Row,
  StateView,
  usePalette,
} from '../../design/ui';
import {
  Banner,
  Disclosure,
  Group,
  NumberBadge,
  Ornament,
  RadioRow,
  SearchField,
  Segments,
  SettingRow,
  rtlRow,
} from '../../design/components';
import {bytes, ltr, number} from '../../design/format';
import {
  chapters,
  editions,
  editionById,
  selectedAudio,
  type EditionId,
} from './domain';
import {useLibrary, useOnFocus} from './context';
import {act} from './LibraryScreens';
import {playback} from '../audio/controller';
export function QuranAudioScreen({route, navigation}: any) {
  const {runtime, ready, error, retry} = useLibrary(),
    p = usePalette();
  const [id, setId] = useState<EditionId>(
      route.params?.editionId ?? editions[0].id,
    ),
    [chosen, setChosen] = useState(''),
    [selected, setSelected] = useState<number[]>(
      route.params?.surah ? [route.params.surah] : [],
    ),
    [pending, setPending] = useState(false),
    [stage, setStage] = useState(false),
    [query, setQuery] = useState('');
  useOnFocus(() => {
    if (!route.params?.editionId)
      act(runtime.preferred().then(e => setId(e.id)));
  }, [runtime, route.params?.editionId]);
  const recordings = runtime.catalog.recordings.filter(
      r => r.riwaya === editionById(id).riwaya,
    ),
    recording = recordings.find(r => r.id === chosen),
    selection = recording
      ? selectedAudio(
          recording,
          selected.filter(n => recording.chapters.some(c => c.surah === n)),
        )
      : null;
  const download = () => {
    if (!selection) return;
    setPending(true);
    act(
      (async () => {
        try {
          for (const c of selection.rows) await runtime.download(c.pack);
          navigation.navigate('Downloads');
        } finally {
          setPending(false);
        }
      })(),
    );
  };
  return (
    <Page
      title={stage ? 'تحميل التلاوات' : 'اختر القارئ'}
      subtitle={stage ? recording?.title : undefined}
      onBack={() => (stage ? setStage(false) : navigation.goBack())}
      footer={
        stage && selection ? (
          <>
            <AppText role="caption">
              {number(selection.rows.length) +
                ' سور · ' +
                bytes(selection.bytes)}
            </AppText>
            <Button
              label="تحميل المحدد"
              icon="download"
              disabled={!ready || error || pending || !selection.rows.length}
              onPress={download}
            />
          </>
        ) : undefined
      }>
      {error && (
        <StateView
          title="تعذر قراءة التنزيلات"
          action={{label: 'إعادة المحاولة', onPress: retry}}
        />
      )}
      {!stage ? (
        <>
          <Ornament title="الرواية" />
          <Segments
            value={id}
            options={editions.map(e => ({value: e.id, label: e.title}))}
            onChange={v => {
              setId(v);
              setChosen('');
              setSelected([]);
            }}
          />
          <SearchField label="ابحث عن قارئ" value={query} onChange={setQuery} />
          {!recordings.length && (
            <StateView title="لا توجد تسجيلات متاحة لهذه الرواية بعد" />
          )}
          {recordings
            .filter(r => !query || r.title.includes(query))
            .map(r => (
              <RadioRow
                key={r.id}
                title={r.title}
                detail={
                  r.quality +
                  ' · ' +
                  number(r.chapters.length) +
                  ' سورة' +
                  (r.tariq ? ' · ' + r.tariq : '')
                }
                icon="headphones"
                selected={chosen === r.id}
                onPress={() => {
                  setChosen(r.id);
                  setSelected([]);
                }}
              />
            ))}
          <Banner text="تظهر التلاوات المتوافقة مع الرواية المختارة. لا يبدأ التنزيل بمجرد الاختيار." />
          <View style={{minHeight: 20}} />
          <Button
            label="اختيار السور"
            disabled={!recording}
            onPress={() => {
              setStage(true);
              setQuery('');
            }}
          />
          <Row
            title="مكتبتي الصوتية"
            icon="headphones"
            onPress={() => navigation.navigate('QuranOfflineAudio')}
          />
        </>
      ) : (
        recording &&
        selection && (
          <>
            <SearchField
              label="ابحث عن سورة"
              value={query}
              onChange={setQuery}
            />
            <SettingRow
              title={
                selected.length === recording.chapters.length
                  ? 'إلغاء الاختيار'
                  : 'تحديد كل السور المتاحة'
              }
              icon="check"
              onPress={() =>
                setSelected(
                  selected.length === recording.chapters.length
                    ? []
                    : recording.chapters.map(c => c.surah),
                )
              }
            />
            {recording.chapters
              .filter(c => !query || chapters[c.surah - 1].name.includes(query))
              .map(c => (
                <Pressable
                  key={c.surah}
                  accessibilityRole="checkbox"
                  accessibilityLabel={
                    number(c.surah) + ' · ' + chapters[c.surah - 1].name
                  }
                  accessibilityState={{checked: selected.includes(c.surah)}}
                  onPress={() =>
                    setSelected(s =>
                      s.includes(c.surah)
                        ? s.filter(n => n !== c.surah)
                        : [...s, c.surah],
                    )
                  }
                  style={{
                    ...rtlRow,
                    padding: 12,
                    minHeight: 64,
                    borderWidth: 1,
                    borderColor: p.borderSubtle,
                    borderRadius: 12,
                    backgroundColor: p.surface,
                  }}>
                  <NumberBadge value={c.surah} />
                  <View style={{flex: 1}}>
                    <AppText role="bodyStrong">
                      {chapters[c.surah - 1].name}
                    </AppText>
                    <AppText role="caption">
                      {bytes(c.pack.assets.reduce((n, a) => n + a.bytes, 0))}
                      {runtime.installed(c.pack) ? ' · محفوظة' : ''}
                    </AppText>
                  </View>
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 4,
                      borderWidth: 1,
                      borderColor: p.borderControl,
                      backgroundColor: selected.includes(c.surah)
                        ? p.actionPrimary
                        : p.surface,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    {selected.includes(c.surah) && (
                      <AppIcon name="check" size={16} color={p.textOnAction} />
                    )}
                  </View>
                </Pressable>
              ))}
            <Group>
              <SettingRow
                title="سياسة التنزيل"
                detail="حسب Wi-Fi في الإعدادات"
                icon="wifi"
                onPress={() => navigation.navigate('Settings')}
              />
              <SettingRow
                title={number(selection.rows.length) + ' سور'}
                detail={bytes(selection.bytes)}
                icon="storage"
              />
            </Group>
            <Disclosure title="معلومات التسجيل">
              <AppText role="caption">{recording.notice}</AppText>
              <AppText role="caption">
                {selection.complete
                  ? 'التسجيل يضم 114 سورة'
                  : 'هذا التسجيل غير مكتمل؛ تظهر السور المتاحة فقط'}
              </AppText>
            </Disclosure>
          </>
        )
      )}
    </Page>
  );
}
export function OfflineAudioScreen({navigation}: any) {
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
        .then(() => navigation.navigate('Player')),
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
                onPress={() => play(r, [c])}
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
