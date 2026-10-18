import React, {useSyncExternalStore} from 'react';
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
  Page,
  usePalette,
} from '../../design/ui';
import {number, ltr} from '../../design/format';
import {audioErrors, playback} from './controller';
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
            <Button label="المشغل" onPress={onOpen} secondary />
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
    {position, duration} = useProgress();
  return (
    <Page title="المشغل" onBack={() => navigation.goBack()}>
      <Card>
        <AppText role="sectionTitle">
          {track?.title ?? 'اختر مقطعاً للاستماع'}
        </AppText>
        <AppText style={{textAlign: 'center', writingDirection: 'ltr'}}>
          {ltr(`${number(position)} / ${number(duration)} s`)}
        </AppText>
        <Button
          label="تشغيل / إيقاف مؤقت"
          onPress={() => {
            void playback.toggle();
          }}
          disabled={!track}
        />
        <Button
          label="المقطع التالي"
          onPress={() => {
            void playback.next();
          }}
          secondary
          disabled={!track}
        />
        <Button
          label="المقطع السابق"
          onPress={() => {
            void playback.previous();
          }}
          secondary
          disabled={!track}
        />
        <Button
          label="إيقاف الصوت"
          onPress={() => {
            void playback.stop();
          }}
          secondary
          disabled={!track}
        />
      </Card>
    </Page>
  );
}
