/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Real per-track mixer: vertical faders + pan + mute/solo drive the actual
 * AudioEngine gain/pan nodes (see audioEngine.ts), and each channel's VU
 * meter reads live RMS off that track's real AnalyserNode - not a simulated
 * or randomized animation.
 */

import React, { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Headphones } from "lucide-react";
import { TrackState } from "../types";
import { audioEngine } from "../utils/audioEngine";

interface MixerPanelProps {
  tracks: TrackState[];
  onTracksUpdate: (newTracks: TrackState[]) => void;
}

export function MixerPanel({ tracks, onTracksUpdate }: MixerPanelProps) {
  const updateTrack = (trackId: string, patch: Partial<TrackState>) => {
    const updated = tracks.map((t) => (t.id === trackId ? { ...t, ...patch } : t));
    onTracksUpdate(updated);
  };

  const handleVolume = (trackId: string, val: number) => updateTrack(trackId, { volume: val });
  const handlePan = (trackId: string, val: number) => updateTrack(trackId, { pan: val });
  const handleMute = (trackId: string) => {
    const track = tracks.find((t) => t.id === trackId);
    if (track) updateTrack(trackId, { muted: !track.muted });
  };
  const handleSolo = (trackId: string) => {
    const track = tracks.find((t) => t.id === trackId);
    if (track) updateTrack(trackId, { soloed: !track.soloed });
  };

  if (tracks.length === 0) {
    return (
      <p className="text-[12px] text-brand-ink-muted text-center py-8">
        No tracks yet - add tracks in the Sequencer to see them here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-[14px] text-brand-ink flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-brand-gold" /> Mixer
        </h3>
        <p className="text-[11px] text-brand-ink-muted mt-0.5">
          Real per-track gain and pan nodes. Meters reflect actual output level, live.
        </p>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {tracks.map((track) => (
          <ChannelStrip
            key={track.id}
            track={track}
            onVolumeChange={(v) => handleVolume(track.id, v)}
            onPanChange={(v) => handlePan(track.id, v)}
            onMuteToggle={() => handleMute(track.id)}
            onSoloToggle={() => handleSolo(track.id)}
          />
        ))}
      </div>
    </div>
  );
}

function ChannelStrip({
  track,
  onVolumeChange,
  onPanChange,
  onMuteToggle,
  onSoloToggle,
}: {
  track: TrackState;
  onVolumeChange: (v: number) => void;
  onPanChange: (v: number) => void;
  onMuteToggle: () => void;
  onSoloToggle: () => void;
}) {
  const [level, setLevel] = useState(0); // 0..1 live RMS
  const [peak, setPeak] = useState(0); // slow-decaying peak hold
  const rafRef = useRef<number | null>(null);
  const peakRef = useRef(0);

  useEffect(() => {
    const analyser = audioEngine.getTrackAnalyser(track.id);
    if (!analyser) return;

    const data = new Float32Array(analyser.fftSize);

    const tick = () => {
      analyser.getFloatTimeDomainData(data);
      let sumSquares = 0;
      for (let i = 0; i < data.length; i++) sumSquares += data[i] * data[i];
      const rms = Math.sqrt(sumSquares / data.length);
      // Map RMS (roughly 0..~0.6 in practice) to a 0..1 meter height with a
      // gentle curve so low-level signal is still visible.
      const mapped = Math.min(1, Math.pow(rms * 4, 0.6));
      setLevel(mapped);

      peakRef.current = mapped > peakRef.current ? mapped : peakRef.current * 0.96;
      setPeak(peakRef.current);

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track.id]);

  const meterColor = level > 0.85 ? "bg-red-500" : level > 0.65 ? "bg-yellow-400" : "bg-brand-gold";

  return (
    <div className="flex flex-col items-center gap-2 bg-brand-surface-2 border border-brand-border rounded-xl p-3 w-[92px] shrink-0">
      <span className="text-[11px] text-brand-ink truncate w-full text-center" title={track.name}>
        {track.name}
      </span>

      {/* Pan knob */}
      <div className="flex flex-col items-center gap-1 w-full">
        <input
          type="range"
          min={-1}
          max={1}
          step={0.05}
          value={track.pan ?? 0}
          onChange={(e) => onPanChange(parseFloat(e.target.value))}
          className="w-full h-1.5 accent-brand-gold cursor-pointer"
          title={`Pan: ${(track.pan ?? 0).toFixed(2)}`}
        />
        <span className="text-[9px] text-brand-ink-muted">
          {Math.abs(track.pan ?? 0) < 0.05 ? "C" : (track.pan ?? 0) < 0 ? `L${Math.round(Math.abs(track.pan ?? 0) * 100)}` : `R${Math.round((track.pan ?? 0) * 100)}`}
        </span>
      </div>

      {/* Fader + live VU meter, side by side */}
      <div className="flex items-end gap-2 h-[140px]">
        {/* VU meter: real-time bar driven by AnalyserNode RMS */}
        <div className="relative w-3 h-full bg-brand-bg rounded-sm overflow-hidden border border-brand-border">
          <div
            className={`absolute bottom-0 left-0 w-full ${meterColor} transition-[height] duration-75`}
            style={{ height: `${level * 100}%` }}
          />
          <div
            className="absolute left-0 w-full h-[2px] bg-brand-ink/70"
            style={{ bottom: `${peak * 100}%` }}
          />
        </div>

        {/* Vertical fader */}
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={track.volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          className="h-full accent-brand-gold cursor-pointer"
          style={{ writingMode: "vertical-lr" as any, direction: "rtl" }}
          title={`Volume: ${Math.round(track.volume * 100)}%`}
        />
      </div>

      <span className="text-[10px] text-brand-ink-muted">{Math.round(track.volume * 100)}%</span>

      {/* Mute / Solo */}
      <div className="flex gap-1.5 w-full">
        <button
          onClick={onMuteToggle}
          title="Mute"
          className={`flex-1 py-1.5 rounded-md border text-[10px] font-medium transition-all flex items-center justify-center ${
            track.muted
              ? "bg-red-500/20 border-red-500/40 text-red-400"
              : "bg-brand-bg border-brand-border text-brand-ink-muted hover:text-brand-ink"
          }`}
        >
          {track.muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
        </button>
        <button
          onClick={onSoloToggle}
          title="Solo"
          className={`flex-1 py-1.5 rounded-md border text-[10px] font-medium transition-all flex items-center justify-center ${
            track.soloed
              ? "bg-brand-gold/20 border-brand-gold/50 text-brand-gold"
              : "bg-brand-bg border-brand-border text-brand-ink-muted hover:text-brand-ink"
          }`}
        >
          <Headphones className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
