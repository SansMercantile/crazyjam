import React, { useState } from "react";
import { StudioSupportHub } from "./StudioSupportHub";
import { Settings2, Mic, Info } from "lucide-react";

interface SupportTabProps {
  onTriggerComposition: (prompt: string) => void;
  onLoadAudioBlueprint: (blueprint: any) => void;
  isGeneratingTracks: boolean;
  addLog: (log: any) => void;
  audioCtx: AudioContext | null;
}

export const SupportTab: React.FC<SupportTabProps> = ({
  onTriggerComposition,
  onLoadAudioBlueprint,
  isGeneratingTracks,
  addLog,
  audioCtx,
}) => {
  // These now actually shape the recorded mic signal in real time via a
  // Web Audio processing chain (see StudioSupportHub) - not decorative.
  const [reverbValue, setReverbValue] = useState(40);
  const [vocalLowCut, setVocalLowCut] = useState(80);
  const [vocalGate, setVocalGate] = useState(true);
  const [micInputGain, setMicInputGain] = useState(85);

  return (
    <div className="space-y-6 animate-fadeIn text-left">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 h-full">
          <StudioSupportHub
            onTriggerComposition={onTriggerComposition}
            onLoadAudioBlueprint={(blueprint) => {
              onLoadAudioBlueprint(blueprint);
              addLog({
                agentName: "CrazyJam Vocal Synth",
                role: "Hum System",
                avatar: "🎙️",
                message: `Recording analyzed and deployed as sequencer step triggers.`,
                phase: "System",
                status: "completed"
              });
            }}
            isGeneratingTracks={isGeneratingTracks}
            audioCtx={audioCtx}
            micGain={micInputGain}
            highpassFreq={vocalLowCut}
            noiseGateEnabled={vocalGate}
            reverbWet={reverbValue}
          />
        </div>

        <div className="lg:col-span-4 bg-brand-surface border border-brand-border rounded-2xl p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-brand-border pb-3">
              <Settings2 className="h-5 w-5 text-brand-gold" />
              <div>
                <span className="text-[10px] text-brand-gold">Mic processing</span>
                <h3 className="font-display text-[15px] text-brand-ink">Vocal input chain</h3>
              </div>
            </div>

            <p className="text-[11px] text-brand-ink-muted leading-relaxed">
              These shape the actual signal captured before it's sent for hum-to-beat analysis - gain, a
              high-pass filter, light compression as a noise gate, and a simple delay-based space.
            </p>

            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[11px] text-brand-ink-muted">
                <span>Room space (delay-based)</span>
                <span className="text-brand-gold">{reverbValue}% wet</span>
              </div>
              <input type="range" min="0" max="100" value={reverbValue} onChange={(e) => setReverbValue(Number(e.target.value))} className="w-full h-1 bg-brand-surface-2 rounded-lg appearance-none cursor-pointer accent-brand-gold" />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] text-brand-ink-muted">
                <span>High-pass cutoff</span>
                <span className="text-brand-gold">{vocalLowCut} Hz</span>
              </div>
              <input type="range" min="30" max="240" value={vocalLowCut} onChange={(e) => setVocalLowCut(Number(e.target.value))} className="w-full h-1 bg-brand-surface-2 rounded-lg appearance-none cursor-pointer accent-brand-gold" />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] text-brand-ink-muted">
                <span>Input gain</span>
                <span className="text-brand-gold">{micInputGain}%</span>
              </div>
              <input type="range" min="0" max="100" value={micInputGain} onChange={(e) => setMicInputGain(Number(e.target.value))} className="w-full h-1 bg-brand-surface-2 rounded-lg appearance-none cursor-pointer accent-brand-gold" />
            </div>

            <div className="flex items-center justify-between bg-brand-surface-2 border border-brand-border p-3 rounded-xl mt-3">
              <div>
                <span className="text-[12px] text-brand-ink block">Noise reduction</span>
                <span className="text-[10px] text-brand-ink-muted block">Compressor-based, not a true gate</span>
              </div>
              <button
                onClick={() => setVocalGate(!vocalGate)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                  vocalGate ? "bg-brand-gold text-brand-bg border-brand-gold" : "bg-brand-surface-2 border-brand-border text-brand-ink-muted"
                }`}
              >
                {vocalGate ? "On" : "Off"}
              </button>
            </div>

            <div className="bg-brand-surface-2 border border-brand-border rounded-lg p-3 flex gap-2 items-start">
              <Info className="h-3.5 w-3.5 text-brand-ink-muted shrink-0 mt-0.5" />
              <p className="text-[10px] text-brand-ink-muted leading-relaxed">
                Real-time pitch correction (autotune) isn't built - that needs dedicated pitch-shifting DSP,
                a separate piece of work from these signal-chain controls.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-brand-surface border border-brand-border rounded-2xl p-6">
        <h3 className="font-display text-[15px] text-brand-gold mb-3">Hum-to-beat guide</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-brand-surface-2 p-4 rounded-xl border border-brand-border">
            <h4 className="text-[13px] text-brand-ink mb-1">1. Start recording</h4>
            <p className="text-[11px] text-brand-ink-muted leading-relaxed">
              Grant microphone permission, open the Hum-to-beat tab, and press the record button.
            </p>
          </div>
          <div className="bg-brand-surface-2 p-4 rounded-xl border border-brand-border">
            <h4 className="text-[13px] text-brand-ink mb-1">2. Hum, sing, or beatbox</h4>
            <p className="text-[11px] text-brand-ink-muted leading-relaxed">
              A melody, bassline, or a kick/snare pattern - captures up to 8 seconds.
            </p>
          </div>
          <div className="bg-brand-surface-2 p-4 rounded-xl border border-brand-border">
            <h4 className="text-[13px] text-brand-ink mb-1">3. Auto-arrangement</h4>
            <p className="text-[11px] text-brand-ink-muted leading-relaxed">
              The swarm analyzes rhythm and pitch, then populates drum and melody patterns automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
