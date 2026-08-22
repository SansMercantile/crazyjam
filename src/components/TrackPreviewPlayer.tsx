/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Compact inline track preview player - play/pause, seek, elapsed/duration,
 * volume - for use inside creation tools (Music Video Creator, Album Art
 * Studio) so users can listen to the actual composition while editing,
 * without leaving the tool or touching the global queue/PlayerBar. Renders
 * a real offline mix via audioEngine.exportMixWav the first time it's
 * played, then caches the blob URL for scrubbing.
 */
import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, Loader2 } from "lucide-react";
import { TrackState } from "../types";
import { audioEngine } from "../utils/audioEngine";

function formatTime(t: number): string {
  if (!Number.isFinite(t) || t < 0) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface TrackPreviewPlayerProps {
  tracks: TrackState[];
  tempo: number;
  loops?: number;
  label?: string;
  className?: string;
}

export function TrackPreviewPlayer({ tracks, tempo, loops = 2, label, className = "" }: TrackPreviewPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Composition changed under us - drop the stale render so the next
    // play renders fresh instead of previewing outdated audio.
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks, tempo]);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      audioRef.current?.pause();
    };
  }, []);

  const ensureLoaded = async (): Promise<HTMLAudioElement | null> => {
    if (audioRef.current && urlRef.current) return audioRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const blob = await audioEngine.exportMixWav(tracks, tempo, loops);
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const el = audioRef.current || new Audio();
      el.src = url;
      el.volume = volume;
      el.addEventListener("timeupdate", () => setCurrentTime(el.currentTime));
      el.addEventListener("loadedmetadata", () => setDuration(el.duration));
      el.addEventListener("ended", () => setIsPlaying(false));
      audioRef.current = el;
      return el;
    } catch (e: any) {
      setError(e?.message || "Could not render preview audio.");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayPause = async () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }
    const el = await ensureLoaded();
    if (!el) return;
    await el.play();
    setIsPlaying(true);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = pct * duration;
    setCurrentTime(pct * duration);
  };

  const handleVolume = (v: number) => {
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  };

  const hasNotes = tracks.some(
    (t) => (t.melodyNotes && t.melodyNotes.length) || (t.drumLanes || []).some((l) => l.pattern.some(Boolean))
  );

  return (
    <div className={`flex items-center gap-3 bg-brand-surface-2 border border-brand-border rounded-xl px-4 py-2.5 ${className}`}>
      <button
        onClick={togglePlayPause}
        disabled={isLoading || !hasNotes}
        title={!hasNotes ? "Compose a track first" : isPlaying ? "Pause" : "Play preview"}
        className="h-9 w-9 shrink-0 rounded-full bg-brand-gold hover:brightness-110 flex items-center justify-center text-brand-bg disabled:opacity-30 transition-all"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isPlaying ? (
          <Pause className="h-3.5 w-3.5 fill-current" />
        ) : (
          <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        {label && <div className="text-[10px] text-brand-ink-muted truncate mb-0.5">{label}</div>}
        <div
          className="h-1.5 w-full bg-brand-border rounded-full cursor-pointer group relative"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-brand-gold rounded-full group-hover:brightness-110"
            style={{ width: duration ? `${(currentTime / duration) * 100}%` : "0%" }}
          />
        </div>
        {error && <div className="text-[10px] text-red-400 mt-1">{error}</div>}
      </div>

      <div className="text-[10px] text-brand-ink-muted tabular-nums shrink-0 hidden sm:block">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>

      <div className="hidden md:flex items-center gap-1.5 w-20 shrink-0">
        <Volume2 className="h-3.5 w-3.5 text-brand-ink-muted shrink-0" />
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => handleVolume(Number(e.target.value))}
          className="w-full h-1 accent-brand-gold"
        />
      </div>
    </div>
  );
}
