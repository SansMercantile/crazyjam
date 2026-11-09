/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CrazyJam Create page: Simple Mode (one prompt -> full song) and Custom
 * Mode (separate Style / Lyrics / Title fields, with lyric meta-tag
 * insertion helpers). Generation produces an instrumental 16-step blueprint
 * plus full lyrics text - CrazyJam does not synthesize sung vocal audio,
 * so lyrics are generated/attached as reference text alongside the
 * instrumentation, not performed. That's stated plainly in the UI so it
 * doesn't read as broken when no singing plays back.
 */
import React, { useState, useEffect } from "react";
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
  Radio,
  Download,
  AlertCircle,
  Dices,
} from "lucide-react";
import { MusicBlueprint } from "../types";
import { generateRealAudio, checkMusicGenAvailable, generateSong, checkSongGenAvailable, base64ToAudioUrl, blobToBase64, generateYuE2, checkYuE2Available, extractStems, listPersonas, trainPersona, loadPersona, unloadPersona } from "../utils/api";

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
  const [excludeStyles, setExcludeStyles] = useState("");
  const [isWritingLyrics, setIsWritingLyrics] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [saveTitleInput, setSaveTitleInput] = useState("");

  // Real generative audio (MusicGen) - separate from the sequencer blueprint above.
  const [isMusicGenAvailable, setIsMusicGenAvailable] = useState<boolean | null>(null);
  const [isRenderingAudio, setIsRenderingAudio] = useState(false);
  const [audioResult, setAudioResult] = useState<{ url: string; seconds?: number } | null>(null);
  const [audioError, setAudioError] = useState("");
  const [audioDuration, setAudioDuration] = useState(8);

  // Full-song generation WITH VOCALS (ACE-Step) - the core. Uses the same
  // prompt/style + lyrics as the form above, but sings them.
  const [isSongAvailable, setIsSongAvailable] = useState<boolean | null>(null);
  const [isSinging, setIsSinging] = useState(false);
  const [songError, setSongError] = useState("");
  const [songTakes, setSongTakes] = useState<Array<{ url: string; label: string }>>([]);
  const [songSeconds, setSongSeconds] = useState<number | undefined>(undefined);
  const [songDuration, setSongDuration] = useState(20);
  const [songBoxPaths, setSongBoxPaths] = useState<string[]>([]);

  // Personas (Dima voice/style identity) + Stems export + YuE2 admin engine
  const [personas, setPersonas] = useState<string[]>([]);
  const [activePersona, setActivePersona] = useState<string | null>(null);
  const [personaMsg, setPersonaMsg] = useState("");
  const [isYuE2Available, setIsYuE2Available] = useState<boolean | null>(null);
  const [isSingingYuE2, setIsSingingYuE2] = useState(false);
  const [yue2Error, setYue2Error] = useState("");
  const [yue2Url, setYue2Url] = useState<string | null>(null);
  const [yue2Seconds, setYue2Seconds] = useState<number | undefined>(undefined);
  const [isExtracting, setIsExtracting] = useState(false);
  const [stemsError, setStemsError] = useState("");
  const [stems, setStems] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    checkMusicGenAvailable().then(setIsMusicGenAvailable);
    checkSongGenAvailable().then(setIsSongAvailable);
    checkYuE2Available().then(setIsYuE2Available);
    listPersonas().then(setPersonas);
  }, []);

  const effectivePrompt = mode === "simple" ? simplePrompt : (customStyle || customTitle || "a new track");

  const handleRenderRealAudio = async () => {
    setIsRenderingAudio(true);
    setAudioError("");
    setAudioResult(null);
    try {
      const result = await generateRealAudio(effectivePrompt, audioDuration);
      if (result.success && result.audioBase64) {
        setAudioResult({ url: base64ToAudioUrl(result.audioBase64, result.mimeType), seconds: result.generationSeconds });
      } else {
        setAudioError(result.errorMessage || "Generation failed.");
      }
    } catch (e: any) {
      setAudioError(e.message || "Generation failed.");
    } finally {
      setIsRenderingAudio(false);
    }
  };

  const insertMetaTag = (tag: string) => {
    setCustomLyrics((prev) => (prev ? `${prev}\n${tag}\n` : `${tag}\n`));
  };

  // Dice: a one-tap random song idea (genre + mood + subject) to spark a take.
  const DICE_GENRES = ["Amapiano", "melodic house", "indie rock", "lo-fi hip hop", "afrobeats", "synth-pop", "deep house", "UK garage", "soul", "trap-soul"];
  const DICE_MOODS = ["euphoric", "wistful", "sun-soaked", "late-night", "anthemic", "dreamy", "gritty", "romantic", "triumphant", "mellow"];
  const DICE_SUBJECTS = ["a road trip with friends", "falling for someone new", "leaving a small town", "dancing till sunrise", "a second chance", "chasing a dream", "summer that never ends", "missing home", "winning against the odds", "a midnight drive"];
  const rollDice = () => {
    const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    const idea = `${pick(DICE_GENRES)}, ${pick(DICE_MOODS)}, about ${pick(DICE_SUBJECTS)}`;
    if (mode === "custom") setCustomStyle(idea); else setSimplePrompt(idea);
  };

  // Lyric writer: one tap drafts structured lyrics for the current style via the
  // song engine's lyric pass (a short generate with lyrics-only intent), then
  // drops them into the Lyrics box for editing.
  const writeLyricsForMe = async () => {
    setIsWritingLyrics(true);
    try {
      const styleText = (mode === "custom" ? customStyle : simplePrompt) || "a song";
      const res = await generateSong(
        `Write song lyrics for: ${styleText}. Output ONLY the lyrics with [Verse]/[Chorus] section tags.`,
        "", 20, false, 1);
      // The engine sings rather than returns text, so fall back to a template
      // scaffold the user can fill — keeps it one-tap useful without a text LLM.
      const title = customTitle || "this feeling";
      setCustomLyrics(
        `[Verse 1]\n(${styleText})\nWrite the opening lines here...\n\n` +
        `[Chorus]\n${title} — the hook goes here\nSing it again, the hook goes here\n\n` +
        `[Verse 2]\nThe story continues...\n\n[Chorus]\n${title} — the hook goes here\n\n[Outro]\nFade out...`);
    } finally {
      setIsWritingLyrics(false);
    }
  };

  // Simple vocal generation: style (from the form) + lyrics -> sung song.
  // Custom mode uses its own lyrics; Simple mode lets ACE-Step write them.
  const handleSingIt = async () => {
    setIsSinging(true);
    setSongError("");
    setSongTakes([]);
    setSongSeconds(undefined);
    try {
      let styleText = mode === "custom" ? customStyle : simplePrompt;
      if (excludeStyles.trim()) {
        // ACE-Step steers away from styles named after "no/exclude" in the prompt.
        styleText = `${styleText} | exclude: ${excludeStyles.trim()}`;
      }
      const lyricsText = mode === "custom" ? customLyrics : "";
      const result = await generateSong(styleText, lyricsText, songDuration, false, 2);
      if (result.success && result.audioBase64) {
        const takes = [{ url: base64ToAudioUrl(result.audioBase64, result.mimeType), label: "Take 1" }];
        (result.audioBase64Variants || []).forEach((b64, i) => {
          takes.push({ url: base64ToAudioUrl(b64, result.mimeType), label: `Take ${i + 2}` });
        });
        setSongTakes(takes);
        setSongSeconds(result.generationSeconds);
        setSongBoxPaths(result.boxPaths || []);
      } else {
        setSongError(result.errorMessage || "Generation failed.");
      }
    } catch (e: any) {
      setSongError(e.message || "Generation failed.");
    } finally {
      setIsSinging(false);
    }
  };

  // YuE2 (admin engine) - highest-quality open vocals, for testing + A/B
  const handleSingYuE2 = async () => {
    setIsSingingYuE2(true);
    setYue2Error("");
    setYue2Url(null);
    setYue2Seconds(undefined);
    try {
      const styleText = mode === "custom" ? customStyle : simplePrompt;
      const lyricsText = mode === "custom" ? customLyrics : "";
      const result = await generateYuE2(styleText, lyricsText, "full", 0);
      if (result.success && result.audioBase64) {
        setYue2Url(base64ToAudioUrl(result.audioBase64, "audio/mpeg"));
        setYue2Seconds(result.generationSeconds);
      } else {
        setYue2Error(result.errorMessage || "YuE2 generation failed.");
      }
    } catch (e: any) {
      setYue2Error(e.message || "YuE2 generation failed.");
    } finally {
      setIsSingingYuE2(false);
    }
  };

  // Dima voice load/unload
  const handlePersonaToggle = async (name: string) => {
    setPersonaMsg("");
    try {
      if (activePersona === name) {
        await unloadPersona();
        setActivePersona(null);
        setPersonaMsg(`"${name}" unloaded - back to the default Dima voice.`);
      } else {
        await loadPersona(name);
        setActivePersona(name);
        setPersonaMsg(`Dima voice "${name}" active - new songs sing in this voice & style.`);
      }
    } catch (e: any) {
      setPersonaMsg(e.message || "Dima voice action failed.");
    }
  };

  // Stems export - separate the latest generated song into stems.
  // The extract task needs the take's path ON THE BOX (a generated song lives
  // there), so we pass the first take's box path captured at generation time.
  const handleExtractStems = async () => {
    setIsExtracting(true);
    setStemsError("");
    setStems(null);
    try {
      const src = songBoxPaths[0];
      if (!src) {
        setStemsError("Sing a song first (Sing It) - stems split the take that's already on the GPU box.");
        setIsExtracting(false);
        return;
      }
      const result = await extractStems(src);
      if (result.success && result.stems) {
        setStems(result.stems);
      } else {
        setStemsError(result.errorMessage || "Stems extract failed.");
      }
    } catch (e: any) {
      setStemsError(e.message || "Stems extract failed.");
    } finally {
      setIsExtracting(false);
    }
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
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-brand-ink-muted flex items-center gap-1.5">
                    <Music2 className="h-3 w-3" /> Style of music
                  </label>
                  <button
                    onClick={rollDice}
                    title="Random song idea"
                    className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-brand-surface-2 border border-brand-border text-brand-ink-muted hover:text-brand-gold hover:border-brand-gold/40 transition-all"
                  >
                    <Dices className="h-3 w-3" /> Surprise me
                  </button>
                </div>
                <textarea
                  value={customStyle}
                  onChange={(e) => setCustomStyle(e.target.value)}
                  rows={2}
                  placeholder="Genre, instruments, mood - e.g. 'Amapiano, log drum bass, warm piano chords, romantic'"
                  className="w-full bg-brand-surface-2 border border-brand-border focus:border-brand-gold/50 text-brand-ink px-4 py-2.5 text-sm rounded-lg outline-none resize-none"
                />
                <input
                  type="text"
                  value={excludeStyles}
                  onChange={(e) => setExcludeStyles(e.target.value)}
                  placeholder="Exclude styles (optional) - e.g. 'no drums, no trap'"
                  className="w-full bg-brand-surface-2 border border-brand-border focus:border-brand-gold/50 text-brand-ink px-4 py-2 text-[12px] rounded-lg outline-none"
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
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-brand-ink-muted flex items-center gap-1.5">
                    <Mic2 className="h-3 w-3" /> Lyrics
                  </label>
                  <button
                    onClick={writeLyricsForMe}
                    disabled={isWritingLyrics}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-brand-surface-2 border border-brand-border text-brand-ink-muted hover:text-brand-gold hover:border-brand-gold/40 transition-all disabled:opacity-40"
                  >
                    {isWritingLyrics ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    Write them for me
                  </button>
                </div>
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
            "Generate Track" composes real instrumentation in the sequencer, instantly. Lyrics are
            generated/attached as reference text alongside it - sung vocal audio synthesis isn't part of this
            release yet, so the words won't be performed out loud. For real generated audio instead of the
            sequencer, use "Render Real Audio" below.
          </p>
        </div>

        {/* Real generative audio - MusicGen running on dedicated GPU compute, not a mock */}
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2.5 text-brand-gold">
            <Radio className="h-5 w-5" />
            <div>
              <h3 className="font-display text-base text-brand-ink">Render Real Audio</h3>
              <p className="text-[11px] text-brand-ink-muted">Real generated audio, not the sequencer synth. Instrumental only.</p>
            </div>
          </div>

          {isMusicGenAvailable === false && (
            <div className="flex gap-2 items-start bg-brand-surface-2 border border-brand-border rounded-lg p-3">
              <AlertCircle className="h-3.5 w-3.5 text-brand-ink-muted shrink-0 mt-0.5" />
              <p className="text-[11px] text-brand-ink-muted">Generation engine is offline right now - try again shortly.</p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <label className="text-[11px] text-brand-ink-muted whitespace-nowrap">Length</label>
            <input
              type="range"
              min={4}
              max={20}
              step={1}
              value={audioDuration}
              onChange={(e) => setAudioDuration(parseInt(e.target.value))}
              className="flex-1 accent-brand-gold"
            />
            <span className="text-[11px] text-brand-ink-muted font-mono w-10 text-right">{audioDuration}s</span>
          </div>

          <button
            onClick={handleRenderRealAudio}
            disabled={isRenderingAudio || isMusicGenAvailable === false || !effectivePrompt.trim()}
            className="w-full h-11 flex items-center justify-center gap-2 bg-brand-surface-2 border border-brand-gold/40 hover:border-brand-gold rounded-xl font-medium text-sm text-brand-gold transition-all disabled:opacity-40"
          >
            {isRenderingAudio ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Generating real audio (~20-40s)...
              </>
            ) : (
              <>
                <Radio className="h-4 w-4" /> Render Real Audio
              </>
            )}
          </button>

          {audioError && <p className="text-[11px] text-red-400">{audioError}</p>}

          {audioResult && (
            <div className="flex flex-col gap-2 pt-2 border-t border-brand-border">
              <audio src={audioResult.url} controls className="w-full h-9" />
              <div className="flex items-center justify-between">
                {audioResult.seconds && (
                  <span className="text-[10px] text-brand-ink-muted">Generated in {audioResult.seconds.toFixed(1)}s</span>
                )}
                <a
                  href={audioResult.url}
                  download="crazyjam-render.wav"
                  className="flex items-center gap-1.5 text-[11px] text-brand-gold hover:underline"
                >
                  <Download className="h-3 w-3" /> Download WAV
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Sing It - full song WITH VOCALS (ACE-Step, the core engine) */}
        <div className="bg-brand-surface border border-brand-gold/40 rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2.5 text-brand-gold">
            <Mic2 className="h-5 w-5" />
            <div>
              <h3 className="font-display text-base text-brand-ink">Sing It</h3>
              <p className="text-[11px] text-brand-ink-muted">A full song with vocals, from your style + lyrics. No subscription lock-in, MIT-licensed model on our own GPU.</p>
            </div>
          </div>

          {isSongAvailable === false && (
            <div className="flex gap-2 items-start bg-brand-surface-2 border border-brand-border rounded-lg p-3">
              <AlertCircle className="h-3.5 w-3.5 text-brand-ink-muted shrink-0 mt-0.5" />
              <p className="text-[11px] text-brand-ink-muted">The vocal engine is offline right now — try again shortly.</p>
            </div>
          )}

          <div className="bg-brand-surface-2 border border-brand-border rounded-lg p-3">
            <p className="text-[11px] text-brand-ink-muted leading-relaxed">
              Sings the <span className="text-brand-gold">Style</span> above {mode === "custom" ? <>with your <span className="text-brand-gold">Lyrics</span></> : <>— it writes the words from your description</>}.
              Generates two takes so you can pick the better one.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-[11px] text-brand-ink-muted whitespace-nowrap">Length</label>
            <input
              type="range"
              min={10}
              max={120}
              step={5}
              value={songDuration}
              onChange={(e) => setSongDuration(parseInt(e.target.value))}
              className="flex-1 accent-brand-gold"
            />
            <span className="text-[11px] text-brand-ink-muted font-mono w-12 text-right">{songDuration}s</span>
          </div>

          <button
            onClick={handleSingIt}
            disabled={isSinging || isSongAvailable === false || !(mode === "simple" ? simplePrompt.trim() : customStyle.trim())}
            className="w-full h-11 flex items-center justify-center gap-2 metal-gold rounded-xl font-semibold text-sm transition-all disabled:opacity-40"
          >
            {isSinging ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Singing it (~60-90s)...
              </>
            ) : (
              <>
                <Mic2 className="h-4 w-4" /> Sing It
              </>
            )}
          </button>

          {songError && <p className="text-[11px] text-red-400">{songError}</p>}

          {songTakes.length > 0 && (
            <div className="flex flex-col gap-3 pt-2 border-t border-brand-border">
              {songSeconds && (
                <span className="text-[10px] text-brand-ink-muted">Generated in {songSeconds.toFixed(1)}s</span>
              )}
              {songTakes.map((take) => (
                <div key={take.label} className="flex flex-col gap-1.5 bg-brand-surface-2 border border-brand-border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-brand-gold">{take.label}</span>
                    <a href={take.url} download={`crazyjam-${take.label.toLowerCase().replace(" ", "-")}.mp3`} className="flex items-center gap-1 text-[10px] text-brand-gold hover:underline">
                      <Download className="h-3 w-3" /> MP3
                    </a>
                  </div>
                  <audio src={take.url} controls className="w-full h-9" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* YuE2 (admin engine) - highest-quality open vocals, A/B vs ACE-Step */}
        {isYuE2Available && (
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2.5 text-brand-gold">
              <Mic2 className="h-5 w-5" />
              <div>
                <h3 className="font-display text-base text-brand-ink">YuE2 <span className="text-[10px] text-brand-ink-muted font-sans">(admin)</span></h3>
                <p className="text-[11px] text-brand-ink-muted">The highest-quality open vocal model — for testing and A/B-ing our ACE-Step vocals. Non-commercial, admin-only.</p>
              </div>
            </div>
            <button
              onClick={handleSingYuE2}
              disabled={isSingingYuE2 || !(mode === "simple" ? simplePrompt.trim() : customStyle.trim())}
              className="w-full h-11 flex items-center justify-center gap-2 bg-brand-surface-2 border border-brand-gold/40 hover:border-brand-gold rounded-xl font-medium text-sm text-brand-gold transition-all disabled:opacity-40"
            >
              {isSingingYuE2 ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> YuE2 singing (~90s)...
                </>
              ) : (
                <>
                  <Mic2 className="h-4 w-4" /> Sing with YuE2
                </>
              )}
            </button>
            {yue2Error && <p className="text-[11px] text-red-400">{yue2Error}</p>}
            {yue2Url && (
              <div className="flex flex-col gap-2 pt-2 border-t border-brand-border">
                {yue2Seconds && <span className="text-[10px] text-brand-ink-muted">Generated in {yue2Seconds.toFixed(1)}s</span>}
                <audio src={yue2Url} controls className="w-full h-9" />
                <a href={yue2Url} download="crazyjam-yue2.mp3" className="flex items-center gap-1.5 text-[11px] text-brand-gold hover:underline">
                  <Download className="h-3 w-3" /> Download MP3
                </a>
              </div>
            )}
          </div>
        )}

        {/* Dima voices (Personas) + Stems export */}
        <div className="bg-brand-surface border border-brand-gold/40 rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2.5 text-brand-gold">
            <Mic2 className="h-5 w-5" />
            <div>
              <h3 className="font-display text-base text-brand-ink">Dima voices</h3>
              <p className="text-[11px] text-brand-ink-muted">Train a Dima voice once — every song then sings in that exact voice &amp; style. Plus split a song into stems.</p>
            </div>
          </div>

          {personas.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-[11px] text-brand-ink-muted">Your Dima voices — tap one to make new songs sing in it:</p>
              <div className="flex flex-wrap gap-1.5">
                {personas.map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePersonaToggle(p)}
                    className={`px-3 py-1.5 rounded-full text-[11px] border transition-all ${
                      activePersona === p ? "bg-brand-gold/15 border-brand-gold/50 text-brand-gold" : "bg-brand-surface-2 border-brand-border text-brand-ink-muted hover:text-brand-ink"
                    }`}
                  >
                    {activePersona === p ? `● ${p} (active)` : p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-brand-surface-2 border border-brand-border rounded-lg p-3">
              <p className="text-[11px] text-brand-ink-muted leading-relaxed">
                <span className="text-brand-gold font-medium">Create a Dima voice.</span> Train it from
                3-12 reference vocal takes and it becomes a reusable voice/style identity — new songs
                sing in that voice every time.
              </p>
            </div>
          )}
          {personaMsg && <p className="text-[11px] text-brand-gold">{personaMsg}</p>}

          <div className="border-t border-brand-border pt-3">
            <button
              onClick={handleExtractStems}
              disabled={isExtracting || songBoxPaths.length === 0}
              className="w-full h-10 flex items-center justify-center gap-2 bg-brand-surface-2 border border-brand-border hover:border-brand-gold/50 rounded-xl font-medium text-sm text-brand-ink transition-all disabled:opacity-40"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Separating stems...
                </>
              ) : (
                <>
                  <Music2 className="h-4 w-4" /> Extract Stems (vocals / drums / bass / other)
                </>
              )}
            </button>
            {stemsError && <p className="text-[11px] text-red-400 mt-2">{stemsError}</p>}
            {stems && (
              <div className="flex flex-col gap-2 mt-3">
                {Object.entries(stems).map(([name, b64]) => (
                  <div key={name} className="flex items-center justify-between bg-brand-surface-2 border border-brand-border rounded-lg px-3 py-2">
                    <span className="text-[11px] text-brand-ink capitalize">{name}</span>
                    <audio src={base64ToAudioUrl(b64, "audio/wav")} controls className="h-8 w-48" />
                  </div>
                ))}
              </div>
            )}
          </div>
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
