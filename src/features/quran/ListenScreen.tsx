import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {AppText, Button, Sheet, StateView} from '../../design/ui';
import {
  Banner,
  Group,
  Progress,
  RadioRow,
  SettingRow,
  SearchField,
} from '../../design/components';
import {bytes, number} from '../../design/format';
import {readRecord, saveRecord} from '../../repositories/database';
import {PlayerScreen} from '../audio/Player';
import {playback, segmentPlaybackSupported} from '../audio/controller';
import {chapters, editionById, normalizeSearch, type EditionId} from './domain';
import {remoteRecordings, prepareRemoteRecording} from './remoteRecordings';
import {useLibrary} from './context';
import {
  cachedTiming,
  bindCachedTiming,
  prepareTiming,
  prepareTimingSource,
} from './timingCache';
import {
  timingIdentity,
  timingSource,
  timingKey,
  type CachedTiming,
} from './timing';

export function QuranListenScreen({route, navigation}: any) {
  return <QuranListening route={route} navigation={navigation} />;
}

export function ReaderVerseAudio({
  editionId,
  surah,
  verse,
  onClose,
}: {
  editionId: EditionId;
  surah: number;
  verse: number;
  onClose: () => void;
}) {
  return (
    <QuranListening
      route={{params: {editionId, surah, verse}}}
      onClose={onClose}
    />
  );
}

function QuranListening({route, navigation, onClose}: any) {
  const inline = !!onClose;
  const {runtime, ready, error, revision, retry} = useLibrary();
  const editionId: EditionId =
    route.params?.editionId ?? 'warsh-kfgqpc-v2.1-update6';
  const edition = editionById(editionId),
    surah: number = route.params?.surah ?? 1;
  const choices = remoteRecordings.filter(r => r.riwaya === edition.riwaya);
  const [chosen, setChosen] = useState(''),
    [selecting, setSelecting] = useState(false);
  const [verse, setVerse] = useState<number | null>(
    route.params?.verse ?? null,
  );
  const [timing, setTiming] = useState<CachedTiming | null>(null),
    [timingBusy, setTimingBusy] = useState(false);
  const [message, setMessage] = useState(''),
    [waiting, setWaiting] = useState(false),
    [busy, setBusy] = useState(false);
  const [query, setQuery] = useState(''),
    [timedOnly, setTimedOnly] = useState(false);
  const [surahSheet, setSurahSheet] = useState(false),
    [surahQuery, setSurahQuery] = useState('');
  const focus = useRef(false),
    generation = useRef(0);
  const autoVerse = useRef(false);
  const [showPreparation, setShowPreparation] = useState(false);
  const source = choices.find(r => r.id === chosen);
  const recording = runtime.catalog.recordings.find(r => r.id === chosen);
  const chapter = recording?.chapters.find(c => c.surah === surah);
  const installed = chapter && runtime.installed(chapter.pack);
  const job =
    chapter &&
    runtime.downloads
      .listJobs()
      .find(
        j => j.packId === chapter.pack.id && j.version === chapter.pack.version,
      );
  const audioHash =
    job?.expectedHash ||
    chapter?.pack.assets.find(a => a.id === chapter.assetId)?.sha256;
  const identity =
    recording && chapter && audioHash
      ? timingIdentity(recording, surah, editionId, audioHash, job?.etag ?? '')
      : null;
  const key = identity ? timingKey(identity) : '';
  const downloading =
    job &&
    [
      'queued',
      'downloading',
      'waiting_network',
      'verifying',
      'installing',
    ].includes(job.state);

  useFocusEffect(
    useCallback(() => {
      focus.current = true;
      return () => {
        focus.current = false;
        generation.current++;
        setWaiting(false);
        autoVerse.current = false;
      };
    }, []),
  );
  useEffect(() => {
    let live = true;
    setChosen('');
    setMessage('');
    setVerse(route.params?.verse ?? null);
    autoVerse.current = !!route.params?.verse;
    void readRecord<string>('quran-audio-reciter', edition.riwaya)
      .then(saved => {
        if (live)
          setChosen(
            choices.find(r => r.id === (route.params?.recordingId ?? saved))
              ?.id ??
              (edition.riwaya === 'warsh'
                ? 'mp3quran-120-warsh'
                : 'mp3quran-1-hafs'),
          );
      })
      .catch(() => {
        if (live)
          setMessage('تعذر قراءة اختيار القارئ. اختر القارئ للمحاولة مجدداً.');
      });
    return () => {
      live = false;
    };
  }, [edition.riwaya, surah, route.params?.verse, route.params?.recordingId]);
  useEffect(() => {
    generation.current++;
    setTiming(null);
    setWaiting(false);
    setTimingBusy(false);
    return () => {
      generation.current++;
    };
  }, [chosen, surah, editionId]);
  useEffect(() => {
    const current = generation.current;
    setTiming(null);
    if (identity)
      void (
        installed && recording
          ? runtime
              .recordingDuration(recording, surah)
              .then(duration => bindCachedTiming(identity, duration))
          : cachedTiming(identity)
      )
        .then(cached => {
          if (current === generation.current) {
            setTiming(cached);
            if (
              inline &&
              (!installed ||
                cached?.status !== 'ready' ||
                !segmentPlaybackSupported())
            )
              setShowPreparation(true);
          }
        })
        .catch(() => {
          if (current === generation.current)
            setMessage('تعذر قراءة توقيت الآيات المحفوظ.');
        });
    else if (inline && chosen) setShowPreparation(true);
  }, [key, !!installed, chosen]);
  const prepare = async (force = false) => {
    if (!identity || !chapter || !recording) return;
    const current = generation.current;
    setTimingBusy(true);
    try {
      const duration = await runtime.recordingDuration(recording, surah);
      const value = await prepareTiming(identity, duration, force);
      if (current === generation.current) setTiming(value);
    } catch {
      if (current === generation.current)
        setMessage(
          'تعذر تنزيل توقيت الآيات. يمكنك الاستماع للسورة كاملة وإعادة المحاولة.',
        );
    } finally {
      if (current === generation.current) setTimingBusy(false);
    }
  };
  const play = async () => {
    if (!recording || !chapter || !installed || !focus.current) return;
    const segment =
      verse === null
        ? undefined
        : timing?.status === 'ready'
          ? timing.segments.find(s => s.verse === verse)
          : undefined;
    if (verse !== null && (!segment || !segmentPlaybackSupported())) return;
    setWaiting(false);
    autoVerse.current = false;
    setBusy(true);
    setMessage('');
    const current = generation.current;
    const isCurrent = () => focus.current && current === generation.current;
    try {
      const result = await playback.downloaded(
        [
          {
            packId: chapter.pack.id,
            version: chapter.pack.version,
            assetId: chapter.assetId,
            title: recording.title + ' · ' + chapters[surah - 1].name,
            segment,
          },
        ],
        {isCurrent},
      );
      if (!isCurrent()) return;
      if (result && inline) onClose();
      if (!result)
        setMessage('تعذر تشغيل الملف. أعد المحاولة أو أعد تنزيله من التخزين.');
    } finally {
      if (isCurrent()) setBusy(false);
    }
  };
  // Existing installations acquire their sidecar from the whole-surah player.
  // A verse tap only reads the cache; missing data has an explicit prepare action.
  useEffect(() => {
    if (installed && (verse === null || waiting) && !timing) void prepare();
  }, [key, !!installed, verse]);
  useEffect(() => {
    if (
      (waiting || autoVerse.current) &&
      installed &&
      (verse === null || timing?.status === 'ready')
    )
      void play();
  }, [revision, waiting, timing, key, !!installed, verse]);
  const download = async () => {
    if (!source) return;
    const current = generation.current;
    setBusy(true);
    setMessage('');
    try {
      const selected =
        chapter && recording
          ? recording
          : await prepareRemoteRecording(source, surah, recording);
      if (!chapter) await runtime.registerRecording(selected);
      const selectedChapter = selected.chapters.find(c => c.surah === surah)!;
      setTimingBusy(true);
      try {
        await prepareTimingSource(timingSource(selected, surah, editionId));
      } catch {
        if (current === generation.current)
          setMessage(
            'تعذر حفظ توقيت الآيات. سننزل السورة كاملة؛ يمكنك إعادة تجهيز التوقيت لاحقاً.',
          );
      } finally {
        if (current === generation.current) setTimingBusy(false);
      }
      await runtime.download(selectedChapter.pack);
      if (focus.current && current === generation.current) setWaiting(true);
      if (identity) void prepare();
    } catch {
      setMessage('تعذر بدء التنزيل. تحقق من الاتصال والمساحة ثم أعد المحاولة.');
    } finally {
      setBusy(false);
    }
  };
  const choose = (id: string) => {
    setWaiting(false);
    autoVerse.current = false;
    setChosen(id);
    setSelecting(false);
    setMessage('');
    void saveRecord('quran-audio-reciter', edition.riwaya, id).catch(() =>
      setMessage('تعذر حفظ اختيار القارئ.'),
    );
  };
  const timingReady = timing?.status === 'ready';
  const verseAllowed =
    verse === null || (timingReady && segmentPlaybackSupported());
  const intro = (
    <>
      <Group>
        {!inline && (
          <SettingRow
            title={chapters[surah - 1]?.name ?? 'اختر السورة'}
            detail="تغيير السورة"
            icon="book"
            onPress={busy ? undefined : () => setSurahSheet(true)}
          />
        )}
        <SettingRow
          title={source?.title ?? 'اختر القارئ'}
          detail={edition.title}
          icon="headphones"
          onPress={
            busy
              ? undefined
              : () => {
                  setTimedOnly(false);
                  setSelecting(true);
                }
          }
        />
      </Group>
      {error && (
        <StateView
          title="تعذر قراءة التنزيلات"
          action={{label: 'إعادة المحاولة', onPress: retry}}
        />
      )}
      {message && <AppText accessibilityRole="alert">{message}</AppText>}
      {!choices.length && (
        <StateView title="لا توجد تسجيلات متاحة لهذه الرواية" />
      )}
      {source && !source.surahs.includes(surah) && (
        <StateView
          title="لا تتوفر هذه السورة لهذا القارئ"
          action={{label: 'اختيار قارئ آخر', onPress: () => setSelecting(true)}}
        />
      )}
      {source?.surahs.includes(surah) && !chapter && (
        <>
          <AppText role="caption">
            {source.timingAvailable
              ? 'يتوفر توقيت للآيات لهذا التسجيل؛ يُجهّز مع التنزيل.'
              : 'الاستماع للسورة كاملة متاح. لا يتوفر توقيت للآيات لهذا التسجيل.'}
          </AppText>
          <Button
            label={busy ? 'جارٍ تجهيز التنزيل' : 'تنزيل السورة والتشغيل'}
            icon="download"
            disabled={!ready || error || busy}
            onPress={() => void download()}
          />
        </>
      )}
      {verse !== null && (
        <AppText role="caption">
          {'الآية ' + number(verse) + ' · يتوقف التشغيل عند نهاية الآية'}
        </AppText>
      )}
      {chapter && (
        <>
          {installed ? (
            <AppText role="caption">
              السورة محفوظة للاستماع دون اتصال
              {timingReady ? ' · توقيت الآيات محفوظ' : ''}
            </AppText>
          ) : downloading ? (
            <>
              <AppText>
                {job.state === 'waiting_network'
                  ? 'بانتظار الشبكة المسموحة في إعدادات التنزيل'
                  : 'جارٍ تنزيل السورة قبل التشغيل'}
              </AppText>
              <Progress
                value={
                  job.expectedBytes ? job.bytesReceived / job.expectedBytes : 0
                }
              />
              <AppText role="caption">
                {bytes(job.bytesReceived) + ' / ' + bytes(job.expectedBytes)}
              </AppText>
              <Button
                secondary
                label="إيقاف التنزيل مؤقتاً"
                onPress={() => {
                  setWaiting(false);
                  autoVerse.current = false;
                  void runtime.downloads
                    .pause(job.jobId)
                    .catch(() => setMessage('تعذر إيقاف التنزيل.'));
                }}
              />
              <Button
                secondary
                label="إلغاء التنزيل"
                onPress={() => {
                  setWaiting(false);
                  autoVerse.current = false;
                  void runtime.downloads
                    .cancel(job.jobId)
                    .catch(() => setMessage('تعذر إلغاء التنزيل.'));
                }}
              />
            </>
          ) : (
            <Button
              label={
                job?.state === 'paused_user'
                  ? 'متابعة التنزيل والتشغيل'
                  : job?.state === 'failed'
                    ? 'إعادة التنزيل والتشغيل'
                    : 'تنزيل السورة والتشغيل · ' +
                      bytes(
                        chapter.pack.assets.reduce((n, a) => n + a.bytes, 0),
                      )
              }
              icon="download"
              disabled={!ready || error || busy}
              onPress={() => {
                if (job?.state === 'paused_user') {
                  setWaiting(true);
                  void runtime.downloads
                    .resume(job.jobId)
                    .catch(() => setMessage('تعذر متابعة التنزيل.'));
                  void prepare();
                } else void download();
              }}
            />
          )}
          {timingBusy && (
            <AppText role="caption">
              جارٍ تجهيز توقيت الآيات للاستماع دون اتصال
            </AppText>
          )}
          {!timingBusy && !timingReady && (
            <>
              <AppText role="caption">
                {timing?.status === 'invalid'
                  ? 'توقيت الآيات غير صالح لهذا التسجيل. الاستماع للسورة كاملة متاح.'
                  : timing?.status === 'unavailable'
                    ? 'لا يتوفر توقيت للآيات لهذا التسجيل. الاستماع للسورة كاملة متاح.'
                    : 'توقيت الآيات لم يُحفظ بعد.'}
              </AppText>
              {installed && (
                <Button
                  secondary
                  label="إعادة محاولة تجهيز توقيت الآيات"
                  disabled={busy}
                  onPress={() => void prepare(true)}
                />
              )}
            </>
          )}
          {verse !== null && !segmentPlaybackSupported() && (
            <AppText>تشغيل الآية منفردة غير متاح على هذا الجهاز.</AppText>
          )}
          {verse !== null && (
            <Button
              secondary
              compact
              label="الاستماع للسورة كاملة"
              disabled={busy}
              onPress={() => {
                autoVerse.current = false;
                setVerse(null);
                setWaiting(true);
              }}
            />
          )}
        </>
      )}
      {verse !== null && !chapter && source?.surahs.includes(surah) && (
        <Button
          secondary
          compact
          label="تنزيل السورة كاملة والتشغيل"
          disabled={busy}
          onPress={() => {
            autoVerse.current = false;
            setVerse(null);
            void download();
          }}
        />
      )}
      {verse !== null && !timingReady && (
        <Button
          secondary
          label="اختيار قارئ تتوفر له توقيتات الآيات"
          disabled={busy}
          onPress={() => {
            setQuery('');
            setTimedOnly(true);
            setSelecting(true);
          }}
        />
      )}
    </>
  );
  const selectors = (
    <>
      <Sheet
        title={'اختر القارئ · ' + edition.title}
        visible={selecting}
        onClose={() => setSelecting(false)}>
        <SearchField label="ابحث عن قارئ" value={query} onChange={setQuery} />
        {timedOnly && (
          <Banner text="تظهر تسجيلات الرواية نفسها التي لها توقيتات في المصدر. يُتحقق من توقيت السورة بعد التنزيل." />
        )}
        {choices
          .filter(
            r =>
              (!timedOnly || r.timingAvailable) &&
              (!query ||
                normalizeSearch(r.title).includes(normalizeSearch(query))),
          )
          .map(r => (
            <RadioRow
              key={r.id}
              title={r.title}
              detail={
                r.label +
                ' · ' +
                (r.surahs.includes(surah)
                  ? number(r.surahs.length) +
                    ' سورة · ' +
                    (r.timingAvailable
                      ? 'توقيت الآيات متاح'
                      : 'السورة كاملة فقط')
                  : 'هذه السورة غير متاحة')
              }
              selected={r.id === chosen}
              onPress={() => choose(r.id)}
            />
          ))}
      </Sheet>
      <Sheet
        title="اختر السورة"
        visible={surahSheet}
        onClose={() => setSurahSheet(false)}>
        <SearchField
          label="ابحث عن سورة"
          value={surahQuery}
          onChange={setSurahQuery}
        />
        {chapters
          .filter(
            c =>
              !surahQuery ||
              normalizeSearch(c.name).includes(normalizeSearch(surahQuery)) ||
              String(c.number) === surahQuery,
          )
          .map(c => (
            <RadioRow
              key={c.number}
              title={number(c.number) + ' · ' + c.name}
              detail={
                source && !source.surahs.includes(c.number)
                  ? 'غير متاحة لهذا القارئ'
                  : undefined
              }
              selected={c.number === surah}
              onPress={() => {
                setWaiting(false);
                setSurahSheet(false);
                setSurahQuery('');
                navigation.setParams({surah: c.number, verse: undefined});
              }}
            />
          ))}
      </Sheet>
    </>
  );
  if (inline)
    return (
      <>
        {!showPreparation && !message && !error && (
          <AppText
            role="caption"
            accessibilityLiveRegion="polite"
            style={{textAlign: 'center', padding: 6}}>
            جارٍ تجهيز الاستماع…
          </AppText>
        )}
        <Sheet
          visible={(showPreparation || !!message || error) && !selecting}
          title={
            chapters[surah - 1].name + ' · الآية ' + number(route.params.verse)
          }
          onClose={() => {
            generation.current++;
            focus.current = false;
            onClose();
          }}>
          {intro}
          {busy && <StateView title="جارٍ تجهيز الاستماع" busy />}
          {installed && verseAllowed && (
            <Button
              label="تشغيل"
              icon="play"
              disabled={!ready || error || busy}
              onPress={() => void play()}
            />
          )}
        </Sheet>
        {selectors}
      </>
    );
  return (
    <PlayerScreen
      navigation={navigation}
      intro={
        <>
          {intro}
          {selectors}
        </>
      }
      contextPackId={chapter?.pack.id ?? ''}
      contextVerse={verse}
      contextTitle={
        verse === null ? chapters[surah - 1]?.name : 'الآية ' + number(verse)
      }
      contextArtist={source?.title}
      onStart={
        installed
          ? verseAllowed
            ? () => void play()
            : undefined
          : source?.surahs.includes(surah)
            ? () => void download()
            : undefined
      }
      startLabel={installed ? 'تشغيل' : 'تنزيل السورة والتشغيل'}
      startDisabled={
        !ready ||
        error ||
        busy ||
        !!downloading ||
        (verse !== null && !installed && !source?.timingAvailable)
      }
    />
  );
}
