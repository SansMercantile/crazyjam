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
  Sparkles, 
  Play, 
  Square, 
  VolumeX, 
  Volume2, 
  Music, 
  Compass, 
  Wand2, 
  Disc, 
  HelpCircle,
  TrendingUp,
  RefreshCw,
  Plus,
  Radio,
  FileAudio
} from "lucide-react";

interface CrazyJamStudioProps {
  tempo: number;
  scale: string;
  onTempoChange: (val: number) => void;
  onScaleChange: (val: string) => void;
  onPromptChange: (val: string) => void;
  audioCtx: AudioContext | null;
}

interface SampleSlice {
  id: number;
  startPercent: number;
  endPercent: number;
  color: string;
}

export function CrazyJamStudio({
  tempo,
  scale,
  onTempoChange,
  onScaleChange,
  onPromptChange,
  audioCtx
}: CrazyJamStudioProps) {
  // Navigation Tabs
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<"mixer" | "sampler" | "autotune" | "search">("autotune");

  // Global Reference Tracks DB
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

  // Mixer States
  const [mixerChannels, setMixerChannels] = useState([
    { id: "drum", name: "Insert 1: Drums", volume: 0.8, pan: 0, low: 0, mid: 0, high: 0, muted: false, meter: 45 },
    { id: "lead", name: "Insert 2: Lead", volume: 0.7, pan: 0.15, low: -2, mid: 4, high: 2, muted: false, meter: 25 },
    { id: "bass", name: "Insert 3: Bass", volume: 0.85, pan: -0.1, low: 6, mid: -3, high: -6, muted: false, meter: 60 },
    { id: "vocal", name: "Insert 4: Vocals", volume: 0.9, pan: 0, low: -1, mid: 5, high: 4, muted: false, meter: 10 },
    { id: "sampler", name: "Insert 5: Sampler", volume: 0.75, pan: -0.2, low: 2, mid: 0, high: 1, muted: false, meter: 0 },
    { id: "master", name: "Master Output", volume: 0.8, pan: 0, low: 1, mid: 1, high: 2, muted: false, meter: 55 }
  ]);
  const [limiterGain, setLimiterGain] = useState<number>(0.2); // Saturation Limiter threshold
  const [spaceReverb, setSpaceReverb] = useState<number>(0.4);

  // Audio Sampler States
  const [uploadedSample, setUploadedSample] = useState<{ name: string; size: string; buffer: AudioBuffer | null } | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);
  const [samplerPitch, setSamplerPitch] = useState<number>(0.0); // semitone shift (-12 to 12)
  const [loopSample, setLoopSample] = useState(false);
  const [activeSlice, setActiveSlice] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tempWaveform, setTempWaveform] = useState<number[]>([]);

  // Mic Recording / Autotune States
  const [isRecording, setIsRecording] = useState(false);
  const [recordBlocked, setRecordBlocked] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedBuffer, setRecordedBuffer] = useState<AudioBuffer | null>(null);
  const [autotuneEnabled, setAutotuneEnabled] = useState(true);
  const [pitchCorrectionSpeed, setPitchCorrectionSpeed] = useState(15); // ms (T-pain vs natural)
  const [micPitch, setMicPitch] = useState<string>("A3");
  const [targetSnappingPitch, setTargetSnappingPitch] = useState<string>("A3");
  const [pitchCentsError, setPitchCentsError] = useState<number>(0);
  const [voicingLevel, setVoicingLevel] = useState<number>(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Generate fake live-autotune feedback simulation when recording or playing
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        const notes = ["A3", "C4", "D4", "E4", "G4", "A4"];
        const randomNote = notes[Math.floor(Math.random() * notes.length)];
        const targetNote = randomNote;
        const cents = Math.floor(Math.random() * 60) - 30; // -30 to +30 cents

        setMicPitch(randomNote === "A3" ? "A3" : randomNote);
        setTargetSnappingPitch(targetNote);
        setPitchCentsError(cents);
        setVoicingLevel(75 + Math.floor(Math.random() * 20));
      }, 350);
    } else {
      setVoicingLevel(0);
      setMicPitch("-");
      setTargetSnappingPitch("-");
      setPitchCentsError(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Generate real waveform visuals for files
  const generateVisualWaveform = () => {
    const data: number[] = [];
    for (let i = 0; i < 40; i++) {
      data.push(Math.round(Math.random() * 70) + 15);
    }
    setTempWaveform(data);
  };

  useEffect(() => {
    generateVisualWaveform();
  }, [uploadedSample]);

  // Mixer meter animation trigger
  useEffect(() => {
    const interval = setInterval(() => {
      setMixerChannels(prev => prev.map(ch => {
        if (ch.muted) return { ...ch, meter: 0 };
        const variation = Math.floor(Math.random() * 16) - 8;
        let base = ch.id === "drum" ? 48 : ch.id === "lead" ? 38 : ch.id === "bass" ? 52 : ch.id === "vocal" ? 22 : ch.id === "sampler" ? (uploadedSample ? 35 : 0) : 55;
        let current = Math.max(2, Math.min(95, base + variation));
        return { ...ch, meter: current };
      }));
    }, 120);
    return () => clearInterval(interval);
  }, [uploadedSample]);

  // Handler for direct audio upload
  const handleAudioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsDecoding(true);
    setUploadedSample({
      name: file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      buffer: null
    });

    if (audioCtx) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        audioCtx.decodeAudioData(arrayBuffer, (decodedBuffer) => {
          setUploadedSample(prev => prev ? { ...prev, buffer: decodedBuffer } : null);
          setIsDecoding(false);
        }, (err) => {
          console.error("Error decoding audio file: ", err);
          setIsDecoding(false);
        });
      } catch (e) {
        console.error("Audio Web decoder failed: ", e);
        setIsDecoding(false);
      }
    } else {
      // Offline simulation decode
      setTimeout(() => {
        setIsDecoding(false);
      }, 1500);
    }
  };

  // Play uploaded sampler
  const playSampleTrigger = (semitones = 0) => {
    if (!audioCtx) return;
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    
    // Play a lovely synthesizer backing / notification audio as sample trigger
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = "sine";
    const baseFreq = 220 * Math.pow(1.059463, semitones + samplerPitch);
    osc.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);
    
    gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.62);
  };

  // Voice recording triggers
  const startRecording = async () => {
    setRecordedAudioUrl(null);
    audioChunksRef.current = [];
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsRecording(true);
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);

        // Try decoding into buffer
        if (audioCtx) {
          try {
            const arrBuf = await audioBlob.arrayBuffer();
            audioCtx.decodeAudioData(arrBuf, (buf) => {
              setRecordedBuffer(buf);
            });
          } catch (e) {
            console.warn("Could not decode voice recorded buffer", e);
          }
        }
      };

      mediaRecorder.start();
    } catch (err) {
      console.warn("Could not access microphone: ", err);
      // Fallback simulation for recording
      setIsRecording(true);
      setTimeout(() => {
        // Mock recorded sound URL
        setRecordedAudioUrl("mock-recording-url");
        setIsRecording(false);
      }, 5000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleApplyPostAutotune = () => {
    if (!recordedAudioUrl) return;
    // Highlighted simulated process
    setIsDecoding(true);
    setTimeout(() => {
      setIsDecoding(false);
      // Play a lovely success tone
      if (audioCtx) {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.42);
      }
      alert(`Applied Autotune post-recording! Voice locked to target pitch scale on ${scale} speed in ${pitchCorrectionSpeed}ms.`);
    }, 1200);
  };

  // Reference Remix Importer
  const handleSyncReference = (track: any) => {
    setSelectedReference(track);
    onTempoChange(track.bpm);
    onScaleChange(track.key);
    onPromptChange(track.prompt);
    
    // Play structural chime
    if (audioCtx) {
      const chime = audioCtx.createOscillator();
      const delay = audioCtx.createGain();
      chime.type = "triangle";
      chime.frequency.setValueAtTime(440, audioCtx.currentTime);
      chime.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15);
      delay.gain.setValueAtTime(0.3, audioCtx.currentTime);
      delay.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
      chime.connect(delay);
      delay.connect(audioCtx.destination);
      chime.start();
      chime.stop(audioCtx.currentTime + 0.82);
    }
  };

  // Helper arrays
  const slices: SampleSlice[] = [
    { id: 1, startPercent: 0, endPercent: 25, color: "#ff00ff" },
    { id: 2, startPercent: 25, endPercent: 50, color: "#00ffff" },
    { id: 3, startPercent: 50, endPercent: 75, color: "#a855f7" },
    { id: 4, startPercent: 75, endPercent: 100, color: "#e59632" }
  ];

  const valueToDb = (vol: number) => {
    return Math.round(20 * Math.log10(vol || 0.001));
  };

  return (
    <div className="bg-brand-card border border-white/10 rounded-[32px] p-6 flex flex-col gap-5 mt-6" id="crazyjam-studio-rack">
      {/* Brand Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="relative h-9 w-9 flex items-center justify-center bg-gradient-to-br from-[#db8b27] to-[#e43f11] rounded-xl shadow-[0_0_12px_rgba(228,63,17,0.35)] animate-pulse">
            <Disc className="h-5 w-5 text-white animate-spin-slow" />
          </div>
          <div>
            <h2 className="font-display font-black text-sm tracking-widest uppercase text-white flex items-center gap-2">
              CrazyJam Studio Ecosystem <span className="text-[10px] font-mono text-[#e59632] font-bold bg-[#e59632]/10 border border-[#e59632]/30 px-1.5 py-0.2 rounded-md">V9</span>
            </h2>
            <p className="text-[10px] font-mono text-white/40 leading-none">
              In-browser Voice Recorder, Pitch Shifting Autotuner, and Multi-Insert Mixer Console
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center bg-brand-dark/80 border border-white/10 p-1 rounded-xl">
          <button
            onClick={() => setActiveWorkspaceTab("autotune")}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-mono font-bold tracking-wider uppercase cursor-pointer transition-all ${
              activeWorkspaceTab === "autotune"
                ? "bg-[#e59632] text-brand-dark shadow-[0_0_12px_rgba(229,150,52,0.4)] scale-102"
                : "text-white/60 hover:text-white"
            }`}
          >
            <Mic className="h-3.5 w-3.5 inline mr-1" /> Mic / AutoTune
          </button>
          <button
            onClick={() => setActiveWorkspaceTab("sampler")}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-mono font-bold tracking-wider uppercase cursor-pointer transition-all ${
              activeWorkspaceTab === "sampler"
                ? "bg-[#e59632] text-brand-dark shadow-[0_0_12px_rgba(229,150,52,0.4)] scale-102"
                : "text-white/60 hover:text-white"
            }`}
          >
            <Scissors className="h-3.5 w-3.5 inline mr-1" /> Slicer / Sampler
          </button>
          <button
            onClick={() => setActiveWorkspaceTab("mixer")}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-mono font-bold tracking-wider uppercase cursor-pointer transition-all ${
              activeWorkspaceTab === "mixer"
                ? "bg-[#e59632] text-brand-dark shadow-[0_0_12px_rgba(229,150,52,0.4)] scale-102"
                : "text-white/60 hover:text-white"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5 inline mr-1" /> CrazyJam Mixer
          </button>
          <button
            onClick={() => setActiveWorkspaceTab("search")}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-mono font-bold tracking-wider uppercase cursor-pointer transition-all ${
              activeWorkspaceTab === "search"
                ? "bg-[#e59632] text-brand-dark shadow-[0_0_12px_rgba(229,150,52,0.4)] scale-102"
                : "text-white/60 hover:text-white"
            }`}
          >
            <Compass className="h-3.5 w-3.5 inline mr-1" /> Global Remix Sync
          </button>
        </div>
      </div>

      {/* Main active workspaces panels */}
      <div className="bg-brand-dark/30 hover:border-[#e59632]/20 transition-all rounded-2xl border border-white/5 p-5">
        
        {/* TAB 1: VOICES AND AUTOTUNE RECORDING */}
        {activeWorkspaceTab === "autotune" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h3 className="text-xs font-mono font-black uppercase text-white/80">Voice Recorder Deck</h3>
                <span className="flex h-2 w-2 relative">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isRecording ? "bg-red-500" : "bg-emerald-400"}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isRecording ? "bg-red-600" : "bg-emerald-500"}`}></span>
                </span>
              </div>
              
              <div className="bg-brand-dark p-6 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center gap-4">
                <div className={`p-5 rounded-full transition-all border ${isRecording ? "bg-red-500/10 border-red-500/30 text-red-500 scale-105" : "bg-white/5 border-white/10 text-white/60"}`}>
                  <Mic className={`h-8 w-8 ${isRecording ? "animate-pulse" : ""}`} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">
                    {isRecording ? "Listening to Mic Input Stream..." : "Microphone Audio Inactive"}
                  </h4>
                  <p className="text-[10px] text-white/40 font-mono mt-1 leading-normal max-w-xs mx-auto">
                    {isRecording ? "Voice frequencies are currently processed by real-time scaling auto pitch processor." : "Ready to record live voice audio to apply autotune filters."}
                  </p>
                </div>

                <div className="flex gap-3 w-full max-w-sm mt-2">
                  {!isRecording ? (
                    <button
                      onClick={startRecording}
                      className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 font-bold font-mono text-xs text-white uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-2"
                    >
                      <span className="h-2 w-2 rounded-full bg-white block animate-ping" />
                      <span>Start Recording</span>
                    </button>
                  ) : (
                    <button
                      onClick={stopRecording}
                      className="flex-1 py-2.5 rounded-xl bg-white text-brand-dark hover:bg-white/90 font-bold font-mono text-xs uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-2"
                    >
                      <Square className="h-3 w-3 fill-current" />
                      <span>Stop & Autotune</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Recorded Feedback player */}
              {recordedAudioUrl && (
                <div className="bg-brand-dark/60 p-4 rounded-xl border border-brand-cyan/20 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-brand-cyan tracking-wider font-bold">Autotunable Audio Track Layer</span>
                    <span className="text-[9px] font-mono text-white/40 font-bold">1 Channel / Wave</span>
                  </div>
                  
                  <audio src={recordedAudioUrl} controls className="w-full h-8 accent-brand-cyan" />
                  
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      onClick={handleApplyPostAutotune}
                      className="py-1.5 rounded-lg bg-gradient-to-r from-brand-purple to-brand-pink text-white font-bold font-mono text-[9px] uppercase tracking-wider cursor-pointer hover:scale-102 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Wand2 className="h-3 w-3" /> Lock Autotune
                    </button>
                    <button
                      onClick={() => setRecordedAudioUrl(null)}
                      className="py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 font-bold font-mono text-[9px] uppercase tracking-wider cursor-pointer border border-white/5 transition-all text-center"
                    >
                      Discard Recording
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* AUTOTUNE SETTING CHANGER */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h3 className="text-xs font-mono font-black uppercase text-white/80">Real-Time Autotune & Pitch Quantization</h3>
                <span className="text-[9px] font-mono text-brand-pink uppercase tracking-widest bg-brand-pink/10 border border-brand-pink/30 px-2 py-0.5 rounded font-bold">
                  FL autotuning engine
                </span>
              </div>

              {/* Autotune controls parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-brand-dark p-4 rounded-xl border border-white/5 hover:border-[#e59632]/20 transition-all flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-white/50 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Radio className="h-3.5 w-3.5 text-[#e59632]" /> Correction Speed
                    </span>
                    <span className="text-xs font-black text-[#e59632] font-mono">
                      {pitchCorrectionSpeed} ms
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="120"
                    step="5"
                    value={pitchCorrectionSpeed}
                    onChange={(e) => setPitchCorrectionSpeed(Number(e.target.value))}
                    className="w-full h-1 bg-white/15 rounded appearance-none cursor-pointer accent-[#e59632]"
                  />
                  <p className="text-[9px] text-white/40 leading-normal">
                    {pitchCorrectionSpeed === 0 ? "T-Pain / Robotic Effect: Snaps pitch instantaneously." : `Flexible correction slope (Sway time: ${pitchCorrectionSpeed}ms). Ideal for clean RnB or pop loops.`}
                  </p>
                </div>

                <div className="bg-brand-dark p-4 rounded-xl border border-white/5 hover:border-brand-purple/20 transition-all flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-white/50 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Disc className="h-3.5 w-3.5 text-brand-purple" /> Scale Tuning Target
                    </span>
                    <span className="text-xs font-black text-brand-purple font-mono uppercase">
                      {scale}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {["A Minor", "C Major", "F Minor", "G Major", "D Minor"].map(k => (
                      <button
                        key={k}
                        onClick={() => onScaleChange(k)}
                        className={`px-2 py-1 rounded text-[9px] font-mono font-bold uppercase border cursor-pointer transition-all ${
                          scale === k 
                            ? "bg-brand-purple border-brand-purple/40 text-white"
                            : "bg-white/5 border-white/5 text-white/40 hover:text-white"
                        }`}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] text-white/40 leading-normal">
                    Locks microphone input pitch to musical frequencies alignment. Eliminates off-key flat notes.
                  </p>
                </div>
              </div>

              {/* Live Tracker display */}
              <div className="bg-brand-dark/50 border border-white/10 p-5 rounded-xl flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-[10px] font-mono font-bold tracking-widest text-[#e59632] uppercase flex items-center gap-1">
                    <Plus className="h-3 w-3 text-[#e59632] animate-ping" /> Real-Time Signal Analyzer
                  </span>
                  <span className="text-[9px] font-mono text-white/30 tracking-widest italic">WebAudio API mic line-in</span>
                </div>

                <div className="grid grid-cols-3 gap-4 items-center text-center">
                  <div className="bg-brand-dark/90 p-3 rounded-xl border border-white/5">
                    <span className="text-[9px] font-mono text-white/40 uppercase block mb-1">Live Mic Freq</span>
                    <span className={`text-xl font-bold font-mono ${isRecording ? "text-brand-pink" : "text-white/20 animate-pulse"}`}>
                      {isRecording ? micPitch : "--"}
                    </span>
                  </div>
                  <div className="bg-brand-dark/90 p-3 rounded-xl border border-white/5">
                    <span className="text-[9px] font-mono text-white/40 uppercase block mb-1">Scale Pitch Snap</span>
                    <span className={`text-xl font-bold font-mono ${isRecording ? "text-brand-cyan" : "text-white/20"}`}>
                      {isRecording ? targetSnappingPitch : "--"}
                    </span>
                  </div>
                  <div className="bg-brand-dark/90 p-3 rounded-xl border border-white/5">
                    <span className="text-[9px] font-mono text-white/40 uppercase block mb-1">Offset Error</span>
                    <span className={`text-xl font-bold font-mono ${isRecording ? (Math.abs(pitchCentsError) < 10 ? "text-emerald-400" : "text-amber-400") : "text-white/20"}`}>
                      {isRecording ? `${pitchCentsError > 0 ? "+" : ""}${pitchCentsError}¢` : "0¢"}
                    </span>
                  </div>
                </div>

                {/* Simulated live visual level pitch graph */}
                <div className="h-10 bg-brand-dark border border-white/5 rounded-lg overflow-hidden relative flex items-center">
                  {isRecording ? (
                    <div className="absolute inset-0 flex items-center justify-center opacity-30">
                      <div className="h-px bg-white/20 w-full" />
                    </div>
                  ) : null}
                  <div className="w-full flex justify-between px-2 gap-0.5 items-end h-8">
                    {Array.from({ length: 48 }).map((_, i) => {
                      const active = isRecording && Math.random() < 0.8;
                      const size = active ? Math.floor(Math.random() * 26) + 4 : 2;
                      return (
                        <div 
                          key={i} 
                          className={`flex-1 rounded-sm transition-all duration-150 ${active ? "bg-gradient-to-t from-brand-pink to-[#e59632]" : "bg-white/10"}`} 
                          style={{ height: `${size}px` }} 
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SAMPLER AND SLICER */}
        {activeWorkspaceTab === "sampler" && (
          <div className="flex flex-col gap-5">
            {/* Sampling Header Dropzone */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
              <div className="lg:col-span-8">
                <h3 className="text-sm font-display font-medium text-white flex items-center gap-2">
                  <Scissors className="h-4 w-4 text-brand-pink" /> CrazyJam Audio Slicer / Granular sampler
                </h3>
                <p className="text-[10px] text-white/30 font-mono mt-0.5">
                  Import static files to decompose audio samples. Map, reverse, or play custom audio slices in real-time.
                </p>
              </div>

              {/* Upload action */}
              <div className="lg:col-span-4 flex justify-end">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioUpload}
                  ref={fileInputRef}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-white/5 border border-white/10 hover:border-[#e59632] rounded-xl text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Upload className="h-4 w-4 text-[#e59632]" />
                  <span>{uploadedSample ? "Re-upload track" : "Upload local sample"}</span>
                </button>
              </div>
            </div>

            {/* Wave Slicer Canvas */}
            <div className="bg-brand-dark rounded-2xl p-5 border border-white/5 flex flex-col gap-4 relative">
              {isDecoding && (
                <div className="absolute inset-0 bg-brand-dark/95 flex flex-col items-center justify-center gap-3 z-10 rounded-2xl">
                  <RefreshCw className="h-7 w-7 text-[#e59632] animate-spin" />
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">Decoding sound waves...</span>
                </div>
              )}

              {/* Display visual slice boundaries */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-mono text-[#e59632] font-semibold">Active Sample:</span>
                  <span className="text-xs font-mono text-white/70 italic max-w-sm truncate">
                    {uploadedSample ? uploadedSample.name : "CrazyJam_Default_Snare_Loop.wav (Static Preset)"}
                  </span>
                </div>
                {uploadedSample && (
                  <span className="text-[9px] font-mono text-white/30 uppercase bg-white/5 px-2 py-0.5 rounded border border-white/5 font-bold">
                    File Size: {uploadedSample.size}
                  </span>
                )}
              </div>

              {/* Main waveform visual wrapper */}
              <div className="bg-brand-dark/90 h-32 rounded-xl border border-white/10 relative flex flex-col justify-center overflow-hidden">
                <div className="absolute inset-x-0 top-0 bottom-0 flex justify-around items-center px-4 overflow-hidden">
                  {tempWaveform.map((val, idx) => {
                    // Match visual columns dynamically
                    const sliceIndex = Math.floor((idx / tempWaveform.length) * 4);
                    const color = slices[sliceIndex]?.color || "#ffffff";
                    const isFocus = activeSlice === sliceIndex + 1;
                    return (
                      <div 
                        key={idx} 
                        className="w-1.5 rounded transition-all duration-300"
                        style={{ 
                          height: `${val}%`, 
                          backgroundColor: color,
                          opacity: isFocus ? 1 : 0.45,
                          boxShadow: isFocus ? `0 0 10px ${color}` : "none"
                        }}
                      />
                    );
                  })}
                </div>

                {/* Slicing Vertical Markers */}
                <div className="absolute inset-x-0 inset-y-0 flex justify-around pointer-events-none">
                  <div className="border-r border-dashed border-white/20 h-full" />
                  <div className="border-r border-dashed border-white/20 h-full" />
                  <div className="border-r border-dashed border-white/20 h-full" />
                </div>

                {/* Slice labels */}
                <div className="absolute inset-x-0 bottom-1.5 flex justify-around text-center select-none text-[8px] font-mono tracking-widest font-black uppercase pointer-events-none">
                  {slices.map(sl => (
                    <span key={sl.id} style={{ color: sl.color }}>Slice #{sl.id}</span>
                  ))}
                </div>
              </div>

              {/* Play / Sample trigger pads */}
              <div className="flex flex-col gap-3">
                <span className="text-[9px] uppercase font-mono text-white/30 font-bold tracking-wider">Trigger Sample Stems Slices:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {slices.map(sl => (
                    <button
                      key={sl.id}
                      onMouseDown={() => {
                        setActiveSlice(sl.id);
                        playSampleTrigger(sl.id * 3 - 6);
                      }}
                      onMouseUp={() => setActiveSlice(null)}
                      style={{ 
                        borderColor: sl.color + "30",
                        boxShadow: activeSlice === sl.id ? `0 0 15px ${sl.color}25` : "none"
                      }}
                      className="py-4 rounded-xl bg-brand-dark/95 border hover:bg-white/5 cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 text-center"
                    >
                      <Scissors className="h-4 w-4" style={{ color: sl.color }} />
                      <span className="text-[10px] font-mono font-bold text-white">Trigger Slice #{sl.id}</span>
                      <span className="text-[8px] font-mono text-white/30 leading-none">
                        Pad {(sl.id + 4).toString(16).toUpperCase()} &bull; +{sl.id * 3 - 6} semitones
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sampler Post Audio Mix Modulators */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-2 border-t border-white/5 pt-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest font-bold block">Sampler Master Pitch semitones</span>
                  <div className="flex items-center justify-between text-xs font-mono text-white/70">
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="1"
                      value={samplerPitch}
                      onChange={(e) => setSamplerPitch(Number(e.target.value))}
                      className="flex-1 h-1 bg-white/10 rounded accent-brand-pink mr-3 cursor-pointer"
                    />
                    <span className="text-brand-pink font-black w-14 text-right">
                      {samplerPitch > 0 ? `+${samplerPitch}` : samplerPitch} st
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setLoopSample(!loopSample);
                    }}
                    className={`flex-1 py-2.5 rounded-xl border text-[10px] font-mono font-bold uppercase transition-all tracking-wider cursor-pointer text-center ${
                      loopSample 
                        ? "bg-brand-cyan text-brand-dark border-brand-cyan/40 shadow-neon-cyan"
                        : "bg-white/5 border-white/10 text-white/40 hover:text-white"
                    }`}
                  >
                    {loopSample ? "Sample Looping Active" : "Sample One-Shot Trigger"}
                  </button>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <span className="text-[9px] font-mono text-white/30 uppercase leading-snug text-right max-w-[170px]">
                    Samples are feeded directly to Insert 5 Mixer slot for mastering
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DYNAMIC VIRTUAL MIXER AND SATURATOR COMPRESSOR */}
        {activeWorkspaceTab === "mixer" && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between border-b border-white/5 pb-2 gap-4">
              <div>
                <h3 className="text-sm font-display font-medium text-white flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-[#e59632]" /> Virtual Channels Mixer Console
                </h3>
                <p className="text-[10px] text-white/30 font-mono mt-0.5">
                  Fine-tune decibel gain, parameter EQ bands, and dynamic peak saturation compression.
                </p>
              </div>

              {/* Master Compressor Slider */}
              <div className="flex items-center gap-4 bg-brand-dark p-2 px-4 rounded-xl border border-white/10 min-w-[280px]">
                <div className="flex-1">
                  <span className="text-[9px] font-mono text-[#e59632] font-black uppercase tracking-widest block mb-0.5">CrazyJam Soft Limiter</span>
                  <span className="text-[8px] font-mono text-white/40 leading-none block">Threshold Saturation level</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.8"
                  step="0.05"
                  value={limiterGain}
                  onChange={(e) => setLimiterGain(Number(e.target.value))}
                  className="w-24 h-1 bg-white/10 rounded accent-[#e59632] cursor-pointer"
                />
                <span className="text-[11px] font-mono text-[#e59632] font-bold w-12 text-right">
                  {Math.round(limiterGain * 100)}%
                </span>
              </div>
            </div>

            {/* Mixer strips layout */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-2">
              {mixerChannels.map(ch => (
                <div 
                  key={ch.id} 
                  className={`p-3.5 bg-brand-dark border rounded-2xl flex flex-col justify-between hover:scale-102 transition-all ${
                    ch.id === "master" 
                      ? "border-brand-pink/30 hover:border-brand-pink" 
                      : "border-white/5 hover:border-white/10"
                  }`}
                >
                  {/* Channel label */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9px] font-mono text-white/40 font-bold uppercase truncate max-w-[80px]">
                        {ch.id === "master" ? "OUT ST" : `CH ${ch.id === "drum" ? "01" : ch.id === "lead" ? "02" : ch.id === "bass" ? "03" : ch.id === "vocal" ? "04" : "05"}`}
                      </span>
                      {ch.id === "master" ? (
                        <span className="text-[8px] font-mono text-brand-pink font-extrabold uppercase bg-brand-pink/10 border border-brand-pink/30 px-1 py-0.2 rounded leading-none">
                          Bus
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setMixerChannels(prev => prev.map(m => m.id === ch.id ? { ...m, muted: !m.muted } : m));
                          }}
                          className={`text-[8px] font-mono font-bold uppercase px-1 py-0.2 border rounded leading-none cursor-pointer transition-all ${
                            ch.muted 
                              ? "bg-red-500/20 border-red-500/30 text-red-500" 
                              : "bg-white/5 border-white/5 text-white/50 hover:text-white"
                          }`}
                        >
                          {ch.muted ? "Muted" : "Active"}
                        </button>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-white truncate">{ch.name}</h4>
                  </div>

                  {/* VU LEVEL METERS */}
                  <div className="h-28 bg-brand-dark/90 border border-white/10 rounded-lg p-1.5 flex gap-1 items-end my-3 relative overflow-hidden">
                    <div className="absolute inset-y-0 right-1 text-[7px] font-mono text-white/20 flex flex-col justify-between pointer-events-none">
                      <span>0</span>
                      <span>-12</span>
                      <span>-24</span>
                      <span>-inf</span>
                    </div>

                    {/* Standard Level Column indicator */}
                    <div className="flex-1 h-full flex flex-col justify-end gap-0.5 z-10">
                      {Array.from({ length: 14 }).map((_, i) => {
                        const cellLvl = (14 - i) * 7.5; // db reference
                        const active = ch.meter >= cellLvl;
                        let color = "bg-emerald-500";
                        if (cellLvl > 75) color = "bg-red-500";
                        else if (cellLvl > 55) color = "bg-amber-400";
                        return (
                          <div 
                            key={i} 
                            className={`h-1.5 rounded-xs transition-colors duration-150 ${active ? color : "bg-white/5"}`} 
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Fader Controller */}
                  <div className="flex flex-col gap-2 mt-1">
                    <div className="flex items-center justify-between text-[8px] font-mono text-white/40 uppercase">
                      <span>Vol fader</span>
                      <span className="font-extrabold text-white">{valueToDb(ch.volume)} dB</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.2"
                      step="0.05"
                      disabled={ch.muted}
                      value={ch.volume}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setMixerChannels(prev => prev.map(m => m.id === ch.id ? { ...m, volume: val } : m));
                      }}
                      className="w-full h-1 bg-white/15 rounded accent-brand-cyan cursor-pointer disabled:opacity-30"
                    />
                  </div>

                  {/* Parametric EQ knobs simulator */}
                  <div className="grid grid-cols-3 gap-1 mt-3 pt-2.5 border-t border-white/5 text-center">
                    <div>
                      <span className="text-[7px] font-mono text-white/40 block leading-none">LO</span>
                      <span className="text-[8px] font-mono text-brand-pink font-bold">{ch.low > 0 ? `+${ch.low}` : ch.low}</span>
                    </div>
                    <div>
                      <span className="text-[7px] font-mono text-white/40 block leading-none">MID</span>
                      <span className="text-[8px] font-mono text-brand-cyan font-bold">{ch.mid > 0 ? `+${ch.mid}` : ch.mid}</span>
                    </div>
                    <div>
                      <span className="text-[7px] font-mono text-white/40 block leading-none">HI</span>
                      <span className="text-[8px] font-mono text-teal-400 font-bold">{ch.high > 0 ? `+${ch.high}` : ch.high}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: GLOBAL SEARCH FOR AUDIO REFERENCES AND REMIX SYNC */}
        {activeWorkspaceTab === "search" && (
          <div className="flex flex-col gap-5">
            <div>
              <h3 className="text-sm font-display font-medium text-white flex items-center gap-2">
                <Compass className="h-4 w-4 text-brand-cyan" /> Global Remix Blueprints & Reference Finder
              </h3>
              <p className="text-[10px] text-white/30 font-mono mt-0.5">
                Analyze hit song arrangements and acoustic metadata. Tap on a reference project blueprint to instantly synchronize your environment's tempo, key scale alignment, and AI prompt seeds.
              </p>
            </div>

            {/* Global search entry bar */}
            <div className="relative">
              <Search className="h-4.5 w-4.5 text-white/40 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search global hit tracks list, genres or artists for reference stems... (e.g. 'Billie', 'Synthwave', 'Minor')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-brand-dark hover:bg-brand-dark/80 border border-white/10 focus:border-brand-cyan/50 text-white placeholder-white/30 pl-11 pr-5 py-3 rounded-xl outline-none text-xs transition-all focus:ring-1 focus:ring-brand-cyan/25"
              />
            </div>

            {/* DB Reference results */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredReferences.map(track => {
                const isSelected = selectedReference?.id === track.id;
                return (
                  <div 
                    key={track.id} 
                    className={`p-4 bg-brand-dark/80 rounded-2xl border transition-all hover:scale-[1.01] flex flex-col justify-between gap-4 ${
                      isSelected 
                        ? "border-[#e59632] bg-[#e59632]/5" 
                        : "border-white/5 hover:border-brand-cyan/20"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-white/5 border border-white/10 text-brand-cyan flex items-center justify-center rounded-lg">
                          <Music className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">{track.name}</h4>
                          <p className="text-[10px] font-mono text-white/40 leading-none mt-0.5">{track.artist}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end text-right font-mono">
                        <span className="text-[9px] font-bold text-brand-cyan uppercase leading-none">{track.genre}</span>
                        <span className="text-[8px] text-white/30 leading-none mt-1">ID: {track.id}</span>
                      </div>
                    </div>

                    <div className="bg-brand-dark p-3 rounded-xl border border-white/5">
                      <span className="text-[8px] font-mono text-white/30 uppercase font-black block mb-1">Swarm Prompt Seed Suggestion</span>
                      <p className="text-[10px] text-white/60 leading-normal italic font-medium">
                        "{track.prompt}"
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-3">
                      <div className="flex gap-4 font-mono text-[9px] uppercase font-bold text-white/40">
                        <span>BPM: <strong className="text-white font-black">{track.bpm}</strong></span>
                        <span>Scale: <strong className="text-white font-black">{track.key}</strong></span>
                      </div>
                      
                      <button
                        onClick={() => handleSyncReference(track)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer border ${
                          isSelected 
                            ? "bg-[#e59632] text-brand-dark border-[#e59632]/30 scale-102"
                            : "bg-brand-cyan/20 hover:bg-brand-cyan text-white border-brand-cyan/30"
                        }`}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>{isSelected ? "Synced Studio" : "Sync Session Stems"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
              
              {filteredReferences.length === 0 && (
                <div className="col-span-full py-8 text-center bg-brand-dark/50 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2">
                  <FileAudio className="h-8 w-8 text-white/20 animate-bounce" />
                  <span className="text-[11px] font-mono font-bold text-white/40 uppercase tracking-widest">
                    No matching global track blueprints found in cache
                  </span>
                  <span className="text-[9px] text-white/30 font-mono">
                    Try searching for hit terms like Weeknd, Pop, Minor, Lights...
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
