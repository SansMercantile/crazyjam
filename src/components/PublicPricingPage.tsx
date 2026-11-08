/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Public /pricing page — CrazyJam plans at ~50% under Suno. SEO-crawlable,
 * no login required to view. The subscribe CTA sends signed-in users to the
 * PayFast hosted checkout; signed-out users get sent to sign in first.
 */
import React, { useEffect, useState } from "react";
import { Music2, Check, Loader2, Sparkles } from "lucide-react";
import { listBillingPlans, subscribeToPlan, isLoggedIn, BillingPlan } from "../utils/api";

export const PublicPricingPage: React.FC = () => {
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [note, setNote] = useState("~50% less than Suno. Cancel anytime.");
  const [loading, setLoading] = useState(true);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "CrazyJam Pricing | ~50% less than Suno — AI music studio";
    listBillingPlans()
      .then((d) => { setPlans(d.plans); setNote(d.note); })
      .catch(() => setError("Could not load pricing right now."))
      .finally(() => setLoading(false));
  }, []);

  const handleSubscribe = async (planId: string) => {
    setError("");
    if (!isLoggedIn()) {
      // Send them to the app to sign in; after login they can subscribe.
      window.location.href = "/?subscribe=" + planId;
      return;
    }
    setBusyPlan(planId);
    try {
      const r = await subscribeToPlan(planId);
      if (r.success && r.redirectUrl) {
        window.location.href = r.redirectUrl; // PayFast hosted checkout
      } else {
        setError(r.error || "Could not start checkout.");
      }
    } catch (e: any) {
      setError(e.message || "Could not start checkout.");
    } finally {
      setBusyPlan(null);
    }
  };

  const FEATURES: Record<string, string[]> = {
    "crazyjam-pro": [
      "Full songs WITH vocals (ACE-Step on our own GPU)",
      "Two takes per generation — pick the better one",
      "Personas: your own voice/style identity",
      "Stems export (vocals + accompaniment)",
      "Up to 2-minute songs",
    ],
    "crazyjam-premier": [
      "Everything in Pro",
      "Priority GPU queue — faster generations",
      "Longer songs (up to 4 minutes)",
      "Album & music-video tools",
      "Commercial licence on every take",
    ],
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white">
      <header className="border-b border-white/10 px-6 py-5 flex items-center justify-between max-w-5xl mx-auto">
        <div className="flex items-center gap-2.5">
          <Music2 className="h-6 w-6 text-amber-400" />
          <h1 className="font-bold text-lg">CrazyJam Pricing</h1>
        </div>
        <a href="/" className="text-[12px] text-amber-400 hover:underline">Open the studio</a>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 flex flex-col gap-10">
        <div className="text-center flex flex-col gap-3">
          <h2 className="text-3xl font-bold">The AI music studio, ~50% less than Suno</h2>
          <p className="text-white/60 text-sm max-w-xl mx-auto leading-relaxed">
            Full songs with vocals on our own GPU models — no subscription lock-in games,
            just a fair price. {note}
          </p>
        </div>

        {loading ? (
          <p className="text-center text-white/40 text-sm flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading plans…
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto w-full">
            {/* Free tier */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-7 flex flex-col gap-5">
              <div>
                <h3 className="text-xl font-bold">Free</h3>
                <p className="text-[12px] text-white/50">Start making music right now</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-white/50 text-sm">/mo</span>
              </div>
              <ul className="flex flex-col gap-2.5 flex-1">
                {["Instrumental sequencer + blueprint", "Render Real Audio (MusicGen)", "CrazyJam Music publishing", "Community releases"].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[13px] text-white/70">
                    <Check className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
              <a href="/" className="w-full h-11 flex items-center justify-center gap-2 border border-white/20 hover:border-amber-400/50 rounded-xl font-medium text-sm transition-all">
                Start free
              </a>
            </div>

            {plans.map((p, i) => (
              <div key={p.id} className={`rounded-2xl p-7 flex flex-col gap-5 border ${i === plans.length - 1 ? "bg-amber-400/10 border-amber-400/40" : "bg-white/5 border-white/10"}`}>
                {i === plans.length - 1 && (
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Best value
                  </span>
                )}
                <div>
                  <h3 className="text-xl font-bold">{p.name}</h3>
                  <p className="text-[12px] text-white/50">{p.sunoCompare} — we're {p.price === "5.00" ? "half" : "half"} that</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">${p.price.split(".")[0]}</span>
                  <span className="text-white/50 text-sm">/mo</span>
                </div>
                <ul className="flex flex-col gap-2.5 flex-1">
                  {(FEATURES[p.id] || [p.tagline]).map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px] text-white/70">
                      <Check className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSubscribe(p.id)}
                  disabled={busyPlan === p.id}
                  className={`w-full h-11 flex items-center justify-center gap-2 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 ${i === plans.length - 1 ? "bg-amber-400 text-black hover:bg-amber-300" : "border border-white/20 hover:border-amber-400/50"}`}
                >
                  {busyPlan === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {busyPlan === p.id ? "Redirecting…" : `Subscribe to ${p.name}`}
                </button>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-center text-red-400 text-sm">{error}</p>}

        <p className="text-center text-white/40 text-[12px] max-w-md mx-auto leading-relaxed">
          Secure checkout by PayFast — your card never touches our servers.
          Prices in USD, billed monthly, cancel anytime.
        </p>
      </main>
    </div>
  );
};
