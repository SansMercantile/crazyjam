/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  Upload,
  Search,
  SlidersHorizontal,
  Scissors,
  Play,
  Square,
  Music,
  Compass,
  Disc,
  RefreshCw,
  FileAudio,
  AlertCircle,
} from "lucide-react";

interface CrazyJamStudioProps {
  tempo: number;
  scale: string;
  onTempoChange: (val: number) => void;
  onScaleChange: (val: string) => void;
  onPromptChange: (val: string) => void;
  audioCtx: AudioContext | null;
}

export function CrazyJamStudio({
  tempo,
  scale,
  onTempoChange,
  onScaleChange,
  onPromptChange,
  audioCtx
}: CrazyJamStudioProps) {
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<"recorder" | "sampler" | "mixer" | "search">("search");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReference, setSelectedReference] = useState<any>(null);

  const referenceTracks = [
    { id: "ref-1", name: "Blinding Lights", artist: "The Weeknd (Retro Synth)", bpm: 120, key: "F Minor", genre: "Synthwave", prompt: "Nostalgic 80s drums with heavy delay, driving bass line, classic sawtooth lead" },
    { id: "ref-2", name: "Ocean Eyes", artist: "Billie Eilish (Dream Pop)", bpm: 84, key: "A Major", genre: "Dream Pop", prompt: "Spacious breathing pads, slow warm sub-bass, minimalistic crisp rim shots" },
    { id: "ref-3", name: "Get Lucky", artist: "Daft Punk (Disco Groove)", bpm: 116, key: "B Minor", genre: "Disco / Funk", prompt: "Funky plucked high-pass lead synth, bouncy repeating bass, active acoustic cymbals" },
    { id: "ref-4", name: "Rumble", artist: "Fred Again.. & Skrillex (Grid Dub)", bpm: 140, key: "D Minor", genre: "Dubstep / Bass", prompt: "Heavy distorted sub-bass rumble, rapid clicking percussion matrix, transient pluck sweeps" },
    { id: "ref-5", name: "Strobe", artist: "deadmau5 (Progressive Electro)", bpm: 128, key: "A# Minor", genre: "Progressive House", prompt: "Long silky filter sweep pads, slow building rhythmic pluck lead, club kicker beat" }
  ];

  const filteredReferences = referenceTracks.filter(track =>
    track.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    track.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
    track.genre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSyncReference = (track: any) => {
    setSelectedReference(track);
    onTempoChange(track.bpm);
    onScaleChange(track.key);
    onPromptChange(track.prompt);
  };

  // --- Sampler: real upload + real decode + real playback of the actual buffer ---
  const [uploadedSample, setUploadedSample] = useState<{ name: string; size: string; buffer: AudioBuffer | null } | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const handleAudioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !audioCtx) return;
    setIsDecoding(true);
    setUploadedSample({ name: file.name, size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`, buffer: null });
    try {
      const arrayBuffer = await file.arrayBuffer();
      const decoded = await audioCtx.decodeAudioData(arrayBuffer);
      setUploadedSample({ name: file.name, size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`, buffer: decoded });
    } catch (e) {
      console.error("Could not decode audio file:", e);
    } finally {
      setIsDecoding(false);
    }
  };

  const playUploadedSlice = (startFraction: number, endFraction: number) => {
    if (!audioCtx || !uploadedSample?.buffer) return;
    if (audioCtx.state === "suspended") audioCtx.resume();
    activeSourceRef.current?.stop();
    const source = audioCtx.createBufferSource();
    source.buffer = uploadedSample.buffer;
    const gain = audioCtx.createGain();
    gain.gain.value = 0.8;
    source.connect(gain);
    gain.connect(audioCtx.destination);
    const duration = uploadedSample.buffer.duration;
    const offset = duration * startFraction;
    const playLength = duration * (endFraction - startFraction);
    source.start(0, offset, playLength);
    activeSourceRef.current = source;
  };

  const SLICES = [
    { id: 1, start: 0, end: 0.25 },
    { id: 2, start: 0.25, end: 0.5 },
    { id: 3, start: 0.5, end: 0.75 },
    { id: 4, start: 0.75, end: 1 },
  ];

  // --- Recorder: real getUserMedia/MediaRecorder capture ---
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    setRecordedAudioUrl(null);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsRecording(true);
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setRecordedAudioUrl(URL.createObjectURL(audioBlob));
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorder.start();
    } catch (err) {
      console.warn("Could not access microphone:", err);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  return (
    <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 flex flex-col gap-5 mt-6" id="crazyjam-studio-rack">
      <div className="flex flex-wrap items-center justify-between border-b border-brand-border pb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 flex items-center justify-center bg-brand-gold/10 rounded-lg border border-brand-gold/25">
            <Disc className="h-4.5 w-4.5 text-brand-gold" />
          </div>
          <div>
            <h2 className="font-display text-[15px] text-brand-ink">CrazyJam Studio</h2>
            <p className="text-[11px] text-brand-ink-muted">Voice recorder, sample slicer, and reference sync</p>
          </div>
        </div>

        <div className="flex items-center bg-brand-bg border border-brand-border p-1 rounded-lg">
          <button onClick={() => setActiveWorkspaceTab("recorder")} className={`px-3.5 py-1.5 rounded-md text-[12px] font-medium transition-all ${activeWorkspaceTab === "recorder" ? "bg-brand-gold text-brand-bg" : "text-brand-ink-muted hover:text-brand-ink"}`}>
            <Mic className="h-3.5 w-3.5 inline mr-1.5" /> Recorder
          </button>
          <button onClick={() => setActiveWorkspaceTab("sampler")} className={`px-3.5 py-1.5 rounded-md text-[12px] font-medium transition-all ${activeWorkspaceTab === "sampler" ? "bg-brand-gold text-brand-bg" : "text-brand-ink-muted hover:text-brand-ink"}`}>
            <Scissors className="h-3.5 w-3.5 inline mr-1.5" /> Sampler
          </button>
          <button onClick={() => setActiveWorkspaceTab("search")} className={`px-3.5 py-1.5 rounded-md text-[12px] font-medium transition-all ${activeWorkspaceTab === "search" ? "bg-brand-gold text-brand-bg" : "text-brand-ink-muted hover:text-brand-ink"}`}>
            <Compass className="h-3.5 w-3.5 inline mr-1.5" /> Reference sync
          </button>
        </div>
      </div>

      <div className="bg-brand-bg/50 rounded-xl border border-brand-border p-5">
        {/* RECORDER - genuinely functional (real mic capture) */}
        {activeWorkspaceTab === "recorder" && (
          <div className="flex flex-col items-center gap-4 max-w-md mx-auto text-center py-4">
            <div className={`p-5 rounded-full transition-all border ${isRecording ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-brand-surface-2 border-brand-border text-brand-ink-muted"}`}>
              <Mic className={`h-8 w-8 ${isRecording ? "animate-pulse" : ""}`} />
            </div>
            <div>
              <h4 className="text-[14px] text-brand-ink">{isRecording ? "Recording..." : "Microphone idle"}</h4>
              <p className="text-[11px] text-brand-ink-muted mt-1">Captures real audio from your microphone.</p>
            </div>
            <div className="w-full">
              {!isRecording ? (
                <button onClick={startRecording} className="w-full py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-[13px] font-medium transition-all flex items-center justify-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500" /> Start recording
                </button>
              ) : (
                <button onClick={stopRecording} className="w-full py-2.5 rounded-xl bg-brand-surface-2 border border-brand-border text-brand-ink text-[13px] font-medium transition-all flex items-center justify-center gap-2">
                  <Square className="h-3 w-3 fill-current" /> Stop
                </button>
              )}
            </div>
            {recordedAudioUrl && (
              <div className="w-full bg-brand-surface-2 border border-brand-border rounded-xl p-3">
                <audio src={recordedAudioUrl} controls className="w-full h-8" />
              </div>
            )}
            <div className="w-full bg-brand-surface-2 border border-brand-border rounded-lg p-3 flex gap-2 items-start text-left">
              <AlertCircle className="h-3.5 w-3.5 text-brand-ink-muted shrink-0 mt-0.5" />
              <p className="text-[11px] text-brand-ink-muted leading-relaxed">
                Real-time pitch analysis and autotune-style pitch correction aren't built yet - that needs real
                pitch-detection DSP, which is a separate piece of work. Recording and playback above are genuine.
              </p>
            </div>
          </div>
        )}

        {/* SAMPLER - real upload/decode, and playback now actually plays your file */}
        {activeWorkspaceTab === "sampler" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-[14px] text-brand-ink flex items-center gap-2"><Scissors className="h-4 w-4 text-brand-gold" /> Sample slicer</h3>
                <p className="text-[11px] text-brand-ink-muted mt-0.5">Upload an audio file, then trigger quarter-length slices of it.</p>
              </div>
              <div>
                <input type="file" accept="audio/*" onChange={handleAudioUpload} ref={fileInputRef} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="px-3.5 py-2 bg-brand-surface-2 border border-brand-border hover:border-brand-gold/40 rounded-lg text-[12px] text-brand-ink flex items-center gap-2 transition-all">
                  <Upload className="h-3.5 w-3.5 text-brand-gold" /> {uploadedSample ? "Re-upload" : "Upload sample"}
                </button>
              </div>
            </div>

            <div className="bg-brand-surface-2 rounded-xl p-4 border border-brand-border relative">
              {isDecoding && (
                <div className="absolute inset-0 bg-brand-surface-2/95 flex items-center justify-center gap-2 rounded-xl z-10">
                  <RefreshCw className="h-4 w-4 text-brand-gold animate-spin" />
                  <span className="text-[12px] text-brand-ink">Decoding...</span>
                </div>
              )}

              {!uploadedSample ? (
                <p className="text-[12px] text-brand-ink-muted text-center py-6">No sample uploaded yet.</p>
              ) : (
                <>
                  <p className="text-[12px] text-brand-ink truncate mb-3">{uploadedSample.name} <span className="text-brand-ink-muted">({uploadedSample.size})</span></p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {SLICES.map((sl) => (
                      <button
                        key={sl.id}
                        onClick={() => playUploadedSlice(sl.start, sl.end)}
                        disabled={!uploadedSample.buffer}
                        className="py-4 rounded-lg bg-brand-surface border border-brand-border hover:border-brand-gold/40 transition-all flex flex-col items-center gap-1.5 disabled:opacity-40"
                      >
                        <Play className="h-4 w-4 text-brand-gold" />
                        <span className="text-[11px] text-brand-ink">Slice {sl.id}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* REFERENCE SYNC - genuinely functional: sets real tempo/scale/prompt */}
        {activeWorkspaceTab === "search" && (
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-[14px] text-brand-ink flex items-center gap-2"><Compass className="h-4 w-4 text-brand-gold" /> Reference sync</h3>
              <p className="text-[11px] text-brand-ink-muted mt-0.5">
                Pick a reference track's vibe to instantly set your studio's tempo, scale, and prompt seed.
              </p>
            </div>

            <div className="relative">
              <Search className="h-4 w-4 text-brand-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, artist, or genre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-brand-surface-2 border border-brand-border focus:border-brand-gold/50 text-brand-ink placeholder-brand-ink-muted pl-10 pr-4 py-2.5 rounded-lg outline-none text-sm transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredReferences.map((track) => {
                const isSelected = selectedReference?.id === track.id;
                return (
                  <div key={track.id} className={`p-4 bg-brand-surface-2 rounded-xl border transition-all flex flex-col gap-3 ${isSelected ? "border-brand-gold" : "border-brand-border"}`}>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 bg-brand-surface border border-brand-border text-brand-gold flex items-center justify-center rounded-lg shrink-0">
                        <Music className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[13px] text-brand-ink truncate">{track.name}</h4>
                        <p className="text-[11px] text-brand-ink-muted truncate">{track.artist}</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-brand-ink-muted italic leading-relaxed">{track.prompt}</p>
                    <div className="flex items-center justify-between pt-2 border-t border-brand-border">
                      <div className="flex gap-3 text-[11px] text-brand-ink-muted">
                        <span>{track.bpm} BPM</span>
                        <span>{track.key}</span>
                      </div>
                      <button
                        onClick={() => handleSyncReference(track)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1.5 ${isSelected ? "bg-brand-gold text-brand-bg" : "bg-brand-gold/15 hover:bg-brand-gold/25 text-brand-gold"}`}
                      >
                        <RefreshCw className="h-3 w-3" /> {isSelected ? "Synced" : "Sync"}
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredReferences.length === 0 && (
                <div className="col-span-full py-8 text-center flex flex-col items-center gap-2">
                  <FileAudio className="h-6 w-6 text-brand-ink-muted" />
                  <span className="text-[12px] text-brand-ink-muted">No matches found.</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
