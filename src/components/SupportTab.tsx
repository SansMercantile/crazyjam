import React, { useState } from "react";
import { StudioSupportHub } from "./StudioSupportHub";
import { 
  Sparkles, 
  HelpCircle, 
  Settings, 
  ListMusic, 
  Sliders, 
  Volume2, 
  Activity, 
  Settings2,
  Mic
} from "lucide-react";

interface SupportTabProps {
  onTriggerComposition: (prompt: string) => void;
  onLoadAudioBlueprint: (blueprint: any) => void;
  isGeneratingTracks: boolean;
  addLog: (log: any) => void;
}

export const SupportTab: React.FC<SupportTabProps> = ({
  onTriggerComposition,
  onLoadAudioBlueprint,
  isGeneratingTracks,
  addLog,
}) => {
  // Vocal FX processor micro-rack state values
  const [autotuneValue, setAutotuneValue] = useState(65); // Autotune amount (65%)
  const [reverbValue, setReverbValue] = useState(40); // Vocal reverb room mix (40%)
  const [vocalLowCut, setVocalLowCut] = useState(80); // High pass vocal low cut frequency (80Hz)
  const [vocalGate, setVocalGate] = useState(true); // Vocal noise gate (true)
  const [micInputGain, setMicInputGain] = useState(85); // Direct microphone gain (85%)

  return (
    <div className="space-y-6 animate-fadeIn text-left">
      {/* Upper Layout: Customer Chatbot with integrated vocal recording on one side, and Vocal FX on the other */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left column: AI Customer Support Companion & Vocal Hum Record */}
        <div className="lg:col-span-8 h-full">
          <StudioSupportHub
            onTriggerComposition={onTriggerComposition}
            onLoadAudioBlueprint={(blueprint) => {
              onLoadAudioBlueprint(blueprint);
              addLog({
                agentName: "CrazyJam Vocal Synth",
                role: "Hum System",
                avatar: "🎙️",
                message: `Synthesizing frequency transients... Complete! Deployed custom step triggers corresponding to vocal harmonics.`,
                phase: "System",
                status: "completed"
              });
            }}
            isGeneratingTracks={isGeneratingTracks}
          />
        </div>

        {/* Right column: Advanced Vocal Rack FX processor */}
        <div className="lg:col-span-4 bg-brand-surface border border-brand-border rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-brand-border pb-3">
              <Settings2 className="h-5 w-5 text-brand-gold" />
              <div>
                <span className="text-[9px] uppercase font-mono tracking-wide text-brand-gold font-medium">Mic DSP Processor</span>
                <h3 className="font-display font-semibold text-sm uppercase text-brand-ink leading-tight">Vocal FX Master Processor</h3>
              </div>
            </div>

            <p className="text-[10px] text-brand-ink-muted leading-relaxed font-sans">
              Chain high-speed vocal autotune, hardware level limiters, noise gates, and stereo space reflections into the capture microphone.
            </p>

            {/* Vocal Autotune */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-[9px] font-mono text-brand-ink-muted uppercase">
                <span>Vocal Pitch Correction / Autotune</span>
                <span className="text-brand-gold font-medium">
                  {autotuneValue === 100 ? "Hard Pitch Corrector" : autotuneValue === 0 ? "Bypassed" : `${autotuneValue}% Alignment`}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={autotuneValue}
                onChange={(e) => setAutotuneValue(Number(e.target.value))}
                className="w-full h-1 bg-brand-surface-2 rounded-lg appearance-none cursor-pointer accent-brand-gold"
              />
            </div>

            {/* Vocal Reverb Wetness */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[9px] font-mono text-brand-ink-muted uppercase">
                <span>Vocal Space Reverb Room Size</span>
                <span className="text-brand-gold font-medium">{reverbValue}% Wet</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={reverbValue}
                onChange={(e) => setReverbValue(Number(e.target.value))}
                className="w-full h-1 bg-brand-surface-2 rounded-lg appearance-none cursor-pointer accent-brand-gold"
              />
            </div>

            {/* Vocal High Pass filter */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[9px] font-mono text-brand-ink-muted uppercase">
                <span>High-Pass Low Frequency Cutout</span>
                <span className="text-brand-gold font-medium">{vocalLowCut} Hz</span>
              </div>
              <input
                type="range"
                min="30"
                max="240"
                value={vocalLowCut}
                onChange={(e) => setVocalLowCut(Number(e.target.value))}
                className="w-full h-1 bg-brand-surface-2 rounded-lg appearance-none cursor-pointer accent-brand-gold"
              />
            </div>

            {/* Mic Gain Level */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[9px] font-mono text-brand-ink-muted uppercase">
                <span>Analog Microphone input Gain</span>
                <span className="text-brand-gold font-medium">{micInputGain}% Boost</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={micInputGain}
                onChange={(e) => setMicInputGain(Number(e.target.value))}
                className="w-full h-1 bg-brand-surface-2 rounded-lg appearance-none cursor-pointer accent-brand-gold"
              />
            </div>

            {/* Noise gate Toggle */}
            <div className="flex items-center justify-between bg-brand-surface-2 hover:bg-brand-surface-2 border border-brand-border p-3 rounded-xl transition mt-3">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wide font-medium text-brand-ink block">Acoustic Noise Gate Threshold</span>
                <span className="text-[8px] text-brand-ink-muted font-mono block">Excludes backround environment noise</span>
              </div>
              <button
                onClick={() => setVocalGate(!vocalGate)}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-mono font-semibold uppercase border transition cursor-pointer ${
                  vocalGate
                    ? "bg-brand-gold hover:bg-cyan-600 border-brand-gold"
                    : "bg-brand-surface-2 border-brand-border text-brand-ink-muted"
                }`}
              >
                {vocalGate ? "Enabled" : "Muted Gate"}
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-brand-border text-[9px] font-mono text-brand-ink-muted flex items-center justify-between">
            <span className="flex items-center gap-1 font-medium text-brand-gold">
              <Mic className="h-3 w-3 animate-pulse" /> Capturing Vocal Formant Frequencies
            </span>
            <span className="font-medium uppercase">Latensy: 2ms (Direct-M)</span>
          </div>
        </div>
      </div>

      {/* Guide manual list */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 text-left relative overflow-hidden">
        <h3 className="font-display font-semibold text-xs uppercase tracking-wide text-brand-gold mb-3">
          Voice Sequenser & Hum-To-Beat Vocal Guide
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-brand-surface-2 p-4 rounded-xl border border-brand-border">
            <h4 className="text-[11px] font-medium text-brand-ink uppercase block mb-1">1. Click Start Mic</h4>
            <p className="text-[10px] text-brand-ink-muted leading-relaxed font-sans">
              Grant microphone browser permissions inside the applet. Click the "Hum-To-Beat Vocals" tab and click the recording trigger to initialize coordinates.
            </p>
          </div>
          <div className="bg-brand-surface-2 p-4 rounded-xl border border-brand-border">
            <h4 className="text-[11px] font-medium text-brand-ink uppercase block mb-1">2. Hum / Beatbox / Sing</h4>
            <p className="text-[10px] text-brand-ink-muted leading-relaxed font-sans">
              Hum a simple synth lead, sing a deep bass progression, or vocalize beat patterns (e.g., boom-clack kick and snare timings). Captures up to 8s.
            </p>
          </div>
          <div className="bg-brand-surface-2 p-4 rounded-xl border border-brand-border">
            <h4 className="text-[11px] font-medium text-brand-ink uppercase block mb-1">3. Auto Synthesis Render</h4>
            <p className="text-[10px] text-brand-ink-muted leading-relaxed font-sans">
              Gemini decodes frequency wave transients, maps them to standard musical notes, and automatically populates drum trigger patterns and melodic matrices!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
