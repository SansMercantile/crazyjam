/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Suno-style Create page: Simple Mode (one prompt -> full song) and Custom
 * Mode (separate Style / Lyrics / Title fields, with lyric meta-tag
 * insertion helpers). Generation produces an instrumental 16-step blueprint
 * plus full lyrics text - CrazyJam does not synthesize sung vocal audio,
 * so lyrics are generated/attached as reference text alongside the
 * instrumentation, not performed. That's stated plainly in the UI so it
 * doesn't read as broken when no singing plays back.
 */
import React, { useState } from "react";
import {
  Wand2,
  SlidersHorizontal,
  Sparkles,
  Save,
  Loader2,
  Info,
  Music2,
  Mic2,
  Type,
} from "lucide-react";
import { MusicBlueprint } from "../types";

const STYLE_TAG_CHIPS = [
  "Indie Rock", "Amapiano", "Lofi Hip-Hop", "Synthwave", "Afrobeats",
  "Trap", "Deep House", "Acoustic Folk", "Cinematic Orchestral", "Tech House",
];

const META_TAGS = [
  "[Intro]", "[Verse 1]", "[Verse 2]", "[Pre-Chorus]", "[Chorus]", "[Bridge]",
  "[Outro]", "[Male Vocal]", "[Female Vocal]", "[Harmonizing Duet]", "[Building Intensity]",
];

interface CreateTabProps {
  isGenerating: boolean;
  onGenerate: (prompt: string, options?: { mode?: "simple" | "custom"; style?: string; lyrics?: string; userTitle?: string }) => void;
  currentBlueprint: MusicBlueprint;
  onSaveTrack: (title: string) => Promise<void>;
  addLog?: (log: any) => void;
}

export const CreateTab: React.FC<CreateTabProps> = ({ isGenerating, onGenerate, currentBlueprint, onSaveTrack, addLog }) => {
  const [mode, setMode] = useState<"simple" | "custom">("simple");

  const [simplePrompt, setSimplePrompt] = useState(
    "An upbeat indie rock song about a road trip with friends, sun-soaked and nostalgic"
  );

  const [customStyle, setCustomStyle] = useState("Amapiano, log drum bass, warm piano chords, romantic");
  const [customTitle, setCustomTitle] = useState("");
  const [customLyrics, setCustomLyrics] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [saveTitleInput, setSaveTitleInput] = useState("");

  const insertMetaTag = (tag: string) => {
    setCustomLyrics((prev) => (prev ? `${prev}\n${tag}\n` : `${tag}\n`));
  };

  const toggleStyleChip = (chip: string) => {
    setCustomStyle((prev) => {
      const parts = prev.split(",").map((p) => p.trim()).filter(Boolean);
      if (parts.includes(chip)) return parts.filter((p) => p !== chip).join(", ");
      return [...parts, chip].join(", ");
    });
  };

  const handleGenerateClick = () => {
    if (mode === "simple") {
      onGenerate(simplePrompt, { mode: "simple" });
    } else {
      const effectivePrompt = customTitle || customStyle || "a new track";
      onGenerate(effectivePrompt, {
        mode: "custom",
        style: customStyle,
        lyrics: customLyrics,
        userTitle: customTitle || undefined,
      });
    }
  };

  const canGenerate = mode === "simple" ? simplePrompt.trim().length > 0 : customStyle.trim().length > 0;

  const handleSave = async () => {
    const titleToUse = saveTitleInput.trim() || currentBlueprint.title;
    setIsSaving(true);
    setSaveStatus("");
    try {
      await onSaveTrack(titleToUse);
      setSaveStatus("Saved to your library.");
      addLog?.({
        agentName: "Release Manager",
        role: "Library",
        avatar: "💾",
        message: `"${titleToUse}" saved with lyrics attached.`,
        phase: "System",
        status: "completed",
      });
    } catch (e: any) {
      setSaveStatus(e.message || "Save failed.");
    } finally {
      setIsSaving(false);
    }
  };

  const hasGeneratedSomething = currentBlueprint.title && currentBlueprint.title !== "Vapor Lounge";

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mt-6 animate-fadeIn">
      {/* Left: Create form */}
      <div className="xl:col-span-7 flex flex-col gap-4">
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 flex flex-col gap-5">
          <div className="flex items-center gap-2.5 text-brand-gold border-b border-brand-border pb-4">
            <Wand2 className="h-5 w-5" />
            <div>
              <h2 className="font-display text-lg text-brand-ink">Create</h2>
              <p className="text-[11px] text-brand-ink-muted">Generate a full arrangement from a prompt, or take granular control.</p>
            </div>
          </div>

          {/* Mode toggle */}
          <div className="flex items-center gap-1 bg-brand-surface-2 border border-brand-border rounded-lg p-1 w-fit">
            <button
              onClick={() => setMode("simple")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-[12px] font-medium transition-all ${
                mode === "simple" ? "bg-brand-gold" : "text-brand-ink-muted hover:text-brand-ink"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" /> Simple
            </button>
            <button
              onClick={() => setMode("custom")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-[12px] font-medium transition-all ${
                mode === "custom" ? "bg-brand-gold" : "text-brand-ink-muted hover:text-brand-ink"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" /> Custom
            </button>
          </div>

          {mode === "simple" ? (
            <div className="flex flex-col gap-3 animate-fadeIn">
              <label className="text-[11px] font-medium text-brand-ink-muted">Describe your song</label>
              <textarea
                value={simplePrompt}
                onChange={(e) => setSimplePrompt(e.target.value)}
                rows={4}
                placeholder='e.g. "upbeat indie rock song about a road trip"'
                className="w-full bg-brand-surface-2 border border-brand-border focus:border-brand-gold/50 text-brand-ink px-4 py-3 text-sm rounded-xl outline-none resize-none"
              />
              <p className="text-[11px] text-brand-ink-muted leading-relaxed">
                The swarm invents the title, style, lyrics, and arrangement together from this one description.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 animate-fadeIn">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-brand-ink-muted flex items-center gap-1.5">
                  <Type className="h-3 w-3" /> Title (optional)
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Leave blank to let the swarm name it"
                  className="w-full bg-brand-surface-2 border border-brand-border focus:border-brand-gold/50 text-brand-ink px-4 py-2.5 text-sm rounded-lg outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-brand-ink-muted flex items-center gap-1.5">
                  <Music2 className="h-3 w-3" /> Style of music
                </label>
                <textarea
                  value={customStyle}
                  onChange={(e) => setCustomStyle(e.target.value)}
                  rows={2}
                  placeholder="Genre, instruments, mood - e.g. 'Amapiano, log drum bass, warm piano chords, romantic'"
                  className="w-full bg-brand-surface-2 border border-brand-border focus:border-brand-gold/50 text-brand-ink px-4 py-2.5 text-sm rounded-lg outline-none resize-none"
                />
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {STYLE_TAG_CHIPS.map((chip) => {
                    const active = customStyle.toLowerCase().includes(chip.toLowerCase());
                    return (
                      <button
                        key={chip}
                        onClick={() => toggleStyleChip(chip)}
                        className={`px-2.5 py-1 rounded-full text-[11px] border transition-all ${
                          active ? "bg-brand-gold/15 border-brand-gold/50 text-brand-gold" : "bg-brand-surface-2 border-brand-border text-brand-ink-muted hover:text-brand-ink"
                        }`}
                      >
                        {chip}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-brand-ink-muted flex items-center gap-1.5">
                  <Mic2 className="h-3 w-3" /> Lyrics
                </label>
                <div className="flex flex-wrap gap-1.5 mb-1">
                  {META_TAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => insertMetaTag(tag)}
                      className="px-2 py-1 rounded text-[10px] bg-brand-surface-2 border border-brand-border text-brand-ink-muted hover:text-brand-gold hover:border-brand-gold/40 transition-all"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
                <textarea
                  value={customLyrics}
                  onChange={(e) => setCustomLyrics(e.target.value)}
                  rows={8}
                  placeholder={"[Verse 1: Male vocal]\nWrite your lyrics here...\n\n[Chorus: Harmonizing duet]\n...\n\nLeave blank to have the swarm write lyrics for you."}
                  className="w-full bg-brand-surface-2 border border-brand-border focus:border-brand-gold/50 text-brand-ink px-4 py-3 text-sm rounded-lg outline-none resize-none font-mono leading-relaxed"
                />
                <p className="text-[11px] text-brand-ink-muted leading-relaxed">
                  Bracketed meta tags shape structure and vocal type, and steer how dense/energetic the arrangement gets at that point.
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleGenerateClick}
            disabled={!canGenerate || isGenerating}
            className="w-full h-12 flex items-center justify-center gap-2 metal-gold rounded-xl font-semibold text-sm transition-all disabled:opacity-40"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Composing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Generate Track
              </>
            )}
          </button>
        </div>

        <div className="bg-brand-surface-2 border border-brand-border rounded-xl p-4 flex gap-2.5 items-start">
          <Info className="h-3.5 w-3.5 text-brand-gold shrink-0 mt-0.5" />
          <p className="text-[11px] text-brand-ink-muted leading-relaxed">
            CrazyJam composes real instrumentation you can hear immediately in the sequencer. Lyrics are
            generated/attached as reference text alongside it - sung vocal audio synthesis isn't part of this
            release yet, so the words won't be performed out loud.
          </p>
        </div>
      </div>

      {/* Right: result / lyrics panel */}
      <div className="xl:col-span-5 flex flex-col gap-4">
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 flex flex-col gap-4 min-h-[300px]">
          <div className="flex items-center justify-between border-b border-brand-border pb-3">
            <h3 className="font-display text-base text-brand-ink">Latest result</h3>
            {hasGeneratedSomething && <span className="text-[11px] text-brand-gold">{currentBlueprint.genre} &bull; {currentBlueprint.tempo} BPM</span>}
          </div>

          {!hasGeneratedSomething ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-[12px] text-brand-ink-muted text-center px-8">Generate a track to see its title, lyrics, and arrangement here</p>
            </div>
          ) : (
            <>
              <h4 className="font-display text-xl text-brand-ink">{currentBlueprint.title}</h4>
              <div className="flex-1 overflow-y-auto max-h-[360px] bg-brand-surface-2 border border-brand-border rounded-lg p-4">
                {currentBlueprint.lyrics ? (
                  <pre className="text-[12px] text-brand-ink-muted whitespace-pre-wrap leading-relaxed font-mono">{currentBlueprint.lyrics}</pre>
                ) : (
                  <p className="text-[11px] text-brand-ink-muted">No lyrics for this track.</p>
                )}
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-brand-border">
                <input
                  type="text"
                  value={saveTitleInput}
                  onChange={(e) => setSaveTitleInput(e.target.value)}
                  placeholder={currentBlueprint.title}
                  className="w-full bg-brand-surface-2 border border-brand-border focus:border-brand-gold/50 text-brand-ink px-3 py-2 text-sm rounded-lg outline-none"
                />
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full flex items-center justify-center gap-2 bg-brand-surface-2 hover:bg-brand-border/30 border border-brand-border rounded-lg py-2.5 text-[12px] font-medium text-brand-ink transition-all disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" /> {isSaving ? "Saving..." : "Save to Library"}
                </button>
                {saveStatus && <p className="text-[11px] text-brand-gold text-center">{saveStatus}</p>}
                <p className="text-[10px] text-brand-ink-muted text-center">Head to CrazyJam Studio to hear playback, edit the sequencer, or open Cover Art Studio for the release artwork.</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
