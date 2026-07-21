/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Music Video Creator: arrange uploaded images/video clips on a simple
 * timeline, add a caption overlay (defaults to the track title / lyrics),
 * and render a real video file client-side - Canvas compositing +
 * MediaRecorder, muxed with the actual track audio rendered by the audio
 * engine. No server-side video generation model involved; this is genuine
 * compositing of what you provide, not text-to-video generation.
 */
import React, { useState, useRef } from "react";
import {
  Film,
  ImagePlus,
  Video as VideoIcon,
  Trash2,
  ArrowUp,
  ArrowDown,
  Loader2,
  Download,
  Save,
  Type,
  Clock,
} from "lucide-react";
import { TrackState } from "../types";
import { audioEngine } from "../utils/audioEngine";
import { saveVideo } from "../utils/api";

interface Clip {
  id: string;
  type: "image" | "video";
  src: string; // object URL
  file: File;
  durationSec: number; // for images; ignored for video (uses natural length, capped)
}

interface MusicVideoCreatorProps {
  tracks: TrackState[];
  tempo: number;
  trackTitle: string;
  lyrics?: string;
  addLog?: (log: any) => void;
  onVideoSaved?: (videoId: string) => void;
}

const CANVAS_W = 1280;
const CANVAS_H = 720;

export const MusicVideoCreator: React.FC<MusicVideoCreatorProps> = ({ tracks, tempo, trackTitle, lyrics, addLog, onVideoSaved }) => {
  const [clips, setClips] = useState<Clip[]>([]);
  const [caption, setCaption] = useState(trackTitle || "");
  const [showCaption, setShowCaption] = useState(true);
  const [loopCount, setLoopCount] = useState(2);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState("");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const addFiles = (files: FileList | null, type: "image" | "video") => {
    if (!files) return;
    const newClips: Clip[] = Array.from(files).map((file) => ({
      id: `clip-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      src: URL.createObjectURL(file),
      file,
      durationSec: type === "image" ? 4 : 6,
    }));
    setClips((prev) => [...prev, ...newClips]);
  };

  const removeClip = (id: string) => setClips((prev) => prev.filter((c) => c.id !== id));
  const moveClip = (id: string, dir: -1 | 1) => {
    setClips((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const updated = [...prev];
      [updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]];
      return updated;
    });
  };
  const updateDuration = (id: string, sec: number) => {
    setClips((prev) => prev.map((c) => (c.id === id ? { ...c, durationSec: Math.max(1, sec) } : c)));
  };

  const totalDuration = clips.reduce((sum, c) => sum + c.durationSec, 0);

  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  const drawCover = (ctx: CanvasRenderingContext2D, media: HTMLImageElement | HTMLVideoElement, w: number, h: number) => {
    const mediaW = media instanceof HTMLVideoElement ? media.videoWidth : media.width;
    const mediaH = media instanceof HTMLVideoElement ? media.videoHeight : media.height;
    const scale = Math.max(w / mediaW, h / mediaH);
    const sw = w / scale;
    const sh = h / scale;
    const sx = (mediaW - sw) / 2;
    const sy = (mediaH - sh) / 2;
    ctx.drawImage(media as any, sx, sy, sw, sh, 0, 0, w, h);
  };

  const handleRender = async () => {
    if (clips.length === 0) {
      setRenderProgress("Add at least one image or video clip first.");
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsRendering(true);
    setResultUrl(null);
    setResultBlob(null);
    setRenderProgress("Rendering audio mix...");

    try {
      // 1. Render the actual track audio (looped to roughly cover the video length)
      const audioLoops = Math.max(loopCount, Math.ceil(totalDuration / (16 * (60 / tempo / 4 * 16))) || loopCount);
      const audioBlob = await audioEngine.exportMixWav(tracks, tempo, loopCount);
      const audioArrayBuffer = await audioBlob.arrayBuffer();
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const decodeCtx = new AudioCtxClass();
      const audioBuffer = await decodeCtx.decodeAudioData(audioArrayBuffer);

      // 2. Set up an audio graph that feeds a MediaStreamDestination
      const streamDest = decodeCtx.createMediaStreamDestination();
      const source = decodeCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(streamDest);

      // 3. Combine canvas video stream + audio stream
      setRenderProgress("Preparing video canvas...");
      const videoStream = (canvas as any).captureStream(30) as MediaStream;
      const combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...streamDest.stream.getAudioTracks(),
      ]);

      const mimeCandidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
      const supportedMime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || "video/webm";

      const recorder = new MediaRecorder(combinedStream, { mimeType: supportedMime, videoBitsPerSecond: 3_000_000 });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      const recordingDone = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: supportedMime }));
      });

      recorder.start();
      source.start();

      // 4. Draw each clip in sequence for its allotted duration
      setRenderProgress("Compositing clips...");
      const videoDuration = Math.min(totalDuration, audioBuffer.duration); // don't run video longer than the audio bed
      let elapsed = 0;
      const startTime = performance.now();

      for (const clip of clips) {
        if (elapsed >= videoDuration) break;
        const clipDur = Math.min(clip.durationSec, videoDuration - elapsed);

        if (clip.type === "image") {
          const img = await loadImage(clip.src);
          const frameStart = performance.now();
          while (performance.now() - frameStart < clipDur * 1000) {
            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
            drawCover(ctx, img, CANVAS_W, CANVAS_H);
            if (showCaption && caption) drawCaption(ctx, caption);
            await new Promise((r) => requestAnimationFrame(r));
          }
        } else {
          const videoEl = document.createElement("video");
          videoEl.src = clip.src;
          videoEl.muted = true;
          videoEl.playsInline = true;
          await new Promise((resolve) => { videoEl.onloadedmetadata = resolve; });
          await videoEl.play();
          const frameStart = performance.now();
          while (performance.now() - frameStart < clipDur * 1000) {
            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
            if (videoEl.readyState >= 2) drawCover(ctx, videoEl, CANVAS_W, CANVAS_H);
            if (showCaption && caption) drawCaption(ctx, caption);
            await new Promise((r) => requestAnimationFrame(r));
          }
          videoEl.pause();
        }
        elapsed += clipDur;
        setRenderProgress(`Compositing... ${Math.round((elapsed / videoDuration) * 100)}%`);
      }

      // Hold last frame until audio finishes if clips ran out early
      while (performance.now() - startTime < audioBuffer.duration * 1000) {
        await new Promise((r) => requestAnimationFrame(r));
      }

      recorder.stop();
      source.stop();
      const finalBlob = await recordingDone;
      const url = URL.createObjectURL(finalBlob);
      setResultBlob(finalBlob);
      setResultUrl(url);
      setRenderProgress("Done.");
      addLog?.({
        agentName: "Video Director",
        role: "Music Video",
        avatar: "🎬",
        message: `Rendered a ${Math.round(audioBuffer.duration)}s music video from ${clips.length} clip(s).`,
        phase: "System",
        status: "completed",
      });
    } catch (e: any) {
      setRenderProgress(e.message || "Render failed - your browser may not support MediaRecorder with audio capture.");
    } finally {
      setIsRendering(false);
    }
  };

  const drawCaption = (ctx: CanvasRenderingContext2D, text: string) => {
    ctx.save();
    ctx.font = "600 42px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, CANVAS_H - 110, CANVAS_W, 110);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(text, CANVAS_W / 2, CANVAS_H - 45, CANVAS_W - 80);
    ctx.restore();
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `${(trackTitle || "crazyjam-video").replace(/[^a-z0-9]+/gi, "_")}.webm`;
    a.click();
  };

  const handleSave = async () => {
    if (!resultBlob) return;
    setIsSaving(true);
    setSaveStatus("");
    try {
      const arrayBuffer = await resultBlob.arrayBuffer();
      const base64 = btoa(new Uint8Array(arrayBuffer).reduce((s, b) => s + String.fromCharCode(b), ""));
      const clipMeta = clips.map((c) => ({ type: c.type, durationSec: c.durationSec }));
      const video = await saveVideo(trackTitle || "Untitled Video", clipMeta, base64, resultBlob.type);
      setSaveStatus("Saved to your library.");
      onVideoSaved?.(video.id);
    } catch (e: any) {
      setSaveStatus(e.message || "Save failed (video may be too large - try fewer/shorter clips).");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 flex flex-col gap-5">
      <canvas ref={canvasRef} className="hidden" />

      <div className="flex items-center gap-2.5 text-brand-gold border-b border-brand-border pb-4">
        <Film className="h-5 w-5" />
        <div>
          <h2 className="font-display text-lg text-brand-ink">Music Video Creator</h2>
          <p className="text-[11px] text-brand-ink-muted">Composite your images/clips with the real track audio into a downloadable video.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => imageInputRef.current?.click()}
          className="flex items-center gap-1.5 bg-brand-surface-2 hover:bg-brand-border/30 border border-brand-border rounded-lg px-3 py-2 text-[12px] font-medium text-brand-ink transition-all"
        >
          <ImagePlus className="h-3.5 w-3.5" /> Add Images
        </button>
        <button
          onClick={() => videoInputRef.current?.click()}
          className="flex items-center gap-1.5 bg-brand-surface-2 hover:bg-brand-border/30 border border-brand-border rounded-lg px-3 py-2 text-[12px] font-medium text-brand-ink transition-all"
        >
          <VideoIcon className="h-3.5 w-3.5" /> Add Video Clips
        </button>
        <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files, "image")} />
        <input ref={videoInputRef} type="file" accept="video/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files, "video")} />
      </div>

      {/* Clip list / timeline */}
      {clips.length > 0 && (
        <div className="flex flex-col gap-2">
          {clips.map((clip, idx) => (
            <div key={clip.id} className="flex items-center gap-3 bg-brand-surface-2 border border-brand-border rounded-lg p-2">
              {clip.type === "image" ? (
                <img src={clip.src} className="h-12 w-12 object-cover rounded" />
              ) : (
                <video src={clip.src} className="h-12 w-12 object-cover rounded" muted />
              )}
              <span className="text-[11px] text-brand-ink-muted flex-1 truncate">{clip.file.name}</span>
              {clip.type === "image" && (
                <div className="flex items-center gap-1 text-[10px] text-brand-ink-muted">
                  <Clock className="h-3 w-3" />
                  <input
                    type="number"
                    min={1}
                    value={clip.durationSec}
                    onChange={(e) => updateDuration(clip.id, Number(e.target.value))}
                    className="w-10 bg-brand-surface border border-brand-border rounded px-1 py-0.5 text-brand-ink text-center"
                  />
                  s
                </div>
              )}
              <button onClick={() => moveClip(clip.id, -1)} disabled={idx === 0} className="text-brand-ink-muted hover:text-brand-gold disabled:opacity-20"><ArrowUp className="h-3.5 w-3.5" /></button>
              <button onClick={() => moveClip(clip.id, 1)} disabled={idx === clips.length - 1} className="text-brand-ink-muted hover:text-brand-gold disabled:opacity-20"><ArrowDown className="h-3.5 w-3.5" /></button>
              <button onClick={() => removeClip(clip.id)} className="text-brand-ink-muted hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      )}

      {/* Caption + settings */}
      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-medium text-brand-ink-muted flex items-center gap-1.5">
          <Type className="h-3 w-3" /> Caption overlay
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="flex-1 bg-brand-surface-2 border border-brand-border focus:border-brand-gold/50 text-brand-ink px-3 py-2 text-sm rounded-lg outline-none"
            placeholder="Track title or a lyric line"
          />
          <label className="flex items-center gap-1.5 text-[11px] text-brand-ink-muted whitespace-nowrap">
            <input type="checkbox" checked={showCaption} onChange={(e) => setShowCaption(e.target.checked)} className="accent-brand-gold" />
            Show
          </label>
        </div>
        {lyrics && (
          <button onClick={() => setCaption(lyrics.split("\n").find((l) => l.trim() && !l.startsWith("[")) || trackTitle)} className="text-[10px] text-brand-gold self-start">
            Use a line from lyrics instead
          </button>
        )}
      </div>

      <button
        onClick={handleRender}
        disabled={isRendering || clips.length === 0}
        className="w-full h-11 flex items-center justify-center gap-2 metal-gold rounded-xl font-semibold text-sm transition-all disabled:opacity-40"
      >
        {isRendering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
        {isRendering ? "Rendering..." : "Render Video"}
      </button>
      {renderProgress && <p className="text-[11px] text-brand-ink-muted text-center">{renderProgress}</p>}

      {resultUrl && (
        <div className="flex flex-col gap-3 pt-3 border-t border-brand-border">
          <video src={resultUrl} controls className="w-full rounded-lg border border-brand-border" />
          <div className="flex gap-2">
            <button onClick={handleDownload} className="flex-1 flex items-center justify-center gap-2 bg-brand-surface-2 hover:bg-brand-border/30 border border-brand-border rounded-lg py-2.5 text-[12px] font-medium text-brand-ink transition-all">
              <Download className="h-3.5 w-3.5" /> Download
            </button>
            <button onClick={handleSave} disabled={isSaving} className="flex-1 flex items-center justify-center gap-2 metal-gold rounded-lg py-2.5 text-[12px] font-semibold transition-all disabled:opacity-50">
              <Save className="h-3.5 w-3.5" /> {isSaving ? "Saving..." : "Save to Library"}
            </button>
          </div>
          {saveStatus && <p className="text-[11px] text-brand-gold text-center">{saveStatus}</p>}
        </div>
      )}
    </div>
  );
};
