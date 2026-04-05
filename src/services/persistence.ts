import AsyncStorage from '@react-native-async-storage/async-storage';

import {createInitialRepeatCounts, type Mode, type RepeatCounts} from '../store';

const STORAGE_KEY = '@roqia/app-state';
const MAX_PERSISTED_BYTES = 512 * 1024 * 1024;

type PersistedAppState = {
  mode: Mode;
  repeatCounts: RepeatCounts;
  updatedAt: number;
};

const getApproxByteSize = (value: string) => value.length * 2;

const sanitizeRepeatCounts = (input: unknown): RepeatCounts => {
  if (!input || typeof input !== 'object') {
    return {};
  }

  return Object.entries(input as Record<string, unknown>).reduce<RepeatCounts>(
    (acc, [key, value]) => {
      if (typeof value !== 'number' || Number.isNaN(value)) {
        return acc;
      }

      acc[key] = value < 0 ? 0 : Math.floor(value);
      return acc;
    },
    {},
  );
};

export const loadPersistedAppState = async () => {
  const fallbackRepeatCounts = createInitialRepeatCounts();

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return {
        mode: null as Mode | null,
        repeatCounts: fallbackRepeatCounts,
      };
    }

    if (getApproxByteSize(raw) > MAX_PERSISTED_BYTES) {
      await AsyncStorage.removeItem(STORAGE_KEY);

      return {
        mode: null as Mode | null,
        repeatCounts: fallbackRepeatCounts,
      };
    }

    const parsed = JSON.parse(raw) as Partial<PersistedAppState>;

    const mode: Mode | null =
      parsed.mode === 'dark' || parsed.mode === 'light' ? parsed.mode : null;

    const repeatCounts = {
      ...fallbackRepeatCounts,
      ...sanitizeRepeatCounts(parsed.repeatCounts),
    };

    return {
      mode,
      repeatCounts,
    };
  } catch {
    return {
      mode: null as Mode | null,
      repeatCounts: fallbackRepeatCounts,
    };
  }
};

export const persistAppState = async (mode: Mode, repeatCounts: RepeatCounts) => {
  try {
    const payload: PersistedAppState = {
      mode,
      repeatCounts,
      updatedAt: Date.now(),
    };

    const serialized = JSON.stringify(payload);

    if (getApproxByteSize(serialized) > MAX_PERSISTED_BYTES) {
      await AsyncStorage.removeItem(STORAGE_KEY);
      return;
    }

    await AsyncStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // Ignore persistence failures to keep app startup and interactions responsive.
  }
};
