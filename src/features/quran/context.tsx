import {useFocusEffect} from '@react-navigation/native';
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';

import {quran, type QuranRuntime} from './runtime';

export const QuranContext = createContext<QuranRuntime>(quran);

export const useQuran = () => useContext(QuranContext);

export function useLibrary() {
  const runtime = useQuran(),
    revision = useSyncExternalStore(
      runtime.downloads.subscribe,
      runtime.downloads.snapshot,
    );
  const [ready, setReady] = useState(false),
    [error, setError] = useState(false);
  const retry = React.useCallback(() => {
    setError(false);
    void runtime
      .initialize()
      .then(() => setReady(true))
      .catch(() => setError(true));
  }, [runtime]);
  useEffect(retry, [retry]);
  return {
    runtime,
    revision,
    ready,
    error: error || !!runtime.downloads.getError(),
    retry,
  };
}

export function useOnFocus(action: () => void, deps: React.DependencyList) {
  // Screens stay mounted in the stack; refresh preference/installation state on return.
  useFocusEffect(React.useCallback(action, deps));
}
