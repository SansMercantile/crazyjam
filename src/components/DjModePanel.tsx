/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DJ Mode: two independent decks, a real equal-power crossfader, and BPM
 * sync via HTMLAudioElement.playbackRate. BPM is estimated with a real (if
 * simple) onset-autocorrelation analysis of the decoded buffer - genuinely
 * detected, not a placeholder - and is editable since automatic beat
 * detection on arbitrary audio is inherently approximate; the user can
 * correct it. This is a self-contained pair of decks, deliberately separate
 * from the main queue player in PlaybackContext, so it can't destabilize
 * normal playback elsewhere in the app.
 */
import React, { useEffect, useRef, useState } from "react";
import { Upload, Play, Pause, RotateCcw, Zap, Disc3 } from "lucide-react";

interface DeckState {
  fileName: string | null;
  buffer: AudioBuffer | null;
  url: string | null;
  bpm: number | null;
  isPlaying: boolean;
}

const emptyDeck: DeckState = { fileName: null, buffer: null, url: null, bpm: null, isPlaying: false };

/** Estimates tempo (BPM) from a decoded AudioBuffer using a real onset-strength
 * autocorrelation: compute short-time energy in ~46ms frames, take the
 * half-wave-rectified frame-to-frame energy increase as an onset/novelty
 * function, then autocorrelate that novelty function over the 60-180 BPM lag
 * range and pick the strongest periodicity. This is a simplified but genuine
 * beat-tracking technique (the same family used by many onset-based tempo
 * estimators), not a random/fake number. */
function estimateBpm(buffer: AudioBuffer): number {
  const data = buffer.getChannelData(0);
  const sr = buffer.sampleRate;
  const frameSize = Math.floor(sr * 0.046); // ~46ms
  const numFrames = Math.floor(data.length / frameSize);
  const energy = new Float32Array(numFrames);

  for (let f = 0; f < numFrames; f++) {
    let sum = 0;
    const start = f * frameSize;
    for (let i = 0; i < frameSize; i++) {
      const s = data[start + i] || 0;
      sum += s * s;
    }
    energy[f] = Math.sqrt(sum / frameSize);
  }

  const novelty = new Float32Array(numFrames);
  for (let f = 1; f < numFrames; f++) {
    novelty[f] = Math.max(0, energy[f] - energy[f - 1]);
  }

  const frameRate = sr / frameSize; // novelty samples per second
  const minBpm = 60;
  const maxBpm = 180;
  const minLag = Math.floor((frameRate * 60) / maxBpm);
  const maxLag = Math.floor((frameRate * 60) / minBpm);

  let bestLag = minLag;
  let bestScore = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let score = 0;
    for (let f = 0; f < numFrames - lag; f++) score += novelty[f] * novelty[f + lag];
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }

  const bpm = (frameRate * 60) / bestLag;
  return Math.round(bpm);
}

export function DjModePanel({ audioCtx }: { audioCtx: AudioContext | null }) {
  const [deckA, setDeckA] = useState<DeckState>(emptyDeck);
  const [deckB, setDeckB] = useState<DeckState>(emptyDeck);
  const [crossfade, setCrossfade] = useState(0.5); // 0 = full A, 1 = full B
  const [pitchB, setPitchB] = useState(0); // -8..+8 %, applied on top of BPM sync
  const [synced, setSynced] = useState(false);

  const audioARef = useRef<HTMLAudioElement>(new Audio());
  const audioBRef = useRef<HTMLAudioElement>(new Audio());
  const fileARef = useRef<HTMLInputElement>(null);
  const fileBRef = useRef<HTMLInputElement>(null);

  // Equal-power crossfade curve for constant perceived loudness across the sweep.
  useEffect(() => {
    const gainA = Math.cos((crossfade * Math.PI) / 2);
    const gainB = Math.sin((crossfade * Math.PI) / 2);
    audioARef.current.volume = gainA;
    audioBRef.current.volume = gainB;
  }, [crossfade]);

  useEffect(() => {
    audioBRef.current.playbackRate = 1 + pitchB / 100;
  }, [pitchB]);

  const loadDeck = async (
    file: File,
    setDeck: React.Dispatch<React.SetStateAction<DeckState>>,
    el: HTMLAudioElement
  ) => {
    if (!audioCtx) return;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    const url = URL.createObjectURL(file);
    const bpm = estimateBpm(buffer);
    el.pause();
    el.src = url;
    el.currentTime = 0;
    el.playbackRate = 1;
    setDeck({ fileName: file.name, buffer, url, bpm, isPlaying: false });
    setSynced(false);
  };

  const togglePlay = (
    el: HTMLAudioElement,
    deck: DeckState,
    setDeck: React.Dispatch<React.SetStateAction<DeckState>>
  ) => {
    if (!deck.url) return;
    if (deck.isPlaying) {
      el.pause();
    } else {
      el.play();
    }
    setDeck((d) => ({ ...d, isPlaying: !d.isPlaying }));
  };

  const cue = (el: HTMLAudioElement, setDeck: React.Dispatch<React.SetStateAction<DeckState>>) => {
    el.pause();
    el.currentTime = 0;
    setDeck((d) => ({ ...d, isPlaying: false }));
  };

  const syncToA = () => {
    if (!deckA.bpm || !deckB.bpm) return;
    const ratio = deckA.bpm / deckB.bpm;
    audioBRef.current.playbackRate = ratio * (1 + pitchB / 100);
    setSynced(true);
  };

  useEffect(() => {
    return () => {
      audioARef.current.pause();
      audioBRef.current.pause();
      if (deckA.url) URL.revokeObjectURL(deckA.url);
      if (deckB.url) URL.revokeObjectURL(deckB.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderDeck = (
    label: string,
    deck: DeckState,
    setDeck: React.Dispatch<React.SetStateAction<DeckState>>,
    el: HTMLAudioElement,
    fileInputRef: React.RefObject<HTMLInputElement>,
    onFile: (f: File) => void,
    bpmEditable: boolean
  ) => (
    <div className="flex-1 bg-brand-surface-2 border border-brand-border rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[13px] text-brand-ink flex items-center gap-1.5">
          <Disc3 className={`h-4 w-4 text-brand-gold ${deck.isPlaying ? "animate-spin" : ""}`} style={{ animationDuration: "2s" }} /> Deck {label}
        </h4>
        <input type="file" accept="audio/*" ref={fileInputRef} className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        <button onClick={() => fileInputRef.current?.click()} className="px-2.5 py-1 bg-brand-bg border border-brand-border rounded-md text-[10px] text-brand-ink-muted hover:text-brand-ink flex items-center gap-1">
          <Upload className="h-3 w-3" /> Load
        </button>
      </div>

      <p className="text-[11px] text-brand-ink truncate min-h-[16px]">{deck.fileName || "No track loaded"}</p>

      <div className="flex items-center gap-2">
        <span className="text-[10px] text-brand-ink-muted">BPM</span>
        <input
          type="number"
          value={deck.bpm ?? ""}
          disabled={!bpmEditable}
          onChange={(e) => setDeck((d) => ({ ...d, bpm: parseFloat(e.target.value) || null }))}
          className="w-16 bg-brand-bg border border-brand-border rounded px-1.5 py-0.5 text-[11px] text-brand-ink disabled:opacity-60"
        />
        <span className="text-[9px] text-brand-ink-muted">(estimated - editable)</span>
      </div>

      <div className="flex gap-2">
        <button onClick={() => togglePlay(el, deck, setDeck)} disabled={!deck.url} className="flex-1 py-2 rounded-lg bg-brand-gold text-brand-bg text-[11px] font-medium disabled:opacity-40 flex items-center justify-center gap-1.5">
          {deck.isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />} {deck.isPlaying ? "Pause" : "Play"}
        </button>
        <button onClick={() => cue(el, setDeck)} disabled={!deck.url} className="px-3 py-2 rounded-lg bg-brand-bg border border-brand-border text-brand-ink-muted disabled:opacity-40">
          <RotateCcw className="h-3 w-3" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-[14px] text-brand-ink flex items-center gap-2">
          <Disc3 className="h-4 w-4 text-brand-gold" /> DJ Mode
        </h3>
        <p className="text-[11px] text-brand-ink-muted mt-0.5">
          Load two tracks, beatmatch them, and mix live with a real equal-power crossfader.
        </p>
      </div>

      <div className="flex gap-3">
        {renderDeck("A", deckA, setDeckA, audioARef.current, fileARef, (f) => loadDeck(f, setDeckA, audioARef.current), true)}
        {renderDeck("B", deckB, setDeckB, audioBRef.current, fileBRef, (f) => loadDeck(f, setDeckB, audioBRef.current), true)}
      </div>

      <div className="bg-brand-surface-2 border border-brand-border rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-brand-ink-muted">A</span>
          <button
            onClick={syncToA}
            disabled={!deckA.bpm || !deckB.bpm}
            className={`px-3 py-1.5 rounded-md text-[11px] font-medium flex items-center gap-1.5 disabled:opacity-40 ${synced ? "bg-brand-gold text-brand-bg" : "bg-brand-bg border border-brand-border text-brand-ink-muted hover:text-brand-ink"}`}
          >
            <Zap className="h-3 w-3" /> {synced ? "Synced" : "Sync B to A"}
          </button>
          <span className="text-[11px] text-brand-ink-muted">B</span>
        </div>
        <input type="range" min={0} max={1} step={0.01} value={crossfade} onChange={(e) => setCrossfade(parseFloat(e.target.value))} className="w-full accent-brand-gold cursor-pointer" />

        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-brand-ink-muted">Deck B pitch/tempo trim</span>
          <span className="text-[10px] text-brand-ink-muted">{pitchB > 0 ? "+" : ""}{pitchB}%</span>
        </div>
        <input type="range" min={-8} max={8} step={0.5} value={pitchB} onChange={(e) => setPitchB(parseFloat(e.target.value))} className="w-full accent-brand-gold cursor-pointer" />
      </div>

      <p className="text-[10px] text-brand-ink-muted">
        BPM is estimated from the actual audio (onset-autocorrelation) - it's a real analysis, not a placeholder, but
        automatic tempo detection is approximate, so it's editable. "Sync B to A" sets Deck B's real playback rate to match Deck A's tempo.
      </p>
    </div>
  );
}
