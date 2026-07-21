/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { TrackState, DrumLane, NoteEvent } from "../types";
import { VolumeX, Volume2, Bolt, Trash2, RefreshCw, Sparkles } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<string>("drums");

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
            if (Math.random() < 0.15) pattern[s] = !pattern[s];
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
    <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 flex flex-col gap-6" id="sequencer-matrix">
      <div className="flex flex-wrap items-center justify-between border-b border-brand-border pb-4 gap-4">
        <div className="flex items-center gap-2.5">
          <div className="h-2 w-2 rounded-full bg-brand-gold" />
          <h2 className="font-display text-base text-brand-ink">Multi-track sequencer</h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onTracksUpdate && (
            <div className="flex flex-wrap items-center gap-1.5 bg-brand-bg border border-brand-border p-1 rounded-lg">
              <button
                onClick={handleMutate}
                className="px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all text-brand-ink-muted hover:text-brand-ink hover:bg-brand-surface-2 flex items-center gap-1.5"
                title="Evolve the active track's pattern randomly"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Mutate
              </button>
              <button
                onClick={handleRandomize}
                className="px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all text-brand-ink-muted hover:text-brand-ink hover:bg-brand-surface-2 flex items-center gap-1.5"
                title="Generate a new pattern using scale theory"
              >
                <Sparkles className="h-3.5 w-3.5" /> Generate
              </button>
              <button
                onClick={handleHumanize}
                className="px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all text-brand-ink-muted hover:text-brand-ink hover:bg-brand-surface-2 flex items-center gap-1.5"
                title="Slightly vary the existing pattern"
              >
                <Bolt className="h-3.5 w-3.5" /> Humanize
              </button>
              <button
                onClick={handleClear}
                className="px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all text-red-400 hover:bg-red-500/10 flex items-center gap-1.5"
                title="Clear the active track's pattern"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </button>
            </div>
          )}

          <div className="flex items-center bg-brand-bg border border-brand-border p-1 rounded-lg">
            {tracks.map((track) => {
              const isActive = activeTab === track.id;
              return (
                <button
                  key={track.id}
                  onClick={() => setActiveTab(track.id)}
                  className={`px-3.5 py-1.5 rounded-md text-[12px] font-medium transition-all ${
                    isActive ? "bg-brand-gold text-brand-bg" : "text-brand-ink-muted hover:text-brand-ink"
                  }`}
                >
                  {track.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {tracks.map((track) => {
          if (track.id !== activeTab) return null;

          if (track.type === "drums" && track.drumLanes) {
            return (
              <div key={track.id} className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-4 bg-brand-surface-2 border border-brand-border p-4 rounded-xl">
                  <div>
                    <h4 className="text-[14px] text-brand-ink">{track.name}</h4>
                    <p className="text-[11px] text-brand-ink-muted">16-step rhythm matrix</p>
                  </div>

                  <div className="flex items-center gap-4 flex-wrap">
                    <button
                      onClick={() => onTrackMuteToggle(track.id)}
                      className={`p-2 rounded-lg border transition-colors ${
                        track.muted ? "bg-red-500/10 text-red-400 border-red-500/30" : "bg-brand-surface text-brand-ink-muted border-brand-border hover:text-brand-ink"
                      }`}
                    >
                      {track.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </button>

                    <div className="flex items-center gap-2 min-w-[130px]">
                      <span className="text-[11px] text-brand-ink-muted">Vol</span>
                      <input
                        type="range" min="0" max="1" step="0.05"
                        value={track.volume} disabled={track.muted}
                        onChange={(e) => onTrackVolumeChange(track.id, Number(e.target.value))}
                        className="flex-1 h-1.5 bg-brand-surface rounded-lg appearance-none cursor-pointer accent-brand-gold disabled:opacity-30"
                      />
                      <span className="text-[11px] text-brand-ink-muted w-6 text-right">{Math.round(track.volume * 100)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl overflow-hidden border border-brand-border bg-brand-bg">
                  <div className="grid grid-cols-12 md:grid-cols-20 items-center border-b border-brand-border p-2 bg-brand-surface-2">
                    <div className="col-span-3 text-[10px] text-brand-ink-muted px-2 text-left">Lane</div>
                    <div className="col-span-9 md:col-span-17 grid grid-cols-16 gap-1 md:gap-1.5 px-2">
                      {Array.from({ length: 16 }).map((_, stepIdx) => {
                        const isCurrent = currentStep === stepIdx;
                        return (
                          <div key={stepIdx} className={`text-center text-[10px] rounded ${isCurrent ? "text-brand-gold" : "text-brand-ink-muted"}`}>
                            {stepIdx + 1}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col divide-y divide-brand-border pb-1">
                    {track.drumLanes.map((lane) => (
                      <div key={lane.id} className="grid grid-cols-12 md:grid-cols-20 items-center p-2.5 hover:bg-brand-surface-2/50 transition-colors">
                        <div className="col-span-3 flex items-center gap-2.5 px-2">
                          <div className="w-1 h-6 rounded-full bg-brand-gold/40" />
                          <div className="min-w-0">
                            <span className="text-[12px] text-brand-ink block truncate">{lane.name}</span>
                          </div>
                        </div>

                        <div className="col-span-9 md:col-span-17 grid grid-cols-16 gap-1.5 px-2">
                          {lane.pattern.map((isSet, stepIdx) => {
                            const isCurrent = currentStep === stepIdx;
                            const isFour = stepIdx % 4 === 0;
                            return (
                              <button
                                key={stepIdx}
                                onClick={() => onStepToggle(track.id, lane.id, stepIdx)}
                                className={`aspect-square sm:h-9 hover:brightness-110 active:scale-95 transition-all rounded-md border outline-none ${
                                  isSet
                                    ? "bg-brand-gold border-brand-gold/60"
                                    : isCurrent
                                    ? "bg-brand-surface-2 border-brand-gold"
                                    : isFour
                                    ? "bg-brand-surface border-brand-border"
                                    : "bg-brand-surface/60 border-brand-border"
                                }`}
                                title={`${lane.name} step ${stepIdx + 1}`}
                              />
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

          const notesSet = track.id === "lead" ? LEAD_NOTES : track.id === "bass" ? BASS_NOTES : PAD_NOTES;

          return (
            <div key={track.id} className="flex flex-col gap-4 animate-fadeIn">
              <div className="flex flex-wrap items-center justify-between gap-4 bg-brand-surface-2 border border-brand-border p-4 rounded-xl">
                <div>
                  <h4 className="text-[14px] text-brand-ink">{track.name}</h4>
                  <p className="text-[11px] text-brand-ink-muted">{scaleKey || "A Minor"} scale</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center bg-brand-bg border border-brand-border p-1 rounded-lg">
                    {(["saw", "square", "sine", "triangle", "pluck"] as const).map((wt) => {
                      const isActive = (track.instrumentType || "saw") === wt;
                      return (
                        <button
                          key={wt}
                          onClick={() => onInstrumentChange(track.id, wt)}
                          className={`px-2.5 py-1 rounded text-[11px] transition-colors ${isActive ? "bg-brand-gold/15 text-brand-gold" : "text-brand-ink-muted hover:text-brand-ink"}`}
                        >
                          {wt}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => onTrackMuteToggle(track.id)}
                      className={`p-2 rounded-lg border transition-colors ${
                        track.muted ? "bg-red-500/10 text-red-400 border-red-500/30" : "bg-brand-surface text-brand-ink-muted border-brand-border hover:text-brand-ink"
                      }`}
                    >
                      {track.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </button>

                    <div className="flex items-center gap-2 min-w-[130px]">
                      <span className="text-[11px] text-brand-ink-muted">Vol</span>
                      <input
                        type="range" min="0" max="1" step="0.05"
                        value={track.volume} disabled={track.muted}
                        onChange={(e) => onTrackVolumeChange(track.id, Number(e.target.value))}
                        className="flex-1 h-1.5 bg-brand-surface rounded-lg appearance-none cursor-pointer accent-brand-gold"
                      />
                      <span className="text-[11px] text-brand-ink-muted w-6 text-right">{Math.round(track.volume * 100)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl overflow-hidden border border-brand-border bg-brand-bg">
                <div className="grid grid-cols-12 md:grid-cols-20 items-center border-b border-brand-border p-2 bg-brand-surface-2">
                  <div className="col-span-3 text-[10px] text-brand-ink-muted px-2 text-left">Pitch</div>
                  <div className="col-span-9 md:col-span-17 grid grid-cols-16 gap-1 md:gap-1.5 px-2">
                    {Array.from({ length: 16 }).map((_, stepIdx) => {
                      const isCurrent = currentStep === stepIdx;
                      return (
                        <div key={stepIdx} className={`text-center text-[10px] rounded ${isCurrent ? "text-brand-gold" : "text-brand-ink-muted"}`}>
                          {stepIdx + 1}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col divide-y divide-brand-border pb-1">
                  {notesSet.map((note) => (
                    <div key={note} className="grid grid-cols-12 md:grid-cols-20 items-center py-2 hover:bg-brand-surface-2/50 transition-all">
                      <div className="col-span-3 flex items-center px-3">
                        <span className="text-[12px] text-brand-ink-muted">{note}</span>
                      </div>

                      <div className="col-span-9 md:col-span-17 grid grid-cols-16 gap-1.5 px-2">
                        {Array.from({ length: 16 }).map((_, stepIdx) => {
                          const isCurrent = currentStep === stepIdx;
                          const isFour = stepIdx % 4 === 0;
                          const pinActive = isSynthNoteActive(track, note, stepIdx);
                          return (
                            <button
                              key={stepIdx}
                              onClick={() => onStepToggle(track.id, note, stepIdx)}
                              className={`aspect-square sm:h-9 hover:brightness-110 active:scale-95 transition-all rounded-md border outline-none ${
                                pinActive
                                  ? "bg-brand-gold border-brand-gold/60"
                                  : isCurrent
                                  ? "bg-brand-surface-2 border-brand-gold"
                                  : isFour
                                  ? "bg-brand-surface border-brand-border"
                                  : "bg-brand-surface/60 border-brand-border"
                              }`}
                              title={`${track.name} ${note} step ${stepIdx + 1}`}
                            />
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
