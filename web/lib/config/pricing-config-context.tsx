"use client";

/**
 * Tenant-level pricing configuration + the demo viewer role.
 * Persisted to localStorage for the demo; in production this is the versioned
 * PricingRuleSet / RateCard from the backend.
 */
import { createContext, useCallback, useContext, useMemo } from "react";
import { DEFAULT_PRICING_CONFIG, type PricingConfig } from "@/lib/config/defaults";
import { persistedStore, usePersisted } from "@/lib/state/persisted-store";
import type { UserRole } from "@/lib/types";

const configStore = persistedStore<PricingConfig | null>(
  "quoteiq.pricing-config.v1",
  null,
  (v) => (v as PricingConfig | null)?.version === DEFAULT_PRICING_CONFIG.version,
);
const roleStore = persistedStore<UserRole>("quoteiq.demo-role.v1", "analyst");

interface PricingConfigState {
  config: PricingConfig;
  isCustomised: boolean;
  update: (fn: (draft: PricingConfig) => void) => void;
  reset: () => void;
  role: UserRole;
  setRole: (role: UserRole) => void;
}

const Ctx = createContext<PricingConfigState | null>(null);

export function PricingConfigProvider({ children }: { children: React.ReactNode }) {
  const stored = usePersisted(configStore);
  const role = usePersisted(roleStore);
  const config = stored ?? DEFAULT_PRICING_CONFIG;

  const update = useCallback((fn: (draft: PricingConfig) => void) => {
    configStore.set((prev) => {
      const next = structuredClone(prev ?? DEFAULT_PRICING_CONFIG);
      fn(next);
      return next;
    });
  }, []);

  const value = useMemo<PricingConfigState>(
    () => ({
      config,
      isCustomised: stored !== null,
      update,
      reset: configStore.clear,
      role,
      setRole: roleStore.set,
    }),
    [config, stored, update, role],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePricingConfig() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePricingConfig must be used inside PricingConfigProvider");
  return ctx;
}
