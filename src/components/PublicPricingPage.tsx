/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Public /pricing page — CrazyJam plans. SEO-crawlable, no login required to
 * view. The subscribe CTA sends signed-in users to the PayFast hosted
 * checkout; signed-out users get sent to sign in first.
 */
import React, { useEffect, useState } from "react";
import { Music2, Check, Loader2, Sparkles, Coins } from "lucide-react";
import { listBillingPlans, subscribeToPlan, topUpCredits, getCredits, isLoggedIn, BillingPlan, CreditPack } from "../utils/api";

export const PublicPricingPage: React.FC = () => {
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [creditPacks, setCreditPacks] = useState<CreditPack[]>([]);
  const [note, setNote] = useState("Subscriptions cover unlimited music creation. Credits power video & album art.");
  const [loading, setLoading] = useState(true);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [busyPack, setBusyPack] = useState<string | null>(null);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "CrazyJam Pricing | AI music studio";
    listBillingPlans()
      .then((d) => { setPlans(d.plans); setCreditPacks(d.creditPacks || []); setNote(d.note); })
      .catch(() => setError("Could not load pricing right now."))
      .finally(() => setLoading(false));
    if (isLoggedIn()) {
      getCredits().then((c) => setCreditBalance(c.credits)).catch(() => {});
    }
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

  const handleTopUp = async (packId: string) => {
    setError("");
    if (!isLoggedIn()) {
      window.location.href = "/?topup=" + packId;
      return;
    }
    setBusyPack(packId);
    try {
      const r = await topUpCredits(packId);
      if (r.success && r.redirectUrl) {
        window.location.href = r.redirectUrl;
      } else {
        setError(r.error || "Could not start checkout.");
      }
    } catch (e: any) {
      setError(e.message || "Could not start checkout.");
    } finally {
      setBusyPack(null);
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

        {/* Credit packs — video creation + album art */}
        {creditPacks.length > 0 && (
          <section className="flex flex-col gap-6 pt-4 border-t border-white/10">
            <div className="text-center flex flex-col gap-2">
              <div className="flex items-center justify-center gap-2">
                <Coins className="h-5 w-5 text-amber-400" />
                <h3 className="text-2xl font-bold">Credits for video &amp; album art</h3>
              </div>
              <p className="text-white/60 text-sm max-w-lg mx-auto leading-relaxed">
                Subscriptions cover unlimited <span className="text-white/80">music</span> creation.
                Video creation and album art are credit-based — top up a pack and spend
                credits on those renders. One-off purchase, credits never expire.
              </p>
              {creditBalance !== null && (
                <p className="text-amber-400 text-sm font-medium">Your balance: {creditBalance} credits</p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-3xl mx-auto w-full">
              {creditPacks.map((c) => (
                <div key={c.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-3 hover:border-amber-400/40 transition-all">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold">{c.name}</h4>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-amber-400/15 border border-amber-400/30 text-amber-400">{c.credits} credits</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">${c.price}</span>
                    <span className="text-white/60 text-[12px]">one-off</span>
                  </div>
                  <p className="text-[12px] text-white/60 flex-1">
                    ≈ {Math.floor(c.credits / 5)} album covers or {Math.floor(c.credits / 25)} video renders
                  </p>
                  <button
                    onClick={() => handleTopUp(c.id)}
                    disabled={busyPack === c.id}
                    className="w-full h-10 flex items-center justify-center gap-2 rounded-xl border border-white/20 hover:border-amber-400/50 font-semibold text-sm transition-all disabled:opacity-50 active:scale-[0.99]"
                  >
                    {busyPack === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {busyPack === c.id ? "Redirecting…" : "Top up"}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="text-center flex flex-col gap-2">
          <p className="text-white/60 text-[12px] max-w-md mx-auto leading-relaxed">
            Secure checkout by PayFast — your card never touches our servers.
            Subscriptions billed monthly, cancel anytime. Credits are one-off and never expire.
          </p>
        </div>
      </main>
    </div>
  );
};
