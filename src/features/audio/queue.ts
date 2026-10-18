import {type DataProps} from '../../data';
export type AudioEntry = {
  id: string;
  audioFile: string;
  title: string;
  contentId: string;
};
export function devotionalQueue(
  items: DataProps[],
  repeat = true,
): AudioEntry[] {
  return items.flatMap(item => {
    const sources = item.audioArray?.length
      ? item.audioArray.map(a => ({audioFile: a.fileName, title: a.title}))
      : item.audioFile
        ? [{audioFile: item.audioFile, title: item.caption ?? 'استماع'}]
        : [];
    return Array.from(
      {length: repeat ? Math.max(1, item.repeat ?? 1) : 1},
      (_, r) =>
        sources.map((source, i) => ({
          ...source,
          contentId: item.id,
          id: `${item.id}:${r}:${i}`,
        })),
    ).flat();
  });
}
