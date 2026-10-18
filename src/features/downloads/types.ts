export type DownloadState =
  | 'queued'
  | 'waiting_network'
  | 'downloading'
  | 'paused_user'
  | 'verifying'
  | 'installing'
  | 'ready'
  | 'failed'
  | 'cancelled'
  | 'deleting'
  | 'removed';
export type Asset = {
  id: string;
  file: string;
  url: string;
  bytes: number;
  sha256: string;
  mime:
    | 'audio/mpeg'
    | 'application/json'
    | 'font/ttf'
    | 'font/otf'
    | 'application/zip'
    | 'text/plain';
};
export type LocalAsset = Omit<Asset, 'url'>;
export type SourcePreparation = {
  kind: 'quran-source-v1';
  editionId: string;
  sourceAssetId: string;
  notice: string;
  dataAssetId?: string;
  documentAssetId?: string;
  archiveMembers?: {entry: string; assetId: string}[];
};
export type Pack = {
  id: string;
  version: string;
  title: string;
  manifestHash: string;
  review: 'approved';
  capabilities: string[];
  sourceMetadata: Record<string, string>;
  assets: Asset[];
  derivedAssets?: LocalAsset[];
  preparation?: SourcePreparation;
};
export type DownloadJob = {
  jobId: string;
  assetId: string;
  version: string;
  packId: string;
  nativeTaskId: string | null;
  generation: number;
  state: DownloadState;
  pauseReason: 'user' | 'network' | null;
  relativeTempPath: string;
  relativeFinalPath: string;
  bytesReceived: number;
  expectedBytes: number;
  expectedHash: string;
  etag: string | null;
  lastModified: string | null;
  attempt: number;
  errorCode: string | null;
  consentNetworkPolicy: 'wifi' | 'any';
  updatedAt: number;
  retryAt: number;
};
export type InstalledPack = {
  active: boolean;
  packId: string;
  version: string;
  relativeDirectory: string;
  manifestHash: string;
  capabilities: string[];
  state: 'installing' | 'ready' | 'deleting' | 'missing' | 'corrupt';
  activatedAt: number;
  sourceMetadata: Record<string, string>;
  files: string[];
};
export type InstallJournal = {
  packId: string;
  version: string;
  phase: 'install' | 'delete';
};
export const packKey = (pack: Pick<Pack, 'id' | 'version'>) =>
  `${pack.id}@${pack.version}`;
export const jobKey = (pack: Pack, asset: Asset) =>
  `${pack.id}.${asset.id}@${pack.version}`;
export function validateCatalog(packs: Pack[], allowLocalFixtures = false) {
  const keys = new Set<string>();
  for (const pack of packs) {
    const safe = (s: string) => /^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/.test(s);
    if (
      !safe(pack.id) ||
      !safe(pack.version) ||
      pack.review !== 'approved' ||
      !pack.assets.length ||
      pack.assets.some(a => typeof a.url !== 'string') ||
      !/^[a-f0-9]{64}$/.test(pack.manifestHash) ||
      !Object.keys(pack.sourceMetadata).length
    )
      throw Error('unreviewed_catalog');
    const key = packKey(pack);
    if (keys.has(key)) throw Error('duplicate_pack');
    keys.add(key);
    if (
      pack.preparation &&
      (pack.preparation.kind !== 'quran-source-v1' ||
        !pack.derivedAssets?.length ||
        !pack.assets.some(a => a.id === pack.preparation!.sourceAssetId))
    )
      throw Error('invalid_preparation');
    const files = new Set<string>(),
      ids = new Set<string>();
    for (const asset of [...pack.assets, ...(pack.derivedAssets ?? [])]) {
      if (
        !safe(asset.id) ||
        !safe(asset.file) ||
        files.has(asset.file) ||
        ids.has(asset.id) ||
        !Number.isSafeInteger(asset.bytes) ||
        asset.bytes <= 0 ||
        !/^[a-f0-9]{64}$/.test(asset.sha256) ||
        ![
          'audio/mpeg',
          'application/json',
          'font/ttf',
          'font/otf',
          'application/zip',
          'text/plain',
        ].includes(asset.mime) ||
        ('url' in asset &&
          typeof asset.url === 'string' &&
          !/^https:\/\/[^/\s]+\//.test(asset.url) &&
          !(
            allowLocalFixtures && /^http:\/\/127\.0\.0\.1:\d+\//.test(asset.url)
          ))
      )
        throw Error('invalid_asset');
      if (!('url' in asset) && !pack.preparation)
        throw Error('missing_preparation');
      files.add(asset.file);
      ids.add(asset.id);
    }
  }
}
