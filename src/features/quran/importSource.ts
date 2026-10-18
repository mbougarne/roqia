import {NativeModules} from 'react-native';
import {FileSystem} from 'react-native-file-access';
import {type Pack} from '../downloads/types';
import {privatePath} from '../../platform/files';
import {parseOriginalSource} from './sourceParser';
import {parseTranslationSource} from './translationParser';

export async function prepareSource(pack: Pack, directory: string) {
  const p = pack.preparation;
  if (!p) throw Error('unknown_preparation');
  const local = pack.derivedAssets ?? [];
  const asset = (id: string) => {
    const value = [...pack.assets, ...local].find(a => a.id === id);
    if (!value) throw Error('missing_source_member');
    return value;
  };
  const path = (id: string) => privatePath(`${directory}/${asset(id).file}`);
  const verify = async (id: string) => {
    const a = asset(id),
      file = path(id);
    if (
      (await FileSystem.stat(file)).size !== a.bytes ||
      (await FileSystem.hash(file, 'SHA-256')) !== a.sha256
    )
      throw Error('source_integrity_failed');
  };
  await verify(p.sourceAssetId);
  let openings: Record<string, string> = {};
  if (p.kind === 'quran-source-v1' && p.archiveMembers) {
    if (
      !NativeModules.RoqiaReader?.extractSource ||
      !p.documentAssetId ||
      !p.dataAssetId
    )
      throw Error('source_import_unavailable');
    const source = asset(p.sourceAssetId);
    await NativeModules.RoqiaReader.extractSource(
      path(source.id),
      source.bytes,
      source.sha256,
      p.archiveMembers.map(m => ({
        entry: m.entry,
        path: path(m.assetId),
        bytes: asset(m.assetId).bytes,
        sha256: asset(m.assetId).sha256,
      })),
    );
    for (const m of p.archiveMembers) await verify(m.assetId);
    const document = asset(p.documentAssetId);
    openings = await NativeModules.RoqiaReader.sourceOpenings(
      path(document.id),
      document.bytes,
      document.sha256,
    );
  }
  const raw = await FileSystem.readFile(
    path(
      p.kind === 'quran-source-v1'
        ? (p.dataAssetId ?? p.sourceAssetId)
        : p.sourceAssetId,
    ),
    'utf8',
  );
  const chapters =
    p.kind === 'translation-source-v1'
      ? parseTranslationSource(p, raw)
      : parseOriginalSource(p, raw, openings);
  for (const chapter of chapters) {
    const id = `chapter-${chapter.surah}`,
      a = asset(id);
    const text = JSON.stringify(chapter) + '\n';
    // An interrupted write is never trusted. The coordinator verifies each expected output
    // before publishing ready state; a restart repeats this deterministic import.
    await FileSystem.writeFile(
      privatePath(`${directory}/${a.file}`),
      text,
      'utf8',
    );
    await verify(id);
  }
}
