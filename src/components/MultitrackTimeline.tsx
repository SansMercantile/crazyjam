/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Multitrack arrangement timeline: arrange named sections (Intro, Verse,
 * Chorus, Drop, Outro...) end to end, drag to reorder, click a section to
 * load it into the sequencer grid below for editing, and play through the
 * whole arrangement in order. Also hosts stem export - since each
 * instrument is already synthesized on its own track (never mixed
 * together), "extraction" is just rendering each track to its own WAV in
 * isolation, no ML source-separation model needed.
 */
import React, { useState, useRef, useEffect } from "react";
import {
  Plus,
  Copy,
  Trash2,
  GripVertical,
  Music2,
  Drum,
  Download,
  Loader2,
  ListMusic,
} from "lucide-react";
import { TrackState, SongSection } from "../types";
import { audioEngine } from "../utils/audioEngine";

interface MultitrackTimelineProps {
  tracks: TrackState[];
  tempo: number;
  isPlaying: boolean;
  onLoadSectionTracks: (tracks: TrackState[]) => void;
  addLog: (log: any) => void;
}

function cloneTracks(tracks: TrackState[]): TrackState[] {
  return JSON.parse(JSON.stringify(tracks));
}

function miniPreview(tracks: TrackState[]): boolean[] {
  // Combine all drum lanes into one 16-cell activity preview for the block.
  const drums = tracks.find((t) => t.id === "drums");
  const combined = Array(16).fill(false);
  if (drums?.drumLanes) {
    for (const lane of drums.drumLanes) {
      lane.pattern.forEach((hit, i) => {
        if (hit) combined[i] = true;
      });
    }
  }
  return combined;
}

export const MultitrackTimeline: React.FC<MultitrackTimelineProps> = ({
  tracks,
  tempo,
  isPlaying,
  onLoadSectionTracks,
  addLog,
}) => {
  const [sections, setSections] = useState<SongSection[]>([
    { id: "sec-1", name: "Main Loop", tracks: cloneTracks(tracks) },
  ]);
  const [activeSectionId, setActiveSectionId] = useState<string>("sec-1");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [playbackSectionId, setPlaybackSectionId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState("");

  const stepListenerRef = useRef<((step: number) => void) | null>(null);

  // Keep the active section's stored snapshot in sync while the user edits
  // it in the sequencer grid below (tracks prop changes on every edit).
  useEffect(() => {
    setSections((prev) =>
      prev.map((s) => (s.id === activeSectionId ? { ...s, tracks: cloneTracks(tracks) } : s))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks]);

  // Arrangement auto-advance: when playing, swap in the next section's
  // pattern each time the loop wraps back to step 0.
  useEffect(() => {
    if (!isPlaying) {
      setPlaybackSectionId(null);
      if (stepListenerRef.current) {
        audioEngine.removeStepListener(stepListenerRef.current);
        stepListenerRef.current = null;
      }
      return;
    }

    let currentIdx = sections.findIndex((s) => s.id === activeSectionId);
    if (currentIdx === -1) currentIdx = 0;
    setPlaybackSectionId(sections[currentIdx]?.id ?? null);

    const listener = (step: number) => {
      if (step !== 0) return;
      if (sections.length <= 1) return; // nothing to advance to
      currentIdx = (currentIdx + 1) % sections.length;
      const next = sections[currentIdx];
      if (next) {
        setPlaybackSectionId(next.id);
        audioEngine.updateTracks(next.tracks);
      }
    };

    stepListenerRef.current = listener;
    audioEngine.addStepListener(listener);

    return () => {
      if (stepListenerRef.current) {
        audioEngine.removeStepListener(stepListenerRef.current);
        stepListenerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, sections]);

  const selectSection = (section: SongSection) => {
    setActiveSectionId(section.id);
    onLoadSectionTracks(cloneTracks(section.tracks));
  };

  const addSection = (duplicate: boolean) => {
    const base = duplicate ? sections.find((s) => s.id === activeSectionId) : null;
    const newSection: SongSection = {
      id: `sec-${Date.now()}`,
      name: duplicate ? `${base?.name || "Section"} Copy` : `Section ${sections.length + 1}`,
      tracks: duplicate && base ? cloneTracks(base.tracks) : cloneTracks(tracks),
    };
    setSections((prev) => [...prev, newSection]);
    selectSection(newSection);
    addLog?.({
      agentName: "Arranger",
      role: "Timeline",
      avatar: "🗂️",
      message: `Added section "${newSection.name}" to the arrangement (${sections.length + 1} total).`,
      phase: "Sequence",
      status: "completed",
    });
  };

  const renameSection = (id: string, name: string) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  };

  const deleteSection = (id: string) => {
    if (sections.length === 1) return;
    const idx = sections.findIndex((s) => s.id === id);
    const remaining = sections.filter((s) => s.id !== id);
    setSections(remaining);
    if (activeSectionId === id) {
      const fallback = remaining[Math.max(0, idx - 1)];
      selectSection(fallback);
    }
  };

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    setSections((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(dragIndex, 1);
      updated.splice(index, 0, moved);
      return updated;
    });
    setDragIndex(index);
  };
  const handleDragEnd = () => setDragIndex(null);

  const handleExportStems = async () => {
    setIsExporting(true);
    setExportStatus("Rendering stems...");
    try {
      const stems = await audioEngine.exportAllStems(tracks, tempo, 4);
      const labels: Record<string, string> = { drums: "Drums", bass: "Bass", lead: "Lead", pad: "Pad" };
      for (const [trackId, blob] of Object.entries(stems)) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${labels[trackId] || trackId}-stem.wav`;
        a.click();
        URL.revokeObjectURL(url);
        await new Promise((r) => setTimeout(r, 250)); // stagger downloads
      }
      setExportStatus("4 stems downloaded (Drums, Bass, Lead, Pad).");
      addLog?.({
        agentName: "Mastering",
        role: "Export",
        avatar: "🎚️",
        message: "Exported 4 isolated instrument stems as individual WAV files.",
        phase: "Mixdown",
        status: "completed",
      });
    } catch (e: any) {
      setExportStatus(e.message || "Stem export failed.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportMix = async () => {
    setIsExporting(true);
    setExportStatus("Rendering full mix...");
    try {
      const blob = await audioEngine.exportMixWav(tracks, tempo, 4);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "crazyjam-mix.wav";
      a.click();
      URL.revokeObjectURL(url);
      setExportStatus("Full mix WAV downloaded.");
    } catch (e: any) {
      setExportStatus(e.message || "Mix export failed.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 relative overflow-hidden">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-brand-border pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-brand-gold/15 p-2 rounded-xl text-brand-gold border border-brand-gold/20">
            <ListMusic className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-mono tracking-wide text-brand-gold font-medium">Arrangement Timeline</span>
            <h2 className="font-display font-semibold text-lg uppercase text-brand-ink leading-tight">CrazyJam Studio</h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => addSection(true)}
            className="flex items-center gap-1.5 bg-brand-surface-2 hover:bg-brand-surface-2 border border-brand-border rounded-xl px-3 py-2 text-[10px] font-mono font-medium uppercase text-brand-ink transition-all"
          >
            <Copy className="h-3.5 w-3.5" /> Duplicate
          </button>
          <button
            onClick={() => addSection(false)}
            className="flex items-center gap-1.5 bg-brand-gold/15 hover:bg-brand-gold/25 border border-brand-gold/30 text-brand-gold rounded-xl px-3 py-2 text-[10px] font-mono font-medium uppercase transition-all"
          >
            <Plus className="h-3.5 w-3.5" /> Add Section
          </button>
        </div>
      </div>

      {/* Timeline strip */}
      <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
        {sections.map((section, idx) => {
          const preview = miniPreview(section.tracks);
          const isActive = section.id === activeSectionId;
          const isPlayingThis = isPlaying && playbackSectionId === section.id;
          return (
            <div
              key={section.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              onClick={() => selectSection(section)}
              className={`shrink-0 w-44 rounded-2xl border-2 p-3 cursor-pointer transition-all select-none ${
                isPlayingThis
                  ? "border-emerald-400 bg-emerald-400/10"
                  : isActive
                  ? "border-brand-gold bg-brand-gold/10"
                  : "border-brand-border bg-brand-surface-2 hover:border-brand-border"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <GripVertical className="h-3.5 w-3.5 text-brand-ink-muted cursor-grab" />
                {isPlayingThis && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                {sections.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSection(section.id); }}
                    className="text-brand-ink-muted hover:text-red-400 transition-all"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
              <input
                value={section.name}
                onChange={(e) => renameSection(section.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-transparent text-[11px] font-display font-semibold uppercase text-brand-ink outline-none mb-2 truncate"
              />
              <div className="grid gap-[2px]" style={{ gridTemplateColumns: "repeat(16, 1fr)" }}>
                {preview.map((hit, i) => (
                  <span key={i} className={`h-2.5 rounded-sm ${hit ? "bg-brand-gold" : "bg-brand-surface-2"}`} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Export controls */}
      <div className="flex flex-wrap items-center gap-2 pt-4 mt-4 border-t border-brand-border">
        <button
          onClick={handleExportStems}
          disabled={isExporting}
          className="flex items-center gap-1.5 bg-brand-surface-2 hover:bg-brand-surface-2 border border-brand-border rounded-xl px-3.5 py-2 text-[10px] font-mono font-medium uppercase text-brand-ink transition-all disabled:opacity-50"
        >
          {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Export Stems (Drums / Bass / Lead / Pad)
        </button>
        <button
          onClick={handleExportMix}
          disabled={isExporting}
          className="flex items-center gap-1.5 bg-brand-surface-2 hover:bg-brand-surface-2 border border-brand-border rounded-xl px-3.5 py-2 text-[10px] font-mono font-medium uppercase text-brand-ink transition-all disabled:opacity-50"
        >
          <Music2 className="h-3.5 w-3.5" /> Export Full Mix
        </button>
        {exportStatus && <span className="text-[10px] font-mono text-brand-gold">{exportStatus}</span>}
      </div>
      <p className="text-[9px] font-mono text-brand-ink-muted mt-2">
        Drag section cards to reorder &bull; click a card to edit it below &bull; Play cycles through the whole arrangement in order.
      </p>
    </div>
  );
};
