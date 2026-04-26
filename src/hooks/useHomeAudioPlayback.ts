import {useCallback, useEffect, useMemo, useState} from 'react';
import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  State,
  useActiveTrack,
  usePlaybackState,
  type AddTrack,
} from 'react-native-track-player';

import {audioAssets} from '../assets/audio';

type HomeAudioTrack = {
  audioFile?: string;
  repeat?: number;
  caption?: string;
};

type PlaybackMode = 'queue' | 'single' | null;

let playerSetupPromise: Promise<void> | null = null;

const isAlreadyInitializedError = (error: unknown) => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const maybeError = error as {code?: string; message?: string};

  return (
    maybeError.code === 'player_already_initialized' ||
    maybeError.message === 'The player has already been initialized via setupPlayer.'
  );
};

const ensurePlayerSetup = async () => {
  if (!playerSetupPromise) {
    playerSetupPromise = (async () => {
      try {
        await TrackPlayer.setupPlayer();
      } catch (error) {
        if (!isAlreadyInitializedError(error)) {
          throw error;
        }
      }

      await TrackPlayer.updateOptions({
        android: {
          appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
        },
        capabilities: [Capability.Play, Capability.Pause, Capability.Stop],
        notificationCapabilities: [Capability.Play, Capability.Pause, Capability.Stop],
        progressUpdateEventInterval: 1,
      });
    })().catch(error => {
      playerSetupPromise = null;
      throw error;
    });
  }

  await playerSetupPromise;
};

const buildSingleTrack = (track: HomeAudioTrack, id: string): AddTrack | null => {
  if (!track.audioFile || !audioAssets[track.audioFile]) {
    return null;
  }

  return {
    id,
    url: audioAssets[track.audioFile] as unknown as string,
    title: track.caption ?? 'تشغيل الرقية',
    artist: 'الرقية الشرعية',
    audioFile: track.audioFile,
  };
};

const buildQueue = (tracks: HomeAudioTrack[]) =>
  tracks.reduce<AddTrack[]>((queue, track, trackIndex) => {
    const repeat = Math.max(1, track.repeat ?? 1);

    for (let repeatIndex = 0; repeatIndex < repeat; repeatIndex += 1) {
      const queueTrack = buildSingleTrack(track, `home-${trackIndex}-${repeatIndex}`);

      if (queueTrack) {
        queue.push(queueTrack);
      }
    }

    return queue;
  }, []);

const isPausedState = (state: State | undefined) =>
  state === State.Paused ||
  state === State.Ready ||
  state === State.Stopped ||
  state === State.Ended ||
  state === State.None;

export const useHomeAudioPlayback = (tracks: HomeAudioTrack[]) => {
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>(null);
  const queue = useMemo(() => buildQueue(tracks), [tracks]);
  const playbackState = usePlaybackState();
  const activeTrack = useActiveTrack();
  const playerState = playbackState.state;
  const activeAudioFile = typeof activeTrack?.audioFile === 'string' ? activeTrack.audioFile : null;
  const isAudioPaused = activeTrack ? isPausedState(playerState) : false;
  const isPlaylistActive = playbackMode === 'queue' && Boolean(activeTrack);

  useEffect(() => {
    void ensurePlayerSetup().catch(() => {});
  }, []);

  useEffect(() => {
    if (playerState === State.Ended) {
      void TrackPlayer.reset();
      setPlaybackMode(null);
    }
  }, [playerState]);

  useEffect(() => {
    if (!activeTrack && playbackMode !== null) {
      setPlaybackMode(null);
    }
  }, [activeTrack, playbackMode]);

  const stopPlayback = useCallback(async () => {
    await ensurePlayerSetup();
    await TrackPlayer.reset();
    setPlaybackMode(null);
  }, []);

  const togglePlayback = useCallback(async () => {
    if (!activeTrack) {
      return;
    }

    await ensurePlayerSetup();

    if (playerState === State.Playing || playerState === State.Buffering || playerState === State.Loading) {
      await TrackPlayer.pause();
      return;
    }

    await TrackPlayer.play();
  }, [activeTrack, playerState]);

  const onAudioPress = useCallback(async (audioFile: string) => {
    const sourceTrack = tracks.find(track => track.audioFile === audioFile);
    const queueTrack = sourceTrack ? buildSingleTrack(sourceTrack, `single-${audioFile}`) : null;

    if (!queueTrack) {
      return;
    }

    await ensurePlayerSetup();

    if (playbackMode === 'single' && activeAudioFile === audioFile) {
      if (isPausedState(playerState)) {
        await TrackPlayer.play();
      } else {
        await TrackPlayer.pause();
      }
      return;
    }

    await TrackPlayer.reset();
    await TrackPlayer.add(queueTrack);
    setPlaybackMode('single');
    await TrackPlayer.play();
  }, [activeAudioFile, playbackMode, playerState, tracks]);

  const onPlayAllPress = useCallback(async () => {
    if (queue.length === 0) {
      return;
    }

    await ensurePlayerSetup();

    if (playbackMode === 'queue' && activeTrack) {
      if (isPausedState(playerState)) {
        await TrackPlayer.play();
      } else {
        await TrackPlayer.pause();
      }
      return;
    }

    await TrackPlayer.reset();
    await TrackPlayer.add(queue);
    setPlaybackMode('queue');
    await TrackPlayer.play();
  }, [activeTrack, playbackMode, playerState, queue]);

  return {
    activeAudioFile,
    isAudioPaused,
    isPlaylistActive,
    onAudioPress,
    onPlayAllPress,
    stopPlayback,
    togglePlayback,
  };
};