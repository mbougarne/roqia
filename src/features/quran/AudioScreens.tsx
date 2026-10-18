import React, {useState} from 'react';
import {AppText, Button, Card, Page, Row, StateView} from '../../design/ui';
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
    [id, setId] = useState<EditionId>(
      route.params?.editionId ?? editions[0].id,
    ),
    [chosen, setChosen] = useState(''),
    [selected, setSelected] = useState<number[]>(
      route.params?.surah ? [route.params.surah] : [],
    ),
    [pending, setPending] = useState(false);
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
  return (
    <Page title="القراء والتنزيلات الصوتية" onBack={() => navigation.goBack()}>
      {editions.map(e => (
        <Button
          key={e.id}
          label={e.title}
          selected={id === e.id}
          secondary={id !== e.id}
          onPress={() => {
            setId(e.id);
            setChosen('');
            setSelected([]);
          }}
        />
      ))}
      <Button
        secondary
        label="مكتبتي الصوتية"
        onPress={() => navigation.navigate('QuranOfflineAudio')}
      />
      {error && (
        <StateView
          title="تعذر قراءة التنزيلات"
          action={{label: 'إعادة المحاولة', onPress: retry}}
        />
      )}
      {!recordings.length && (
        <StateView
          title="لا توجد تسجيلات متاحة لهذه الرواية بعد"
          description="تظهر التسجيلات بعد التحقق من القارئ والرواية وملفات الصوت. لن نستبدل ورش بحفص عند غياب التسجيل."
        />
      )}
      {recordings.map(r => (
        <Row
          key={r.id}
          title={r.title}
          detail={`${r.quality} · ${number(r.chapters.length)} سورة${r.tariq ? ` · ${r.tariq}` : ''}`}
          onPress={() => {
            setChosen(r.id);
            setSelected([]);
          }}
        />
      ))}
      {recording && selection && (
        <>
          <AppText role="sectionTitle">{recording.title}</AppText>
          <AppText>{recording.notice}</AppText>
          <AppText>
            {selection.complete
              ? 'التسجيل يضم 114 سورة'
              : 'هذا التسجيل غير مكتمل؛ تظهر السور المتاحة فقط'}
          </AppText>
          <Button
            secondary
            label={
              selection.complete
                ? 'اختيار المصحف كاملا'
                : 'اختيار كل السور المتاحة'
            }
            onPress={() => setSelected(recording.chapters.map(c => c.surah))}
          />
          <Button
            secondary
            label="إلغاء الاختيار"
            onPress={() => setSelected([])}
          />
          <Button
            label={`تنزيل المختار · ${number(selection.rows.length)} · ${ltr(bytes(selection.bytes))}`}
            disabled={!ready || error || pending || !selection.rows.length}
            onPress={() => {
              setPending(true);
              act(
                (async () => {
                  try {
                    for (const c of selection.rows)
                      await runtime.download(c.pack);
                    navigation.navigate('Downloads');
                  } finally {
                    setPending(false);
                  }
                })(),
              );
            }}
          />
          <AppText role="caption">
            الحجم يمثل الملفات المختارة. الملفات المكتملة لا تنزل مرة أخرى. تطبق
            سياسة Wi-Fi من الإعدادات.
          </AppText>
          {recording.chapters.map(c => (
            <Card key={c.surah}>
              <Button
                label={`${number(c.surah)} · ${chapters[c.surah - 1].name}`}
                selected={selected.includes(c.surah)}
                secondary={!selected.includes(c.surah)}
                onPress={() =>
                  setSelected(s =>
                    s.includes(c.surah)
                      ? s.filter(n => n !== c.surah)
                      : [...s, c.surah],
                  )
                }
              />
              {runtime.installed(c.pack) && (
                <Button
                  secondary
                  label="استماع إلى الملف المحفوظ"
                  onPress={() =>
                    act(
                      playback.downloaded([
                        {
                          packId: c.pack.id,
                          version: c.pack.version,
                          assetId: c.assetId,
                          title: `${recording.title} · ${chapters[c.surah - 1].name}`,
                        },
                      ]),
                    )
                  }
                />
              )}
            </Card>
          ))}
          <AppText role="caption">
            المعاينة متاحة للملف المحفوظ. لا يبدأ بث الصوت أو تنزيله بمجرد
            اختيار القارئ.
          </AppText>
        </>
      )}
    </Page>
  );
}
export function OfflineAudioScreen({navigation}: any) {
  const {runtime, error, retry} = useLibrary();
  const recordings = runtime.catalog.recordings
    .map(r => ({
      ...r,
      chapters: r.chapters.filter(c => runtime.installed(c.pack)),
    }))
    .filter(r => r.chapters.length);
  return (
    <Page title="مكتبتي الصوتية" onBack={() => navigation.goBack()}>
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
        <Card key={r.id}>
          <AppText role="sectionTitle">{r.title}</AppText>
          <AppText>
            {r.riwaya === 'warsh' ? 'ورش عن نافع' : 'حفص عن عاصم'} ·{' '}
            {number(r.chapters.length)} سورة
          </AppText>
          <Button
            label="استماع إلى السور المحفوظة"
            onPress={() =>
              act(
                playback
                  .downloaded(
                    r.chapters.map(c => ({
                      packId: c.pack.id,
                      version: c.pack.version,
                      assetId: c.assetId,
                      title: `${r.title} · ${chapters[c.surah - 1].name}`,
                    })),
                  )
                  .then(() => navigation.navigate('Player')),
              )
            }
          />
          {r.chapters.map(c => (
            <Button
              key={c.surah}
              secondary
              label={`${number(c.surah)} · ${chapters[c.surah - 1].name}`}
              onPress={() =>
                act(
                  playback
                    .downloaded([
                      {
                        packId: c.pack.id,
                        version: c.pack.version,
                        assetId: c.assetId,
                        title: `${r.title} · ${chapters[c.surah - 1].name}`,
                      },
                    ])
                    .then(() => navigation.navigate('Player')),
                )
              }
            />
          ))}
        </Card>
      ))}
      <Button
        secondary
        label="إدارة التخزين"
        onPress={() => navigation.navigate('Storage')}
      />
    </Page>
  );
}
