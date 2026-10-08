"use client";

/**
 * Minimal localStorage-backed store for useSyncExternalStore.
 * Server render and hydration use the fallback; the client then switches to the stored value.
 * Storage failures (private mode, blocked) fall back to in-memory state.
 */
import { useSyncExternalStore } from "react";

export interface PersistedStore<T> {
  get: () => T;
  set: (value: T | ((prev: T) => T)) => void;
  clear: () => void;
  subscribe: (listener: () => void) => () => void;
  fallback: T;
}

const stores = new Map<string, PersistedStore<unknown>>();

export function persistedStore<T>(key: string, fallback: T, isValid: (v: unknown) => boolean = () => true): PersistedStore<T> {
  const existing = stores.get(key);
  if (existing) return existing as PersistedStore<T>;

  const listeners = new Set<() => void>();
  let cache: T | undefined;

  const read = (): T => {
    if (cache !== undefined) return cache;
    try {
      const raw = window.localStorage.getItem(key);
      const parsed: unknown = raw ? JSON.parse(raw) : undefined;
      cache = parsed !== undefined && isValid(parsed) ? (parsed as T) : fallback;
    } catch {
      cache = fallback;
    }
    return cache;
  };

  const emit = () => listeners.forEach((l) => l());

  const store: PersistedStore<T> = {
    fallback,
    get: read,
    set: (value) => {
      const next = typeof value === "function" ? (value as (prev: T) => T)(read()) : value;
      cache = next;
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // keep in memory only
      }
      emit();
    },
    clear: () => {
      cache = fallback;
      try {
        window.localStorage.removeItem(key);
      } catch {
        // ignore
      }
      emit();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      const onStorage = (e: StorageEvent) => {
        if (e.key === key) {
          cache = undefined;
          listener();
        }
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    },
  };
  stores.set(key, store as PersistedStore<unknown>);
  return store;
}

export function usePersisted<T>(store: PersistedStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, () => store.fallback);
}
