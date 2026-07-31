/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Persistent bottom player bar: now-playing, transport controls, seek,
 * volume, DJ Mode (crossfade) toggle, and a slide-up queue/playlist drawer.
 * Rendered once at the App root so it survives tab navigation.
 */
import React, { useState } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, ListMusic, Radio, X, GripVertical } from "lucide-react";
import { usePlayback } from "../context/PlaybackContext";

function formatTime(t: number): string {
  if (!Number.isFinite(t) || t < 0) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PlayerBar() {
  const {
    queue, currentIndex, current, isPlaying, isLoading, currentTime, duration,
    volume, djMode, togglePlayPause, next, prev, seek, setVolume, toggleDjMode,
    removeFromQueue, playQueueAt,
  } = usePlayback();
  const [showQueue, setShowQueue] = useState(false);

  if (!current) return null; // nothing loaded yet - stay out of the way

  return (
    <>
      {showQueue && (
        <div className="fixed bottom-[76px] right-4 z-40 w-80 max-h-[60vh] overflow-y-auto rounded-xl border border-white/10 bg-[#131318] shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="text-sm font-semibold text-white flex items-center gap-2">
              <ListMusic size={16} /> Queue ({queue.length})
            </span>
            <button onClick={() => setShowQueue(false)} className="text-white/50 hover:text-white">
              <X size={16} />
            </button>
          </div>
          <div className="py-1">
            {queue.map((item, i) => (
              <div
                key={`${item.id}-${i}`}
                className={`group flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-white/5 ${
                  i === currentIndex ? "bg-amber-500/10" : ""
                }`}
                onClick={() => playQueueAt(queue, i)}
              >
                <GripVertical size={13} className="text-white/20 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className={`text-sm truncate ${i === currentIndex ? "text-amber-400" : "text-white/85"}`}>
                    {item.title}
                  </div>
                  {item.artist && <div className="text-[11px] text-white/40 truncate">{item.artist}</div>}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromQueue(i);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400 shrink-0"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
            {queue.length === 0 && <div className="px-4 py-6 text-center text-xs text-white/40">Queue is empty</div>}
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-[#0d0d12]/95 backdrop-blur-md">
        {/* Seek bar */}
        <div
          className="h-1 w-full bg-white/10 cursor-pointer group"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            seek(pct * (duration || 0));
          }}
        >
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-300 group-hover:brightness-110"
            style={{ width: duration ? `${(currentTime / duration) * 100}%` : "0%" }}
          />
        </div>

        <div className="flex items-center gap-4 px-4 py-2.5 max-w-[1600px] mx-auto">
          {/* Now playing */}
          <div className="flex items-center gap-3 min-w-0 w-56 shrink-0">
            <div className="w-10 h-10 rounded-md bg-gradient-to-br from-amber-600/40 to-purple-700/40 shrink-0 overflow-hidden">
              {current.artUrl && <img src={current.artUrl} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="min-w-0">
              <div className="text-sm text-white/90 truncate">{current.title}</div>
              {current.artist && <div className="text-xs text-white/40 truncate">{current.artist}</div>}
            </div>
          </div>

          {/* Transport */}
          <div className="flex items-center gap-3 shrink-0">
            <button onClick={prev} disabled={currentIndex <= 0} className="text-white/60 hover:text-white disabled:opacity-30">
              <SkipBack size={18} />
            </button>
            <button
              onClick={togglePlayPause}
              className="w-9 h-9 rounded-full bg-amber-400 hover:bg-amber-300 flex items-center justify-center text-black disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause size={16} />
              ) : (
                <Play size={16} className="ml-0.5" />
              )}
            </button>
            <button
              onClick={next}
              disabled={currentIndex >= queue.length - 1}
              className="text-white/60 hover:text-white disabled:opacity-30"
            >
              <SkipForward size={18} />
            </button>
          </div>

          {/* Time */}
          <div className="text-xs text-white/40 tabular-nums shrink-0 hidden sm:block">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          <div className="flex-1" />

          {/* DJ Mode */}
          <button
            onClick={toggleDjMode}
            title="DJ Mode: auto-crossfade into the next queued track"
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-colors ${
              djMode
                ? "bg-purple-500/20 border-purple-400/50 text-purple-300"
                : "border-white/10 text-white/50 hover:text-white/80"
            }`}
          >
            <Radio size={13} /> DJ Mode
          </button>

          {/* Volume */}
          <div className="hidden md:flex items-center gap-2 w-28 shrink-0">
            <Volume2 size={16} className="text-white/50 shrink-0" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full accent-amber-400"
            />
          </div>

          {/* Queue toggle */}
          <button
            onClick={() => setShowQueue((s) => !s)}
            className={`p-2 rounded-md ${showQueue ? "text-amber-400" : "text-white/50 hover:text-white"}`}
          >
            <ListMusic size={18} />
          </button>
        </div>
      </div>
    </>
  );
}
