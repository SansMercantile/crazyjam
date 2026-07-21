import React, { useState } from "react";
import {
  Rocket,
  Sparkles,
  Import,
  Clock,
} from "lucide-react";
import { PublishPanel } from "./CrazyJamMusicTab";

interface LaunchpadTabProps {
  currentTempo: number;
  currentScale: string;
  onApplyStyle: (prompt: string, tempo: number, scale: string, genre: string) => void;
  addLog: (log: any) => void;
  tracks: any[];
}

interface StylePreset {
  id: string;
  styleName: string;
  tempo: number;
  scale: string;
  genre: string;
  prompt: string;
  description: string;
  attributes: string[];
}

// Curated starting points - not personalized (no real streaming-history
// integration exists yet), but genuinely useful presets you can apply.
const STYLE_PRESETS: StylePreset[] = [
  {
    id: "preset-1",
    styleName: "Moody Cyberpunk Synthwave",
    tempo: 118,
    scale: "A Minor",
    genre: "Electro-Clash / Synthwave",
    prompt: "Brooding retro bassline, neon analog synthesizer pads, gated snare drums, nostalgic and futuristic atmosphere, cyberpunk driving beat",
    description: "Rich minor chords, mid-tempo rhythms, and heavy spatial delay effects.",
    attributes: ["Retro gated snare", "Arpeggiated sub bass", "Atmospheric reverb"]
  },
  {
    id: "preset-2",
    styleName: "Late-Night Chilled Lo-Fi",
    tempo: 82,
    scale: "F Major",
    genre: "Lo-Fi Instrumental Hip-Hop",
    prompt: "Cozy chilled chord loop, crackly vinyl dust, warm rhodes keys, off-beat acoustic kick drums, jazzy saxophone notes, sleepy laidback study vibes",
    description: "Mellow major scales, high swing values, and analog tape distortion textures.",
    attributes: ["Tape hiss overlay", "Rhodes keyboard", "60% swing quantize"]
  },
  {
    id: "preset-3",
    styleName: "Melodic House Climax",
    tempo: 125,
    scale: "D Minor",
    genre: "Melodic House & Techno",
    prompt: "Dripping ethereal synth chord swells, rolling 16th note basslines, snappy club hi-hats, sub-atmospheric soundscape, building climax drop",
    description: "High-fidelity space delays, fast pumping sidechain compression, and 4-on-the-floor drum lines.",
    attributes: ["Melodic climax", "Rolling arpeggiator bass", "Sidechain pump"]
  }
];

export const LaunchpadTab: React.FC<LaunchpadTabProps> = ({ onApplyStyle, addLog }) => {
  const [appliedId, setAppliedId] = useState<string | null>(null);

  const handleApply = (preset: StylePreset) => {
    setAppliedId(preset.id);
    onApplyStyle(preset.prompt, preset.tempo, preset.scale.split(" ")[0] || "A", preset.genre);
    addLog({
      agentName: "Style Presets",
      role: "Studio",
      avatar: "🎛️",
      message: `Applied preset "${preset.styleName}" - tempo set to ${preset.tempo} BPM, scale to ${preset.scale}.`,
      phase: "Creation",
      status: "completed"
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn text-left">
      {/* Banner */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1 bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-[10px] px-2 py-0.5 rounded-full font-medium">
            <Rocket className="h-3 w-3" />
            <span>Creation to release, in one workflow</span>
          </div>
          <h2 className="font-display text-xl text-brand-ink">Production launchpad</h2>
          <p className="text-[12px] text-brand-ink-muted max-w-2xl leading-relaxed">
            Start from a curated style preset, then publish directly to CrazyJam Music when a track is ready.
          </p>
        </div>
      </div>

      {/* Style presets - real, honest: static curated starting points */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-6">
        <div className="flex items-center gap-2 border-b border-brand-border pb-3 mb-4">
          <Sparkles className="h-5 w-5 text-brand-gold" />
          <div>
            <h3 className="font-display text-base text-brand-ink">Starter style presets</h3>
            <p className="text-[11px] text-brand-ink-muted">Apply one directly to your studio workspace.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STYLE_PRESETS.map((preset) => (
            <div key={preset.id} className="p-4 bg-brand-surface-2 rounded-xl border border-brand-border flex flex-col justify-between gap-3">
              <div>
                <span className="text-[13px] font-medium text-brand-ink block">{preset.styleName}</span>
                <p className="text-[11px] text-brand-ink-muted mt-1 leading-relaxed">{preset.description}</p>
                <div className="grid grid-cols-2 gap-2 mt-2.5 bg-brand-surface p-2 rounded-lg text-[11px]">
                  <div><span className="text-brand-ink-muted block">Tempo</span><span className="text-brand-gold">{preset.tempo} BPM</span></div>
                  <div><span className="text-brand-ink-muted block">Scale</span><span className="text-brand-gold">{preset.scale}</span></div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {preset.attributes.map((a, i) => (
                    <span key={i} className="text-[10px] text-brand-ink-muted bg-brand-surface px-1.5 py-0.5 rounded">{a}</span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => handleApply(preset)}
                className="py-2 w-full bg-brand-surface hover:bg-brand-border/20 border border-brand-border hover:border-brand-gold/40 text-brand-ink text-[12px] font-medium rounded-lg transition-all flex items-center justify-center gap-1.5"
              >
                <Import className="h-3.5 w-3.5" /> {appliedId === preset.id ? "Applied" : "Apply to studio"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Real publish flow - same panel used in CrazyJam Music */}
      <PublishPanel addLog={addLog} onPublished={() => {}} />

      {/* Honest roadmap - not fake-functional */}
      <div className="bg-brand-surface-2 border border-brand-border rounded-xl p-5 flex gap-3 items-start">
        <Clock className="h-4 w-4 text-brand-ink-muted shrink-0 mt-0.5" />
        <div>
          <p className="text-[12px] text-brand-ink">On the roadmap</p>
          <p className="text-[11px] text-brand-ink-muted mt-1 leading-relaxed">
            Personalized style suggestions from your Spotify/YouTube listening history, and direct one-click
            distribution to Spotify/Apple Music/DistroKid/LANDR etc. Both need real API partnerships we haven't
            set up yet, so they're not built - this isn't a "coming soon" placeholder dressed up as working,
            it's genuinely not here.
          </p>
        </div>
      </div>
    </div>
  );
};
