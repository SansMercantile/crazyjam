/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Play, Square, Sparkles, Volume2, Music, Loader2 } from "lucide-react";

interface HeaderProps {
  title: string;
  scale: string;
  genre: string;
  tempo: number;
  isPlaying: boolean;
  isGenerating: boolean;
  prompt: string;
  onPromptChange: (val: string) => void;
  onGenerate: () => void;
  onPlayToggle: () => void;
  onTempoChange: (val: number) => void;
  onVolumeChange: (val: number) => void;
  volume: number;
}

const PRESET_CHIPS = [
  "Moody Cyberpunk Synthwave",
  "Nostalgic 86 Lofi Beats",
  "Heavy Underground Deep House",
  "Cinematic Industrial Dark Techno",
  "Tropical Organic Ambient Groove",
];

export function Header({
  title,
  scale,
  genre,
  tempo,
  isPlaying,
  isGenerating,
  prompt,
  onPromptChange,
  onGenerate,
  onPlayToggle,
  onTempoChange,
  onVolumeChange,
  volume,
}: HeaderProps) {
  return (
    <header className="border-b border-white/10 bg-brand-card/90 backdrop-blur-md p-5 sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto flex flex-col gap-4">
        {/* Brand Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src="/full-logo-1,png"
                alt="CrazyJam Logo"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src.includes("full-logo-1,png")) {
                    target.src = "/full-logo-1.png";
                  } else {
                    target.style.display = "none";
                    const fallbackEl = document.getElementById("brand-visual-fallback");
                    if (fallbackEl) {
                      fallbackEl.classList.remove("hidden");
                      fallbackEl.classList.add("flex");
                    }
                  }
                }}
                className="h-12 w-auto object-contain select-none transition-all duration-300"
                style={{
                  filter: "drop-shadow(0 0 8px rgba(255, 0, 255, 0.65)) drop-shadow(0 0 16px rgba(0, 255, 255, 0.45))"
                }}
                referrerPolicy="no-referrer"
              />

              {/* High-fidelity abstract soundwave brand fallback - strictly NO word CRAZYJAM and NO C letter/icon */}
              <div 
                id="brand-visual-fallback" 
                className="hidden items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10"
              >
                <div className="flex gap-1 items-end h-7">
                  <div className="w-1 bg-[#ff00ff] rounded h-5 animate-pulse" style={{ animationDelay: "0s", animationDuration: "1s" }} />
                  <div className="w-1 bg-[#00ffff] rounded h-3 animate-pulse" style={{ animationDelay: "0.2s", animationDuration: "0.8s" }} />
                  <div className="w-1 bg-[#a855f7] rounded h-6 animate-pulse" style={{ animationDelay: "0.4s", animationDuration: "1.2s" }} />
                  <div className="w-1 bg-[#e59632] rounded h-4 animate-pulse" style={{ animationDelay: "0.6s", animationDuration: "0.9s" }} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-mono font-black uppercase tracking-widest text-white/80 leading-none">
                    Studio Active
                  </span>
                  <span className="text-[7px] font-mono text-brand-cyan uppercase tracking-widest mt-0.5 font-bold leading-none">
                    Reference Synced
                  </span>
                </div>
              </div>
            </div>

            <div className="h-8 w-px bg-white/10 hidden sm:block" />

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold bg-[#ff00ff]/10 text-brand-pink border border-[#ff00ff]/30 px-1.5 py-0.5 rounded uppercase tracking-wider">
                  Suite v3.1
                </span>
              </div>
              <p className="text-[11px] text-white/40 font-mono tracking-widest uppercase mt-0.5">
                AI-Native Music Composition Ecosystem
              </p>
            </div>
          </div>

          {/* Active Track Metadata Card */}
          <div className="flex items-center gap-6 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
            <div className="border-r border-white/10 pr-5">
              <span className="text-[10px] uppercase tracking-widest font-mono text-white/40 block mb-0.5">
                Active Project
              </span>
              <span className="font-black text-sm text-white font-display block truncate max-w-[150px]">
                {title || "Uncompiled Session"}
              </span>
            </div>
            <div className="border-r border-white/10 pr-5">
              <span className="text-[10px] uppercase tracking-widest font-mono text-white/40 block mb-0.5">
                Scale Key
              </span>
              <span className="font-mono text-xs text-brand-cyan font-bold block uppercase tracking-wider">
                {scale || "N/A"}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-widest font-mono text-white/40 block mb-0.5">
                Style Alignment
              </span>
              <span className="font-mono text-xs text-brand-pink font-bold block uppercase tracking-wider">
                {genre || "Modular Ambient"}
              </span>
            </div>
          </div>
        </div>

        {/* AI Jam Control Box */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center mt-2">
          {/* Prompt Entry Input */}
          <div className="lg:col-span-8 relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-brand-pink">
              <Sparkles className="h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder="Prompt the neural multi-agent swarm... (e.g. 'moody dark ambient forest walk beat')"
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 focus:border-brand-pink/50 text-white placeholder-white/30 pl-11 pr-4 py-3 rounded-xl outline-none text-sm transition-all focus:ring-1 focus:ring-brand-pink/20"
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              disabled={isGenerating}
            />
          </div>

          {/* Action Trigger */}
          <button
            onClick={onGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="lg:col-span-4 h-full flex items-center justify-center gap-2 bg-gradient-to-r from-brand-purple to-brand-pink hover:scale-[1.02] disabled:from-brand-card disabled:to-brand-dark/40 text-white font-black text-xs uppercase tracking-widest px-6 py-3.5 rounded-xl transition-all shadow-neon-glow cursor-pointer disabled:cursor-not-allowed border-t border-white/20"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>ASSEMBLING BEAT BLUEPRINT...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>COMPOSE TRACK BLUEPRINT</span>
              </>
            )}
          </button>
        </div>

        {/* Preset Chips Quick Fill */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest font-mono">Quick Themes:</span>
          {PRESET_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => onPromptChange(chip)}
              className="px-2.5 py-1 text-[10px] font-bold font-mono bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/60 hover:text-brand-pink transition-all cursor-pointer uppercase tracking-wider"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Control Desk Row (Play / Pause / Tempo / Volume) */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-2 bg-brand-dark/40 border border-white/10 px-5 py-3 rounded-xl">
          {/* Transport buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={onPlayToggle}
              className={`p-3 rounded-full flex items-center justify-center cursor-pointer transition-all border ${
                isPlaying
                  ? "bg-brand-pink text-white border-brand-pink/40 hover:scale-105 shadow-neon-glow animate-pulse"
                  : "bg-brand-cyan text-brand-dark border-brand-cyan/40 hover:scale-105 shadow-neon-cyan"
              }`}
            >
              {isPlaying ? (
                <Square className="h-5 w-5 fill-current" />
              ) : (
                <Play className="h-5 w-5 fill-current" />
              )}
            </button>
            <div>
              <span className="text-[10px] font-mono text-white/30 font-bold block uppercase tracking-widest">
                Transport Flow
              </span>
              <span
                className={`font-mono text-xs font-bold uppercase tracking-wider ${
                  isPlaying ? "text-brand-pink" : "text-brand-cyan"
                }`}
              >
                {isPlaying ? "Live Synthesizer Playing" : "Sequencer Idle"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-8">
            {/* BPM Slider */}
            <div className="flex items-center gap-3 min-w-[200px]">
              <div>
                <span className="text-[10px] font-mono text-white/30 font-bold block leading-tight uppercase tracking-widest">
                  TEMPO
                </span>
                <span className="font-mono text-xs font-black text-brand-cyan">
                  {tempo} <span className="text-[9px] text-white/40 uppercase font-bold">BPM</span>
                </span>
              </div>
              <input
                type="range"
                min="75"
                max="145"
                value={tempo}
                onChange={(e) => onTempoChange(Number(e.target.value))}
                className="flex-1 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-cyan"
              />
            </div>

            {/* Master Gain Slider */}
            <div className="flex items-center gap-3 min-w-[180px]">
              <div className="flex items-center gap-1.5">
                <Volume2 className="h-4 w-4 text-white/30" />
                <div>
                  <span className="text-[10px] font-mono text-white/30 font-bold block leading-tight uppercase tracking-widest">
                    GAIN
                  </span>
                  <span className="font-mono text-xs font-black text-brand-pink">
                    {Math.round(volume * 100)}%
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => onVolumeChange(Number(e.target.value))}
                className="flex-1 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-pink"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
