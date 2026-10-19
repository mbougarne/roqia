import {chapters, editionById, type EditionId, type Recording} from './domain';

export type TimingIdentity = {
  read: number;
  riwaya: 'warsh' | 'hafs';
  numberingScheme: string;
  surah: number;
  audioSha256: string;
  audioEtag: string;
  audioVersion: string;
  audioUrl: string;
};

export type VerseSegment = {verse: number; startMs: number; endMs: number};

export type CachedTiming = {
  identity: TimingIdentity;
  status: 'ready' | 'unavailable' | 'invalid';
  segments: VerseSegment[];
  fetchedAt: number;
  durationMs: number;
};

export type TimingSource = Omit<TimingIdentity, 'audioSha256' | 'audioEtag'>;

export function timingSource(
  recording: Recording,
  surah: number,
  editionId: EditionId,
): TimingSource {
  const edition = editionById(editionId),
    chapter = recording.chapters.find(c => c.surah === surah);
  if (!chapter || recording.riwaya !== edition.riwaya)
    throw Error('recording_mismatch');
  const asset = chapter.pack.assets.find(a => a.id === chapter.assetId)!;
  const read = Number(chapter.pack.sourceMetadata.recordingId);
  if (!asset || !Number.isSafeInteger(read) || read < 1)
    throw Error('recording_mismatch');
  return {
    read,
    riwaya: edition.riwaya,
    numberingScheme: edition.numbering,
    surah,
    audioVersion: chapter.pack.version,
    audioUrl: asset.url,
  };
}

export function timingIdentity(
  recording: Recording,
  surah: number,
  editionId: EditionId,
  audioSha256?: string,
  audioEtag = '',
): TimingIdentity {
  const source = timingSource(recording, surah, editionId);
  const chapter = recording.chapters.find(c => c.surah === surah)!;
  const hash =
    audioSha256 ||
    chapter.pack.assets.find(a => a.id === chapter.assetId)!.sha256;
  if (!/^[a-f0-9]{64}$/.test(hash)) throw Error('recording_mismatch');
  return {...source, audioSha256: hash, audioEtag: audioEtag.trim()};
}

export const timingKey = (identity: TimingIdentity) =>
  `${identity.read}:${identity.numberingScheme}:${identity.surah}:${identity.audioVersion}:${identity.audioSha256}:${identity.audioEtag}`;

// Timing reads identify a recording, not its author. Matching the URL also prevents
// using another recording by the same reciter. A cached set belongs to one audio hash.
export function matchingTimingRead(value: unknown, identity: TimingSource) {
  if (!Array.isArray(value)) throw Error('invalid_timing_catalog');
  return value.some(
    r =>
      r?.id === identity.read &&
      r.rewaya ===
        (identity.riwaya === 'warsh' ? 'ورش عن نافع' : 'حفص عن عاصم') &&
      typeof r.folder_url === 'string' &&
      r.folder_url.replace(/\/$/, '') +
        '/' +
        String(identity.surah).padStart(3, '0') +
        '.mp3' ===
        identity.audioUrl,
  );
}

export function validateTiming(
  value: unknown,
  identity: TimingIdentity,
  durationMs: number,
): VerseSegment[] {
  if (!Array.isArray(value) || !Number.isFinite(durationMs) || durationMs <= 0)
    throw Error('invalid_timing');
  const expected =
    chapters[identity.surah - 1]?.[
      identity.riwaya === 'warsh' ? 'warshVerses' : 'hafsVerses'
    ];
  if (!expected || value.length < expected || value.length > expected + 1)
    throw Error('invalid_timing');
  let previousEnd = 0,
    previousVerse = -1;
  const segments: VerseSegment[] = [];
  for (const row of value) {
    if (
      !row ||
      ![row.ayah, row.start_time, row.end_time].every(Number.isSafeInteger) ||
      row.ayah < 0 ||
      row.ayah > expected ||
      row.ayah <= previousVerse ||
      row.start_time < previousEnd ||
      row.end_time <= row.start_time ||
      row.start_time >= durationMs ||
      row.end_time > durationMs + 100
    )
      throw Error('invalid_timing');
    previousVerse = row.ayah;
    previousEnd = row.end_time;
    // At EOF allow MP3 frame-duration rounding only; never extend past the local recording.
    if (row.ayah > 0)
      segments.push({
        verse: row.ayah,
        startMs: row.start_time,
        endMs: Math.min(row.end_time, durationMs),
      });
  }
  if (
    segments.length !== expected ||
    segments.some((v, i) => v.verse !== i + 1)
  )
    throw Error('invalid_timing');
  return segments;
}
