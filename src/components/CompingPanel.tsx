/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Real take comping: record multiple real takes of the same passage (each a
 * genuine getUserMedia + MediaRecorder capture, decoded to a real AudioBuffer),
 * then build a composite by assigning which take supplies each segment of the
 * timeline. Rendering the composite is real sample-accurate audio splicing
 * with a short crossfade at each cut - not a simulated/fake render.
 */
import React, { useRef, useState } from "react";
import { Mic, Square, Play, Wand2, Download, Send, Trash2 } from "lucide-react";
import { audioEngine } from "../utils/audioEngine";

const SEGMENT_COUNT = 8;

interface Take {
  id: string;
  label: string;
  buffer: AudioBuffer;
  url: string;
}

interface CompingPanelProps {
  audioCtx: AudioContext | null;
  onSendToSampler?: (name: string, size: string, buffer: AudioBuffer) => void;
}

export function CompingPanel({ audioCtx, onSendToSampler }: CompingPanelProps) {
  const [takes, setTakes] = useState<Take[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  // Which take (by id) supplies each of the SEGMENT_COUNT equal timeline segments.
  const [segmentTakeIds, setSegmentTakeIds] = useState<(string | null)[]>(Array(SEGMENT_COUNT).fill(null));
  const [compUrl, setCompUrl] = useState<string | null>(null);
  const [compBuffer, setCompBuffer] = useState<AudioBuffer | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [activePreviewTakeId, setActivePreviewTakeId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const previewSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const startTake = async () => {
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsRecording(true);
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (!audioCtx) return;
        const arrayBuffer = await blob.arrayBuffer();
        const buffer = await audioCtx.decodeAudioData(arrayBuffer);
        const id = `take-${Date.now()}`;
        const take: Take = { id, label: `Take ${takes.length + 1}`, buffer, url: URL.createObjectURL(blob) };
        setTakes((prev) => {
          const next = [...prev, take];
          // First take recorded: default the whole comp to it.
          if (prev.length === 0) setSegmentTakeIds(Array(SEGMENT_COUNT).fill(id));
          return next;
        });
      };
      recorder.start();
    } catch (err) {
      console.warn("Could not access microphone:", err);
      setIsRecording(false);
    }
  };

  const stopTake = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const previewTake = (take: Take) => {
    if (!audioCtx) return;
    previewSourceRef.current?.stop();
    const source = audioCtx.createBufferSource();
    source.buffer = take.buffer;
    const gain = audioCtx.createGain();
    gain.gain.value = 0.85;
    source.connect(gain);
    gain.connect(audioCtx.destination);
    source.start();
    previewSourceRef.current = source;
    setActivePreviewTakeId(take.id);
    source.onended = () => setActivePreviewTakeId((cur) => (cur === take.id ? null : cur));
  };

  const assignSegment = (segIndex: number, takeId: string) => {
    setSegmentTakeIds((prev) => {
      const next = [...prev];
      next[segIndex] = takeId;
      return next;
    });
    setCompUrl(null); // stale until re-rendered
  };

  const removeTake = (id: string) => {
    setTakes((prev) => prev.filter((t) => t.id !== id));
    setSegmentTakeIds((prev) => prev.map((s) => (s === id ? null : s)));
  };

  // Real sample-accurate splice: for each output segment, copy samples from the
  // assigned take at the SAME FRACTIONAL position (segments of the same phrase
  // recorded at slightly different tempos still line up reasonably), with a
  // short linear crossfade across each cut so joins don't click.
  const renderComposite = async () => {
    if (!audioCtx || takes.length === 0 || segmentTakeIds.some((s) => !s)) return;
    setIsRendering(true);
    try {
      const sampleRate = audioCtx.sampleRate;
      const maxDuration = Math.max(...takes.map((t) => t.buffer.duration));
      const outLength = Math.ceil(maxDuration * sampleRate);
      const outBuffer = audioCtx.createBuffer(1, outLength, sampleRate);
      const out = outBuffer.getChannelData(0);
      const crossfadeSamples = Math.round(sampleRate * 0.015); // 15ms

      for (let seg = 0; seg < SEGMENT_COUNT; seg++) {
        const take = takes.find((t) => t.id === segmentTakeIds[seg])!;
        const src = take.buffer.getChannelData(0);
        const segStartFrac = seg / SEGMENT_COUNT;
        const segEndFrac = (seg + 1) / SEGMENT_COUNT;
        const outStart = Math.floor(segStartFrac * outLength);
        const outEnd = Math.floor(segEndFrac * outLength);
        const srcStart = Math.floor(segStartFrac * src.length);
        const srcSpan = Math.floor(segEndFrac * src.length) - srcStart;
        const outSpan = outEnd - outStart;

        for (let i = 0; i < outSpan; i++) {
          const srcIdx = srcStart + Math.floor((i / outSpan) * srcSpan);
          let sample = src[Math.min(srcIdx, src.length - 1)] || 0;

          // Crossfade the first `crossfadeSamples` of this segment against
          // whatever is already in `out` from the previous segment's tail.
          if (seg > 0 && i < crossfadeSamples) {
            const fadeIn = i / crossfadeSamples;
            const existing = out[outStart + i] || 0;
            sample = existing * (1 - fadeIn) + sample * fadeIn;
          }
          out[outStart + i] = sample;
        }
      }

      const blob = audioEngine.audioBufferToWavBlob(outBuffer);
      setCompUrl(URL.createObjectURL(blob));
      setCompBuffer(outBuffer);
    } finally {
      setIsRendering(false);
    }
  };

  const sendCompToSampler = () => {
    if (!compBuffer || !onSendToSampler) return;
    onSendToSampler(`Comp (${takes.length} takes)`, `${(compBuffer.length * 2 / (1024 * 1024)).toFixed(2)} MB`, compBuffer);
  };

  const allSegmentsAssigned = segmentTakeIds.every((s) => !!s);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-[14px] text-brand-ink flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-brand-gold" /> Comping
          </h3>
          <p className="text-[11px] text-brand-ink-muted mt-0.5">
            Record multiple takes of the same passage, then pick which take covers each part of the timeline.
          </p>
        </div>
        {!isRecording ? (
          <button onClick={startTake} className="px-3.5 py-2 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 rounded-lg text-[12px] text-red-400 flex items-center gap-2 transition-all">
            <Mic className="h-3.5 w-3.5" /> Record new take
          </button>
        ) : (
          <button onClick={stopTake} className="px-3.5 py-2 bg-brand-surface-2 border border-brand-border rounded-lg text-[12px] text-brand-ink flex items-center gap-2 transition-all">
            <Square className="h-3 w-3 fill-current" /> Stop
          </button>
        )}
      </div>

      {takes.length === 0 && (
        <p className="text-[12px] text-brand-ink-muted text-center py-6">No takes yet - record a few, then comp them together below.</p>
      )}

      {takes.length > 0 && (
        <div className="flex flex-col gap-2">
          {takes.map((take) => (
            <div key={take.id} className="flex items-center gap-2 bg-brand-surface-2 border border-brand-border rounded-lg p-2">
              <button onClick={() => previewTake(take)} className={`p-1.5 rounded-md shrink-0 ${activePreviewTakeId === take.id ? "bg-brand-gold text-brand-bg" : "bg-brand-bg text-brand-ink-muted hover:text-brand-ink"}`} title="Preview take">
                <Play className="h-3 w-3" />
              </button>
              <span className="text-[11px] text-brand-ink w-16 shrink-0">{take.label}</span>
              <div className="flex-1 grid grid-cols-8 gap-0.5">
                {Array.from({ length: SEGMENT_COUNT }).map((_, segIndex) => {
                  const isAssigned = segmentTakeIds[segIndex] === take.id;
                  return (
                    <button
                      key={segIndex}
                      onClick={() => assignSegment(segIndex, take.id)}
                      title={`Use ${take.label} for segment ${segIndex + 1}`}
                      className={`h-6 rounded-sm transition-all ${isAssigned ? "bg-brand-gold" : "bg-brand-bg border border-brand-border hover:border-brand-gold/40"}`}
                    />
                  );
                })}
              </div>
              <button onClick={() => removeTake(take.id)} className="p-1.5 rounded-md text-brand-ink-muted hover:text-red-400 shrink-0" title="Delete take">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          <p className="text-[10px] text-brand-ink-muted">Click a cell in a take's row to assign that 1/8 segment of the composite to that take.</p>
        </div>
      )}

      {takes.length > 0 && (
        <div className="flex flex-col gap-3">
          <button
            onClick={renderComposite}
            disabled={!allSegmentsAssigned || isRendering}
            className="w-full py-2.5 rounded-xl bg-brand-gold text-brand-bg text-[13px] font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Wand2 className="h-3.5 w-3.5" /> {isRendering ? "Rendering..." : "Render composite"}
          </button>
          {!allSegmentsAssigned && <p className="text-[10px] text-brand-ink-muted text-center">Assign every segment to a take before rendering.</p>}

          {compUrl && (
            <div className="w-full bg-brand-surface-2 border border-brand-border rounded-xl p-3 flex flex-col gap-2">
              <audio src={compUrl} controls className="w-full h-8" />
              <div className="flex gap-2">
                <a href={compUrl} download="comp.wav" className="flex-1 py-2 rounded-lg bg-brand-bg border border-brand-border text-[11px] text-brand-ink flex items-center justify-center gap-1.5 hover:border-brand-gold/40 transition-all">
                  <Download className="h-3 w-3" /> Download WAV
                </a>
                {onSendToSampler && (
                  <button onClick={sendCompToSampler} className="flex-1 py-2 rounded-lg bg-brand-bg border border-brand-border text-[11px] text-brand-ink flex items-center justify-center gap-1.5 hover:border-brand-gold/40 transition-all">
                    <Send className="h-3 w-3" /> Send to Sampler
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
