/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Sliders, Waves, Activity, Radio, HelpCircle } from "lucide-react";

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
  // Local state for smooth visual responsiveness
  const [cutoff, setCutoff] = useState<number>(20000);
  const [qFactor, setQFactor] = useState<number>(1.0);
  const [delayTime, setDelayTime] = useState<number>(0.35);
  const [delayFeedback, setDelayFeedback] = useState<number>(0.25);
  const [synthRelease, setSynthRelease] = useState<number>(0.28);

  const handleCutoff = (val: number) => {
    setCutoff(val);
    onCutoffChange(val);
  };

  const handleQ = (val: number) => {
    setQFactor(val);
    onQChange(val);
  };

  const handleDelayTime = (val: number) => {
    setDelayTime(val);
    onDelayTimeChange(val);
  };

  const handleDelayFeedback = (val: number) => {
    setDelayFeedback(val);
    onDelayFeedbackChange(val);
  };

  const handleRelease = (val: number) => {
    setSynthRelease(val);
    onReleaseChange(val);
  };

  return (
    <div className="bg-brand-card border border-white/10 rounded-[32px] p-6 flex flex-col gap-4" id="fx-rack">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2 text-brand-cyan">
          <Sliders className="h-4.5 w-4.5 animate-pulse" />
          <h2 className="font-display font-black text-sm tracking-widest uppercase text-white">
            Quantum Synthesis & FX Modulation Rack
          </h2>
        </div>
        <span className="text-[10px] font-mono text-brand-cyan bg-brand-cyan/15 rounded-md px-2 py-0.5 border border-brand-cyan/20 font-bold uppercase tracking-widest">
          Node Processor
        </span>
      </div>

      {/* Control sliders grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mt-2">
        {/* Resonant filter cutoff */}
        <div className="flex flex-col gap-2 p-4 bg-brand-dark/40 rounded-2xl border border-white/5 hover:border-brand-cyan/20 transition-all">
          <div className="flex items-center justify-between text-[11px] font-mono font-bold text-white/50 uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <Waves className="h-3.5 w-3.5 text-brand-cyan" /> Filter Cutoff
            </span>
            <span className="text-brand-cyan font-black">
              {cutoff === 20000 ? "BYPASS" : `${cutoff} Hz`}
            </span>
          </div>
          <input
            type="range"
            min="100"
            max="20000"
            step="100"
            value={cutoff}
            onChange={(e) => handleCutoff(Number(e.target.value))}
            className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-brand-cyan"
            id="fx-slider-cutoff"
          />
          <p className="text-[9px] font-medium text-white/30 leading-tight">
            Cuts high frequencies. Set lower to create muffled, ambient underwater lo-fi sweeps.
          </p>
        </div>

        {/* Filter Q */}
        <div className="flex flex-col gap-2 p-4 bg-brand-dark/40 rounded-2xl border border-white/5 hover:border-brand-purple/20 transition-all">
          <div className="flex items-center justify-between text-[11px] font-mono font-bold text-white/50 uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <Activity className="h-3.5 w-3.5 text-brand-purple" /> Resonance Q
            </span>
            <span className="text-brand-purple font-black">
              {qFactor.toFixed(1)}x
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="12"
            step="0.1"
            value={qFactor}
            onChange={(e) => handleQ(Number(e.target.value))}
            className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-brand-purple"
            id="fx-slider-qfactor"
          />
          <p className="text-[9px] font-medium text-white/30 leading-tight">
            Emphasizes filter edge frequencies. Higher values create a whistling, vocalized sweep resonance.
          </p>
        </div>

        {/* Delay Speed / Time */}
        <div className="flex flex-col gap-2 p-4 bg-brand-dark/40 rounded-2xl border border-white/5 hover:border-brand-pink/20 transition-all">
          <div className="flex items-center justify-between text-[11px] font-mono font-bold text-white/50 uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <Radio className="h-3.5 w-3.5 text-brand-pink animate-pulse" /> Delay Time
            </span>
            <span className="text-brand-pink font-black">
              {Math.round(delayTime * 1000)} ms
            </span>
          </div>
          <input
            type="range"
            min="0.05"
            max="0.95"
            step="0.05"
            value={delayTime}
            onChange={(e) => handleDelayTime(Number(e.target.value))}
            className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-brand-pink"
            id="fx-slider-delaytime"
          />
          <p className="text-[9px] font-medium text-white/30 leading-tight">
            Controls spacing between dynamic echoes. Lower values are tight, higher create spacious mountain reverberation.
          </p>
        </div>

        {/* Delay Feedback */}
        <div className="flex flex-col gap-2 p-4 bg-brand-dark/40 rounded-2xl border border-white/5 hover:border-[#ff9f00]/20 transition-all">
          <div className="flex items-center justify-between text-[11px] font-mono font-bold text-white/50 uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <Radio className="h-3.5 w-3.5 text-[#ff9f00]" /> Feedback Echo
            </span>
            <span className="text-[#ff9f00] font-black">
              {Math.round(delayFeedback * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="0.85"
            step="0.05"
            value={delayFeedback}
            onChange={(e) => handleDelayFeedback(Number(e.target.value))}
            className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-[#ff9f00]"
            id="fx-slider-[#ff9f00]"
          />
          <p className="text-[9px] font-medium text-white/30 leading-tight">
            Number of echo repeats inside the loop. Set above 60% for long cascading, ambient sound trails.
          </p>
        </div>

        {/* Envelope Release */}
        <div className="flex flex-col gap-2 p-4 bg-brand-dark/40 rounded-2xl border border-white/5 hover:border-teal-400/20 transition-all">
          <div className="flex items-center justify-between text-[11px] font-mono font-bold text-white/50 uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <Activity className="h-3.5 w-3.5 text-teal-400" /> Synth Decay
            </span>
            <span className="text-teal-400 font-black">
              {Math.round(synthRelease * 1000)} ms
            </span>
          </div>
          <input
            type="range"
            min="0.08"
            max="0.95"
            step="0.02"
            value={synthRelease}
            onChange={(e) => handleRelease(Number(e.target.value))}
            className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-teal-400"
            id="fx-slider-synthrelease"
          />
          <p className="text-[9px] font-medium text-white/30 leading-tight">
            Tail release of synthesized pluck/lead waves. Shorten for hard staccatos, lengthen for silky space pads.
          </p>
        </div>
      </div>
    </div>
  );
}
