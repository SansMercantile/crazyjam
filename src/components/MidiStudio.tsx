/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
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
  // MIDI States
  const [midiSupported, setMidiSupported] = useState(false);
  const [midiDevices, setMidiDevices] = useState<MidiDevice[]>([]);
  const [activeMidiLog, setActiveMidiLog] = useState<string[]>(["MIDI Engine initialized successfully."]);
  const [virtualKeyboardOctave, setVirtualKeyboardOctave] = useState<number>(4);
  const [lastKeyPressed, setLastKeyPressed] = useState<string | null>(null);

  // USB Device States
  const [usbConnected, setUsbConnected] = useState<boolean>(false);
  const [virtualInputDevice, setVirtualInputDevice] = useState<string>("Keyboard controller");

  // Master Sound Engineer states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [optimizationScore, setOptimizationScore] = useState(74);
  const [diagnosticsList, setDiagnosticsList] = useState<any[]>([
    { id: "warn-1", type: "warning", message: "Mid frequency clutter detected on Insert 2 (Lead synth layer).", fix: "Attenuate mid frequency by 2.2dB." },
    { id: "warn-2", type: "warning", message: "Sub-bass headroom is insufficient. Soft limiter is near active clipping.", fix: "Lower synth bass fader or engage Master Limiter threshold." },
    { id: "info-1", type: "optimal", message: "Pitch scale key is aligned to sequencer modal grid.", fix: "No adjustments needed." }
  ]);

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

  // Real-time Master engineer optimization handler
  const handleEngineerOptimize = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      
      // Perform acoustic recalculation
      // Suggest automatic correct variables (e.g. adjust low cutoff, perfect tempo, release delay peaks)
      onAutoFix({
        tempo: Math.max(100, Math.min(125, tempo + 5)), // perfect pocket
        cutoff: cutoff > 18000 ? 12000 : Math.max(800, cutoff - 150), // eliminate high-end harshness
        q: 1.2, // set transparent resonance
        delayTime: 0.33, // snap delay to 1/4 note grid
        delayFeedback: 0.3, // eliminate loop congestion
        volume: 0.8 // perfect loudness pocket
      });

      setOptimizationScore(98);
      setDiagnosticsList([
        { id: "success-1", type: "optimal", message: "Insert 2 (Lead synth) high frequencies smoothed via Dynamic EQ.", fix: "Optimized." },
        { id: "success-2", type: "optimal", message: "Mid-bass headroom expanded. Limiter ceiling optimized to -0.3dBFS.", fix: "Optimized." },
        { id: "info-1", type: "optimal", message: "Loudness target matched to Spotify Streaming standard (-14 LUFsi).", fix: "Optimized." }
      ]);
    }, 1800);
  };

  return (
    <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 mt-6 animate-fadeIn" id="midi-usb-hub">
      {/* LEFT SECTION: MIDI & USB CONNECTIVES */}
      <div className="xl:col-span-6 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-brand-border pb-3">
          <div className="flex items-center gap-2 text-brand-gold">
            <Plug className="h-4.5 w-4.5 text-brand-gold animate-pulse" />
            <h2 className="font-display font-semibold text-sm tracking-wide uppercase text-brand-ink">
              USB Instrument & MIDI Controller Station
            </h2>
          </div>
          <span className="text-[9px] font-mono text-brand-gold uppercase bg-brand-gold/10 border border-brand-gold/30 px-2 py-0.5 rounded font-medium">
            Keyboard Interface
          </span>
        </div>

        {/* Device Sync Matrix */}
        <div className="bg-brand-bg p-4 rounded-2xl border border-brand-border flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-medium text-brand-ink-muted uppercase">Connection Status</span>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 block animate-pulse" />
              <span className="text-[10px] font-mono text-emerald-400 font-medium uppercase">MIDI Engine Active</span>
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
                className={`px-2.5 py-1 text-[9px] font-mono font-medium uppercase rounded border cursor-pointer transition-all ${
                  usbConnected ? "bg-emerald-500 border-emerald-500/30" : "bg-brand-surface-2 border-brand-border text-brand-ink hover:border-[#e59632]"
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
                  <span className="text-[8px] font-mono text-emerald-400 font-semibold tracking-wide bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase leading-none border border-emerald-500/20">
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
            <span className="text-[10px] font-mono text-brand-ink-muted uppercase font-semibold">Interactive Virtual Keydeck</span>
            <div className="flex items-center gap-1 font-mono text-[9px]">
              <span className="text-brand-ink-muted uppercase mr-1">Octave</span>
              {[3, 4, 5].map(oct => (
                <button
                  key={oct}
                  onClick={() => setVirtualKeyboardOctave(oct)}
                  className={`w-5 h-5 rounded flex items-center justify-center font-medium cursor-pointer transition-all ${
                    virtualKeyboardOctave === oct ? "bg-[#e59632] font-semibold" : "bg-brand-surface-2 text-brand-ink-muted hover:bg-brand-surface-2"
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
                className={`flex-1 bg-brand-surface-2 hover:bg-brand-surface-2 active:bg-brand-gold border border-brand-bg/20 text-[10px] font-mono font-extrabold text-[#0c0e17] flex items-end justify-center pb-1.5 rounded-sm transition-all shadow-[0_3px_5px_rgba(0,0,0,0.35)] cursor-pointer`}
              >
                {note}
              </button>
            ))}

            {/* Simulated Black Keys */}
            <button onClick={() => handleVirtualKeyPress("C#")} className="absolute h-12 w-4 cursor-pointer bg-[#0c0e17] hover:bg-slate-800 active:bg-brand-gold text-[7px] font-mono font-medium text-brand-ink flex items-end justify-center pb-1 rounded-sm border-r border-b border-brand-border" style={{ left: "11.5%" }} >C#</button>
            <button onClick={() => handleVirtualKeyPress("D#")} className="absolute h-12 w-4 cursor-pointer bg-[#0c0e17] hover:bg-slate-800 active:bg-brand-gold text-[7px] font-mono font-medium text-brand-ink flex items-end justify-center pb-1 rounded-sm border-r border-b border-brand-border" style={{ left: "25.5%" }} >D#</button>
            <button onClick={() => handleVirtualKeyPress("F#")} className="absolute h-12 w-4 cursor-pointer bg-[#0c0e17] hover:bg-slate-800 active:bg-brand-gold text-[7px] font-mono font-medium text-brand-ink flex items-end justify-center pb-1 rounded-sm border-r border-b border-brand-border" style={{ left: "54.5%" }} >F#</button>
            <button onClick={() => handleVirtualKeyPress("G#")} className="absolute h-12 w-4 cursor-pointer bg-[#0c0e17] hover:bg-slate-800 active:bg-brand-gold text-[7px] font-mono font-medium text-brand-ink flex items-end justify-center pb-1 rounded-sm border-r border-b border-brand-border" style={{ left: "68.5%" }} >G#</button>
            <button onClick={() => handleVirtualKeyPress("A#")} className="absolute h-12 w-4 cursor-pointer bg-[#0c0e17] hover:bg-slate-800 active:bg-brand-gold text-[7px] font-mono font-medium text-brand-ink flex items-end justify-center pb-1 rounded-sm border-r border-b border-brand-border" style={{ left: "82.5%" }} >A#</button>
          </div>

          <div className="flex items-center justify-between text-[9px] font-mono">
            <span className="text-brand-ink-muted italic">Tip: Key triggers are polyphonic and fully mapped dynamically.</span>
            <span className="text-brand-gold font-medium block uppercase tracking-wide">
              {lastKeyPressed ? `Last Trigger: ${lastKeyPressed}` : "Idle"}
            </span>
          </div>
        </div>

        {/* Real-time MIDI data steam log block */}
        <div className="bg-brand-bg/60 p-3 rounded-xl border border-brand-border flex flex-col gap-1.5 h-32 overflow-hidden">
          <span className="text-[9px] font-mono text-brand-ink-muted tracking-wide font-semibold uppercase">Hardware signal console logs</span>
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
            <h2 className="font-display font-semibold text-sm tracking-wide uppercase text-brand-ink">
              CrazyJam AI Intelligent Master Engineer
            </h2>
          </div>
          <span className="text-[9px] font-mono text-brand-gold uppercase bg-brand-gold/10 border border-brand-gold/30 px-2 py-0.5 rounded font-medium">
            Auto-Mix Suite
          </span>
        </div>

        {/* Dynamic Diagnostics Analyzer Dashboard */}
        <div className="bg-brand-bg p-4 rounded-2xl border border-brand-border flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[9px] font-mono text-brand-ink-muted uppercase tracking-wide font-semibold block">Mixing & Loudness Health</span>
              <h3 className="text-xs font-medium text-brand-ink">Neural Analytical Health Score</h3>
            </div>

            <div className="h-12 w-12 rounded-full border border-brand-border flex flex-col justify-center items-center backdrop-blur-md relative" style={{ boxShadow: optimizationScore > 90 ? "0 0 15px rgba(16,185,129,0.25)" : "0 0 15px rgba(239,68,68,0.15)" }}>
              <span className={`text-base font-semibold font-mono leading-none ${optimizationScore > 90 ? "text-emerald-400" : "text-[#e59632]"}`}>
                {optimizationScore}%
              </span>
              <span className="text-[7px] font-mono text-brand-ink-muted uppercase mt-0.5 font-medium">Acoustic</span>
            </div>
          </div>

          {/* Progress analyzer levels bar */}
          <div className="grid grid-cols-3 gap-3 border-t border-b border-brand-border py-3 font-mono text-[9px] uppercase font-medium text-brand-ink-muted">
            <div>
              <span className="block text-brand-ink-muted mb-0.5">Bass Clutter</span>
              <div className="w-full bg-brand-surface-2 h-1.5 rounded overflow-hidden">
                <div className={`h-full ${optimizationScore > 90 ? "bg-emerald-500 w-[15%]" : "bg-brand-gold w-[68%]"}`} />
              </div>
            </div>
            <div>
              <span className="block text-brand-ink-muted mb-0.5">High Crispness</span>
              <div className="w-full bg-brand-surface-2 h-1.5 rounded overflow-hidden">
                <div className="h-full bg-brand-gold w-[82%]" />
              </div>
            </div>
            <div>
              <span className="block text-brand-ink-muted mb-0.5">Loudness Target</span>
              <div className="w-full bg-brand-surface-2 h-1.5 rounded overflow-hidden">
                <div className={`h-full ${optimizationScore > 90 ? "bg-emerald-500 w-[94%]" : "bg-[#e59632] w-[45%]"}`} />
              </div>
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
                    <strong className="text-brand-ink-muted font-semibold uppercase">Correction target:</strong> {diag.fix}
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
          className="w-full py-4 rounded-xl bg-gradient-to-r from-brand-purple to-brand-gold hover:scale-[1.01] text-brand-ink font-semibold text-xs uppercase tracking-wide flex items-center justify-center gap-2 cursor-pointer transition-all border-t border-brand-border select-none shadow-neon-glow"
        >
          {isAnalyzing ? (
            <>
              <ListRestart className="h-4 w-4 animate-spin text-brand-ink" />
              <span>CRAZYJAM COMPUTING MASTER ACOUSTICS EQUALIZER...</span>
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 text-yellow-300 animate-pulse" />
              <span>ENGAGE AI MASTER SOUND ENGINE OPTIMIZATION</span>
            </>
          )}
        </button>

        <p className="text-[9px] text-brand-ink-muted font-mono text-center leading-normal">
          The sound engineer operates by optimizing real-time modular synthesis gain coefficients to Spotify/Club alignment. Click engage to auto-set effects mix and levels instantly.
        </p>
      </div>
    </div>
  );
}
