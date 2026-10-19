import {Dirs, FileSystem} from 'react-native-file-access';

export const privateRoot = `${Dirs.DocumentDir}/roqia`;

export function privatePath(relative: string) {
  if (
    !relative ||
    relative.startsWith('/') ||
    relative.includes('\\') ||
    relative.split('/').some(p => p === '..' || p === '.' || !p)
  )
    throw new Error('unsafe_path');
  return `${privateRoot}/${relative}`;
}

export async function ensureDirectory(path: string) {
  if (!(await FileSystem.exists(path))) await FileSystem.mkdir(path);
  else if (!(await FileSystem.isDir(path))) throw Error('directory_is_file');
}

export async function ensurePrivateRoot() {
  await ensureDirectory(privateRoot);
}

export async function removeIfPresent(path: string) {
  if (await FileSystem.exists(path)) await FileSystem.unlink(path);
}
