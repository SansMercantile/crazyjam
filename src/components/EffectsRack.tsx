/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Sliders, Waves, Activity, Radio } from "lucide-react";

interface EffectsRackProps {
  onCutoffChange: (val: number) => void;
  onQChange: (val: number) => void;
  onDelayTimeChange: (val: number) => void;
  onDelayFeedbackChange: (val: number) => void;
  onReleaseChange: (val: number) => void;
}

export function EffectsRack({
  onCutoffChange,
  onQChange,
  onDelayTimeChange,
  onDelayFeedbackChange,
  onReleaseChange,
}: EffectsRackProps) {
  const [cutoff, setCutoff] = useState<number>(20000);
  const [qFactor, setQFactor] = useState<number>(1.0);
  const [delayTime, setDelayTime] = useState<number>(0.35);
  const [delayFeedback, setDelayFeedback] = useState<number>(0.25);
  const [synthRelease, setSynthRelease] = useState<number>(0.28);

  const handleCutoff = (val: number) => { setCutoff(val); onCutoffChange(val); };
  const handleQ = (val: number) => { setQFactor(val); onQChange(val); };
  const handleDelayTime = (val: number) => { setDelayTime(val); onDelayTimeChange(val); };
  const handleDelayFeedback = (val: number) => { setDelayFeedback(val); onDelayFeedbackChange(val); };
  const handleRelease = (val: number) => { setSynthRelease(val); onReleaseChange(val); };

  const sliders = [
    { icon: Waves, label: "Filter cutoff", value: cutoff === 20000 ? "Bypass" : `${cutoff} Hz`, min: 100, max: 20000, step: 100, val: cutoff, onChange: handleCutoff, desc: "Cuts high frequencies for muffled, ambient sweeps." },
    { icon: Activity, label: "Resonance Q", value: `${qFactor.toFixed(1)}x`, min: 0.5, max: 12, step: 0.1, val: qFactor, onChange: handleQ, desc: "Emphasizes filter edge frequencies for a vocalized sweep." },
    { icon: Radio, label: "Delay time", value: `${Math.round(delayTime * 1000)} ms`, min: 0.05, max: 0.95, step: 0.05, val: delayTime, onChange: handleDelayTime, desc: "Spacing between echoes - lower is tight, higher is spacious." },
    { icon: Radio, label: "Feedback echo", value: `${Math.round(delayFeedback * 100)}%`, min: 0, max: 0.85, step: 0.05, val: delayFeedback, onChange: handleDelayFeedback, desc: "Number of echo repeats - above 60% gives long ambient trails." },
    { icon: Activity, label: "Synth decay", value: `${Math.round(synthRelease * 1000)} ms`, min: 0.08, max: 0.95, step: 0.02, val: synthRelease, onChange: handleRelease, desc: "Tail release of pluck/lead waves - short for staccato, long for pads." },
  ];

  return (
    <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 flex flex-col gap-4" id="fx-rack">
      <div className="flex items-center justify-between border-b border-brand-border pb-3">
        <div className="flex items-center gap-2 text-brand-gold">
          <Sliders className="h-4 w-4" />
          <h2 className="font-display text-[15px] text-brand-ink">Effects rack</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {sliders.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="flex flex-col gap-2 p-3.5 bg-brand-surface-2 rounded-xl border border-brand-border">
              <div className="flex items-center justify-between text-[11px] text-brand-ink-muted">
                <span className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5 text-brand-gold" /> {s.label}</span>
                <span className="text-brand-gold font-medium">{s.value}</span>
              </div>
              <input
                type="range" min={s.min} max={s.max} step={s.step} value={s.val}
                onChange={(e) => s.onChange(Number(e.target.value))}
                className="w-full h-1.5 bg-brand-surface rounded-lg appearance-none cursor-pointer accent-brand-gold"
              />
              <p className="text-[10px] text-brand-ink-muted leading-tight">{s.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
