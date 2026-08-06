/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Cpu, 
  Settings, 
  HelpCircle, 
  Sparkles, 
  Activity, 
  Radio, 
  CheckCircle, 
  AlertTriangle,
  Zap,
  Plug,
  ListRestart
} from "lucide-react";
import { audioEngine } from "../utils/audioEngine";
import { useTier } from "../context/TierContext";

interface MidiStudioProps {
  tempo: number;
  cutoff: number;
  qFactor: number;
  delayTime: number;
  delayFeedback: number;
  volume: number;
  onAutoFix: (adjustments: {
    tempo?: number;
    cutoff?: number;
    q?: number;
    delayTime?: number;
    delayFeedback?: number;
    volume?: number;
  }) => void;
  audioCtx: AudioContext | null;
}

interface MidiDevice {
  id: string;
  name: string;
  manufacturer: string;
  state: string;
  connection: string;
  type: string;
}

export function MidiStudio({
  tempo,
  cutoff,
  qFactor,
  delayTime,
  delayFeedback,
  volume,
  onAutoFix,
  audioCtx
}: MidiStudioProps) {
  const { isPro } = useTier();
  // MIDI States
  const [midiSupported, setMidiSupported] = useState(false);
  const [midiDevices, setMidiDevices] = useState<MidiDevice[]>([]);
  const [activeMidiLog, setActiveMidiLog] = useState<string[]>(["MIDI Engine initialized successfully."]);
  const [virtualKeyboardOctave, setVirtualKeyboardOctave] = useState<number>(4);
  const [lastKeyPressed, setLastKeyPressed] = useState<string | null>(null);

  // USB Device States
  const [usbConnected, setUsbConnected] = useState<boolean>(false);
  const [virtualInputDevice, setVirtualInputDevice] = useState<string>("Keyboard controller");

  // Master Sound Engineer state - all values below are computed from a real
  // AnalyserNode reading the actual master bus output (audioEngine.analyser),
  // not hardcoded. See measureMix() for the analysis itself.
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [metrics, setMetrics] = useState<{ bassPct: number; midPct: number; highPct: number; peakDb: number; rmsDb: number } | null>(null);
  const [optimizationScore, setOptimizationScore] = useState<number | null>(null);
  const [diagnosticsList, setDiagnosticsList] = useState<{ id: string; type: "warning" | "optimal"; message: string; fix: string }[]>([
    { id: "init", type: "optimal", message: "No analysis yet - play something and run an analysis to see real measurements.", fix: "N/A" },
  ]);

  /** Reads the real master output via audioEngine.analyser and computes actual
   * spectral band energy + level metrics. Returns null if audio hasn't started. */
  const measureMix = useCallback((): { bassPct: number; midPct: number; highPct: number; peakDb: number; rmsDb: number } | null => {
    const analyser = audioEngine.analyser;
    if (!analyser) return null;

    const freqData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(freqData);
    const timeData = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(timeData);

    const sampleRate = 44100; // AudioContext default; band edges are approximate either way
    const binHz = sampleRate / analyser.fftSize;
    const bassEndBin = Math.min(freqData.length - 1, Math.round(250 / binHz));
    const highStartBin = Math.min(freqData.length - 1, Math.round(6000 / binHz));

    let bassSum = 0, midSum = 0, highSum = 0, totalSum = 0;
    for (let i = 0; i < freqData.length; i++) {
      const v = freqData[i];
      totalSum += v;
      if (i <= bassEndBin) bassSum += v;
      else if (i >= highStartBin) highSum += v;
      else midSum += v;
    }
    const bassPct = totalSum > 0 ? (bassSum / totalSum) * 100 : 0;
    const highPct = totalSum > 0 ? (highSum / totalSum) * 100 : 0;
    const midPct = totalSum > 0 ? (midSum / totalSum) * 100 : 0;

    let sumSquares = 0;
    let peakDev = 0;
    for (let i = 0; i < timeData.length; i++) {
      const dev = (timeData[i] - 128) / 128; // -1..1
      sumSquares += dev * dev;
      peakDev = Math.max(peakDev, Math.abs(dev));
    }
    const rms = Math.sqrt(sumSquares / timeData.length);
    const rmsDb = rms > 0 ? 20 * Math.log10(rms) : -60;
    const peakDb = peakDev > 0 ? 20 * Math.log10(peakDev) : -60;

    return { bassPct, midPct, highPct, peakDb, rmsDb };
  }, []);

  // Live-updating meters while the panel is open, so the bars reflect what's
  // actually playing right now rather than a static snapshot.
  useEffect(() => {
    const interval = setInterval(() => {
      const m = measureMix();
      if (m) setMetrics(m);
    }, 500);
    return () => clearInterval(interval);
  }, [measureMix]);

  // Request Access to MIDI on start
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.requestMIDIAccess) {
      setMidiSupported(true);
      navigator.requestMIDIAccess()
        .then((access) => {
          updateMidiDevices(access);
          access.onstatechange = () => {
            updateMidiDevices(access);
          };
        })
        .catch((err) => {
          setActiveMidiLog(prev => [...prev, "WebMIDI permission blocked or unsupported in current frame."]);
        });
    } else {
      setMidiSupported(false);
      setActiveMidiLog(prev => [...prev, "WebMIDI API not supported by this browser version."]);
    }
  }, []);

  const updateMidiDevices = (access: any) => {
    const inputs = Array.from(access.inputs.values()) as any[];
    const list: MidiDevice[] = inputs.map(i => ({
      id: i.id,
      name: i.name || "Unknown MIDI Controller",
      manufacturer: i.manufacturer || "Generic USB Device",
      state: i.state || "connected",
      connection: i.connection || "open",
      type: i.type || "input"
    }));
    setMidiDevices(list);
    
    // Bind event handlers to midi devices
    inputs.forEach(input => {
      input.onmidimessage = handleMidiMessage;
    });

    if (list.length > 0) {
      setActiveMidiLog(prev => [...prev, `Physical connection detected: ${list[0].name}`]);
    }
  };

  const handleMidiMessage = (event: any) => {
    const data = event.data;
    if (!data || data.length < 3) return;
    
    const command = data[0] & 0xf0;
    const note = data[1];
    const velocity = data[2];

    if (command === 144 && velocity > 0) { // Note ON
      const noteName = midiNoteToName(note);
      setLastKeyPressed(noteName);
      setActiveMidiLog(prev => [
        `MIDI Note ON: ${noteName} &bull; Velocity: ${velocity} &bull; Chan #1`,
        ...prev.slice(0, 8)
      ]);
      playMonoTone(noteToFrequency(note));
    } else if (command === 128 || (command === 144 && velocity === 0)) { // Note OFF
      const noteName = midiNoteToName(note);
      setActiveMidiLog(prev => [
        `MIDI Note OFF: ${noteName}`,
        ...prev.slice(0, 8)
      ]);
    }
  };

  const midiNoteToName = (note: number): string => {
    const scale_notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const octave = Math.floor(note / 12) - 1;
    const noteIdx = note % 12;
    return `${scale_notes[noteIdx]}${octave}`;
  };

  const noteToFrequency = (note: number): number => {
    return 440 * Math.pow(2, (note - 69) / 12);
  };

  // Sound Engine Tone Trigger
  const playMonoTone = (freq: number) => {
    if (!audioCtx) return;
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.42);
  };

  // Keyboard Click Trigger
  const handleVirtualKeyPress = (noteStr: string) => {
    const notes_map: { [key: string]: number } = {
      "C": 60, "C#": 61, "D": 62, "D#": 63, "E": 64, "F": 65, 
      "F#": 66, "G": 67, "G#": 68, "A": 69, "A#": 70, "B": 71
    };
    const midiVal = notes_map[noteStr] + (virtualKeyboardOctave - 4) * 12;
    setLastKeyPressed(`${noteStr}${virtualKeyboardOctave}`);
    setActiveMidiLog(prev => [
      `Trigger Keyboard: ${noteStr}${virtualKeyboardOctave} &bull; Velocity 100`,
      ...prev.slice(0, 8)
    ]);
    playMonoTone(noteToFrequency(midiVal));
  };

  // Real-time Master engineer analysis: samples the actual master output a few
  // times over ~600ms (to smooth out a single noisy instant), then derives
  // diagnostics, a score, and auto-fix values entirely from those measurements.
  // It only calls onAutoFix with parameters that genuinely correspond to a
  // detected issue and that this panel actually controls (lowpass cutoff/Q and
  // master volume) - it no longer touches delay params or claims LUFS/loudness-
  // standard compliance it can't actually verify, and issues it can't fix from
  // here (like bass buildup - there's no bass-cut control wired to onAutoFix)
  // are reported as text suggestions pointing at the Mixer instead of faked.
  const handleEngineerOptimize = () => {
    if (!audioEngine.analyser) {
      setDiagnosticsList([{ id: "no-audio", type: "warning", message: "No audio is playing yet - start playback first so there's something to analyze.", fix: "N/A" }]);
      return;
    }

    setIsAnalyzing(true);
    const samples: ReturnType<typeof measureMix>[] = [];
    let count = 0;
    const sampleInterval = setInterval(() => {
      const m = measureMix();
      if (m) samples.push(m);
      count++;
      if (count >= 6) {
        clearInterval(sampleInterval);
        finishAnalysis(samples.filter((s): s is NonNullable<typeof s> => !!s));
      }
    }, 100);
  };

  const finishAnalysis = (samples: { bassPct: number; midPct: number; highPct: number; peakDb: number; rmsDb: number }[]) => {
    setIsAnalyzing(false);
    if (samples.length === 0) {
      setDiagnosticsList([{ id: "silent", type: "warning", message: "Master output is silent - nothing to analyze right now.", fix: "N/A" }]);
      return;
    }

    const avg = {
      bassPct: samples.reduce((s, x) => s + x.bassPct, 0) / samples.length,
      highPct: samples.reduce((s, x) => s + x.highPct, 0) / samples.length,
      peakDb: Math.max(...samples.map((x) => x.peakDb)),
      rmsDb: samples.reduce((s, x) => s + x.rmsDb, 0) / samples.length,
    };
    setMetrics({ ...avg, midPct: 100 - avg.bassPct - avg.highPct });

    const diagnostics: typeof diagnosticsList = [];
    const fixes: Parameters<typeof onAutoFix>[0] = {};

    if (avg.bassPct > 40) {
      diagnostics.push({
        id: "bass",
        type: "warning",
        message: `Low end is heavy - bass is ${avg.bassPct.toFixed(0)}% of spectral energy.`,
        fix: "This panel can't cut bass directly - lower the bass track's fader in the Mixer tab.",
      });
    }

    if (avg.highPct < 6) {
      diagnostics.push({
        id: "dull",
        type: "warning",
        message: `Mix sounds dull - only ${avg.highPct.toFixed(0)}% of energy is in the high end.`,
        fix: cutoff < 15000 ? "Opening the lowpass cutoff to let more highs through." : "Cutoff is already wide open; the dullness is likely in the source sounds.",
      });
      if (cutoff < 15000) fixes.cutoff = Math.min(20000, cutoff + 3000);
    } else if (avg.highPct > 22) {
      diagnostics.push({
        id: "harsh",
        type: "warning",
        message: `High end is harsh - ${avg.highPct.toFixed(0)}% of energy is above 6kHz.`,
        fix: "Lowering the lowpass cutoff to tame harshness.",
      });
      fixes.cutoff = Math.max(2000, cutoff - 2500);
      fixes.q = 1.0;
    }

    if (avg.peakDb > -0.5) {
      diagnostics.push({
        id: "clip",
        type: "warning",
        message: `Peaks are close to clipping (${avg.peakDb.toFixed(1)} dBFS).`,
        fix: "Lowering master volume to add headroom.",
      });
      fixes.volume = Math.max(0.1, volume - 0.15);
    } else if (avg.rmsDb < -28) {
      diagnostics.push({
        id: "quiet",
        type: "warning",
        message: `Mix is quiet overall (${avg.rmsDb.toFixed(1)} dBFS RMS average).`,
        fix: "Raising master volume.",
      });
      fixes.volume = Math.min(1, volume + 0.15);
    }

    if (diagnostics.length === 0) {
      diagnostics.push({
        id: "healthy",
        type: "optimal",
        message: `Mix looks healthy: bass ${avg.bassPct.toFixed(0)}%, highs ${avg.highPct.toFixed(0)}%, peak ${avg.peakDb.toFixed(1)} dBFS, RMS ${avg.rmsDb.toFixed(1)} dBFS.`,
        fix: "No changes needed.",
      });
    }

    // Score: start at 100, subtract real penalties for each measured deviation
    // from a healthy range - not a hardcoded jump to a fixed number.
    let score = 100;
    score -= Math.max(0, avg.bassPct - 40) * 1.2;
    score -= Math.max(0, 6 - avg.highPct) * 2;
    score -= Math.max(0, avg.highPct - 22) * 1.5;
    score -= Math.max(0, avg.peakDb + 0.5) * 20;
    score -= Math.max(0, -28 - avg.rmsDb) * 0.8;
    setOptimizationScore(Math.round(Math.max(0, Math.min(100, score))));

    setDiagnosticsList(diagnostics);
    if (Object.keys(fixes).length > 0) onAutoFix(fixes);
  };


  return (
    <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 mt-6 animate-fadeIn" id="midi-usb-hub">
      {/* LEFT SECTION: MIDI & USB CONNECTIVES */}
      <div className="xl:col-span-6 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-brand-border pb-3">
          <div className="flex items-center gap-2 text-brand-gold">
            <Plug className="h-4.5 w-4.5" />
            <h2 className="font-display text-[15px] text-brand-ink">MIDI &amp; USB controllers</h2>
          </div>
          <span className="text-[10px] text-brand-gold bg-brand-gold/10 border border-brand-gold/25 px-2 py-0.5 rounded">
            Keyboard input
          </span>
        </div>

        {/* Device Sync Matrix */}
        <div className="bg-brand-bg p-4 rounded-2xl border border-brand-border flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-medium text-brand-ink-muted">Connection Status</span>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 block animate-pulse" />
              <span className="text-[10px] font-mono text-emerald-400 font-medium">MIDI Engine Active</span>
            </div>
          </div>

          {midiDevices.length === 0 ? (
            <div className="p-3 bg-brand-surface-2 rounded-xl border border-brand-border flex items-center justify-between">
              <div>
                <h4 className="text-xs font-medium text-brand-ink-muted">Virtual USB Controller Bus</h4>
                <p className="text-[9px] text-brand-ink-muted font-mono mt-0.5">Click/press virtual keys or connect an external MIDI board</p>
              </div>
              <button 
                onClick={() => {
                  setUsbConnected(!usbConnected);
                  if(!usbConnected) {
                    setMidiDevices([{ id: "v-usb", name: "CrazyJam Virtual Keyboard Controller", manufacturer: "Swarmlabs LLC", state: "connected", connection: "open", type: "input" }]);
                    setActiveMidiLog(prev => ["Mapped virtual controller device to USB slot 1", ...prev]);
                  } else {
                    setMidiDevices([]);
                  }
                }}
                className={`px-2.5 py-1 text-[9px] font-mono font-medium rounded border cursor-pointer transition-all ${
                  usbConnected ? "bg-emerald-500 border-emerald-500/30" : "bg-brand-surface-2 border-brand-border text-brand-ink hover:border-[var(--gold)]"
                }`}
              >
                {usbConnected ? "Disconnect USB" : "Connect Dummy Keyb"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {midiDevices.map(device => (
                <div key={device.id} className="p-3.5 bg-brand-gold/5 rounded-xl border border-brand-gold/20 flex items-center justify-between animate-fadeIn">
                  <div className="flex items-center gap-2.5">
                    <Plug className="h-4 w-4 text-brand-gold" />
                    <div>
                      <h4 className="text-xs font-medium text-brand-ink">{device.name}</h4>
                      <p className="text-[9px] font-mono text-brand-gold">{device.manufacturer} &bull; Type: Input</p>
                    </div>
                  </div>
                  <span className="text-[8px] font-mono text-emerald-400 font-semibold tracking-wide bg-emerald-500/10 px-1.5 py-0.5 rounded leading-none border border-emerald-500/20">
                    Online
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Visual virtual music key controller */}
        <div className="bg-brand-bg/40 p-4 border border-brand-border rounded-2xl flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-brand-ink-muted font-semibold">Interactive Virtual Keydeck</span>
            <div className="flex items-center gap-1 font-mono text-[9px]">
              <span className="text-brand-ink-muted mr-1">Octave</span>
              {[3, 4, 5].map(oct => (
                <button
                  key={oct}
                  onClick={() => setVirtualKeyboardOctave(oct)}
                  className={`w-5 h-5 rounded flex items-center justify-center font-medium cursor-pointer transition-all ${
                    virtualKeyboardOctave === oct ? "bg-[var(--gold)] font-semibold" : "bg-brand-surface-2 text-brand-ink-muted hover:bg-brand-surface-2"
                  }`}
                >
                  {oct}
                </button>
              ))}
            </div>
          </div>

          {/* Key layout */}
          <div className="flex h-20 bg-brand-bg rounded-xl overflow-hidden border border-brand-border p-1 select-none relative">
            {/* White keys */}
            {["C", "D", "E", "F", "G", "A", "B"].map(note => (
              <button
                key={note}
                onClick={() => handleVirtualKeyPress(note)}
                className={`flex-1 bg-brand-surface-2 hover:bg-brand-surface-2 active:bg-brand-gold border border-brand-bg/20 text-[10px] font-mono font-extrabold text-[var(--bg)] flex items-end justify-center pb-1.5 rounded-sm transition-all shadow-[0_3px_5px_rgba(0,0,0,0.35)] cursor-pointer`}
              >
                {note}
              </button>
            ))}

            {/* Simulated Black Keys */}
            <button onClick={() => handleVirtualKeyPress("C#")} className="absolute h-12 w-4 cursor-pointer bg-[var(--bg)] hover:bg-slate-800 active:bg-brand-gold text-[7px] font-mono font-medium text-brand-ink flex items-end justify-center pb-1 rounded-sm border-r border-b border-brand-border" style={{ left: "11.5%" }} >C#</button>
            <button onClick={() => handleVirtualKeyPress("D#")} className="absolute h-12 w-4 cursor-pointer bg-[var(--bg)] hover:bg-slate-800 active:bg-brand-gold text-[7px] font-mono font-medium text-brand-ink flex items-end justify-center pb-1 rounded-sm border-r border-b border-brand-border" style={{ left: "25.5%" }} >D#</button>
            <button onClick={() => handleVirtualKeyPress("F#")} className="absolute h-12 w-4 cursor-pointer bg-[var(--bg)] hover:bg-slate-800 active:bg-brand-gold text-[7px] font-mono font-medium text-brand-ink flex items-end justify-center pb-1 rounded-sm border-r border-b border-brand-border" style={{ left: "54.5%" }} >F#</button>
            <button onClick={() => handleVirtualKeyPress("G#")} className="absolute h-12 w-4 cursor-pointer bg-[var(--bg)] hover:bg-slate-800 active:bg-brand-gold text-[7px] font-mono font-medium text-brand-ink flex items-end justify-center pb-1 rounded-sm border-r border-b border-brand-border" style={{ left: "68.5%" }} >G#</button>
            <button onClick={() => handleVirtualKeyPress("A#")} className="absolute h-12 w-4 cursor-pointer bg-[var(--bg)] hover:bg-slate-800 active:bg-brand-gold text-[7px] font-mono font-medium text-brand-ink flex items-end justify-center pb-1 rounded-sm border-r border-b border-brand-border" style={{ left: "82.5%" }} >A#</button>
          </div>

          <div className="flex items-center justify-between text-[9px] font-mono">
            <span className="text-brand-ink-muted italic">Tip: Key triggers are polyphonic and fully mapped dynamically.</span>
            <span className="text-brand-gold font-medium block tracking-wide">
              {lastKeyPressed ? `Last Trigger: ${lastKeyPressed}` : "Idle"}
            </span>
          </div>
        </div>

        {/* Real-time MIDI data steam log block */}
        <div className="bg-brand-bg/60 p-3 rounded-xl border border-brand-border flex flex-col gap-1.5 h-32 overflow-hidden">
          <span className="text-[9px] font-mono text-brand-ink-muted tracking-wide font-semibold">Hardware signal console logs</span>
          <div className="flex-1 flex flex-col gap-1 overflow-y-auto pr-1">
            {activeMidiLog.map((log, index) => (
              <div key={index} className="text-[10px] font-mono text-emerald-400/90 leading-tight border-b border-brand-border pb-1 flex items-start gap-1.5">
                <span className="text-brand-ink-muted select-none font-medium">»</span>
                <span dangerouslySetInnerHTML={{ __html: log }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT SECTION: CRAZYJAM AI MASTER SOUND ENGINEER */}
      <div className="xl:col-span-6 flex flex-col gap-4 border-t xl:border-t-0 xl:border-l border-brand-border pt-4 xl:pt-0 xl:pl-6">
        <div className="flex items-center justify-between border-b border-brand-border pb-3">
          <div className="flex items-center gap-2 text-brand-gold">
            <Cpu className="h-4.5 w-4.5 text-brand-gold animate-pulse" />
            <h2 className="font-display font-semibold text-sm tracking-wide text-brand-ink">
              AI master engineer
            </h2>
          </div>
          <span className="text-[9px] font-mono text-brand-gold bg-brand-gold/10 border border-brand-gold/30 px-2 py-0.5 rounded font-medium">
            Auto-Mix Suite
          </span>
        </div>

        {/* Dynamic Diagnostics Analyzer Dashboard */}
        <div className="bg-brand-bg p-4 rounded-2xl border border-brand-border flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[9px] font-mono text-brand-ink-muted tracking-wide font-semibold block">Mixing & Loudness Health</span>
              <h3 className="text-xs font-medium text-brand-ink">Neural Analytical Health Score</h3>
            </div>

            <div className="h-12 w-12 rounded-full border border-brand-border flex flex-col justify-center items-center backdrop-blur-md relative" style={{ boxShadow: optimizationScore !== null && optimizationScore > 90 ? "0 0 15px rgba(16,185,129,0.25)" : "0 0 15px rgba(239,68,68,0.15)" }}>
              <span className={`text-base font-semibold font-mono leading-none ${optimizationScore !== null && optimizationScore > 90 ? "text-emerald-400" : "text-[var(--gold)]"}`}>
                {optimizationScore !== null ? `${optimizationScore}%` : "—"}
              </span>
              <span className="text-[7px] font-mono text-brand-ink-muted mt-0.5 font-medium">Acoustic</span>
            </div>
          </div>

          {/* Real spectral band levels, read live from the master AnalyserNode */}
          <div className="grid grid-cols-3 gap-3 border-t border-b border-brand-border py-3 font-mono text-[9px] font-medium text-brand-ink-muted">
            <div>
              <span className="block text-brand-ink-muted mb-0.5">Bass (&lt;250Hz)</span>
              <div className="w-full bg-brand-surface-2 h-1.5 rounded overflow-hidden">
                <div className={`h-full transition-all ${metrics && metrics.bassPct > 40 ? "bg-amber-500" : "bg-brand-gold"}`} style={{ width: `${metrics ? Math.min(100, metrics.bassPct) : 0}%` }} />
              </div>
              <span className="block mt-0.5">{metrics ? `${metrics.bassPct.toFixed(0)}%` : "—"}</span>
            </div>
            <div>
              <span className="block text-brand-ink-muted mb-0.5">Highs (&gt;6kHz)</span>
              <div className="w-full bg-brand-surface-2 h-1.5 rounded overflow-hidden">
                <div className={`h-full transition-all ${metrics && (metrics.highPct < 6 || metrics.highPct > 22) ? "bg-amber-500" : "bg-brand-gold"}`} style={{ width: `${metrics ? Math.min(100, metrics.highPct) : 0}%` }} />
              </div>
              <span className="block mt-0.5">{metrics ? `${metrics.highPct.toFixed(0)}%` : "—"}</span>
            </div>
            <div>
              <span className="block text-brand-ink-muted mb-0.5">RMS level</span>
              <div className="w-full bg-brand-surface-2 h-1.5 rounded overflow-hidden">
                <div className={`h-full transition-all ${metrics && metrics.rmsDb < -28 ? "bg-amber-500" : "bg-brand-gold"}`} style={{ width: `${metrics ? Math.max(0, Math.min(100, (metrics.rmsDb + 60) / 60 * 100)) : 0}%` }} />
              </div>
              <span className="block mt-0.5">{metrics ? `${metrics.rmsDb.toFixed(1)}dB` : "—"}</span>
            </div>
          </div>


          {/* Specific warnings */}
          <div className="flex flex-col gap-2.5 max-h-[170px] overflow-y-auto pr-1">
            {diagnosticsList.map((diag) => (
              <div key={diag.id} className={`p-3 rounded-xl border flex gap-3 items-start transition-all ${
                diag.type === "warning" 
                  ? "bg-amber-500/5 border-amber-500/20" 
                  : "bg-emerald-500/5 border-emerald-500/20 animate-fadeIn"
              }`}>
                <div className="shrink-0 mt-0.5">
                  {diag.type === "warning" ? (
                    <AlertTriangle className="h-4 w-4 text-amber-400 animate-pulse" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                  )}
                </div>
                <div>
                  <h4 className="text-[11px] font-medium text-brand-ink leading-normal">{diag.message}</h4>
                  <p className="text-[9px] font-mono text-brand-ink-muted mt-1">
                    <strong className="text-brand-ink-muted font-semibold">Correction target:</strong> {diag.fix}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Execution Optimizer Button */}
        <button
          onClick={handleEngineerOptimize}
          disabled={isAnalyzing}
          className="w-full py-4 rounded-xl metal-gold font-semibold text-sm flex items-center justify-center gap-2 transition-all"
        >
          {isAnalyzing ? (
            <>
              <ListRestart className="h-4 w-4 animate-spin text-brand-ink" />
              <span>Computing optimizations...</span>
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 text-yellow-300 animate-pulse" />
              <span>Run AI master optimization</span>
            </>
          )}
        </button>

        <p className="text-[9px] text-brand-ink-muted font-mono text-center leading-normal">
          Reads the real master output (spectral bands + peak/RMS) and only adjusts the lowpass cutoff/Q and
          master volume when a measurement actually calls for it. It can't fix bass buildup or panning from
          here - those get a text pointer to the Mixer tab instead of a fake fix.
        </p>
      </div>
    </div>
  );
}
