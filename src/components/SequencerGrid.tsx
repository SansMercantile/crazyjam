/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { TrackState, DrumLane, NoteEvent } from "../types";
import { VolumeX, Volume2, ShieldAlert, Music, Bolt, Plus, Trash2, Eye, EyeOff, RefreshCw, Sparkles } from "lucide-react";

interface SequencerGridProps {
  tracks: TrackState[];
  currentStep: number;
  onStepToggle: (trackId: string, laneId: string | null, stepIndex: number) => void;
  onTrackVolumeChange: (trackId: string, val: number) => void;
  onTrackMuteToggle: (trackId: string) => void;
  onInstrumentChange: (trackId: string, type: "saw" | "square" | "sine" | "triangle" | "pluck") => void;
  scaleKey: string;
  onTracksUpdate?: (updated: TrackState[]) => void;
}

// Available notes mapping for Lead and Bass piano rolls
const LEAD_NOTES = ["A5", "G5", "E5", "D5", "C5", "B4", "A4"];
const BASS_NOTES = ["A3", "G3", "E3", "D3", "C3", "A2"];
const PAD_NOTES = ["A4", "E4", "C4", "G3", "E3", "C3"];

export function SequencerGrid({
  tracks,
  currentStep,
  onStepToggle,
  onTrackVolumeChange,
  onTrackMuteToggle,
  onInstrumentChange,
  scaleKey,
  onTracksUpdate,
}: SequencerGridProps) {
  const [activeTab, setActiveTab ] = useState<string>("drums");

  // Helper to check if a specific synth note is active at a step
  const isSynthNoteActive = (track: TrackState, note: string, step: number): boolean => {
    if (!track.melodyNotes) return false;
    return track.melodyNotes.some((item) => item.step === step && item.note === note);
  };

  const handleMutate = () => {
    if (!onTracksUpdate) return;
    const next = tracks.map((t) => {
      if (t.id !== activeTab) return t;
      if (t.type === "drums" && t.drumLanes) {
        const upLanes = t.drumLanes.map((l) => {
          const pattern = [...l.pattern];
          for (let s = 0; s < 16; s++) {
            if (Math.random() < 0.15) {
              pattern[s] = !pattern[s];
            }
          }
          return { ...l, pattern };
        });
        return { ...t, drumLanes: upLanes };
      }
      if (t.type === "synth" && t.melodyNotes) {
        let pattern = [...t.melodyNotes];
        const notesSet = t.id === "lead" ? LEAD_NOTES : t.id === "bass" ? BASS_NOTES : PAD_NOTES;
        for (let s = 0; s < 16; s++) {
          const rand = Math.random();
          if (rand < 0.1) {
            pattern = pattern.filter((n) => n.step !== s);
          } else if (rand < 0.22) {
            pattern = pattern.filter((n) => n.step !== s);
            const chosenNote = notesSet[Math.floor(Math.random() * notesSet.length)];
            pattern.push({ step: s, note: chosenNote, duration: 1 });
          }
        }
        return { ...t, melodyNotes: pattern };
      }
      return t;
    });
    onTracksUpdate(next);
  };

  const handleHumanize = () => {
    if (!onTracksUpdate) return;
    // Mutate with a very low variance to humanize lead or bass notes
    const next = tracks.map((t) => {
      if (t.id !== activeTab) return t;
      if (t.type === "synth" && t.melodyNotes) {
        const pattern = t.melodyNotes.map((n) => {
          if (Math.random() < 0.15) {
            const notesSet = t.id === "lead" ? LEAD_NOTES : t.id === "bass" ? BASS_NOTES : PAD_NOTES;
            const idx = notesSet.indexOf(n.note);
            if (idx !== -1) {
              const shift = Math.random() < 0.5 ? -1 : 1;
              const nextIdx = Math.max(0, Math.min(notesSet.length - 1, idx + shift));
              return { ...n, note: notesSet[nextIdx] };
            }
          }
          return n;
        });
        return { ...t, melodyNotes: pattern };
      }
      return t;
    });
    onTracksUpdate(next);
  };

  const handleRandomize = () => {
    if (!onTracksUpdate) return;
    const next = tracks.map((t) => {
      if (t.id !== activeTab) return t;
      if (t.type === "drums" && t.drumLanes) {
        const upLanes = t.drumLanes.map((l) => {
          const pattern = Array(16).fill(false);
          if (l.id === "kick") {
            [0, 4, 8, 12].forEach((idx) => { pattern[idx] = true; });
            if (Math.random() < 0.5) pattern[10] = true;
          } else if (l.id === "snare") {
            [4, 12].forEach((idx) => { pattern[idx] = true; });
          } else if (l.id === "hihat") {
            [2, 6, 10, 14].forEach((idx) => { pattern[idx] = true; });
            if (Math.random() < 0.4) [0, 8].forEach((idx) => { pattern[idx] = true; });
          } else {
            [3, 7, 11, 15].forEach((idx) => {
              if (Math.random() < 0.5) pattern[idx] = true;
            });
          }
          return { ...l, pattern };
        });
        return { ...t, drumLanes: upLanes };
      }
      if (t.type === "synth") {
        const notesSet = t.id === "lead" ? LEAD_NOTES : t.id === "bass" ? BASS_NOTES : PAD_NOTES;
        const newNotes: NoteEvent[] = [];
        const stepsToTrigger = t.id === "lead"
          ? [0, 2, 4, 7, 8, 10, 12, 14]
          : t.id === "bass"
          ? [0, 4, 8, 12]
          : [0, 4, 8, 12];
        stepsToTrigger.forEach((s) => {
          if (Math.random() < 0.7) {
            const pitch = notesSet[Math.floor(Math.random() * notesSet.length)];
            newNotes.push({ step: s, note: pitch, duration: 1 });
          }
        });
        return { ...t, melodyNotes: newNotes };
      }
      return t;
    });
    onTracksUpdate(next);
  };

  const handleClear = () => {
    if (!onTracksUpdate) return;
    const next = tracks.map((t) => {
      if (t.id !== activeTab) return t;
      if (t.type === "drums" && t.drumLanes) {
        const upLanes = t.drumLanes.map((l) => ({ ...l, pattern: Array(16).fill(false) }));
        return { ...t, drumLanes: upLanes };
      }
      if (t.type === "synth") {
        return { ...t, melodyNotes: [] };
      }
      return t;
    });
    onTracksUpdate(next);
  };

  return (
    <div className="bg-brand-card border border-brand-border rounded-2xl p-6 flex flex-col gap-6" id="sequencer-matrix">
      {/* Sequencer Track Selector Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-brand-border pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-brand-cyan animate-pulse shadow-neon-cyan" />
          <h2 className="font-display font-semibold text-sm tracking-wide uppercase text-brand-ink">
            Digital Multi-Track Sequencer
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Algorithmic operators strip */}
          {onTracksUpdate && (
            <div className="flex flex-wrap items-center gap-2 bg-brand-dark/40 border border-brand-border p-0.5 rounded-xl">
              <button
                onClick={handleMutate}
                className="px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase cursor-pointer transition-all border border-brand-pink/20 hover:border-brand-pink text-brand-ink flex items-center gap-1 hover:bg-brand-pink/10"
                title="Evolve active track randomly via Neural mutation"
              >
                <RefreshCw className="h-3.5 w-3.5 text-brand-pink" /> <span>Mutate</span>
              </button>
              <button
                onClick={handleRandomize}
                className="px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase cursor-pointer transition-all border border-brand-cyan/20 hover:border-brand-cyan text-brand-ink flex items-center gap-1 hover:bg-brand-cyan/10"
                title="Generates a perfect melodic or beat loop using scale theory"
              >
                <Sparkles className="h-3.5 w-3.5 text-brand-cyan" /> <span>Algo Gen</span>
              </button>
              <button
                onClick={handleHumanize}
                className="px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase cursor-pointer transition-all border border-teal-500/20 hover:border-teal-400 text-brand-ink flex items-center gap-1 hover:bg-teal-400/10"
                title="Slightly humanize instrument steps structure"
              >
                <Bolt className="h-3.5 w-3.5 text-teal-400" /> <span>Humanize</span>
              </button>
              <button
                onClick={handleClear}
                className="px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase cursor-pointer transition-all border border-red-500/10 hover:border-red-500 text-red-400 flex items-center gap-1 hover:bg-red-500/10"
                title="Wipe current grid completely"
              >
                <Trash2 className="h-3.5 w-3.5" /> <span>Erase</span>
              </button>
            </div>
          )}

          {/* Tab triggers */}
          <div className="flex items-center bg-brand-dark/80 border border-brand-border p-1 rounded-xl">
            {tracks.map((track) => {
              const isActive = activeTab === track.id;
              return (
                <button
                  key={track.id}
                  onClick={() => setActiveTab(track.id)}
                  className={`px-4 py-2 rounded-lg text-xs font-mono font-bold tracking-wide uppercase cursor-pointer transition-all ${
                    isActive
                      ? "bg-brand-pink text-brand-ink shadow-neon-glow scale-102"
                      : "text-brand-ink-muted hover:text-brand-ink hover:bg-brand-surface-2"
                  }`}
                >
                  {track.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Primary Workspace Grid */}
      <div className="flex flex-col gap-6">
        {tracks.map((track) => {
          if (track.id !== activeTab) return null;

          // Render DRUMS Matrix Editor
          if (track.type === "drums" && track.drumLanes) {
            return (
              <div key={track.id} className="flex flex-col gap-5">
                {/* Track Strip Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 bg-brand-dark/40 border border-brand-border p-4 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="text-xl">🥁</div>
                    <div>
                      <h4 className="font-semibold text-sm text-brand-ink uppercase font-display">
                        {track.name} Group
                      </h4>
                      <p className="text-[10px] font-mono text-brand-ink-muted uppercase tracking-wide font-bold">
                        Rhythm Step Matrix
                      </p>
                    </div>
                  </div>

                  {/* Volume Control widget */}
                  <div className="flex items-center gap-4 flex-wrap">
                    {/* Mute toggle button */}
                    <button
                      onClick={() => onTrackMuteToggle(track.id)}
                      className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                        track.muted
                          ? "bg-red-500/10 text-red-500 border-red-500/30 hover:bg-red-500/20"
                          : "bg-brand-surface-2 text-brand-ink-muted border border-brand-border hover:bg-brand-surface-2 hover:text-brand-ink"
                      }`}
                    >
                      {track.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </button>

                    {/* Volume Slider */}
                    <div className="flex items-center gap-2 min-w-[130px]">
                      <span className="text-[10px] font-mono text-brand-ink-muted font-bold">VOL</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={track.volume}
                        disabled={track.muted}
                        onChange={(e) => onTrackVolumeChange(track.id, Number(e.target.value))}
                        className="flex-1 h-1.5 bg-brand-surface-2 rounded-lg appearance-none cursor-pointer accent-brand-pink disabled:opacity-30"
                      />
                      <span className="text-[10px] font-mono text-brand-ink-muted font-bold w-6 text-right">
                        {Math.round(track.volume * 100)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* DRUMS Trigger 16-Step grid sheet */}
                <div className="ring-1 ring-white/10 rounded-2xl overflow-hidden bg-brand-dark/60">
                  {/* Step coordinates header grid */}
                  <div className="grid grid-cols-12 md:grid-cols-20 items-center border-b border-brand-border p-2 bg-brand-surface-2">
                    <div className="col-span-3 text-[10px] font-mono text-brand-ink-muted font-bold px-2 uppercase tracking-wide text-left">
                      Instr Lane
                    </div>
                    <div className="col-span-9 md:col-span-17 grid grid-cols-16 gap-1 md:gap-1.5 px-2">
                      {Array.from({ length: 16 }).map((_, stepIdx) => {
                        const isCurrent = currentStep === stepIdx;
                        // Bold beat notches at 1, 5, 9, 13
                        const isPrimaryBeat = stepIdx % 4 === 0;
                        return (
                          <div
                            key={stepIdx}
                            className={`text-center font-mono text-[10px] font-bold rounded ${
                              isCurrent
                                ? "text-brand-pink bg-brand-pink/10 border border-brand-pink/30 p-0.5 animate-pulse"
                                : isPrimaryBeat
                                ? "text-brand-ink-muted"
                                : "text-brand-ink-muted"
                            }`}
                          >
                            {stepIdx + 1}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Lanes rendering */}
                  <div className="flex flex-col divide-y divide-white/5 pb-1">
                    {track.drumLanes.map((lane) => (
                      <div
                        key={lane.id}
                        className="grid grid-cols-12 md:grid-cols-20 items-center p-3 hover:bg-brand-surface-2 transition-colors"
                      >
                        {/* Lane identity details */}
                        <div className="col-span-3 flex items-center gap-2.5 px-2">
                          <div className={`w-1.5 h-6 rounded-full ${
                            lane.id === "kick" ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" :
                            lane.id === "snare" ? "bg-brand-pink shadow-neon-glow" :
                            lane.id === "hihat" ? "bg-brand-cyan shadow-neon-cyan" :
                            "bg-amber-400"
                          }`} />
                          <div className="min-w-0">
                            <span className="font-bold text-xs text-brand-ink block truncate">
                              {lane.name}
                            </span>
                            <span className="text-[9px] font-mono text-brand-ink-muted uppercase tracking-wide block font-bold">
                              {lane.id.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {/* Sequencer Buttons layout */}
                        <div className="col-span-9 md:col-span-17 grid grid-cols-16 gap-1.5 px-2">
                          {lane.pattern.map((isSet, stepIdx) => {
                            const isCurrent = currentStep === stepIdx;
                            const isFour = stepIdx % 4 === 0;

                            let activeBg = isSet
                              ? lane.id === "kick"
                                ? "bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_12px_rgba(239,68,68,0.4)] border-red-400/20"
                                : lane.id === "snare"
                                ? "bg-gradient-to-r from-brand-purple to-brand-pink shadow-neon-glow border-brand-pink/20"
                                : lane.id === "hihat"
                                ? "bg-gradient-to-r from-brand-cyan to-brand-purple shadow-neon-cyan border-brand-cyan/20"
                                : "bg-gradient-to-r from-amber-500 to-yellow-400 shadow-neon-glow border-amber-400/20"
                              : "";

                            return (
                              <button
                                key={stepIdx}
                                onClick={() => onStepToggle(track.id, lane.id, stepIdx)}
                                className={`aspect-square sm:h-9 hover:brightness-110 active:scale-95 transition-all rounded-lg border cursor-pointer outline-none relative ${
                                  isSet
                                    ? `${activeBg} text-brand-ink`
                                    : isCurrent
                                    ? "bg-brand-surface-2 border-brand-cyan shadow-neon-cyan"
                                    : isFour
                                    ? "bg-brand-dark border-brand-border"
                                    : "bg-brand-dark/40 border-brand-border"
                                }`}
                                title={`${lane.name} Step ${stepIdx + 1}`}
                              >
                                {isCurrent && (
                                  <div className="absolute inset-0.5 rounded-md border border-dashed border-brand-border animate-ping pointer-events-none" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          }

          // Render SYNTH / Monophonic Piano Roll View
          const notesSet = track.id === "lead" ? LEAD_NOTES : track.id === "bass" ? BASS_NOTES : PAD_NOTES;

          return (
            <div key={track.id} className="flex flex-col gap-5 animate-fadeIn">
              {/* Synth settings bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-brand-dark/40 border border-brand-border p-4 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="text-xl">🎹</div>
                  <div>
                    <h4 className="font-semibold text-sm text-slate-100 uppercase font-display flex items-center gap-2">
                      {track.name} Synthesis
                    </h4>
                    <p className="text-[10px] font-mono text-brand-pink uppercase tracking-wide font-bold">
                      Oscillator Node Selector ({scaleKey || "A Minor"} Scale)
                    </p>
                  </div>
                </div>

                {/* Synth configuration controls */}
                <div className="flex flex-wrap items-center gap-4">
                  {/* Waveform type picker */}
                  <div className="flex items-center bg-brand-dark border border-brand-border p-1 rounded-lg">
                    {(["saw", "square", "sine", "triangle", "pluck"] as const).map((wt) => {
                      const isActive = (track.instrumentType || "saw") === wt;
                      return (
                        <button
                          key={wt}
                          onClick={() => onInstrumentChange(track.id, wt)}
                          className={`px-3 py-1 rounded text-[10px] font-mono font-bold uppercase transition-colors cursor-pointer ${
                            isActive
                              ? "bg-brand-pink/20 text-brand-pink border border-[#ff00ff]/30"
                              : "text-brand-ink-muted hover:text-brand-ink"
                          }`}
                        >
                          {wt}
                        </button>
                      );
                    })}
                  </div>

                  {/* Volume Dial */}
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => onTrackMuteToggle(track.id)}
                      className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                        track.muted
                          ? "bg-red-500/10 text-red-500 border-red-500/30 hover:bg-red-500/20"
                          : "bg-brand-surface-2 text-brand-ink-muted border border-brand-border hover:bg-brand-surface-2 hover:text-brand-ink"
                      }`}
                    >
                      {track.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </button>

                    <div className="flex items-center gap-2 min-w-[130px]">
                      <span className="text-[10px] font-mono text-brand-ink-muted font-bold">VOL</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={track.volume}
                        disabled={track.muted}
                        onChange={(e) => onTrackVolumeChange(track.id, Number(e.target.value))}
                        className="flex-1 h-1.5 bg-brand-surface-2 rounded-lg appearance-none cursor-pointer accent-brand-pink"
                      />
                      <span className="text-[10px] font-mono text-brand-ink-muted font-bold w-6 text-right">
                        {Math.round(track.volume * 100)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* PIANO ROLL Guts Matrix */}
              <div className="ring-1 ring-white/10 rounded-2xl overflow-hidden bg-brand-dark/60">
                {/* Roll Coordinates header */}
                <div className="grid grid-cols-12 md:grid-cols-20 items-center border-b border-brand-border p-2 bg-brand-surface-2">
                  <div className="col-span-3 text-[10px] font-mono text-brand-ink-muted font-bold px-2 uppercase tracking-wide text-left">
                    Pitch Freq
                  </div>
                  <div className="col-span-9 md:col-span-17 grid grid-cols-16 gap-1 md:gap-1.5 px-2">
                    {Array.from({ length: 16 }).map((_, stepIdx) => {
                      const isCurrent = currentStep === stepIdx;
                      const isPrimaryBeat = stepIdx % 4 === 0;
                      return (
                        <div
                          key={stepIdx}
                          className={`text-center font-mono text-[10px] font-bold rounded ${
                            isCurrent
                              ? "text-brand-cyan bg-brand-cyan/10 border border-brand-cyan/30 p-0.5 animate-pulse"
                              : isPrimaryBeat
                              ? "text-brand-ink-muted"
                              : "text-brand-ink-muted"
                          }`}
                        >
                          {stepIdx + 1}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Piano note rows */}
                <div className="flex flex-col divide-y divide-white/5 pb-1">
                  {notesSet.map((note) => (
                    <div
                      key={note}
                      className="grid grid-cols-12 md:grid-cols-20 items-center py-2.5 hover:bg-brand-surface-2 transition-all"
                    >
                      {/* Note tag element */}
                      <div className="col-span-3 flex items-center justify-between px-3">
                        <span className="font-mono text-xs font-semibold text-brand-ink-muted uppercase">
                          {note}
                        </span>
                        {/* Black key indicator logic */}
                        {note.includes("#") ? (
                          <span className="text-[8px] font-mono text-brand-pink/80 uppercase font-bold">
                            # Sharp Freq
                          </span>
                        ) : (
                          <span className="text-[8px] font-mono text-brand-cyan/40 uppercase font-bold">
                            Base Scale
                          </span>
                        )}
                      </div>

                      {/* Sequencer Buttons layout */}
                      <div className="col-span-9 md:col-span-17 grid grid-cols-16 gap-1.5 px-2">
                        {Array.from({ length: 16 }).map((_, stepIdx) => {
                          const isCurrent = currentStep === stepIdx;
                          const isFour = stepIdx % 4 === 0;
                          const pinActive = isSynthNoteActive(track, note, stepIdx);

                          let fillGradient = pinActive
                            ? track.id === "lead"
                              ? "from-[#7000ff] via-[#9c27b0] to-brand-pink shadow-neon-glow border-brand-pink/20"
                              : track.id === "bass"
                              ? "from-brand-cyan to-brand-purple shadow-neon-cyan border-brand-cyan/20"
                              : "from-brand-pink to-orange-500 shadow-neon-glow border-brand-pink/20"
                            : "";

                          return (
                            <button
                              key={stepIdx}
                              onClick={() => onStepToggle(track.id, note, stepIdx)}
                              className={`aspect-square sm:h-9 hover:brightness-110 active:scale-95 transition-all rounded-lg border cursor-pointer outline-none relative ${
                                pinActive
                                  ? `bg-gradient-to-tr ${fillGradient} text-brand-ink`
                                  : isCurrent
                                  ? "bg-brand-surface-2 border-brand-cyan shadow-neon-cyan"
                                  : isFour
                                  ? "bg-brand-dark border-brand-border"
                                  : "bg-brand-dark/40 border-brand-border"
                              }`}
                              title={`${track.name} ${note} Step ${stepIdx + 1}`}
                            >
                              {isCurrent && (
                                <div className="absolute inset-0.5 rounded-md border border-dashed border-brand-border animate-ping pointer-events-none" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
