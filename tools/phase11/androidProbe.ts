/* Debug-only probes through production adapters. Preserve user records across process-death tests. */
import {NativeModules} from 'react-native';
import TrackPlayer, {RepeatMode, State} from 'react-native-track-player';
import {ensurePlayer, playback} from '../../src/features/audio/controller';
import {
  readRecord,
  saveRecord,
  removeRecord,
} from '../../src/repositories/database';
import {
  loadPreferences,
  savePreferences,
  reconcilePrayer,
} from '../../src/features/prayer/service';
import {localSound, sounds} from '../../src/features/prayer/sounds';
const probe = NativeModules.RoqiaProbe;
const native = NativeModules.RoqiaPrayer;
const log = (event: string, value: object = {}) =>
  probe.record(event, JSON.stringify(value));
const wait = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));
const check = (condition: unknown, reason: string) => {
  if (!condition) throw Error(reason);
};
const keys = [
  ['playback', 'session'],
  ['prayer', 'preferences'],
  ['prayer', 'renewal'],
] as const;
async function backup() {
  if (await readRecord('phase11-backup', 'original')) return;
  const records = [];
  for (const [collection, id] of keys)
    records.push({collection, id, value: await readRecord(collection, id)});
  await saveRecord('phase11-backup', 'original', records);
}
async function tone() {
  await ensurePlayer();
  await TrackPlayer.reset();
  await TrackPlayer.add({
    id: 'phase11-tone',
    title: 'Phase 11 test tone',
    url: await probe.prepare(),
  });
  await TrackPlayer.setRepeatMode(RepeatMode.Track);
  await TrackPlayer.play();
  await wait(1200);
  check(
    (await TrackPlayer.getPlaybackState()).state === State.Playing,
    'tone_not_playing',
  );
}
export async function phase11Probe(scenario: string) {
  await backup();
  const mode = scenario.replace('phase11-', '');
  if (mode === 'cleanup') {
    await playback.stop();
    native.stopAdhan();
    const records = await readRecord<
      {collection: string; id: string; value: unknown}[]
    >('phase11-backup', 'original');
    for (const r of records ?? []) {
      if (r.value === null) await removeRecord(r.collection, r.id);
      else await saveRecord(r.collection, r.id, r.value);
    }
    await reconcilePrayer();
    await removeRecord('phase11-backup', 'original');
    log('phase11-cleaned');
    return;
  }
  if (
    mode === 'sleep' ||
    mode === 'sleep-replace' ||
    mode === 'sleep-cancel' ||
    mode === 'sleep-restart-arm'
  ) {
    await tone();
    await NativeModules.RoqiaAudio.setSleepTimer(
      mode === 'sleep-restart-arm' ? 30000 : 10000,
    );
    if (mode === 'sleep-replace')
      await NativeModules.RoqiaAudio.setSleepTimer(3000);
    if (mode === 'sleep-cancel')
      await NativeModules.RoqiaAudio.setSleepTimer(0);
    log('phase11-sleep-armed', {
      mode,
      deadline: await NativeModules.RoqiaAudio.sleepDeadline(),
    });
    if (mode === 'sleep-restart-arm') return;
    await wait(mode === 'sleep-replace' ? 5000 : 14000);
    const state = (await TrackPlayer.getPlaybackState()).state;
    const deadline = await NativeModules.RoqiaAudio.sleepDeadline();
    check(
      state === (mode === 'sleep-cancel' ? State.Playing : State.Paused),
      'wrong_sleep_state',
    );
    check(deadline === 0, 'deadline_not_consumed');
    log('phase11-sleep-pass', {mode, state, deadline});
    await playback.stop();
    return;
  }
  if (mode === 'sleep-restart-check') {
    await ensurePlayer();
    const deadline = await NativeModules.RoqiaAudio.sleepDeadline();
    check(deadline > Date.now(), 'sleep_not_restored');
    log('phase11-restart-pass', {
      deadline,
      state: await TrackPlayer.getPlaybackState(),
    });
    await playback.stop();
    return;
  }
  if (mode === 'focus') {
    await tone();
    const sound = await localSound(sounds.find(s => s.variant === 'normal')!);
    check(sound, 'adhan_not_installed');
    await native.previewAdhan(
      JSON.stringify({
        ...sound,
        id: 'roqia-prayer:test',
        at: Date.now(),
        title: 'Phase 11 focus test',
      }),
    );
    await wait(2500);
    check(
      (await TrackPlayer.getPlaybackState()).state === State.Paused,
      'focus_not_paused',
    );
    native.stopAdhan();
    await wait(1500);
    check(
      (await TrackPlayer.getPlaybackState()).state === State.Paused,
      'focus_auto_resumed',
    );
    log('phase11-focus-pass');
    await playback.stop();
    return;
  }
  if (mode === 'preview-replace') {
    const normal = await localSound(sounds.find(s => s.variant === 'normal')!);
    const fajr = await localSound(sounds.find(s => s.variant === 'fajr')!);
    check(normal && fajr, 'sounds_not_installed');
    for (const sound of [normal, fajr]) {
      await native.previewAdhan(
        JSON.stringify({
          ...sound,
          id: 'roqia-prayer:test',
          at: Date.now(),
          title: 'Phase 11 preview replacement',
        }),
      );
      await wait(2000);
      const status = await native.adhanStatus();
      check(status.activePath === sound!.path, 'wrong_preview_playing');
      check(status.lastEvent === 'playing:roqia-prayer:test', 'preview_failed');
    }
    native.stopAdhan();
    await wait(500);
    check(!(await native.adhanStatus()).activePath, 'preview_did_not_stop');
    log('phase11-preview-replace-pass');
    return;
  }
  if (mode === 'renewal-arm') {
    const prefs = await loadPreferences();
    check(prefs.location, 'location_required');
    await savePreferences({...prefs, modes: {...prefs.modes, fajr: 'full'}});
    const coverage = await reconcilePrayer();
    check(coverage.backgroundRenewal, 'renewal_not_available');
    log('phase11-renewal-armed', {coverage});
    return;
  }
  if (mode === 'renewal-check') {
    const value = await readRecord<{at: number}>('prayer', 'renewal');
    check(value?.at && Date.now() - value.at < 120000, 'headless_did_not_run');
    log('phase11-renewal-pass', {value, status: await native.adhanStatus()});
    return;
  }
  throw Error('unknown_phase11_scenario');
}
