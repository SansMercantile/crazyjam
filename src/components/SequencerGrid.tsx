/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { TrackState, DrumLane, NoteEvent } from "../types";
import { VolumeX, Volume2, Bolt, Trash2, RefreshCw, Sparkles, Sliders, RotateCcw, Plus, X } from "lucide-react";
import { audioEngine, AudioEngine } from "../utils/audioEngine";

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
const DEFAULT_MELODY_NOTES = ["A5", "F5", "D5", "A4", "F4", "D4", "A3"]; // for custom split tracks

const CORE_TRACK_IDS = ["drums", "bass", "lead", "pad"];

function notesSetFor(trackId: string): string[] {
  if (trackId === "lead") return LEAD_NOTES;
  if (trackId === "bass") return BASS_NOTES;
  if (trackId === "pad") return PAD_NOTES;
  return DEFAULT_MELODY_NOTES;
}

const CUSTOM_TRACK_ICONS = ["🎸", "🎹", "🎤", "🎻", "🎷", "🪕", "🎺", "🪘"];

/** Compact 6-band EQ panel for one track, reads/writes the audio engine
 * directly since these are real-time DSP settings, not app-level state. */
const TrackEQPanel: React.FC<{ trackId: string }> = ({ trackId }) => {
  const [bands, setBands] = useState<number[]>(audioEngine.getTrackEQ(trackId));

  const handleChange = (bandIndex: number, value: number) => {
    audioEngine.setTrackEQBand(trackId, bandIndex, value);
    setBands((prev) => prev.map((b, i) => (i === bandIndex ? value : b)));
  };

  const handleReset = () => {
    audioEngine.resetTrackEQ(trackId);
    setBands([0, 0, 0, 0, 0, 0]);
  };

  return (
    <div className="bg-brand-surface-2 border border-brand-border rounded-xl p-4 flex flex-col gap-3 animate-fadeIn">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-brand-ink-muted">6-band EQ &bull; real-time, affects live playback and exports</span>
        <button onClick={handleReset} className="flex items-center gap-1 text-[10px] text-brand-ink-muted hover:text-brand-gold transition-all">
          <RotateCcw className="h-3 w-3" /> Flat
        </button>
      </div>
      <div className="grid grid-cols-6 gap-2">
        {AudioEngine.EQ_BANDS.map((band, i) => (
          <div key={band.label} className="flex flex-col items-center gap-1.5">
            <span className={`text-[10px] ${bands[i] !== 0 ? "text-brand-gold" : "text-brand-ink-muted"}`}>{bands[i] > 0 ? `+${bands[i]}` : bands[i]}</span>
            <input
              type="range"
              min={-15} max={15} step={1}
              value={bands[i]}
              onChange={(e) => handleChange(i, Number(e.target.value))}
              className="w-24 accent-brand-gold"
              style={{ writingMode: "vertical-lr" as any, direction: "rtl", height: "80px" }}
            />
            <span className="text-[9px] text-brand-ink-muted">{band.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

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
  const [showEQFor, setShowEQFor] = useState<string | null>(null);
  const [showAddTrack, setShowAddTrack] = useState(false);
  const [newTrackName, setNewTrackName] = useState("");
  const [newTrackIcon, setNewTrackIcon] = useState(CUSTOM_TRACK_ICONS[0]);

  const isSynthNoteActive = (track: TrackState, note: string, step: number): boolean => {
    if (!track.melodyNotes) return false;
    return track.melodyNotes.some((item) => item.step === step && item.note === note);
  };

  const handleAddTrack = () => {
    if (!onTracksUpdate || !newTrackName.trim()) return;
    const id = `custom-${Date.now()}`;
    const newTrack: TrackState = {
      id,
      name: newTrackName.trim(),
      type: "synth",
      volume: 0.65,
      pan: 0,
      muted: false,
      soloed: false,
      color: "bg-brand-gold",
      instrumentType: "pluck",
      melodyNotes: [],
    };
    onTracksUpdate([...tracks, newTrack]);
    setActiveTab(id);
    setNewTrackName("");
    setShowAddTrack(false);
  };

  const handleRemoveTrack = (e: React.MouseEvent, trackId: string) => {
    e.stopPropagation();
    if (!onTracksUpdate) return;
    const next = tracks.filter((t) => t.id !== trackId);
    onTracksUpdate(next);
    if (activeTab === trackId) setActiveTab(next[0]?.id || "drums");
    audioEngine.resetTrackEQ(trackId);
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
        const notesSet = notesSetFor(t.id);
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
        const notesSet = notesSetFor(t.id);
        const pattern = t.melodyNotes.map((n) => {
          if (Math.random() < 0.15) {
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
        const notesSet = notesSetFor(t.id);
        const newNotes: NoteEvent[] = [];
        const stepsToTrigger = t.id === "lead"
          ? [0, 2, 4, 7, 8, 10, 12, 14]
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

          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex flex-wrap items-center bg-brand-bg border border-brand-border p-1 rounded-lg gap-0.5">
              {tracks.map((track) => {
                const isActive = activeTab === track.id;
                const isCustom = !CORE_TRACK_IDS.includes(track.id);
                return (
                  <button
                    key={track.id}
                    onClick={() => setActiveTab(track.id)}
                    className={`group px-3.5 py-1.5 rounded-md text-[12px] font-medium transition-all flex items-center gap-1.5 ${
                      isActive ? "bg-brand-gold text-brand-bg" : "text-brand-ink-muted hover:text-brand-ink"
                    }`}
                  >
                    {track.name}
                    {isCustom && onTracksUpdate && (
                      <span
                        onClick={(e) => handleRemoveTrack(e, track.id)}
                        className={`opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? "hover:text-brand-bg/70" : "hover:text-red-400"}`}
                      >
                        <X className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {onTracksUpdate && (
              <button
                onClick={() => setShowAddTrack(!showAddTrack)}
                title="Split off a new instrument track (guitar, keyboard, extra vocal, etc.)"
                className={`p-2 rounded-lg border transition-all ${
                  showAddTrack ? "bg-brand-gold/15 text-brand-gold border-brand-gold/40" : "bg-brand-surface-2 text-brand-ink-muted border-brand-border hover:text-brand-gold"
                }`}
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {showAddTrack && onTracksUpdate && (
        <div className="bg-brand-surface-2 border border-brand-border rounded-xl p-4 flex flex-wrap items-center gap-3 animate-fadeIn">
          <span className="text-[12px] text-brand-ink-muted">New track:</span>
          <div className="flex items-center gap-1">
            {CUSTOM_TRACK_ICONS.map((icon) => (
              <button
                key={icon}
                onClick={() => setNewTrackIcon(icon)}
                className={`h-8 w-8 rounded-lg flex items-center justify-center text-base border transition-all ${newTrackIcon === icon ? "border-brand-gold bg-brand-gold/10" : "border-transparent hover:bg-brand-surface"}`}
              >
                {icon}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={newTrackName}
            onChange={(e) => setNewTrackName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddTrack()}
            placeholder="e.g. Guitar, Keyboard, Voice 1..."
            className="flex-1 min-w-[160px] bg-brand-surface border border-brand-border focus:border-brand-gold/50 text-brand-ink px-3 py-2 text-sm rounded-lg outline-none"
          />
          <button
            onClick={handleAddTrack}
            disabled={!newTrackName.trim()}
            className="metal-gold font-semibold text-[12px] px-4 py-2 rounded-lg transition-all disabled:opacity-40"
          >
            Add track
          </button>
        </div>
      )}

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
                      onClick={() => setShowEQFor(showEQFor === track.id ? null : track.id)}
                      className={`p-2 rounded-lg border transition-colors flex items-center gap-1.5 ${
                        showEQFor === track.id ? "bg-brand-gold/15 text-brand-gold border-brand-gold/40" : "bg-brand-surface text-brand-ink-muted border-brand-border hover:text-brand-ink"
                      }`}
                    >
                      <Sliders className="h-4 w-4" /> <span className="text-[11px]">EQ</span>
                    </button>
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

                {showEQFor === track.id && <TrackEQPanel trackId={track.id} />}

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

          const notesSet = notesSetFor(track.id);

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
                      onClick={() => setShowEQFor(showEQFor === track.id ? null : track.id)}
                      className={`p-2 rounded-lg border transition-colors flex items-center gap-1.5 ${
                        showEQFor === track.id ? "bg-brand-gold/15 text-brand-gold border-brand-gold/40" : "bg-brand-surface text-brand-ink-muted border-brand-border hover:text-brand-ink"
                      }`}
                    >
                      <Sliders className="h-4 w-4" /> <span className="text-[11px]">EQ</span>
                    </button>
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

              {showEQFor === track.id && <TrackEQPanel trackId={track.id} />}

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
