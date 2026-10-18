/* Android debug harness. This is not a product screen or production download coordinator. */
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Button, NativeModules, ScrollView, Text, View} from 'react-native';
import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  RepeatMode,
} from 'react-native-track-player';
import {
  createDownloadTask,
  directories,
  getExistingDownloadTasks,
  setConfig,
  type DownloadTask,
} from '@kesha-antonov/react-native-background-downloader';

const probe = NativeModules.RoqiaProbe;
const server = 'http://127.0.0.1:8082';
const wait = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));
const log = (event: string, detail: object = {}) =>
  probe.record(event, JSON.stringify(detail));
const message = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

type Manifest = {scenario: string; bytes: number; sha256: string; etag: string};
async function download(scenario: string) {
  await probe.prepare();
  setConfig({
    maxParallelDownloads: 1,
    allowsCellularAccess: false,
    progressInterval: 250,
    progressMinBytes: 65536,
  });
  const reattach = scenario === 'reattach';
  const name = reattach ? 'recovery' : scenario;
  let manifest: Manifest;
  let sourceUrl = `${server}/file?case=${name}`;
  if (name === 'provider') {
    const sample =
      require('../../docs/feasibility/android/evidence/audio-inventory.json')
        .recordings[0].files[0];
    manifest = {
      scenario,
      bytes: sample.bytes,
      sha256: sample.sha256,
      etag: sample.responseHeaders
        .find((h: string) => h.startsWith('etag: '))
        .slice(6),
    };
    sourceUrl = sample.url;
  } else {
    const response = await fetch(`${server}/manifest?case=${name}`);
    if (!response.ok)
      throw new Error(`Fixture manifest HTTP ${response.status}`);
    manifest = await response.json();
  }
  const destination = `${directories.documents}/feasibility/${name}.part`;
  let task: DownloadTask;
  if (reattach) {
    const tasks = await getExistingDownloadTasks();
    const recovered = tasks.find(t => t.id === 'roqia-probe-recovery');
    if (!recovered)
      throw new Error('Persisted paused native job was not recovered');
    task = recovered;
    log('download-reattached', {
      id: task.id,
      state: task.state,
      metadata: task.metadata,
    });
  } else {
    // Only clean this harness's own file/job; never app counters, media or preferences.
    for (const existing of await getExistingDownloadTasks())
      if (existing.id === `roqia-probe-${name}`) await existing.stop();
    await probe.remove(`${name}.part`);
    await probe.remove(`${name}.ready`);
    task = createDownloadTask({
      id: `roqia-probe-${name}`,
      url: sourceUrl,
      destination,
      headers: {'If-Range': manifest.etag},
      metadata: {probe: true, scenario: name, sha256: manifest.sha256},
    });
  }
  await new Promise<void>((resolve, reject) => {
    let paused = reattach || ['unknown', 'provider'].includes(name);
    const timeout = setTimeout(
      () => reject(new Error('Probe timed out; job retained for inspection')),
      60000,
    );
    const finish = (error?: Error) => {
      clearTimeout(timeout);
      if (error) reject(error);
      else resolve();
    };
    task
      .begin(info => log('download-begin', {scenario, ...info}))
      .progress(info => {
        if (!paused && info.bytesDownloaded >= 262144) {
          paused = true;
          void (async () => {
            await task.pause();
            log('download-paused', {scenario, bytes: info.bytesDownloaded});
            if (name === 'recovery' && !reattach) {
              finish();
              return;
            }
            await wait(500);
            await task.resume();
            log('download-resumed', {scenario});
          })().catch(error => finish(new Error(message(error))));
        }
      })
      .done(info => {
        log('download-transport-complete', {scenario, ...info});
        void probe
          .verifyAndInstall(`${name}.part`, manifest.sha256)
          .then((verified: {bytes: number}) => {
            if (['changed', 'wrong206', 'range416'].includes(name)) {
              finish(new Error('Unsafe fixture unexpectedly installed'));
              return;
            }
            if (verified.bytes !== manifest.bytes) {
              finish(new Error('Installed byte count mismatch'));
              return;
            }
            log('download-verified', {scenario, ...verified});
            finish();
          })
          .catch((error: unknown) => {
            log('download-quarantined', {scenario, error: message(error)});
            if (['changed', 'wrong206'].includes(name)) finish();
            else finish(new Error(message(error)));
          });
      })
      .error(info => {
        log('download-error', {scenario, ...info});
        if (name === 'range416') finish();
        else finish(new Error(info.error));
      });
    if (reattach)
      void task.resume().catch(error => finish(new Error(message(error))));
    else task.start();
  });
}

async function audio() {
  const tone: string = await probe.prepare();
  try {
    await TrackPlayer.setupPlayer({autoHandleInterruptions: true});
  } catch (error) {
    if ((error as {code?: string}).code !== 'player_already_initialized')
      throw error;
  }
  await TrackPlayer.updateOptions({
    android: {
      appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
    },
    capabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.Stop,
      Capability.SeekTo,
    ],
    progressUpdateEventInterval: 1,
  });
  await TrackPlayer.reset();
  await TrackPlayer.add([
    {id: 'probe-a', url: tone, title: 'Roqia test tone A'},
    {id: 'probe-b', url: tone, title: 'Roqia test tone B'},
  ]);
  await TrackPlayer.setRepeatMode(RepeatMode.Track);
  await TrackPlayer.setRate(1.25);
  await TrackPlayer.play();
  await wait(1000);
  await TrackPlayer.seekTo(2);
  log('audio-controls', {
    rate: await TrackPlayer.getRate(),
    repeat: await TrackPlayer.getRepeatMode(),
    queueSize: (await TrackPlayer.getQueue()).length,
    progress: await TrackPlayer.getProgress(),
  });
  const listener = TrackPlayer.addEventListener(Event.PlaybackState, state =>
    log('audio-state', state),
  );
  log('audio-background-window', {seconds: 24});
  await wait(24000);
  log('audio-after-background', {
    state: await TrackPlayer.getPlaybackState(),
    progress: await TrackPlayer.getProgress(),
  });
  await TrackPlayer.pause();
  log('audio-paused', {state: await TrackPlayer.getPlaybackState()});
  listener.remove();
}

async function run(scenario: string) {
  log('scenario-start', {scenario});
  if (scenario === 'timezone')
    log(
      'timezone-compatibility',
      require('./timezone.cjs').checkMoroccoTimeZoneData(),
    );
  else if (scenario === 'audio') await audio();
  else if (scenario === 'alarm') {
    const at = await probe.scheduleAlarm(8);
    log('alarm-armed-from-js', {at});
  } else if (scenario === 'cleanup') {
    await probe.cancelAlarm();
    await TrackPlayer.reset().catch(() => undefined);
    for (const task of await getExistingDownloadTasks())
      if (task.id.startsWith('roqia-probe-')) await task.stop();
    for (const name of [
      'stable',
      'range200',
      'changed',
      'wrong206',
      'range416',
      'unknown',
      'recovery',
      'provider',
    ]) {
      await probe.remove(`${name}.part`);
      await probe.remove(`${name}.ready`);
    }
  } else await download(scenario);
  log('scenario-finished', {scenario});
}

export default function ProbeApp({scenario}: {scenario?: string}) {
  const launched = useRef(false);
  const [status, setStatus] = useState(
    'Choose a probe. Only debug/test files are touched.',
  );
  const [running, setRunning] = useState(false);
  const launch = useCallback(async (value: string) => {
    setRunning(true);
    setStatus(`Running ${value}`);
    try {
      await run(value);
      setStatus(`${value}: finished; inspect events.jsonl for evidence`);
    } catch (error) {
      log('scenario-failed', {scenario: value, error: message(error)});
      setStatus(`${value}: ${message(error)}`);
    } finally {
      setRunning(false);
    }
  }, []);
  useEffect(() => {
    if (scenario && !launched.current) {
      launched.current = true;
      void launch(scenario);
    }
  }, [scenario, launch]); // Fast Refresh must not replay a probe on an existing activity.
  return (
    <ScrollView
      style={{backgroundColor: '#ffffff'}}
      contentContainerStyle={{padding: 24, paddingTop: 50}}>
      <Text style={{fontSize: 20, color: '#123b32'}}>
        Android feasibility lab
      </Text>
      <Text style={{marginVertical: 18, color: '#123b32'}}>{status}</Text>
      {[
        'timezone',
        'provider',
        'stable',
        'range200',
        'changed',
        'wrong206',
        'range416',
        'unknown',
        'recovery',
        'reattach',
        'audio',
        'alarm',
        'cleanup',
      ].map(value => (
        <View key={value} style={{marginBottom: 8}}>
          <Button
            title={value}
            disabled={running}
            onPress={() => {
              void launch(value);
            }}
          />
        </View>
      ))}
    </ScrollView>
  );
}
