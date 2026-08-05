/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pro Tools/Cubase-style non-destructive region editing for an uploaded
 * sample: trim, fade in/out, and gain, all applied via a real Web Audio
 * graph at playback/render time - the original decoded AudioBuffer is never
 * mutated. The waveform is drawn from the buffer's actual sample peaks, not
 * a placeholder image. "Render" bakes the edit into a brand new buffer via
 * OfflineAudioContext (still non-destructive to the source).
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Play, Square, Download, Send, RotateCcw } from "lucide-react";
import { audioEngine } from "../utils/audioEngine";

interface RegionEditorProps {
  buffer: AudioBuffer;
  fileName: string;
  audioCtx: AudioContext | null;
  onReplaceSample?: (buffer: AudioBuffer) => void;
}

const WAVEFORM_HEIGHT = 90;

export function RegionEditor({ buffer, fileName, audioCtx, onReplaceSample }: RegionEditorProps) {
  const [trimStart, setTrimStart] = useState(0); // 0..1 fraction of buffer duration
  const [trimEnd, setTrimEnd] = useState(1);
  const [fadeInMs, setFadeInMs] = useState(0);
  const [fadeOutMs, setFadeOutMs] = useState(0);
  const [gainDb, setGainDb] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [renderedUrl, setRenderedUrl] = useState<string | null>(null);
  const [renderedBuffer, setRenderedBuffer] = useState<AudioBuffer | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const dragRef = useRef<"start" | "end" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset edit state whenever a genuinely different buffer comes in.
  useEffect(() => {
    setTrimStart(0);
    setTrimEnd(1);
    setFadeInMs(0);
    setFadeOutMs(0);
    setGainDb(0);
    setRenderedUrl(null);
    setRenderedBuffer(null);
  }, [buffer]);

  // Draw the real waveform: peak-per-pixel downsampling of the actual buffer data.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;
    const width = canvas.width;
    const height = canvas.height;
    const data = buffer.getChannelData(0);
    const samplesPerPixel = Math.max(1, Math.floor(data.length / width));

    ctx2d.clearRect(0, 0, width, height);
    ctx2d.fillStyle = "rgba(212, 175, 55, 0.5)";
    for (let x = 0; x < width; x++) {
      let min = 1, max = -1;
      const start = x * samplesPerPixel;
      for (let i = 0; i < samplesPerPixel; i++) {
        const v = data[start + i] || 0;
        if (v < min) min = v;
        if (v > max) max = v;
      }
      const y1 = ((1 - max) / 2) * height;
      const y2 = ((1 - min) / 2) * height;
      ctx2d.fillRect(x, y1, 1, Math.max(1, y2 - y1));
    }
  }, [buffer]);

  const fractionFromEvent = useCallback((clientX: number): number => {
    const el = containerRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const handleHandleDown = (which: "start" | "end") => (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = which;
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const frac = fractionFromEvent(e.clientX);
      if (dragRef.current === "start") setTrimStart(Math.min(frac, trimEnd - 0.02));
      else setTrimEnd(Math.max(frac, trimStart + 0.02));
    };
    const handleUp = () => {
      dragRef.current = null;
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [fractionFromEvent, trimStart, trimEnd]);

  const gainLinear = Math.pow(10, gainDb / 20);
  const regionDuration = buffer.duration * (trimEnd - trimStart);

  const buildEnvelope = (gainNode: GainNode, ctx: BaseAudioContext, startTime: number) => {
    const fadeInSec = Math.min(fadeInMs / 1000, regionDuration / 2);
    const fadeOutSec = Math.min(fadeOutMs / 1000, regionDuration / 2);
    gainNode.gain.cancelScheduledValues(startTime);
    if (fadeInSec > 0) {
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(gainLinear, startTime + fadeInSec);
    } else {
      gainNode.gain.setValueAtTime(gainLinear, startTime);
    }
    if (fadeOutSec > 0) {
      gainNode.gain.setValueAtTime(gainLinear, startTime + regionDuration - fadeOutSec);
      gainNode.gain.linearRampToValueAtTime(0.0001, startTime + regionDuration);
    }
  };

  const playPreview = () => {
    if (!audioCtx) return;
    if (audioCtx.state === "suspended") audioCtx.resume();
    sourceRef.current?.stop();
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    const gainNode = audioCtx.createGain();
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    buildEnvelope(gainNode, audioCtx, audioCtx.currentTime);
    source.start(0, buffer.duration * trimStart, regionDuration);
    sourceRef.current = source;
    setIsPlaying(true);
    source.onended = () => setIsPlaying(false);
  };

  const stopPreview = () => {
    sourceRef.current?.stop();
    setIsPlaying(false);
  };

  const renderRegion = async () => {
    setIsRendering(true);
    try {
      const offlineCtx = new OfflineAudioContext(buffer.numberOfChannels, Math.ceil(regionDuration * buffer.sampleRate), buffer.sampleRate);
      const source = offlineCtx.createBufferSource();
      source.buffer = buffer;
      const gainNode = offlineCtx.createGain();
      source.connect(gainNode);
      gainNode.connect(offlineCtx.destination);
      buildEnvelope(gainNode, offlineCtx, 0);
      source.start(0, buffer.duration * trimStart, regionDuration);
      const rendered = await offlineCtx.startRendering();
      const blob = audioEngine.audioBufferToWavBlob(rendered);
      setRenderedUrl(URL.createObjectURL(blob));
      setRenderedBuffer(rendered);
    } finally {
      setIsRendering(false);
    }
  };

  const handleReset = () => {
    setTrimStart(0);
    setTrimEnd(1);
    setFadeInMs(0);
    setFadeOutMs(0);
    setGainDb(0);
    setRenderedUrl(null);
    setRenderedBuffer(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[14px] text-brand-ink">Region editor</h3>
          <p className="text-[11px] text-brand-ink-muted mt-0.5">
            Trim, fade, and gain - {fileName} ({regionDuration.toFixed(2)}s selected of {buffer.duration.toFixed(2)}s)
          </p>
        </div>
        <button onClick={handleReset} className="text-[10px] text-brand-ink-muted hover:text-brand-gold transition-colors flex items-center gap-1">
          <RotateCcw className="h-3 w-3" /> Reset
        </button>
      </div>

      <div
        ref={containerRef}
        className="relative bg-brand-bg border border-brand-border rounded-lg overflow-hidden select-none"
        style={{ height: WAVEFORM_HEIGHT }}
      >
        <canvas ref={canvasRef} width={800} height={WAVEFORM_HEIGHT} className="w-full h-full" />
        {/* Dimmed regions outside the trim selection */}
        <div className="absolute top-0 left-0 h-full bg-black/50" style={{ width: `${trimStart * 100}%` }} />
        <div className="absolute top-0 right-0 h-full bg-black/50" style={{ width: `${(1 - trimEnd) * 100}%` }} />
        {/* Trim handles */}
        <div
          onMouseDown={handleHandleDown("start")}
          className="absolute top-0 h-full w-1.5 bg-brand-gold cursor-ew-resize"
          style={{ left: `calc(${trimStart * 100}% - 3px)` }}
        />
        <div
          onMouseDown={handleHandleDown("end")}
          className="absolute top-0 h-full w-1.5 bg-brand-gold cursor-ew-resize"
          style={{ left: `calc(${trimEnd * 100}% - 3px)` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] text-brand-ink-muted">Fade in: {fadeInMs}ms</span>
          <input type="range" min={0} max={2000} step={10} value={fadeInMs} onChange={(e) => setFadeInMs(parseInt(e.target.value))} className="w-full accent-brand-gold cursor-pointer" />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] text-brand-ink-muted">Fade out: {fadeOutMs}ms</span>
          <input type="range" min={0} max={2000} step={10} value={fadeOutMs} onChange={(e) => setFadeOutMs(parseInt(e.target.value))} className="w-full accent-brand-gold cursor-pointer" />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] text-brand-ink-muted">Gain: {gainDb > 0 ? "+" : ""}{gainDb.toFixed(1)}dB</span>
          <input type="range" min={-24} max={12} step={0.5} value={gainDb} onChange={(e) => setGainDb(parseFloat(e.target.value))} className="w-full accent-brand-gold cursor-pointer" />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={isPlaying ? stopPreview : playPreview}
          disabled={!audioCtx}
          className="flex-1 py-2.5 rounded-xl bg-brand-surface-2 border border-brand-border hover:border-brand-gold/40 text-brand-ink text-[12px] font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-40"
        >
          {isPlaying ? <Square className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 text-brand-gold" />}
          {isPlaying ? "Stop" : "Preview edit"}
        </button>
        <button
          onClick={renderRegion}
          disabled={isRendering}
          className="flex-1 py-2.5 rounded-xl bg-brand-gold text-brand-bg text-[12px] font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isRendering ? "Rendering..." : "Render region"}
        </button>
      </div>

      {renderedUrl && (
        <div className="bg-brand-surface-2 border border-brand-border rounded-xl p-3 flex flex-col gap-2">
          <audio src={renderedUrl} controls className="w-full h-8" />
          <div className="flex gap-2">
            <a href={renderedUrl} download="region.wav" className="flex-1 py-2 rounded-lg bg-brand-bg border border-brand-border text-[11px] text-brand-ink flex items-center justify-center gap-1.5 hover:border-brand-gold/40 transition-all">
              <Download className="h-3 w-3" /> Download WAV
            </a>
            {onReplaceSample && renderedBuffer && (
              <button
                onClick={() => onReplaceSample(renderedBuffer)}
                className="flex-1 py-2 rounded-lg bg-brand-bg border border-brand-border text-[11px] text-brand-ink flex items-center justify-center gap-1.5 hover:border-brand-gold/40 transition-all"
              >
                <Send className="h-3 w-3" /> Use as sample
              </button>
            )}
          </div>
        </div>
      )}

      <p className="text-[10px] text-brand-ink-muted">
        Non-destructive: trim/fade/gain are applied live via a real Web Audio graph for preview, and baked into a
        brand new buffer on render - your original upload is never modified.
      </p>
    </div>
  );
}
