/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AI Music Video Director - AWS-native (Claude for writing/analysis,
 * Stability for stills, Luma Ray 2 for atmosphere/b-roll video). Flow:
 * analyze the track -> pick 1 of 3 award-style concept treatments -> review/
 * enhance the 4-scene storyboard -> render a real atmosphere/b-roll clip via
 * Luma Ray 2 -> add it straight into the Music Video Creator's timeline.
 *
 * Deliberately does NOT try to generate the artist singing/performing here -
 * that's the existing Wav2Lip "Animate a photo" panel's job. This panel is
 * for the surrounding cinematic footage; the two get composited together on
 * the timeline like any other clips.
 */
import React, { useState, useRef } from "react";
import { Clapperboard, Sparkles, Loader2, Wand2, Image as ImageIcon, RefreshCw, Film, ChevronRight } from "lucide-react";
import {
  analyzeVideoConcepts, generateConceptScenes, enhanceVideoScene, generateSceneStill,
  generateVideoDirectorPrompt, startVideoDirectorRender, getVideoDirectorStatus,
  VideoDirectorConcept, VideoDirectorScene,
} from "../utils/api";

interface VideoDirectorPanelProps {
  trackTitle: string;
  genre?: string;
  bpm: number;
  lyrics?: string;
  onVideoReady: (file: File) => void;
  addLog?: (log: any) => void;
}

type Step = "input" | "concepts" | "scenes" | "rendering" | "done";

export function VideoDirectorPanel({ trackTitle, genre, bpm, lyrics, onVideoReady, addLog }: VideoDirectorPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [step, setStep] = useState<Step>("input");
  const [mood, setMood] = useState("");
  const [description, setDescription] = useState("");
  const [customNotes, setCustomNotes] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [error, setError] = useState("");

  const [audioAnalysis, setAudioAnalysis] = useState("");
  const [concepts, setConcepts] = useState<VideoDirectorConcept[]>([]);
  const [chosen, setChosen] = useState<VideoDirectorConcept | null>(null);
  const [scenes, setScenes] = useState<VideoDirectorScene[]>([]);
  const [sceneStills, setSceneStills] = useState<Record<string, string>>({});
  const [enhancingId, setEnhancingId] = useState<string | null>(null);
  const [stillLoadingId, setStillLoadingId] = useState<string | null>(null);

  const [renderProgress, setRenderProgress] = useState("");
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleAnalyze = async () => {
    setIsBusy(true);
    setBusyLabel("Analyzing your track and pitching 3 concepts...");
    setError("");
    try {
      const result = await analyzeVideoConcepts({
        trackTitle, genre, bpm, mood, description, lyricsConcept: lyrics, customNotes,
      });
      if (!result.success || !result.concepts) {
        setError(result.errorMessage || "Could not analyze the track.");
        return;
      }
      setAudioAnalysis(result.audioAnalysis || "");
      setConcepts(result.concepts);
      setStep("concepts");
    } catch (e: any) {
      setError(e.message || "Analysis failed.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleChooseConcept = async (concept: VideoDirectorConcept) => {
    setChosen(concept);
    setIsBusy(true);
    setBusyLabel(`Writing the storyboard for "${concept.title}"...`);
    setError("");
    try {
      const result = await generateConceptScenes({
        conceptTitle: concept.title, storylineSynopsis: concept.storylineSynopsis,
        directorVision: concept.directorVision, visualStyle: concept.visualStyle,
        narrativeTone: concept.narrativeTone, characterRole: concept.characterRole,
        trackTitle, genre, bpm, mood,
      });
      if (!result.success || !result.scenes) {
        setError(result.errorMessage || "Could not generate the storyboard.");
        return;
      }
      setScenes(result.scenes);
      setStep("scenes");
    } catch (e: any) {
      setError(e.message || "Storyboard generation failed.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleEnhanceScene = async (scene: VideoDirectorScene) => {
    if (!chosen) return;
    setEnhancingId(scene.id);
    try {
      const result = await enhanceVideoScene({
        sceneDescription: scene.description, narrativeAction: scene.narrativeAction,
        storyBeat: scene.storyBeat, cameraMove: scene.cameraMove, lighting: scene.lighting,
        songTitle: trackTitle, songGenre: genre, songMood: mood, bpm,
        conceptTitle: chosen.title, characterRole: chosen.characterRole, visualStyle: chosen.visualStyle,
      });
      if (result.success) {
        setScenes((prev) => prev.map((s) => s.id === scene.id ? {
          ...s,
          description: result.enhancedDescription || s.description,
          cameraMove: result.cameraMove || s.cameraMove,
          lighting: result.lighting || s.lighting,
          narrativeAction: result.narrativeAction || s.narrativeAction,
        } : s));
      }
    } catch { /* leave scene as-is on failure */ }
    finally { setEnhancingId(null); }
  };

  const handlePreviewStill = async (scene: VideoDirectorScene) => {
    setStillLoadingId(scene.id);
    try {
      const result = await generateSceneStill(scene.imagePrompt || scene.description);
      if (result.success && result.imageBase64) {
        setSceneStills((prev) => ({ ...prev, [scene.id]: `data:${result.mimeType || "image/png"};base64,${result.imageBase64}` }));
      }
    } catch { /* skip preview on failure, not fatal */ }
    finally { setStillLoadingId(null); }
  };

  const pollVideoStatus = (jobId: string, startedAt: number) => {
    pollRef.current = setTimeout(async () => {
      try {
        const status = await getVideoDirectorStatus(jobId);
        const elapsed = Math.round((Date.now() - startedAt) / 1000);
        if (status.status === "Completed" && status.videoUrl) {
          setRenderProgress("Downloading your rendered clip...");
          const videoRes = await fetch(status.videoUrl);
          const blob = await videoRes.blob();
          const file = new File([blob], `director-scene-${Date.now()}.mp4`, { type: "video/mp4" });
          onVideoReady(file);
          addLog?.({
            agentName: "Video Director", role: "AI Direction", avatar: "\ud83c\udfac",
            message: `Rendered "${chosen?.title}" atmosphere footage and added it to your timeline.`,
            phase: "System", status: "completed",
          });
          setStep("done");
          setIsBusy(false);
        } else if (status.status === "Failed") {
          setError(status.errorMessage || "Video render failed.");
          setIsBusy(false);
          setStep("scenes");
        } else {
          setRenderProgress(`Rendering with Luma Ray 2... (${elapsed}s elapsed)`);
          pollVideoStatus(jobId, startedAt);
        }
      } catch (e: any) {
        setError(e.message || "Could not check render status.");
        setIsBusy(false);
        setStep("scenes");
      }
    }, 5000);
  };

  const handleGenerateVideo = async () => {
    if (!chosen || scenes.length === 0) return;
    setIsBusy(true);
    setError("");
    setStep("rendering");
    setBusyLabel("Writing the director's shot list...");
    try {
      const promptResult = await generateVideoDirectorPrompt({
        conceptTitle: chosen.title, directorVision: chosen.directorVision, visualStyle: chosen.visualStyle,
        scenes, genre, bpm, mood, storylineSynopsis: chosen.storylineSynopsis, characterRole: chosen.characterRole,
      });
      if (!promptResult.success || !promptResult.prompt) {
        setError(promptResult.errorMessage || "Could not write the video directive.");
        setStep("scenes");
        return;
      }
      setRenderProgress("Starting the render (this takes a few minutes)...");
      const startResult = await startVideoDirectorRender(promptResult.prompt, 5, "16:9");
      if (!startResult.success || !startResult.jobId) {
        setError(startResult.errorMessage || "Could not start the render.");
        setStep("scenes");
        return;
      }
      pollVideoStatus(startResult.jobId, Date.now());
    } catch (e: any) {
      setError(e.message || "Video generation failed.");
      setStep("scenes");
      setIsBusy(false);
    }
  };

  const reset = () => {
    if (pollRef.current) clearTimeout(pollRef.current);
    setStep("input"); setConcepts([]); setChosen(null); setScenes([]); setSceneStills({});
    setError(""); setIsBusy(false); setRenderProgress("");
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-2 bg-brand-surface-2 hover:bg-brand-border/30 border border-brand-border rounded-xl px-4 py-2.5 text-[11px] font-medium text-brand-ink transition-all"
      >
        <Clapperboard className="h-4 w-4 text-brand-pink" /> AI Video Director - generate cinematic scenes from your track
        <ChevronRight className="h-3.5 w-3.5 text-brand-ink-muted" />
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 bg-brand-surface-2 border border-brand-border rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[12px] font-medium text-brand-ink">
          <Clapperboard className="h-4 w-4 text-brand-pink" /> AI Video Director
        </div>
        <div className="flex items-center gap-2">
          {step !== "input" && (
            <button onClick={reset} className="text-[10px] text-brand-ink-muted hover:text-brand-ink flex items-center gap-1">
              <RefreshCw className="h-3 w-3" /> Start over
            </button>
          )}
          <button onClick={() => setExpanded(false)} className="text-[10px] text-brand-ink-muted hover:text-brand-ink">Collapse</button>
        </div>
      </div>

      {error && <p className="text-[11px] text-red-400">{error}</p>}

      {step === "input" && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] text-brand-ink-muted">
            Describe the mood and story for "{trackTitle}" and get 3 award-style video concepts, a full storyboard, and a real generated atmosphere clip.
          </p>
          <input
            value={mood} onChange={(e) => setMood(e.target.value)} placeholder="Mood (e.g. high-energy, nostalgic, electric)"
            className="bg-brand-surface border border-brand-border focus:border-brand-pink/50 text-brand-ink px-3 py-2 text-xs rounded-lg outline-none"
          />
          <textarea
            value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
            placeholder="Track dynamics/energy (e.g. driving arpeggios building to an explosive drop)"
            className="bg-brand-surface border border-brand-border focus:border-brand-pink/50 text-brand-ink px-3 py-2 text-xs rounded-lg outline-none resize-none"
          />
          <textarea
            value={customNotes} onChange={(e) => setCustomNotes(e.target.value)} rows={2}
            placeholder="Any specific story requests? (optional)"
            className="bg-brand-surface border border-brand-border focus:border-brand-pink/50 text-brand-ink px-3 py-2 text-xs rounded-lg outline-none resize-none"
          />
          <button
            onClick={handleAnalyze} disabled={isBusy}
            className="self-start flex items-center gap-1.5 bg-brand-pink/20 hover:bg-brand-pink/30 border border-brand-pink/40 rounded-lg px-3 py-1.5 text-[11px] font-medium text-brand-ink transition-all disabled:opacity-40"
          >
            {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {isBusy ? busyLabel : "Analyze & Pitch Concepts"}
          </button>
        </div>
      )}

      {step === "concepts" && (
        <div className="flex flex-col gap-3">
          {audioAnalysis && <p className="text-[10px] text-brand-ink-muted italic line-clamp-3">{audioAnalysis}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {concepts.map((c) => (
              <button
                key={c.id} onClick={() => handleChooseConcept(c)} disabled={isBusy}
                className="text-left flex flex-col gap-1.5 bg-brand-surface border border-brand-border hover:border-brand-pink/50 rounded-lg p-3 transition-all disabled:opacity-40"
              >
                <div className="flex gap-1">
                  {c.colorPalette?.slice(0, 4).map((color, i) => (
                    <span key={i} className="h-2.5 w-2.5 rounded-full border border-brand-border" style={{ backgroundColor: color }} />
                  ))}
                </div>
                <div className="text-[11px] font-bold text-brand-ink">{c.title}</div>
                <div className="text-[9px] font-mono uppercase text-brand-pink">{c.awardCategory}</div>
                <div className="text-[10px] text-brand-ink-muted line-clamp-3">{c.storylineSynopsis}</div>
              </button>
            ))}
          </div>
          {isBusy && <p className="text-[10px] text-brand-ink-muted flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" /> {busyLabel}</p>}
        </div>
      )}

      {(step === "scenes" || step === "rendering" || step === "done") && chosen && (
        <div className="flex flex-col gap-3">
          <div className="text-[11px] font-bold text-brand-ink">{chosen.title}</div>
          <div className="flex flex-col gap-2">
            {scenes.map((scene) => (
              <div key={scene.id} className="flex gap-3 bg-brand-surface border border-brand-border rounded-lg p-3">
                <button
                  onClick={() => handlePreviewStill(scene)} disabled={stillLoadingId === scene.id}
                  className="h-16 w-28 shrink-0 rounded-md border border-dashed border-brand-border flex items-center justify-center overflow-hidden bg-brand-surface-2"
                  title="Preview a still frame"
                >
                  {stillLoadingId === scene.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-brand-ink-muted" />
                  ) : sceneStills[scene.id] ? (
                    <img src={sceneStills[scene.id]} className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-4 w-4 text-brand-ink-muted" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-brand-pink">{scene.timestamp} - {scene.storyBeat}</span>
                    <button
                      onClick={() => handleEnhanceScene(scene)} disabled={enhancingId === scene.id || step !== "scenes"}
                      className="flex items-center gap-1 text-[9px] text-brand-ink-muted hover:text-brand-ink disabled:opacity-30"
                    >
                      {enhancingId === scene.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />} Enhance
                    </button>
                  </div>
                  <p className="text-[10px] text-brand-ink mt-1 line-clamp-2">{scene.description}</p>
                  <p className="text-[9px] text-brand-ink-muted mt-0.5">{scene.cameraMove} - {scene.lighting}</p>
                </div>
              </div>
            ))}
          </div>

          {step === "scenes" && (
            <button
              onClick={handleGenerateVideo} disabled={isBusy}
              className="self-start flex items-center gap-1.5 bg-brand-pink/20 hover:bg-brand-pink/30 border border-brand-pink/40 rounded-lg px-3 py-1.5 text-[11px] font-medium text-brand-ink transition-all disabled:opacity-40"
            >
              <Film className="h-3.5 w-3.5" /> Generate Atmosphere Video
            </button>
          )}
          {step === "rendering" && (
            <p className="text-[10px] text-brand-ink-muted flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" /> {renderProgress || busyLabel}</p>
          )}
          {step === "done" && (
            <p className="text-[10px] text-brand-gold">Added to your timeline below. Combine it with an "Animate a photo" clip for the performer shot.</p>
          )}
        </div>
      )}
    </div>
  );
}
