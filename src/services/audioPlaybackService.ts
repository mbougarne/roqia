import TrackPlayer, {Event} from 'react-native-track-player';
import {
  playback,
  persistPlayback,
  playbackFailed,
} from '../features/audio/controller';
export default async function audioPlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    void playback.play();
  });
  TrackPlayer.addEventListener(Event.RemotePause, () => {
    void playback.pause();
  });
  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    void playback.stop();
  });
  TrackPlayer.addEventListener(Event.RemoteSeek, e => {
    void playback.seek(e.position);
  });
  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    void playback.next();
  });
  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    void playback.previous();
  });
  TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, () => {
    void persistPlayback().catch(playbackFailed);
  });
  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, () => {
    void persistPlayback().catch(playbackFailed);
  });
  TrackPlayer.addEventListener(Event.PlaybackError, playbackFailed);
}
