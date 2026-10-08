import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** False during server render and hydration, true afterwards. */
export function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}
