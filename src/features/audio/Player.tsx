import React, {useEffect, useState, useSyncExternalStore} from 'react';
import TrackPlayer, {
  RepeatMode,
  Event,
  useTrackPlayerEvents,
} from 'react-native-track-player';
import {I18nManager, View} from 'react-native';
import {
  useActiveTrack,
  usePlaybackState,
  useProgress,
  State,
} from 'react-native-track-player';
import {
  AppText,
  Button,
  Card,
  IconButton,
  Input,
  Page,
  usePalette,
} from '../../design/ui';
import {number, ltr} from '../../design/format';
import {audioErrors, playback, restoreDownloadedSession} from './controller';
import {readRecord} from '../../repositories/database';
export function MiniPlayer({onOpen}: {onOpen: () => void}) {
  const track = useActiveTrack(),
    state = usePlaybackState().state,
    p = usePalette();
  const error = useSyncExternalStore(
    audioErrors.subscribe,
    audioErrors.getSnapshot,
  );
  if (!track && !error) return null;
  return (
    <View
      style={{
        backgroundColor: p.surfaceRaised,
        borderTopColor: p.borderSubtle,
        borderTopWidth: 1,
        padding: 8,
      }}>
      {error && (
        <AppText accessibilityLiveRegion="polite" style={{color: p.danger}}>
          {error}
        </AppText>
      )}
      {track && (
        <View
          style={{
            flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
            alignItems: 'center',
          }}>
          <View style={{flex: 1}}>
            <AppText role="caption">{track.title}</AppText>
            <Button compact label="المشغل" onPress={onOpen} secondary />
          </View>
          <IconButton
            name={state === State.Playing ? 'pause' : 'play'}
            label={state === State.Playing ? 'إيقاف مؤقت' : 'متابعة الصوت'}
            onPress={() => {
              void playback.toggle();
            }}
          />
          <IconButton
            name="stop"
            label="إيقاف الصوت"
            onPress={() => {
              void playback.stop();
            }}
          />
        </View>
      )}
    </View>
  );
}
export function PlayerScreen({navigation}: any) {
  const track = useActiveTrack(),
    {position, duration} = useProgress(),
    state = usePlaybackState().state;
  const [rate, setRate] = useState(1),
    [repeat, setRepeat] = useState(RepeatMode.Off),
    [queue, setQueue] = useState<string[]>([]),
    [seek, setSeek] = useState(''),
    [resume, setResume] = useState(false);
  const error = useSyncExternalStore(
    audioErrors.subscribe,
    audioErrors.getSnapshot,
  );
  const refresh = () => {
    void Promise.all([
      TrackPlayer.getRate(),
      TrackPlayer.getRepeatMode(),
      TrackPlayer.getQueue(),
    ])
      .then(([r, m, q]) => {
        setRate(r);
        setRepeat(m);
        setQueue(q.map(t => t.title ?? ''));
      })
      .catch(() => undefined);
  };
  useEffect(() => {
    refresh();
    void readRecord<any>('playback', 'session')
      .then(s => setResume(!!s?.downloadEntries?.length))
      .catch(() => undefined);
  }, [track?.id]);
  useTrackPlayerEvents([Event.PlaybackActiveTrackChanged], refresh);
  const clock = (s: number) =>
    ltr(
      `${number(Math.floor(s / 60))}:${String(Math.floor(s % 60)).padStart(2, '0')}`,
    );
  return (
    <Page title="المشغل" onBack={() => navigation.goBack()}>
      <Card>
        <AppText role="sectionTitle">
          {track?.title ?? 'اختر مقطعاً للاستماع'}
        </AppText>
        {error && <AppText accessibilityLiveRegion="polite">{error}</AppText>}
        {!track && resume && (
          <Button
            label="استعادة موضع الاستماع دون تشغيل"
            onPress={() => {
              void restoreDownloadedSession().catch(() => setResume(false));
            }}
          />
        )}
        <AppText style={{textAlign: 'center', writingDirection: 'ltr'}}>
          {clock(position)} / {clock(duration)}
        </AppText>
        <Button
          label={state === State.Playing ? 'إيقاف مؤقت' : 'تشغيل'}
          disabled={!track}
          onPress={() => {
            void playback.toggle();
          }}
        />
        <Button
          secondary
          label="تقديم 15 ثانية"
          disabled={!track || !duration}
          onPress={() => {
            void playback.seek(Math.min(duration, position + 15));
          }}
        />
        <Button
          secondary
          label="رجوع 15 ثانية"
          disabled={!track}
          onPress={() => {
            void playback.seek(Math.max(0, position - 15));
          }}
        />
        <Input
          label="الانتقال إلى الثانية"
          value={seek}
          onChangeText={setSeek}
          keyboardType="numeric"
          style={{writingDirection: 'ltr', textAlign: 'left'}}
        />
        <Button
          secondary
          label="انتقال"
          disabled={
            !track || !/^\d+(\.\d+)?$/.test(seek) || Number(seek) > duration
          }
          onPress={() => {
            void playback.seek(Number(seek));
          }}
        />
        <Button
          secondary
          label="المقطع التالي"
          disabled={!track || queue.length < 2}
          onPress={() => {
            void playback.next();
          }}
        />
        <Button
          secondary
          label="المقطع السابق"
          disabled={!track || queue.length < 2}
          onPress={() => {
            void playback.previous();
          }}
        />
        <Button
          secondary
          label="إيقاف الصوت"
          disabled={!track}
          onPress={() => {
            void playback.stop();
          }}
        />
      </Card>
      <AppText role="sectionTitle">سرعة التشغيل</AppText>
      {[0.75, 1, 1.25, 1.5].map(r => (
        <Button
          key={r}
          label={`${ltr(String(r))}×`}
          selected={rate === r}
          secondary={rate !== r}
          disabled={!track}
          onPress={() => {
            void playback.rate(r).then(refresh);
          }}
        />
      ))}
      <AppText role="sectionTitle">التكرار</AppText>
      {[
        [RepeatMode.Off, 'دون تكرار'],
        [RepeatMode.Track, 'تكرار المقطع'],
        [RepeatMode.Queue, 'تكرار القائمة'],
      ].map(([m, label]) => (
        <Button
          key={m}
          label={String(label)}
          selected={repeat === m}
          secondary={repeat !== m}
          disabled={!track}
          onPress={() => {
            void playback.repeat(m as RepeatMode).then(refresh);
          }}
        />
      ))}
      <AppText role="sectionTitle">مؤقت النوم</AppText>
      <AppText>
        غير متاح بعد. لا يعتمد التطبيق على مؤقت قد يتوقف عند إغلاق الشاشة.
      </AppText>
      <AppText role="sectionTitle">
        قائمة الاستماع · {number(queue.length)}
      </AppText>
      {queue.slice(0, 114).map((title, i) => (
        <AppText key={i}>
          {number(i + 1)} · {title}
        </AppText>
      ))}
    </Page>
  );
}
