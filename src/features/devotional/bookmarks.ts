import {useEffect, useSyncExternalStore} from 'react';

import {type Bookmark} from '../../repositories/models';
import {bookmarks} from '../../services/persistence';

let snapshot: {items: Bookmark[]; error: boolean; loaded: boolean} = {
  items: [],
  error: false,
  loaded: false,
};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(fn => fn());
let tail: Promise<unknown> = Promise.resolve();

function serial<T>(fn: () => Promise<T>) {
  const next = tail.then(fn);
  tail = next.catch(() => undefined);
  return next;
}

async function refresh() {
  try {
    snapshot = {items: await bookmarks.list(), error: false, loaded: true};
  } catch (error) {
    snapshot = {...snapshot, error: true};
    throw error;
  } finally {
    emit();
  }
}

export const reloadBookmarks = () => serial(refresh);

export function useBookmarks() {
  const state = useSyncExternalStore(
    fn => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    () => snapshot,
  );
  useEffect(() => {
    void reloadBookmarks().catch(() => undefined);
  }, []);
  return state;
}

export function toggleBookmark(contentId: string) {
  return serial(async () => {
    const existing = (await bookmarks.list()).filter(
      b => b.kind === 'devotional' && b.contentId === contentId,
    );
    if (existing.length) {
      for (const b of existing) await bookmarks.remove(b.bookmarkId);
    } else
      await bookmarks.save({
        kind: 'devotional',
        bookmarkId: `devotional:${contentId}`,
        contentId,
        createdAt: Date.now(),
      });
    await refresh();
    return existing.length === 0;
  });
}

export function removeBookmark(id: string) {
  return serial(async () => {
    await bookmarks.remove(id);
    await refresh();
  });
}
