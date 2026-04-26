import {useCallback, useMemo, useState} from 'react';

import {audioAssets} from '../assets/audio';

type ScreenAudioTrack = {
  audioFile?: string;
  repeat?: number;
};

const buildAudioQueue = (tracks: ScreenAudioTrack[]) =>
  tracks.reduce<string[]>((queue, track) => {
    if (!track.audioFile || !audioAssets[track.audioFile]) {
      return queue;
    }

    const repeat = Math.max(1, track.repeat ?? 1);

    for (let index = 0; index < repeat; index += 1) {
      queue.push(track.audioFile);
    }

    return queue;
  }, []);

export const useScreenAudioPlayback = (tracks: ScreenAudioTrack[]) => {
  const [activeAudioFile, setActiveAudioFile] = useState<string | null>(null);
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const [playlistQueue, setPlaylistQueue] = useState<string[]>([]);
  const [playlistIndex, setPlaylistIndex] = useState<number | null>(null);
  const [playbackInstanceId, setPlaybackInstanceId] = useState(0);

  const queue = useMemo(() => buildAudioQueue(tracks), [tracks]);
  const isPlaylistActive = playlistQueue.length > 0 && playlistIndex !== null;

  const startPlayback = useCallback((audioFile: string) => {
    setPlaybackInstanceId(currentValue => currentValue + 1);
    setActiveAudioFile(audioFile);
    setIsAudioPaused(false);
  }, []);

  const stopPlayback = useCallback(() => {
    setActiveAudioFile(null);
    setIsAudioPaused(false);
    setPlaylistQueue([]);
    setPlaylistIndex(null);
  }, []);

  const togglePlayback = useCallback(() => {
    if (!activeAudioFile) {
      return;
    }

    setIsAudioPaused(currentValue => !currentValue);
  }, [activeAudioFile]);

  const onAudioPress = useCallback((audioFile: string) => {
    setPlaylistQueue([]);
    setPlaylistIndex(null);

    if (activeAudioFile === audioFile) {
      setIsAudioPaused(currentValue => !currentValue);
      return;
    }

    startPlayback(audioFile);
  }, [activeAudioFile, startPlayback]);

  const onPlayAllPress = useCallback(() => {
    if (queue.length === 0) {
      return;
    }

    if (isPlaylistActive) {
      setIsAudioPaused(currentValue => !currentValue);
      return;
    }

    setPlaylistQueue(queue);
    setPlaylistIndex(0);
    startPlayback(queue[0]);
  }, [isPlaylistActive, queue, startPlayback]);

  const onAudioFinished = useCallback(() => {
    if (!isPlaylistActive || playlistIndex === null) {
      setActiveAudioFile(null);
      setIsAudioPaused(false);
      return;
    }

    const nextIndex = playlistIndex + 1;

    if (nextIndex >= playlistQueue.length) {
      stopPlayback();
      return;
    }

    setPlaylistIndex(nextIndex);
    startPlayback(playlistQueue[nextIndex]);
  }, [isPlaylistActive, playlistIndex, playlistQueue, startPlayback, stopPlayback]);

  return {
    activeAudioFile,
    isAudioPaused,
    isPlaylistActive,
    onAudioFinished,
    onAudioPress,
    onPlayAllPress,
    playbackInstanceId,
    stopPlayback,
    togglePlayback,
  };
};