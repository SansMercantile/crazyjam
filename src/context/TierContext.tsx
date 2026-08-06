/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tiers the app's complexity: "simple" is the default, low-friction surface
 * (record, upload, generate, basic sequencing) aimed at someone who's never
 * touched a DAW. "pro" reveals the professional-grade tools built across the
 * app (mixer automation, comping, DJ Mode, region editing, the Master
 * Engineer, per-track EQ) for people who actually want them. Nothing is
 * removed in simple mode - it's hidden, not deleted, and persists per-browser
 * so the choice sticks between sessions.
 */
import React, { createContext, useContext, useEffect, useState } from "react";

export type AppTier = "simple" | "pro";

interface TierContextValue {
  tier: AppTier;
  setTier: (tier: AppTier) => void;
  isPro: boolean;
}

const TierContext = createContext<TierContextValue | undefined>(undefined);

const STORAGE_KEY = "crazyjam_tier";

export function TierProvider({ children }: { children: React.ReactNode }) {
  const [tier, setTierState] = useState<AppTier>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "pro" ? "pro" : "simple";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, tier);
  }, [tier]);

  const setTier = (t: AppTier) => setTierState(t);

  return <TierContext.Provider value={{ tier, setTier, isPro: tier === "pro" }}>{children}</TierContext.Provider>;
}

export function useTier(): TierContextValue {
  const ctx = useContext(TierContext);
  if (!ctx) throw new Error("useTier must be used within a TierProvider");
  return ctx;
}
