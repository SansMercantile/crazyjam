/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Public /pricing page — CrazyJam plans. SEO-crawlable, no login required to
 * view. The subscribe CTA sends signed-in users to the PayFast hosted
 * checkout; signed-out users get sent to sign in first.
 */
import React, { useEffect, useState } from "react";
import { Music2, Check, Loader2, Sparkles } from "lucide-react";
import { listBillingPlans, subscribeToPlan, isLoggedIn, BillingPlan } from "../utils/api";

export const PublicPricingPage: React.FC = () => {
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [note, setNote] = useState("Simple monthly pricing. Cancel anytime.");
  const [loading, setLoading] = useState(true);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "CrazyJam Pricing | AI music studio";
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
      "Full songs WITH vocals on our own GPU models",
      "Two takes per generation — pick the better one",
      "Dima voices: your own voice/style identity",
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
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-[#0a0a0c]/85 border-b border-white/10">
        <div className="px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-amber-400/15 border border-amber-400/30 flex items-center justify-center">
              <Music2 className="h-5 w-5 text-amber-400" />
            </div>
            <h1 className="font-bold text-base">CrazyJam Pricing</h1>
          </div>
          <a href="/" className="text-[12px] text-amber-400 hover:underline">Open the studio</a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-400/[0.06] via-transparent to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto px-6 py-14 text-center flex flex-col gap-4 relative">
          <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-[0.2em]">Pricing</span>
          <h2 className="text-4xl sm:text-5xl font-bold leading-tight">Priced to create</h2>
          <p className="text-white/75 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Full songs with vocals on our own GPU models — no subscription lock-in games,
            just a fair price. {note}
          </p>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-6 py-12 flex flex-col gap-10">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto w-full">
            {[0, 1].map((i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-7 flex flex-col gap-5 animate-pulse">
                <div className="h-6 bg-white/10 rounded w-1/3" />
                <div className="h-10 bg-white/5 rounded w-1/2" />
                <div className="flex flex-col gap-2.5">
                  {[0, 1, 2, 3].map((j) => <div key={j} className="h-3 bg-white/5 rounded" />)}
                </div>
                <div className="h-11 bg-white/10 rounded-xl" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto w-full">
            {/* Free tier */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-7 flex flex-col gap-5 transition-all hover:border-white/20">
              <div>
                <h3 className="text-xl font-bold">Free</h3>
                <p className="text-[12px] text-white/60">Start making music right now</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-bold">$0</span>
                <span className="text-white/60 text-sm">/mo</span>
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

            {plans.map((p, i) => {
              const featured = i === plans.length - 1;
              return (
                <div key={p.id} className={`relative rounded-2xl p-7 flex flex-col gap-5 border transition-all ${featured ? "bg-amber-400/10 border-amber-400/40 shadow-[0_8px_40px_rgba(217,196,143,0.12)] scale-[1.02]" : "bg-white/5 border-white/10 hover:border-white/20"}`}>
                  {featured && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-amber-400 text-black text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Best value
                    </span>
                  )}
                  <div>
                    <h3 className="text-xl font-bold">{p.name}</h3>
                    <p className="text-[12px] text-white/60">{p.tagline}</p>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-bold">${p.price.split(".")[0]}</span>
                    <span className="text-white/60 text-sm">/mo</span>
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
                    className={`w-full h-11 flex items-center justify-center gap-2 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 active:scale-[0.99] ${featured ? "bg-amber-400 text-black hover:bg-amber-300" : "border border-white/20 hover:border-amber-400/50"}`}
                  >
                    {busyPlan === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {busyPlan === p.id ? "Redirecting…" : `Subscribe to ${p.name}`}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {error && <p className="text-center text-red-400 text-sm">{error}</p>}

        <div className="text-center flex flex-col gap-2">
          <p className="text-white/60 text-[12px] max-w-md mx-auto leading-relaxed">
            Secure checkout by PayFast — your card never touches our servers.
            Prices in USD, billed monthly, cancel anytime.
          </p>
        </div>
      </main>
    </div>
  );
};
