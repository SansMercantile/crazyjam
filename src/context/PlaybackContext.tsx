/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Global playback engine: persistent queue + now-playing state, usable from
 * any tab (Dashboard, Discover/CrazyJamMusicTab, etc). Two <audio> elements
 * are kept under the hood so "DJ Mode" can crossfade between the current
 * and next track instead of a hard cut.
 */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { fetchTrackAudioBlob, publicReleaseAudioUrl, registerTrackPlay } from "../utils/api";
import { audioEngine } from "../utils/audioEngine";

export interface PlaybackItem {
  id: string;
  title: string;
  artist?: string;
  artUrl?: string;
  // One of these resolves the actual audio:
  audioUrl?: string;        // already-resolved URL (e.g. public release audio)
  trackId?: string;         // fetch via authenticated /api/tracks/:id/audio
  blueprint?: any;          // fallback: render on-the-fly via audioEngine if no stored audio
  tempo?: number;
}

interface PlaybackContextValue {
  queue: PlaybackItem[];
  currentIndex: number;
  current: PlaybackItem | null;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  djMode: boolean;
  playNow: (item: PlaybackItem, queueContext?: PlaybackItem[]) => void;
  playQueueAt: (items: PlaybackItem[], index: number) => void;
  addToQueue: (item: PlaybackItem) => void;
  removeFromQueue: (index: number) => void;
  togglePlayPause: () => void;
  next: () => void;
  prev: () => void;
  seek: (time: number) => void;
  setVolume: (v: number) => void;
  toggleDjMode: () => void;
}

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

const CROSSFADE_SECONDS = 4;

export function PlaybackProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<PlaybackItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [djMode, setDjMode] = useState(false);

  // Two-deck setup: `active` is index 0 or 1 into these refs, so we can
  // crossfade into the "other" element for DJ mode without re-mounting audio.
  const decks = useRef<[HTMLAudioElement, HTMLAudioElement]>([new Audio(), new Audio()]);
  const activeDeck = useRef<0 | 1>(0);
  const crossfadingRef = useRef(false);
  const objectUrlsRef = useRef<Set<string>>(new Set());

  const current = currentIndex >= 0 && currentIndex < queue.length ? queue[currentIndex] : null;

  const revokeIfBlob = (url: string | null) => {
    if (url && objectUrlsRef.current.has(url)) {
      URL.revokeObjectURL(url);
      objectUrlsRef.current.delete(url);
    }
  };

  /** Resolves a PlaybackItem to a playable URL, rendering on-the-fly for
   * blueprint-only tracks that were never saved with real audio. */
  const resolveUrl = useCallback(async (item: PlaybackItem): Promise<string> => {
    if (item.audioUrl) return item.audioUrl;
    if (item.trackId) {
      try {
        const url = await fetchTrackAudioBlob(item.trackId);
        objectUrlsRef.current.add(url);
        return url;
      } catch {
        // fall through to blueprint render
      }
    }
    if (item.blueprint?.tracks) {
      const blob = await audioEngine.exportMixWav(item.blueprint.tracks, item.tempo || 120, 4);
      const url = URL.createObjectURL(blob);
      objectUrlsRef.current.add(url);
      return url;
    }
    throw new Error("This track has no playable audio.");
  }, []);

  const loadInto = useCallback(
    async (deckIdx: 0 | 1, item: PlaybackItem) => {
      const el = decks.current[deckIdx];
      const url = await resolveUrl(item);
      el.src = url;
      el.volume = deckIdx === activeDeck.current ? volume : 0;
      return el;
    },
    [resolveUrl, volume]
  );

  const playIndex = useCallback(
    async (idx: number, items: PlaybackItem[] = queue) => {
      if (idx < 0 || idx >= items.length) return;
      setIsLoading(true);
      const item = items[idx];
      try {
        const el = await loadInto(activeDeck.current, item);
        await el.play();
        setIsPlaying(true);
        setCurrentIndex(idx);
        if (item.trackId) registerTrackPlay(item.trackId);
      } catch (err) {
        console.warn("Playback failed:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [loadInto, queue]
  );

  const playQueueAt = useCallback(
    (items: PlaybackItem[], index: number) => {
      setQueue(items);
      playIndex(index, items);
    },
    [playIndex]
  );

  const playNow = useCallback(
    (item: PlaybackItem, queueContext?: PlaybackItem[]) => {
      const items = queueContext && queueContext.length ? queueContext : [item];
      const idx = items.findIndex((i) => i.id === item.id);
      playQueueAt(items, idx >= 0 ? idx : 0);
    },
    [playQueueAt]
  );

  const addToQueue = useCallback((item: PlaybackItem) => {
    setQueue((q) => [...q, item]);
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((q) => q.filter((_, i) => i !== index));
    setCurrentIndex((ci) => (index < ci ? ci - 1 : ci));
  }, []);

  const togglePlayPause = useCallback(() => {
    const el = decks.current[activeDeck.current];
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else if (el.src) {
      el.play();
      setIsPlaying(true);
    } else if (current) {
      playIndex(currentIndex);
    }
  }, [isPlaying, current, currentIndex, playIndex]);

  const next = useCallback(() => {
    if (currentIndex + 1 < queue.length) playIndex(currentIndex + 1);
  }, [currentIndex, queue.length, playIndex]);

  const prev = useCallback(() => {
    if (currentIndex - 1 >= 0) playIndex(currentIndex - 1);
  }, [currentIndex, playIndex]);

  const seek = useCallback((time: number) => {
    const el = decks.current[activeDeck.current];
    el.currentTime = time;
    setCurrentTime(time);
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    decks.current[activeDeck.current].volume = v;
  }, []);

  const toggleDjMode = useCallback(() => setDjMode((d) => !d), []);

  // Wire up time/ended listeners on whichever deck is currently active.
  useEffect(() => {
    const el = decks.current[activeDeck.current];

    const onTimeUpdate = async () => {
      setCurrentTime(el.currentTime);
      if (el.duration && Number.isFinite(el.duration)) setDuration(el.duration);

      const remaining = el.duration - el.currentTime;
      const hasNext = currentIndex + 1 < queue.length;

      if (
        djMode &&
        hasNext &&
        !crossfadingRef.current &&
        Number.isFinite(remaining) &&
        remaining <= CROSSFADE_SECONDS &&
        remaining > 0
      ) {
        crossfadingRef.current = true;
        const otherIdx: 0 | 1 = activeDeck.current === 0 ? 1 : 0;
        const nextItem = queue[currentIndex + 1];
        try {
          const otherEl = await loadInto(otherIdx, nextItem);
          otherEl.volume = 0;
          await otherEl.play();

          const steps = 20;
          const stepMs = (CROSSFADE_SECONDS * 1000) / steps;
          for (let s = 1; s <= steps; s++) {
            await new Promise((r) => setTimeout(r, stepMs));
            const t = s / steps;
            el.volume = Math.max(0, volume * (1 - t));
            otherEl.volume = Math.min(volume, volume * t);
          }
          el.pause();
          const oldUrl = el.src;
          activeDeck.current = otherIdx;
          setCurrentIndex(currentIndex + 1);
          if (nextItem.trackId) registerTrackPlay(nextItem.trackId);
          revokeIfBlob(oldUrl);
        } finally {
          crossfadingRef.current = false;
        }
      }
    };

    const onEnded = () => {
      if (djMode) return; // crossfade already handled the transition
      if (currentIndex + 1 < queue.length) {
        playIndex(currentIndex + 1);
      } else {
        setIsPlaying(false);
      }
    };

    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("ended", onEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, queue, djMode, volume, loadInto]);

  useEffect(() => {
    return () => {
      decks.current.forEach((d) => d.pause());
      objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  return (
    <PlaybackContext.Provider
      value={{
        queue,
        currentIndex,
        current,
        isPlaying,
        isLoading,
        currentTime,
        duration,
        volume,
        djMode,
        playNow,
        playQueueAt,
        addToQueue,
        removeFromQueue,
        togglePlayPause,
        next,
        prev,
        seek,
        setVolume,
        toggleDjMode,
      }}
    >
      {children}
    </PlaybackContext.Provider>
  );
}

export function usePlayback() {
  const ctx = useContext(PlaybackContext);
  if (!ctx) throw new Error("usePlayback must be used within a PlaybackProvider");
  return ctx;
}

/** Convenience builder for a release from the Discover feed / public release page. */
export function releaseToPlaybackItem(release: any): PlaybackItem {
  return {
    id: `release-${release.id}`,
    title: release.title,
    artist: release.artistName,
    artUrl: release.albumArtImage,
    audioUrl: release.hasAudio ? publicReleaseAudioUrl(release.id) : undefined,
    blueprint: release.blueprint,
    tempo: release.blueprint?.tempo,
  };
}

/** Convenience builder for a track from the user's own library/dashboard. */
export function trackToPlaybackItem(track: any): PlaybackItem {
  return {
    id: `track-${track.id}`,
    title: track.title,
    trackId: track.hasAudio ? track.id : undefined,
    blueprint: track.blueprint,
    tempo: track.blueprint?.tempo,
  };
}
