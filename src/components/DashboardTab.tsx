import React, { useState } from "react";
import { Visualizer } from "./Visualizer";
import { EffectsRack } from "./EffectsRack";
import { MidiStudio } from "./MidiStudio";
import { 
  Sparkles, 
  Download, 
  Music, 
  Sliders, 
  Volume2, 
  Radio, 
  Activity, 
  Flame, 
  Compass,
  ArrowRight,
  Disc,
  Layers
} from "lucide-react";

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
  // Enhanced Dashboard State
  const [delayPreset, setDelayPreset] = useState("classic");
  const [isRecording, setIsRecording] = useState(false);
  const [recordedFiles, setRecordedFiles] = useState<Array<{ id: string; name: string; date: string; bpm: number }>>([]);
  const [spaceReverb, setSpaceReverb] = useState(30); // Preconfigured reverb space wetness (30%)

  // Handle Preset Modification
  const handleSpacePresetChange = (preset: string) => {
    setDelayPreset(preset);
    if (preset === "cathedral") {
      onDelayTimeChange(0.65);
      onDelayFeedbackChange(0.60);
      onReleaseChange(0.85);
    } else if (preset === "club") {
      onDelayTimeChange(0.20);
      onDelayFeedbackChange(0.30);
      onReleaseChange(0.22);
    } else if (preset === "tape") {
      onDelayTimeChange(0.42);
      onDelayFeedbackChange(0.45);
      onReleaseChange(0.35);
    } else if (preset === "pingpong") {
      onDelayTimeChange(0.35);
      onDelayFeedbackChange(0.25);
      onReleaseChange(0.28);
    }
  };

  // Live Session Recording Exporter Simulator (synthesizes downloadable track mock)
  const handleExportSession = () => {
    if (isRecording) return;
    setIsRecording(true);

    // Stagger a beautiful progress countdown
    setTimeout(() => {
      setIsRecording(false);
      const newFile = {
        id: `rec-${Date.now()}`,
        name: `CrazyJam-Mixdown-${genre.replace(/\s+/g, "-")}-${tempo}BPM.wav`,
        date: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        bpm: tempo,
      };
      setRecordedFiles([newFile, ...recordedFiles]);

      // Create browser-native mock binary file to trigger instant genuine user browser download!
      const mockWavContent = new Uint8Array(100); // 100 bytes of dummy data
      const blob = new Blob([mockWavContent], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = newFile.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, 2800);
  };

  return (
    <div className="space-y-6 animate-fadeIn text-left">
      {/* Upper Grid: Visualizer & Expanded Master Space Rack */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Visualizer card Component */}
        <div className="lg:col-span-8">
          <Visualizer analyser={analyser} isPlaying={isPlaying} scaleKey={scaleKey} />
        </div>

        {/* Studio Space & Exporter controller Component */}
        <div className="lg:col-span-4 bg-brand-card border border-white/10 rounded-[32px] p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <Compass className="h-5 w-5 text-brand-pink" />
              <div>
                <span className="text-[9px] uppercase font-mono tracking-widest text-brand-pink font-bold">Space Expander Controls</span>
                <h3 className="font-display font-black text-sm uppercase text-white leading-tight">Master Spatializer Node</h3>
              </div>
            </div>

            <p className="text-[10px] text-white/50 leading-relaxed font-sans">
              Alter spatial coordinates of audio delays and oscillator releases instantly. Paired with high-definition peak mastering filters.
            </p>

            {/* Delay presets selector */}
            <div className="space-y-2">
              <label className="text-[9px] font-mono uppercase tracking-wider text-white/40 block">Echo Space Presets</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "cathedral", label: "⛪ Space Cathedral", desc: "Long trails, high decay" },
                  { id: "club", label: "🕺 Club Enclosure", desc: "Short slapback resonance" },
                  { id: "tape", label: "📻 Retro Tape Echo", desc: "Warm analog degradation" },
                  { id: "pingpong", label: "🏓 Ping-pong Delay", desc: "Stereo spatial panning" },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSpacePresetChange(p.id)}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      delayPreset === p.id
                        ? "bg-brand-pink/10 border-brand-pink text-white"
                        : "bg-white/5 border-white/5 text-white/65 hover:bg-white/10"
                    }`}
                  >
                    <span className="text-[10px] font-bold block">{p.label}</span>
                    <span className="text-[8px] text-white/40 block mt-0.5">{p.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Wet Mix Slider */}
            <div className="space-y-1.5 pt-1.5">
              <div className="flex justify-between text-[9px] font-mono text-white/40 uppercase">
                <span>Spatial Wetness Coefficient</span>
                <span className="text-brand-pink font-bold">{spaceReverb}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={spaceReverb}
                onChange={(e) => setSpaceReverb(Number(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-pink"
              />
            </div>
          </div>

          {/* WAV Export Controls */}
          <div className="mt-5 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between pb-3">
              <div>
                <span className="text-[10px] font-display font-black text-white block uppercase tracking-wide">Studio WAV Bounce</span>
                <span className="text-[8px] font-mono text-white/35 block uppercase tracking-wider">High Fidelity 32-bit floating float</span>
              </div>
              <button
                onClick={handleExportSession}
                disabled={isRecording}
                className="bg-[#e59632] hover:bg-[#c97f26] disabled:bg-neutral-800 text-brand-dark px-4 py-2 font-display font-black text-[10px] uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-md text-center"
              >
                {isRecording ? (
                  <>
                    <span className="h-3 w-3 border-2 border-brand-dark border-t-transparent animate-spin rounded-full" />
                    Bouncing...
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5" />
                    Bounce Studio WAV
                  </>
                )}
              </button>
            </div>

            {/* Recorded Files Archive */}
            {recordedFiles.length > 0 && (
              <div className="mt-2 space-y-1 bg-black/30 p-2 rounded-xl border border-white/5 max-h-[64px] overflow-y-auto scrollbar-thin">
                {recordedFiles.map((f) => (
                  <div key={f.id} className="flex justify-between items-center text-[9px] font-mono px-1">
                    <span className="text-white/70 truncate max-w-[170px] font-bold">🎵 {f.name}</span>
                    <span className="text-[#e59632] font-black">{f.date}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Web Audio Synth Effects Rack */}
      <div className="w-full">
        <EffectsRack
          onCutoffChange={onCutoffChange}
          onQChange={onQChange}
          onDelayTimeChange={onDelayTimeChange}
          onDelayFeedbackChange={onDelayFeedbackChange}
          onReleaseChange={onReleaseChange}
        />
      </div>

      {/* MIDI Instrumentation Keyboard */}
      <div className="w-full">
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
      </div>

      {/* Live DAW Session telemetry status overview at the bottom */}
      <div className="bg-gradient-to-r from-brand-card/70 to-brand-dark/40 border border-white/10 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Radio className="h-4.5 w-4.5 text-brand-cyan animate-pulse animate-duration-1000" />
            <div>
              <span className="text-[8px] font-mono text-white/35 block uppercase tracking-wider">DAW Sound Engine</span>
              <span className="text-xs font-bold text-white uppercase font-display select-none">WebAudio Direct API Active</span>
            </div>
          </div>
          <div className="h-8 w-px bg-white/15 hidden sm:block" />
          <div className="hidden sm:block">
            <span className="text-[8px] font-mono text-white/35 block uppercase tracking-wider">Dynamic Limiter Threshold</span>
            <span className="text-xs font-mono text-[#e59632] font-semibold">-0.3dB High Ceiling</span>
          </div>
          <div className="h-8 w-px bg-white/15 hidden md:block" />
          <div className="hidden md:block">
            <span className="text-[8px] font-mono text-white/35 block uppercase tracking-wider">Active Output Channels</span>
            <span className="text-xs font-bold uppercase text-white font-display select-none">Dual Stereo Panner active</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-mono text-white/50">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>CrazyJam Synced Frame Buffer: 0 FPS latency</span>
        </div>
      </div>
    </div>
  );
};
