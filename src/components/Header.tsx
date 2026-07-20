/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Play, Square, Sparkles, Volume2, Loader2 } from "lucide-react";

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
    <header className="border-b border-brand-border bg-brand-surface/95 backdrop-blur-md px-6 py-4 sticky top-0 z-40">
      <div className="max-w-[1600px] mx-auto flex flex-col gap-4">
        {/* Brand Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-medium tracking-wide text-brand-gold border border-brand-gold/30 px-2 py-0.5 rounded-full">
              Suite v3.1
            </span>
            <div className="h-4 w-px bg-brand-border hidden sm:block" />
            <p className="text-[11px] text-brand-ink-muted tracking-wide hidden sm:block">
              AI-Native Music Composition Suite
            </p>
          </div>

          {/* Active Track Metadata */}
          <div className="flex items-center gap-5 bg-brand-surface-2 border border-brand-border px-4 py-2 rounded-xl">
            <div className="pr-5 border-r border-brand-border">
              <span className="text-[9px] text-brand-ink-muted block mb-0.5">Project</span>
              <span className="font-medium text-sm text-brand-ink block truncate max-w-[150px]">
                {title || "Untitled Session"}
              </span>
            </div>
            <div className="pr-5 border-r border-brand-border">
              <span className="text-[9px] text-brand-ink-muted block mb-0.5">Key</span>
              <span className="text-xs text-brand-gold font-medium block">{scale || "N/A"}</span>
            </div>
            <div>
              <span className="text-[9px] text-brand-ink-muted block mb-0.5">Style</span>
              <span className="text-xs text-brand-gold font-medium block">{genre || "Modular Ambient"}</span>
            </div>
          </div>
        </div>

        {/* Prompt + Generate */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
          <div className="lg:col-span-8 relative">
            <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gold" />
            <input
              type="text"
              placeholder="Describe a track for the swarm... e.g. 'moody dark ambient forest walk beat'"
              className="w-full bg-brand-surface-2 hover:bg-brand-surface-2 border border-brand-border focus:border-brand-gold/50 text-brand-ink placeholder-brand-ink-muted pl-11 pr-4 py-3 rounded-xl outline-none text-sm transition-all"
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              disabled={isGenerating}
            />
          </div>

          <button
            onClick={onGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="lg:col-span-4 h-full flex items-center justify-center gap-2 bg-brand-gold hover:brightness-110 disabled:opacity-40 text-brand-bg font-semibold text-sm px-6 py-3 rounded-xl transition-all disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Composing...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Compose Track</span>
              </>
            )}
          </button>
        </div>

        {/* Preset Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] text-brand-ink-muted">Quick themes:</span>
          {PRESET_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => onPromptChange(chip)}
              className="px-2.5 py-1 text-[10px] bg-brand-surface-2 hover:bg-brand-border/30 border border-brand-border rounded-full text-brand-ink-muted hover:text-brand-gold transition-all"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Transport */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-brand-surface-2 border border-brand-border px-5 py-3 rounded-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={onPlayToggle}
              className={`h-11 w-11 rounded-full flex items-center justify-center transition-all ${
                isPlaying
                  ? "bg-brand-gold text-brand-bg"
                  : "bg-brand-surface border border-brand-gold/40 text-brand-gold hover:bg-brand-gold/10"
              }`}
            >
              {isPlaying ? <Square className="h-4.5 w-4.5 fill-current" /> : <Play className="h-4.5 w-4.5 fill-current ml-0.5" />}
            </button>
            <div>
              <span className="text-[9px] text-brand-ink-muted block leading-tight">Transport</span>
              <span className="text-xs font-medium text-brand-ink">
                {isPlaying ? "Playing" : "Idle"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-8">
            <div className="flex items-center gap-3 min-w-[190px]">
              <div>
                <span className="text-[9px] text-brand-ink-muted block leading-tight">Tempo</span>
                <span className="text-xs font-medium text-brand-ink">{tempo} <span className="text-[9px] text-brand-ink-muted">BPM</span></span>
              </div>
              <input
                type="range"
                min="75"
                max="145"
                value={tempo}
                onChange={(e) => onTempoChange(Number(e.target.value))}
                className="flex-1 h-1.5 bg-brand-border rounded-lg appearance-none cursor-pointer accent-brand-gold"
              />
            </div>

            <div className="flex items-center gap-3 min-w-[170px]">
              <Volume2 className="h-4 w-4 text-brand-ink-muted" />
              <div>
                <span className="text-[9px] text-brand-ink-muted block leading-tight">Gain</span>
                <span className="text-xs font-medium text-brand-ink">{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => onVolumeChange(Number(e.target.value))}
                className="flex-1 h-1.5 bg-brand-border rounded-lg appearance-none cursor-pointer accent-brand-gold"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
