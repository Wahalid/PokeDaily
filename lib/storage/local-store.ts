import { useCallback, useSyncExternalStore } from "react";
import { isTestDayClient, TEST_STORAGE_PREFIX } from "@/lib/daily/test-day";

/**
 * Tiny typed localStorage store with React bindings (hydration-safe:
 * the server and the first client render use the fallback value).
 */

const listeners = new Set<() => void>();

/** In the (development-only) test-day mode every key lives in a separate namespace. */
const storageKey = (key: string) => (isTestDayClient() ? TEST_STORAGE_PREFIX + key : key);
const cache = new Map<string, { raw: string | null; value: unknown }>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = () => listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function readLocal<T>(logicalKey: string, fallback: T): T {
  const key = storageKey(logicalKey);
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return fallback;
  }
  const cached = cache.get(key);
  if (cached && cached.raw === raw) return cached.value as T;
  let value: T = fallback;
  if (raw !== null) {
    try {
      value = JSON.parse(raw) as T;
    } catch {
      value = fallback;
    }
  }
  cache.set(key, { raw, value });
  return value;
}

export function writeLocal<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(storageKey(key), JSON.stringify(value));
  } catch {
    // storage unavailable (private mode, quota): progress just won't persist
  }
  listeners.forEach((l) => l());
}

/** `fallback` must be referentially stable (e.g. a module constant). */
export function useLocalStorage<T>(key: string, fallback: T): [T, (value: T) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => readLocal(key, fallback),
    () => fallback,
  );
  const set = useCallback((next: T) => writeLocal(key, next), [key]);
  return [value, set];
}
