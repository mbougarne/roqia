import {useSyncExternalStore} from 'react';
import {
  State,
  useActiveTrack,
  usePlaybackState,
} from 'react-native-track-player';
import {type DataProps} from '../data';
import {audioErrors, playback} from '../features/audio/controller';
export function useHomeAudioPlayback(
  tracks: DataProps[],
  scopeOverride?: string,
) {
  const scope = scopeOverride ?? tracks[0]?.id ?? 'empty',
    active = useActiveTrack(),
    state = usePlaybackState().state;
  const belongs = active?.scope === scope;
  return {
    activeAudioFile:
      belongs && typeof active?.audioFile === 'string'
        ? active.audioFile
        : null,
    isAudioPaused: ![State.Playing, State.Buffering, State.Loading].includes(
      state as State,
    ),
    isPlaylistActive: belongs && active?.queueMode === 'all',
    error: useSyncExternalStore(audioErrors.subscribe, audioErrors.getSnapshot),
    onAudioPress: (file: string) => playback.single(tracks, scope, file),
    onPlayAllPress: () => playback.all(tracks, scope),
    stopPlayback: playback.stop,
    togglePlayback: playback.toggle,
  };
}
