import {PanelArtwork} from '../../design/PanelArtwork';
import React, {
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';
import TrackPlayer, {
  RepeatMode,
  Event,
  useTrackPlayerEvents,
} from 'react-native-track-player';
import {
  AppState,
  I18nManager,
  Pressable,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  useActiveTrack,
  usePlaybackState,
  useProgress,
  State,
} from 'react-native-track-player';
import {
  AppIcon,
  Sheet,
  AppText,
  Button,
  Card,
  IconButton,
  Input,
  Page,
  usePalette,
} from '../../design/ui';
import {themeContext} from '../../store';
import {number, ltr} from '../../design/format';
import {audioErrors, playback, restoreDownloadedSession} from './controller';
import {readRecord} from '../../repositories/database';
import {Waveform} from '../../design/Waveform';
import {ListeningArtwork} from '../../design/ListeningArtwork';
import {
  Disclosure,
  Group,
  Ornament,
  Progress,
  Range,
  Segments,
  SettingRow,
  rtlRow,
} from '../../design/components';
import {sleepDeadline, sleepSupported} from './sleep';
export function MiniPlayer({onOpen}: {onOpen: () => void}) {
  const track = useActiveTrack(),
    state = usePlaybackState().state,
    p = usePalette();
  const error = useSyncExternalStore(
    audioErrors.subscribe,
    audioErrors.getSnapshot,
  );
  const {position, duration} = useProgress();
  const light = useContext(themeContext).mode === 'light';
  const ink = '#F7F5EF';
  const control = light ? '#FFFFFF' : p.actionPrimary;
  if (!track && !error) return null;
  return (
    <View
      style={{
        backgroundColor: light ? p.actionPrimary : p.surface,
        marginHorizontal: 12,
        marginBottom: 6,
        overflow: 'hidden',
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: p.borderSubtle,
      }}>
      <PanelArtwork color={control} />
      {error && (
        <AppText accessibilityRole="alert" role="caption" style={{color: ink}}>
          {error}
        </AppText>
      )}
      {track && (
        <>
          <View style={rtlRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="المشغل"
              onPress={onOpen}
              style={{flex: 1, minHeight: 48, justifyContent: 'center'}}>
              <AppText role="bodyStrong" numberOfLines={1} style={{color: ink}}>
                {track.title}
              </AppText>
              <AppText
                role="caption"
                numberOfLines={1}
                style={{color: ink, opacity: 0.75}}>
                {track.artist}
              </AppText>
            </Pressable>
            <View style={{flex: 0.8}}>
              <Waveform color={control} />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                state === State.Playing ? 'إيقاف مؤقت' : 'متابعة الصوت'
              }
              onPress={() => void playback.toggle()}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: control,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <AppIcon
                name={state === State.Playing ? 'pause' : 'play'}
                color="#12392E"
              />
            </Pressable>
          </View>
          <View
            accessibilityRole="progressbar"
            accessibilityValue={{
              min: 0,
              max: 100,
              now: Math.round(duration ? (position / duration) * 100 : 0),
            }}
            style={{
              height: 3,
              backgroundColor: '#FFFFFF25',
              borderRadius: 2,
              overflow: 'hidden',
              marginTop: 6,
            }}>
            <View
              style={{
                height: 3,
                width: `${Math.min(100, duration ? (position / duration) * 100 : 0)}%`,
                backgroundColor: control,
              }}
            />
          </View>
        </>
      )}
    </View>
  );
}
export function PlayerScreen({navigation}: any) {
  const p = usePalette();
  const {width, fontScale} = useWindowDimensions();
  const {uiScale} = useContext(themeContext);
  const stackOptions = width < 360 || fontScale * uiScale > 1.2;
  const track = useActiveTrack(),
    {position, duration} = useProgress(),
    state = usePlaybackState().state;
  const [rate, setRate] = useState(1),
    [repeat, setRepeat] = useState(RepeatMode.Off),
    [queue, setQueue] = useState<string[]>([]),
    [seek, setSeek] = useState(''),
    [resume, setResume] = useState(false),
    [deadline, setDeadline] = useState<number | null>(null),
    [now, setNow] = useState(Date.now()),
    [panel, setPanel] = useState<'rate' | 'repeat' | 'sleep' | null>(null);
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
  useEffect(() => {
    const update = () => {
      setNow(Date.now());
      void sleepDeadline()
        .then(setDeadline)
        .catch(() => undefined);
    };
    update();
    const timer = setInterval(update, 1000);
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') update();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);
  // Downloaded Quran titles contain both reciter and chapter; preserve both
  // while giving the chapter the reference's title hierarchy.
  const parts = track?.downloadEntry ? track.title?.split(' · ') : undefined;
  const displayTitle =
    parts && parts.length > 1 ? parts[parts.length - 1] : track?.title;
  const displayArtist =
    parts && parts.length > 1 ? parts.slice(0, -1).join(' · ') : track?.artist;
  const clock = (s: number) =>
    ltr(
      `${number(Math.floor(s / 60))}:${String(Math.floor(s % 60)).padStart(2, '0')}`,
    );
  return (
    <Page title="الاستماع" onBack={() => navigation.goBack()}>
      <ListeningArtwork size={stackOptions ? 140 : 160} />
      <AppText
        role="screenTitle"
        style={{
          textAlign: 'center',
          fontSize: 24 * uiScale,
          lineHeight: 36 * uiScale,
        }}>
        {displayTitle ?? 'اختر مقطعا للاستماع'}
      </AppText>
      {displayArtist && (
        <AppText role="caption" style={{textAlign: 'center'}}>
          {displayArtist}
        </AppText>
      )}
      {error && <AppText accessibilityLiveRegion="polite">{error}</AppText>}
      {!track && resume && (
        <Button
          label="استعادة موضع الاستماع دون تشغيل"
          onPress={() =>
            void restoreDownloadedSession().catch(() => setResume(false))
          }
        />
      )}
      <Card style={{gap: 12, paddingVertical: 20}}>
        {track && duration > 0 ? (
          <Range
            hideLabel
            label="موضع الاستماع"
            min={0}
            max={duration}
            value={Math.min(position, duration)}
            onChange={v => void playback.seek(v)}
          />
        ) : (
          <Progress value={0} />
        )}
        <View style={{...rtlRow, justifyContent: 'space-between'}}>
          <AppText role="caption">{clock(duration)}</AppText>
          <AppText role="caption">{clock(position)}</AppText>
        </View>
        <View
          style={{
            ...rtlRow,
            justifyContent: 'center',
            gap: 24,
            paddingVertical: 8,
          }}>
          <IconButton
            name="next"
            label="المقطع التالي"
            disabled={!track || queue.length < 2}
            onPress={() => void playback.next()}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              state === State.Playing ? 'إيقاف مؤقت' : 'تشغيل'
            }
            accessibilityState={{disabled: !track}}
            disabled={!track}
            onPress={() => void playback.toggle()}
            style={({pressed}) => ({
              width: 88,
              height: 88,
              borderRadius: 44,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: p.actionPrimary,
              opacity: !track || pressed ? 0.5 : 1,
            })}>
            <AppIcon
              name={state === State.Playing ? 'pause' : 'play'}
              size={32}
              color={p.textOnAction}
            />
          </Pressable>
          <IconButton
            name="previous"
            label="المقطع السابق"
            disabled={!track || queue.length < 2}
            onPress={() => void playback.previous()}
          />
        </View>
      </Card>
      <View
        style={{
          ...rtlRow,
          flexDirection: stackOptions ? 'column' : 'row-reverse',
          alignItems: 'stretch',
          gap: 10,
        }}>
        {(
          [
            {
              key: 'sleep',
              label: deadline
                ? 'مؤقت النوم · ' +
                  number(Math.max(0, Math.ceil((deadline - now) / 60000))) +
                  ' دقيقة'
                : 'مؤقت النوم',
              icon: 'moon',
            },
            {
              key: 'repeat',
              label:
                repeat === RepeatMode.Off
                  ? 'التكرار'
                  : repeat === RepeatMode.Track
                    ? 'تكرار المقطع'
                    : 'تكرار القائمة',
              icon: 'repeat',
            },
            {
              key: 'rate',
              label: number(rate, {maximumFractionDigits: 2}) + '×',
              icon: 'timer',
            },
          ] as const
        ).map(c => (
          <Pressable
            key={c.key}
            accessibilityRole="button"
            accessibilityLabel={c.label}
            accessibilityState={{disabled: !track}}
            disabled={!track}
            onPress={() => setPanel(c.key)}
            style={{
              flex: stackOptions ? undefined : 1,
              minHeight: 90,
              borderRadius: 12,
              borderWidth: 0.5,
              borderColor: p.borderSubtle,
              backgroundColor: p.surface,
              alignItems: 'center',
              justifyContent: 'center',
              padding: 10,
              gap: 6,
              opacity: track ? 1 : 0.5,
            }}>
            <AppIcon name={c.icon} color={p.accent} />
            <AppText role="caption" style={{textAlign: 'center'}}>
              {c.label}
            </AppText>
          </Pressable>
        ))}
      </View>
      <Group>
        <SettingRow
          title="قائمة الاستماع"
          detail={number(queue.length) + ' مقاطع'}
          icon="headphones"
        />
      </Group>
      <Disclosure title="القائمة وأدوات التشغيل">
        {queue.slice(0, 114).map((title, i) => (
          <AppText key={i}>
            {number(i + 1)} · {title}
          </AppText>
        ))}
        <View style={rtlRow}>
          <Button
            compact
            secondary
            label="تقديم 15 ثانية"
            disabled={!track || !duration}
            onPress={() =>
              void playback.seek(Math.min(duration, position + 15))
            }
          />
          <Button
            compact
            secondary
            label="رجوع 15 ثانية"
            disabled={!track}
            onPress={() => void playback.seek(Math.max(0, position - 15))}
          />
        </View>
        <Input
          label="الانتقال إلى الثانية"
          value={seek}
          onChangeText={setSeek}
          keyboardType="numeric"
        />
        <Button
          secondary
          label="انتقال"
          disabled={
            !track || !/^\d+(\.\d+)?$/.test(seek) || Number(seek) > duration
          }
          onPress={() => void playback.seek(Number(seek))}
        />
      </Disclosure>
      <Button
        secondary
        icon="stop"
        label="إيقاف الصوت"
        disabled={!track}
        onPress={() => void playback.stop()}
      />
      <Sheet
        title={
          panel === 'rate'
            ? 'سرعة التشغيل'
            : panel === 'repeat'
              ? 'التكرار'
              : 'مؤقت النوم'
        }
        visible={panel !== null}
        onClose={() => setPanel(null)}>
        {panel === 'rate' && (
          <Segments
            value={rate}
            options={[0.75, 1, 1.25, 1.5].map(value => ({
              value,
              label: number(value, {maximumFractionDigits: 2}) + '×',
            }))}
            onChange={v => void playback.rate(v).then(refresh)}
          />
        )}
        {panel === 'repeat' && (
          <Segments
            value={repeat}
            options={[
              {value: RepeatMode.Off, label: 'دون تكرار'},
              {value: RepeatMode.Track, label: 'تكرار المقطع'},
              {value: RepeatMode.Queue, label: 'تكرار القائمة'},
            ]}
            onChange={v => void playback.repeat(v).then(refresh)}
          />
        )}
        {panel === 'sleep' &&
          (sleepSupported() ? (
            <>
              <AppText>
                {deadline
                  ? 'يتوقف الصوت خلال ' +
                    number(Math.max(0, Math.ceil((deadline - now) / 60000))) +
                    ' دقيقة'
                  : 'المؤقت متوقف'}
              </AppText>
              <AppText role="caption">
                يتوقف الصوت مؤقتا عند انتهاء المدة، حتى مع إغلاق الشاشة. لا
                يستأنف تلقائيا.
              </AppText>
              {[15, 30, 60].map(minutes => (
                <Button
                  secondary
                  key={minutes}
                  label={number(minutes) + ' دقيقة'}
                  onPress={() =>
                    void playback
                      .sleep(minutes)
                      .then(() => sleepDeadline())
                      .then(setDeadline)
                  }
                />
              ))}
              <Button
                secondary
                label="إلغاء مؤقت النوم"
                disabled={!deadline}
                onPress={() =>
                  void playback
                    .sleep(0)
                    .then(() => sleepDeadline())
                    .then(setDeadline)
                }
              />
            </>
          ) : (
            <AppText>مؤقت النوم غير متاح على هذا الجهاز بعد.</AppText>
          ))}
      </Sheet>
    </Page>
  );
}
