import React, { useState } from "react";
import { Visualizer } from "./Visualizer";
import { EffectsRack } from "./EffectsRack";
import { MidiStudio } from "./MidiStudio";
import { Download, Radio, Compass, Loader2, FileMusic } from "lucide-react";
import { audioEngine } from "../utils/audioEngine";
import { exportLoopAsMidi } from "../utils/midiExport";

interface DashboardTabProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  scaleKey: string;
  genre: string;
  tempo: number;
  volume: number;
  cutoff: number;
  qFactor: number;
  delayTime: number;
  delayFeedback: number;
  onCutoffChange: (val: number) => void;
  onQChange: (val: number) => void;
  onDelayTimeChange: (val: number) => void;
  onDelayFeedbackChange: (val: number) => void;
  onReleaseChange: (val: number) => void;
  onAutoFix: (adjustments: any) => void;
  audioCtx: AudioContext | null;
  tracks: any[];
}

const SPACE_PRESETS = [
  { id: "cathedral", label: "Cathedral", desc: "Long trails, high decay" },
  { id: "club", label: "Club", desc: "Short slapback resonance" },
  { id: "tape", label: "Tape echo", desc: "Warm analog degradation" },
  { id: "pingpong", label: "Ping-pong", desc: "Stereo spatial panning" },
];

export const DashboardTab: React.FC<DashboardTabProps> = ({
  analyser,
  isPlaying,
  scaleKey,
  genre,
  tempo,
  volume,
  cutoff,
  qFactor,
  delayTime,
  delayFeedback,
  onCutoffChange,
  onQChange,
  onDelayTimeChange,
  onDelayFeedbackChange,
  onReleaseChange,
  onAutoFix,
  audioCtx,
  tracks,
}) => {
  const [delayPreset, setDelayPreset] = useState("classic");
  const [isRecording, setIsRecording] = useState(false);
  const [recordedFiles, setRecordedFiles] = useState<Array<{ id: string; name: string; date: string }>>([]);
  const [spaceReverb, setSpaceReverb] = useState(30);
  const [exportError, setExportError] = useState("");

  const handleSpacePresetChange = (preset: string) => {
    setDelayPreset(preset);
    if (preset === "cathedral") { onDelayTimeChange(0.65); onDelayFeedbackChange(0.60); onReleaseChange(0.85); }
    else if (preset === "club") { onDelayTimeChange(0.20); onDelayFeedbackChange(0.30); onReleaseChange(0.22); }
    else if (preset === "tape") { onDelayTimeChange(0.42); onDelayFeedbackChange(0.45); onReleaseChange(0.35); }
    else if (preset === "pingpong") { onDelayTimeChange(0.35); onDelayFeedbackChange(0.25); onReleaseChange(0.28); }
  };

  // Real offline render of the current arrangement, not a mock file.
  const handleExportSession = async () => {
    if (isRecording) return;
    setIsRecording(true);
    setExportError("");
    try {
      const blob = await audioEngine.exportMixWav(tracks, tempo, 4);
      const name = `CrazyJam-Mixdown-${genre.replace(/\s+/g, "-")}-${tempo}BPM.wav`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      URL.revokeObjectURL(url);
      setRecordedFiles((prev) => [{ id: `rec-${Date.now()}`, name, date: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }, ...prev]);
    } catch (e: any) {
      setExportError(e.message || "Export failed.");
    } finally {
      setIsRecording(false);
    }
  };

  const handleExportMidi = () => {
    try {
      const blob = exportLoopAsMidi(tracks, tempo);
      const name = `CrazyJam-${genre.replace(/\s+/g, "-")}-${tempo}BPM.mid`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setExportError(e.message || "MIDI export failed.");
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn text-left">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8">
          <Visualizer analyser={analyser} isPlaying={isPlaying} scaleKey={scaleKey} />
        </div>

        <div className="lg:col-span-4 bg-brand-surface border border-brand-border rounded-2xl p-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 border-b border-brand-border pb-3 text-brand-gold">
              <Compass className="h-4.5 w-4.5" />
              <div>
                <span className="text-[10px] text-brand-ink-muted block">Space expander</span>
                <h3 className="font-display text-[15px] text-brand-ink leading-tight">Master spatializer</h3>
              </div>
            </div>

            <p className="text-[12px] text-brand-ink-muted leading-relaxed">
              Adjust spatial delay and release characteristics, paired with the master limiter.
            </p>

            <div className="space-y-2">
              <label className="text-[11px] text-brand-ink-muted block">Space presets</label>
              <div className="grid grid-cols-2 gap-2">
                {SPACE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSpacePresetChange(p.id)}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      delayPreset === p.id ? "bg-brand-gold/10 border-brand-gold/40 text-brand-ink" : "bg-brand-surface-2 border-brand-border text-brand-ink-muted"
                    }`}
                  >
                    <span className="text-[12px] font-medium block">{p.label}</span>
                    <span className="text-[10px] text-brand-ink-muted block mt-0.5">{p.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[11px] text-brand-ink-muted">
                <span>Wet mix</span>
                <span className="text-brand-gold">{spaceReverb}%</span>
              </div>
              <input
                type="range" min="0" max="100" value={spaceReverb}
                onChange={(e) => setSpaceReverb(Number(e.target.value))}
                className="w-full h-1 bg-brand-surface-2 rounded-lg appearance-none cursor-pointer accent-brand-gold"
              />
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-brand-border">
            <div className="flex items-center justify-between pb-3">
              <div>
                <span className="text-[12px] text-brand-ink block">WAV bounce</span>
                <span className="text-[10px] text-brand-ink-muted block">Real offline render of the current arrangement</span>
              </div>
              <button
                onClick={handleExportSession}
                disabled={isRecording}
                className="metal-gold disabled:opacity-50 px-4 py-2 font-semibold text-[12px] rounded-lg transition flex items-center gap-1.5"
              >
                {isRecording ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                {isRecording ? "Rendering..." : "Export WAV"}
              </button>
            </div>
            <button
              onClick={handleExportMidi}
              className="w-full flex items-center justify-center gap-1.5 bg-brand-surface-2 hover:bg-brand-border/20 border border-brand-border text-brand-ink px-4 py-2 font-medium text-[12px] rounded-lg transition-all mb-2"
            >
              <FileMusic className="h-3.5 w-3.5 text-brand-gold" /> Export MIDI (.mid)
            </button>
            {exportError && <p className="text-[11px] text-red-400">{exportError}</p>}

            {recordedFiles.length > 0 && (
              <div className="mt-2 space-y-1 bg-brand-surface-2 p-2 rounded-lg border border-brand-border max-h-[64px] overflow-y-auto">
                {recordedFiles.map((f) => (
                  <div key={f.id} className="flex justify-between items-center text-[11px] px-1">
                    <span className="text-brand-ink-muted truncate max-w-[170px]">{f.name}</span>
                    <span className="text-brand-gold">{f.date}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <EffectsRack
        onCutoffChange={onCutoffChange}
        onQChange={onQChange}
        onDelayTimeChange={onDelayTimeChange}
        onDelayFeedbackChange={onDelayFeedbackChange}
        onReleaseChange={onReleaseChange}
      />

      <MidiStudio
        tempo={tempo}
        cutoff={cutoff}
        qFactor={qFactor}
        delayTime={delayTime}
        delayFeedback={delayFeedback}
        volume={volume}
        onAutoFix={onAutoFix}
        audioCtx={audioCtx}
      />

      <div className="bg-brand-surface border border-brand-border rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-brand-gold" />
            <div>
              <span className="text-[10px] text-brand-ink-muted block">Sound engine</span>
              <span className="text-[12px] text-brand-ink">Web Audio API</span>
            </div>
          </div>
          <div className="h-8 w-px bg-brand-border hidden sm:block" />
          <div className="hidden sm:block">
            <span className="text-[10px] text-brand-ink-muted block">Limiter</span>
            <span className="text-[12px] text-brand-gold">-0.3dB ceiling</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-brand-ink-muted">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>Engine ready</span>
        </div>
      </div>
    </div>
  );
};
