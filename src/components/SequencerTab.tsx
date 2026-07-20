import React, { useState } from "react";
import { SequencerGrid } from "./SequencerGrid";
import { CrazyJamStudio } from "./CrazyJamStudio";
import { MultitrackTimeline } from "./MultitrackTimeline";
import { 
  Dices, 
  Trash2, 
  ArrowLeftRight, 
  Smile, 
  Info,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Sliders
} from "lucide-react";
import { TrackState, NoteEvent } from "../types";

interface SequencerTabProps {
  tracks: TrackState[];
  currentStep: number;
  isPlaying: boolean;
  onStepToggle: (trackId: string, laneId: string | null, stepIndex: number) => void;
  onTrackVolumeChange: (trackId: string, val: number) => void;
  onTrackMuteToggle: (trackId: string) => void;
  onInstrumentChange: (trackId: string, type: "saw" | "square" | "sine" | "triangle" | "pluck") => void;
  scaleKey: string;
  onTracksUpdate: (newTracks: TrackState[]) => void;
  tempo: number;
  onTempoChange: (val: number) => void;
  onScaleChange: (val: string) => void;
  onPromptChange: (val: string) => void;
  audioCtx: AudioContext | null;
  addLog: (log: any) => void;
}

export const SequencerTab: React.FC<SequencerTabProps> = ({
  tracks,
  currentStep,
  isPlaying,
  onStepToggle,
  onTrackVolumeChange,
  onTrackMuteToggle,
  onInstrumentChange,
  scaleKey,
  onTracksUpdate,
  tempo,
  onTempoChange,
  onScaleChange,
  onPromptChange,
  audioCtx,
  addLog,
}) => {
  // Enhanced Sequencer States
  const [grooveSwing, setGrooveSwing] = useState(15); // Groove swing timing delay percentage (15%)
  const [selectedTrackId, setSelectedTrackId] = useState<string>("drums");

  // Expanded Functions - 1. Randomize Selected Track or Lane patterns
  const handleRandomizeTrack = () => {
    const updated = tracks.map((track) => {
      if (track.id !== selectedTrackId) return track;

      if (track.type === "drums" && track.drumLanes) {
        const randomLanes = track.drumLanes.map((lane) => {
          // Generate 16 true/false with high sparse probability
          const pattern = Array.from({ length: 16 }, () => Math.random() > 0.7);
          return { ...lane, pattern };
        });
        return { ...track, drumLanes: randomLanes };
      }

      if (track.type === "synth") {
        // Generate sparse note triggers across the piano roll (e.g., matching common notes in scale standard)
        const notes = ["C3", "E3", "G3", "B3", "C4", "E4", "G4", "B4", "D4"];
        const melodyNotes: NoteEvent[] = [];
        for (let i = 0; i < 16; i += 2) {
          if (Math.random() > 0.5) {
            const randomNote = notes[Math.floor(Math.random() * notes.length)];
            melodyNotes.push({
              step: i,
              note: randomNote,
              duration: 1
            });
          }
        }
        return { ...track, melodyNotes };
      }
      return track;
    });

    onTracksUpdate(updated);

    addLog({
      agentName: "Groove Specialist",
      role: "Beats",
      avatar: "🎧",
      message: `SCATTERED RANDOM ACCIDENTS ARRANGEMENT:\nRandomized structural trigger events across Track ID: "${selectedTrackId}". Play sequence to hear it live!`,
      phase: "Sequence",
      status: "completed"
    });
  };

  // Expanded Functions - 2. Shift Note steps left / right
  const handleShiftSequence = (direction: "left" | "right") => {
    const updated = tracks.map((track) => {
      if (track.id !== selectedTrackId) return track;

      if (track.type === "drums" && track.drumLanes) {
        const shiftedLanes = track.drumLanes.map((lane) => {
          const oldPattern = [...lane.pattern];
          let pattern = [...oldPattern];
          if (direction === "left") {
            const first = pattern.shift();
            pattern.push(first || false);
          } else {
            const last = pattern.pop();
            pattern.unshift(last || false);
          }
          return { ...lane, pattern };
        });
        return { ...track, drumLanes: shiftedLanes };
      }

      if (track.type === "synth" && track.melodyNotes) {
        const melodyNotes = track.melodyNotes.map((note) => {
          let step = note.step;
          if (direction === "left") {
            step = (step - 1 + 16) % 16;
          } else {
            step = (step + 1) % 16;
          }
          return { ...note, step };
        });
        return { ...track, melodyNotes };
      }
      return track;
    });

    onTracksUpdate(updated);

    addLog({
      agentName: "Groove Specialist",
      role: "Beats",
      avatar: "🎧",
      message: `SHIFTED ARRANGEMENTS:\nShifted dynamic sequenser timings for Track ID: "${selectedTrackId}" to the ${direction}.`,
      phase: "Sequence",
      status: "completed"
    });
  };

  // Expanded Functions - 3. Clear All Sequence patterns
  const handleClearTrack = () => {
    const updated = tracks.map((track) => {
      if (track.id !== selectedTrackId) return track;

      if (track.type === "drums" && track.drumLanes) {
        const clearLanes = track.drumLanes.map((lane) => ({
          ...lane,
          pattern: Array(16).fill(false)
        }));
        return { ...track, drumLanes: clearLanes };
      }

      if (track.type === "synth") {
        return { ...track, melodyNotes: [] };
      }
      return track;
    });

    onTracksUpdate(updated);

    addLog({
      agentName: "Groove Specialist",
      role: "Beats",
      avatar: "🎧",
      message: `CLEARED SEQUENSER BUFFER:\nWiped trigger values across Track ID "${selectedTrackId}" to prepare scratch musical structures.`,
      phase: "Sequence",
      status: "completed"
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn text-left">
      {/* Arrangement timeline - multi-section song structure + stem export */}
      <MultitrackTimeline
        tracks={tracks}
        tempo={tempo}
        isPlaying={isPlaying}
        onLoadSectionTracks={onTracksUpdate}
        addLog={addLog}
      />

      {/* Top Console Command Dashboard */}
      <div className="bg-brand-card border border-brand-border rounded-2xl p-6 relative overflow-hidden">
        {/* glowing trace lights */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-cyan/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 border-b border-brand-border pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-brand-cyan/15 p-2 rounded-xl text-brand-cyan border border-brand-cyan/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[9px] uppercase font-mono tracking-wide text-brand-cyan font-bold">Sequenser Groove Controllers</span>
              <h2 className="font-display font-semibold text-lg uppercase text-brand-ink leading-tight">Advanced Groove & Timing Console</h2>
            </div>
          </div>

          {/* Quick Helper Chip */}
          <div className="flex items-center gap-2 bg-brand-surface-2 border border-brand-border px-3.5 py-1.5 rounded-xl text-[10px] font-mono text-brand-ink-muted">
            <Info className="h-3.5 w-3.5 text-brand-pink" />
            <span>Click any block below to hear instant notes & build drum loop.</span>
          </div>
        </div>

        {/* Master Sequencer Controllers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
          {/* Target Track Select */}
          <div className="md:col-span-4 space-y-1.5">
            <label className="text-[9px] font-mono uppercase tracking-wide text-brand-ink-muted block">Target Track Array</label>
            <div className="flex gap-1 bg-brand-surface-2 border border-brand-border p-1 rounded-xl">
              {tracks.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTrackId(t.id)}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-display font-semibold uppercase text-center transition cursor-pointer ${
                    selectedTrackId === t.id
                      ? "bg-brand-pink text-brand-ink shadow-md shadow-brand-pink/20"
                      : "text-brand-ink-muted hover:text-brand-ink-muted hover:bg-brand-surface-2"
                  }`}
                >
                  {t.id}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Step Action Buttons */}
          <div className="md:col-span-4 flex items-center gap-2">
            <div className="flex-1 space-y-1.5">
              <label className="text-[9px] font-mono uppercase tracking-wide text-brand-ink-muted block">Arrangement Generators</label>
              <div className="flex gap-2">
                <button
                  onClick={handleRandomizeTrack}
                  className="flex-1 bg-brand-cyan hover:bg-cyan-600 font-display font-semibold text-brand-dark px-3 py-2.5 text-[10px] uppercase tracking-wide rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                  title="Randomize selected track patterns"
                >
                  <Dices className="h-4.5 w-4.5" />
                  <span>Randomize</span>
                </button>
                <button
                  onClick={handleClearTrack}
                  className="flex-1 bg-brand-surface-2 hover:bg-red-500/10 border border-brand-border hover:border-red-500/20 font-display font-semibold text-brand-ink hover:text-red-400 px-3 py-2.5 text-[10px] uppercase tracking-wide rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                  title="Clear selected track note triggers"
                >
                  <Trash2 className="h-4.5 w-4.5" />
                  <span>Clear Grid</span>
                </button>
              </div>
            </div>
          </div>

          <div className="md:col-span-4 space-y-1.5">
            {/* Step Offset Shifters and Groove timings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-mono uppercase tracking-wide text-brand-ink-muted block">Timing Swing Delay</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="range"
                    min="0"
                    max="80"
                    value={grooveSwing}
                    onChange={(e) => setGrooveSwing(Number(e.target.value))}
                    className="flex-1 h-1 bg-brand-surface-2 rounded-lg appearance-none cursor-pointer accent-brand-cyan"
                  />
                  <span className="text-[9px] font-mono font-bold text-brand-cyan">{grooveSwing}%</span>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-mono uppercase tracking-wide text-brand-ink-muted block">Shift Steps Left/Right</label>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => handleShiftSequence("left")}
                    className="flex-1 p-2 rounded-lg border border-brand-border hover:border-brand-pink/40 hover:text-brand-pink text-brand-ink-muted bg-brand-surface-2 transition text-center flex items-center justify-center cursor-pointer"
                    title="Slide steps backwards"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleShiftSequence("right")}
                    className="flex-1 p-2 rounded-lg border border-brand-border hover:border-brand-pink/40 hover:text-brand-pink text-brand-ink-muted bg-brand-surface-2 transition text-center flex items-center justify-center cursor-pointer"
                    title="Slide steps forwards"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CrazyJam Sampling & Digital Virtual Mixer */}
      <div className="w-full">
        <CrazyJamStudio
          tempo={tempo}
          scale={scaleKey}
          onTempoChange={onTempoChange}
          onScaleChange={onScaleChange}
          onPromptChange={onPromptChange}
          audioCtx={audioCtx}
        />
      </div>

      {/* Main step Sequencer grid Component */}
      <div className="w-full">
        <SequencerGrid
          tracks={tracks}
          currentStep={currentStep}
          onStepToggle={onStepToggle}
          onTrackVolumeChange={onTrackVolumeChange}
          onTrackMuteToggle={onTrackMuteToggle}
          onInstrumentChange={onInstrumentChange}
          scaleKey={scaleKey}
          onTracksUpdate={onTracksUpdate}
        />
      </div>
    </div>
  );
};
