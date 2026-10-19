import {
  type CachedTiming,
  type TimingIdentity,
  type TimingSource,
  matchingTimingRead,
  timingKey,
  validateTiming,
} from './timing';
import {readRecord, saveRecord} from '../../repositories/database';

type SourceTiming = {
  source: TimingSource;
  status: 'available' | 'unavailable';
  rows: unknown[];
  fetchedAt: number;
  audioEtag: string;
};
const pending = new Map<string, Promise<CachedTiming>>();
const sourcePending = new Map<string, Promise<SourceTiming>>();
const sourceKey = (s: TimingSource) =>
  `entity-v1:${s.read}:${s.riwaya}:${s.numberingScheme}:${s.surah}:${s.audioVersion}:${s.audioUrl}`;
const strongEtag = (value: string) => /^"[^"\r\n]+"$/.test(value);

async function audioEntity(url: string) {
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });
    const etag = response.headers.get('etag')?.trim() ?? '';
    if (!response.ok || !strongEtag(etag))
      throw Error('audio_version_unavailable');
    return etag;
  } finally {
    clearTimeout(timer);
  }
}

async function json(url: string) {
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {signal: controller.signal});
    if (!response.ok) throw Error('timing_network');
    const body = await response.text();
    if (body.length > 4 * 1024 * 1024) throw Error('timing_too_large');
    return JSON.parse(body) as unknown;
  } finally {
    clearTimeout(timer);
  }
}

// Fetched before audio is enqueued. This durable raw source is never playable;
// after restart it must be bound to the completed file's hash and duration.
export function prepareTimingSource(
  source: TimingSource,
  retry = false,
): Promise<SourceTiming> {
  const key = sourceKey(source);
  if (sourcePending.has(key)) return sourcePending.get(key)!;
  const task = (async () => {
    const cached = await readRecord<SourceTiming>('quran-timing-source', key);
    if (cached && !retry) return cached;
    let reads = await readRecord<{value: unknown; fetchedAt: number}>(
      'quran-audio-timing',
      'reads',
    );
    if (!reads || retry || Date.now() - reads.fetchedAt > 7 * 86400000) {
      reads = {
        value: await json('https://www.mp3quran.net/api/v3/ayat_timing/reads'),
        fetchedAt: Date.now(),
      };
      if (!Array.isArray(reads.value)) throw Error('invalid_timing_catalog');
      await saveRecord('quran-audio-timing', 'reads', reads);
    }
    const result: SourceTiming = {
      source,
      status: 'unavailable',
      rows: [],
      fetchedAt: Date.now(),
      audioEtag: '',
    };
    if (matchingTimingRead(reads.value, source)) {
      const coverageKey =
        'surahs:' +
        source.read +
        ':' +
        source.audioUrl.slice(0, source.audioUrl.lastIndexOf('/'));
      let coverage = await readRecord<{surahs: number[]; fetchedAt: number}>(
        'quran-audio-timing',
        coverageKey,
      );
      if (
        !coverage ||
        retry ||
        Date.now() - coverage.fetchedAt > 7 * 86400000
      ) {
        const rows = await json(
          `https://www.mp3quran.net/api/v3/ayat_timing/soar?read=${source.read}`,
        );
        if (
          !Array.isArray(rows) ||
          rows.some(r => !Number.isInteger(r?.id) || r.id < 1 || r.id > 114)
        )
          throw Error('invalid_timing_catalog');
        coverage = {surahs: rows.map(r => r.id), fetchedAt: Date.now()};
        await saveRecord('quran-audio-timing', coverageKey, coverage);
      }
      if (coverage.surahs.includes(source.surah)) {
        result.audioEtag = await audioEntity(source.audioUrl);
        const rows = await json(
          `https://www.mp3quran.net/api/v3/ayat_timing?read=${source.read}&surah=${source.surah}`,
        );
        if (!Array.isArray(rows)) throw Error('invalid_timing_data');
        result.rows = rows;
        result.status = 'available';
      }
    }
    await saveRecord('quran-timing-source', key, result);
    return result;
  })().finally(() => sourcePending.delete(key));
  sourcePending.set(key, task);
  return task;
}

// These local reads never access the network.
export async function cachedTiming(identity: TimingIdentity) {
  const result = await readRecord<CachedTiming>(
    'quran-audio-timing',
    timingKey(identity),
  );
  if (
    !result ||
    !(Object.keys(identity) as (keyof TimingIdentity)[]).every(
      k => result.identity?.[k] === identity[k],
    ) ||
    !['ready', 'unavailable', 'invalid'].includes(result.status) ||
    !Array.isArray(result.segments) ||
    (result.status === 'ready' && !strongEtag(identity.audioEtag)) ||
    !Number.isSafeInteger(result.durationMs) ||
    result.durationMs <= 0
  )
    return null;
  if (result.status === 'ready') {
    try {
      validateTiming(
        result.segments.map(s => ({
          ayah: s.verse,
          start_time: s.startMs,
          end_time: s.endMs,
        })),
        identity,
        result.durationMs,
      );
    } catch {
      return null;
    }
  } else if (result.segments.length) return null;
  return result;
}

async function bind(
  source: SourceTiming,
  identity: TimingIdentity,
  durationMs: number,
) {
  if (
    sourceKey(source.source) !== sourceKey(identity) ||
    !Number.isSafeInteger(durationMs) ||
    durationMs <= 0
  )
    throw Error('timing_mismatch');
  const result: CachedTiming = {
    identity,
    status: 'unavailable',
    segments: [],
    fetchedAt: source.fetchedAt,
    durationMs,
  };
  if (source.status === 'available') {
    try {
      if (
        !strongEtag(identity.audioEtag) ||
        source.audioEtag !== identity.audioEtag
      )
        throw Error('audio_version_mismatch');
      result.segments = validateTiming(source.rows, identity, durationMs);
      result.status = 'ready';
    } catch {
      result.status = 'invalid';
    }
  }
  await saveRecord('quran-audio-timing', timingKey(identity), result);
  return result;
}

export async function bindCachedTiming(
  identity: TimingIdentity,
  durationMs: number,
) {
  const cached = await cachedTiming(identity);
  if (cached) return cached;
  const source = await readRecord<SourceTiming>(
    'quran-timing-source',
    sourceKey(identity),
  );
  return source ? bind(source, identity, durationMs) : null;
}

export function prepareTiming(
  identity: TimingIdentity,
  durationMs: number,
  retry = false,
): Promise<CachedTiming> {
  const key = timingKey(identity);
  if (pending.has(key)) return pending.get(key)!;
  const task = (async () => {
    const cached = await cachedTiming(identity);
    if (cached && !retry) return cached;
    return bind(
      await prepareTimingSource(identity, retry),
      identity,
      durationMs,
    );
  })().finally(() => pending.delete(key));
  pending.set(key, task);
  return task;
}
