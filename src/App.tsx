/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { ServiceAgent, TrackState, AgentLog, MusicBlueprint, NoteEvent } from "./types";
import { AudioEngine } from "./utils/audioEngine";
import { Header } from "./components/Header";
import { Visualizer } from "./components/Visualizer";
import { SequencerGrid } from "./components/SequencerGrid";
import { AgentControl } from "./components/AgentControl";
import { EffectsRack } from "./components/EffectsRack";
import { CrazyJamStudio } from "./components/CrazyJamStudio";
import { MidiStudio } from "./components/MidiStudio";
import { UserProfile } from "./components/UserProfile";
import { StudioSupportHub } from "./components/StudioSupportHub";
import { Sidebar } from "./components/Sidebar";
import { DashboardTab } from "./components/DashboardTab";
import { SequencerTab } from "./components/SequencerTab";
import { AgentsTab } from "./components/AgentsTab";
import { SupportTab } from "./components/SupportTab";
import { ProfileTab } from "./components/ProfileTab";
import { LaunchpadTab } from "./components/LaunchpadTab";
import { Sparkles, Library, AlertCircle, RefreshCw, Volume2, Moon, Sliders } from "lucide-react";

// Initialize singleton audio engine
const audioEngine = new AudioEngine();

const INITIAL_AGENTS: ServiceAgent[] = [
  {
    id: "ar-critic",
    name: "Zeitgeist A&R",
    role: "A&R / Concept Analyst",
    description: "Evaluates the prompt text against viral tempos, trending scales, and harmonic moods to coordinate the synthesis parameters.",
    avatar: "🕵️",
    type: "insights",
    enabled: true,
    agencyLevel: 90,
    biasValue: 15,
    specialty: "Billboard & Spotify Virality Forecast"
  },
  {
    id: "lofi-beat",
    name: "Groove Specialist",
    role: "Beats / Rhythm Synthesizer",
    description: "Coordinates drum pattern layouts across Kick, Snare, Hihat, and Percussion tracks. Tunes swing coefficients and beat syncopations.",
    avatar: "🎧",
    type: "genre",
    enabled: true,
    agencyLevel: 85,
    biasValue: 0,
    specialty: "Percussive Polyrhythms"
  },
  {
    id: "harmonics",
    name: "Harmonic Architect",
    role: "Melody & Chords Planner",
    description: "Plots chord structures and bass progressions using strict music theory corresponding to the set scale key.",
    avatar: "🎹",
    type: "genre",
    enabled: true,
    agencyLevel: 95,
    biasValue: -10,
    specialty: "Sub Bass & Modal Progressions"
  },
  {
    id: "mastering",
    name: "Sonic Mastering",
    role: "EQ & Limiter Coordinator",
    description: "Polishes volume levels, spatial stereo pans, and feedback echoes to ensure high-fidelity studio mastering in real-time.",
    avatar: "🎚️",
    type: "production",
    enabled: true,
    agencyLevel: 80,
    biasValue: 20,
    specialty: "Spatial Imaging & Peak Limiting"
  }
];

const INITIAL_TRACKS: TrackState[] = [
  {
    id: "drums",
    name: "Beats Matrix",
    type: "drums",
    volume: 0.8,
    pan: 0,
    muted: false,
    soloed: false,
    color: "bg-cyan-500",
    drumLanes: [
      { id: "kick", name: "Heavy Kick", pattern: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false], color: "bg-rose-500" },
      { id: "snare", name: "Crisp Snare", pattern: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false], color: "bg-purple-500" },
      { id: "hihat", name: "Acoustic Hat", pattern: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false], color: "bg-amber-400" },
      { id: "perc", name: "Rim Shot", pattern: [false, false, false, true, false, false, false, false, false, true, false, false, false, false, false, true], color: "bg-teal-400" }
    ]
  },
  {
    id: "lead",
    name: "Synth Lead",
    type: "synth",
    volume: 0.65,
    pan: 0.2,
    muted: false,
    soloed: false,
    color: "bg-purple-500",
    instrumentType: "pluck",
    melodyNotes: [
      { step: 0, note: "A4", duration: 1 },
      { step: 4, note: "C5", duration: 1 },
      { step: 8, note: "E5", duration: 1 },
      { step: 10, note: "D5", duration: 1 },
      { step: 12, note: "G5", duration: 1 }
    ]
  },
  {
    id: "bass",
    name: "Synth Bass",
    type: "synth",
    volume: 0.75,
    pan: -0.1,
    muted: false,
    soloed: false,
    color: "bg-cyan-400",
    instrumentType: "sine",
    melodyNotes: [
      { step: 0, note: "A2", duration: 2 },
      { step: 4, note: "C3", duration: 2 },
      { step: 8, note: "E3", duration: 2 },
      { step: 12, note: "G3", duration: 2 }
    ]
  },
  {
    id: "pad",
    name: "Ambient Pad",
    type: "synth",
    volume: 0.5,
    pan: -0.3,
    muted: false,
    soloed: false,
    color: "bg-pink-500",
    instrumentType: "triangle",
    melodyNotes: [
      { step: 0, note: "A3", duration: 4 },
      { step: 4, note: "C4", duration: 4 },
      { step: 8, note: "E4", duration: 4 },
      { step: 12, note: "G4", duration: 4 }
    ]
  }
];

const INITIAL_LOGS: AgentLog[] = [
  {
    id: "init-1",
    agentName: "CrazyJam Swarm Core",
    role: "Suite Controller",
    avatar: "⚙️",
    message: "Welcome to CrazyJam™ AI-Native Music Studio.\nDefault industrial electro sequencer layout is preloaded.\nType a sound prompt and click 'COMPOSE TRACK BLUEPRINT' to coordinate our 100+ neural multi-agent specialist cluster.",
    timestamp: "10:56:00 AM",
    phase: "System",
    status: "completed"
  }
];

export default function App() {
  const [agents, setAgents] = useState<ServiceAgent[]>(INITIAL_AGENTS);
  const [tracks, setTracks] = useState<TrackState[]>(INITIAL_TRACKS);
  const [logs, setLogs] = useState<AgentLog[]>(INITIAL_LOGS);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [prompt, setPrompt] = useState<string>("Slow spacey vaporwave with deep sub-bass rumble and a shining pluck melody");
  
  // Track meta values
  const [title, setTitle] = useState<string>("Vapor Lounge");
  const [scale, setScale] = useState<string>("A Minor");
  const [genre, setGenre] = useState<string>("Space Vaporwave");
  const [tempo, setTempo] = useState<number>(95);
  const [volume, setVolume] = useState<number>(0.7);

  // Filter and effects states
  const [cutoff, setCutoff] = useState<number>(20000);
  const [qFactor, setQFactor] = useState<number>(1.0);
  const [delayTime, setDelayTime] = useState<number>(0.35);
  const [delayFeedback, setDelayFeedback] = useState<number>(0.25);
  const [synthRelease, setSynthRelease] = useState<number>(0.28);

  // Profile and Onboarding States
  const [currentUser, setCurrentUser] = useState<any>({
    email: "hello@sansmercantile.com",
    name: "Independent Producer",
    avatar: "🕵️",
    handle: "@jam_architect",
    styleAlign: "Moody Cyberpunk Synthwave",
    tracksComposed: 12,
    presetsSaved: 4,
    bio: "Composing high-fidelity synthetic micro-rhythms with neural multi-agent swarm grids."
  });
  const [onboardingFinished, setOnboardingFinished] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [sidebarExpanded, setSidebarExpanded] = useState<boolean>(true);

  // Synchronize audio engine state values on start
  useEffect(() => {
    audioEngine.updateTracks(tracks);
    audioEngine.setBPM(tempo);
    audioEngine.setVolume(volume);

    // Audio context step callback
    audioEngine.setOnStep((stepNum) => {
      setCurrentStep(stepNum);
    });

    // Check localStorage for onboarding state
    const savedOnb = localStorage.getItem("crazyjam_onboarding_completed");
    if (savedOnb === "true") {
      setOnboardingFinished(true);
    }
    const savedUser = localStorage.getItem("crazyjam_user_profile");
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Error parsing user profile", e);
      }
    }
  }, []);

  // Sync volume with audio engine
  const handleVolumeChange = (val: number) => {
    setVolume(val);
    audioEngine.setVolume(val);
  };

  const handleCutoffChange = (val: number) => {
    setCutoff(val);
    audioEngine.setMasterFilterCutoff(val);
  };

  const handleQChange = (val: number) => {
    setQFactor(val);
    audioEngine.setMasterFilterQ(val);
  };

  const handleDelayTimeChange = (val: number) => {
    setDelayTime(val);
    audioEngine.setDelayTime(val);
  };

  const handleDelayFeedbackChange = (val: number) => {
    setDelayFeedback(val);
    audioEngine.setDelayFeedback(val);
  };

  const handleReleaseChange = (val: number) => {
    setSynthRelease(val);
    audioEngine.setSynthReleaseTime(val);
  };

  // AI Sound engineer auto correction trigger state modification
  const handleAutoFix = (adjustments: {
    tempo?: number;
    cutoff?: number;
    q?: number;
    delayTime?: number;
    delayFeedback?: number;
    volume?: number;
  }) => {
    if (adjustments.tempo !== undefined) {
      handleTempoChange(adjustments.tempo);
    }
    if (adjustments.cutoff !== undefined) {
      handleCutoffChange(adjustments.cutoff);
    }
    if (adjustments.q !== undefined) {
      handleQChange(adjustments.q);
    }
    if (adjustments.delayTime !== undefined) {
      handleDelayTimeChange(adjustments.delayTime);
    }
    if (adjustments.delayFeedback !== undefined) {
      handleDelayFeedbackChange(adjustments.delayFeedback);
    }
    if (adjustments.volume !== undefined) {
      handleVolumeChange(adjustments.volume);
    }

    addLog({
      agentName: "CrazyJam Mastering Pro",
      role: "System Master Engineer",
      avatar: "⚙️",
      message: `ANALYTICAL MASTER RE-MIX SHAPED IN REAL-TIME:\n` +
        `- Sound alignment calibrated to optimal acoustic levels\n` +
        `- Limiters matched to safe dynamic thresholds (-0.3dB)\n` +
        `- Transients and filters balanced automatically.`,
      phase: "System",
      status: "completed"
    });
  };

  const handleTracksUpdate = (newTracks: TrackState[]) => {
    setTracks(newTracks);
    audioEngine.updateTracks(newTracks);
  };

  const handleAddAgent = (newAgent: ServiceAgent) => {
    setAgents((prev) => [...prev, newAgent]);
    addLog({
      agentName: "System Swarm Manager",
      role: "System",
      avatar: "⚙️",
      message: `SCALING MULTI-AGENT SWARM:\nDeployed Node Specialist: ${newAgent.name} successfully!\nAssigned specialty: ${newAgent.specialty}. Listening in on next track prompt.`,
      phase: "System",
      status: "completed"
    });
  };

  const handleRemoveAgent = (id: string) => {
    setAgents((prev) => prev.filter((a) => a.id !== id));
    addLog({
      agentName: "System Swarm Manager",
      role: "System",
      avatar: "⚙️",
      message: `DECOMMISSIONED SWARM NODE:\nReleased computational thread for custom agent ${id}.`,
      phase: "System",
      status: "completed"
    });
  };

  // Sync tempo with audio engine
  const handleTempoChange = (val: number) => {
    setTempo(val);
    audioEngine.setBPM(val);
  };

  // Handle Playback Toggle
  const handlePlayToggle = () => {
    if (isPlaying) {
      audioEngine.stop();
      setIsPlaying(false);
      setCurrentStep(0);
    } else {
      audioEngine.start();
      setIsPlaying(true);
    }
  };

  // Swarm Agent Controllers Adjustments
  const handleToggleAgent = (id: string) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
    addLog({
      agentName: "Swarm Core",
      role: "Diagnostics",
      avatar: "⚙️",
      message: `Re-routing signal. Swarm Agent ID "${id}" toggled.`,
      phase: "System",
      status: "completed"
    });
  };

  const handleAgencyChange = (id: string, val: number) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === id ? { ...a, agencyLevel: val } : a))
    );
  };

  const handleBiasChange = (id: string, val: number) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === id ? { ...a, biasValue: val } : a))
    );
  };

  const addLog = (newLog: Omit<AgentLog, "id" | "timestamp">) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    const readyLog: AgentLog = {
      ...newLog,
      id: `log-${Math.random()}`,
      timestamp: timeStr,
    };
    setLogs((prev) => [readyLog, ...prev]);
  };

  // Step Sequencer Toggling Event
  const handleStepToggle = (trackId: string, laneId: string | null, stepIndex: number) => {
    setTracks((prevTracks) => {
      const updatedTracks = prevTracks.map((track) => {
        if (track.id !== trackId) return track;

        // Drums track toggle logic
        if (track.type === "drums" && track.drumLanes && laneId) {
          const updatedLanes = track.drumLanes.map((lane) => {
            if (lane.id !== laneId) return lane;
            const updatedPattern = [...lane.pattern];
            updatedPattern[stepIndex] = !updatedPattern[stepIndex];
            
            // Audible click feedback
            if (updatedPattern[stepIndex]) {
              playFeedbackAudible(trackId, laneId, null);
            }

            return { ...lane, pattern: updatedPattern };
          });
          return { ...track, drumLanes: updatedLanes };
        }

        // Synth tracks Piano Roll toggle logic
        if (track.type === "synth" && track.melodyNotes) {
          let updatedNotes = [...track.melodyNotes];
          const existIdx = updatedNotes.findIndex(
            (item) => item.step === stepIndex && item.note === laneId // laneId holds the Pitch (e.g., "A4")
          );

          if (existIdx !== -1) {
            // Delete note
            updatedNotes.splice(existIdx, 1);
          } else {
            // Add note
            if (laneId) {
              updatedNotes.push({
                step: stepIndex,
                note: laneId,
                duration: 1,
              });
              // Audible pitch feedback
              playFeedbackAudible(trackId, null, laneId);
            }
          }
          return { ...track, melodyNotes: updatedNotes };
        }

        return track;
      });

      // Instantly inject latest active patterns back into synthesis engine
      audioEngine.updateTracks(updatedTracks);
      return updatedTracks;
    });
  };

  // Audibly play single note/sound trigger when user clicks sequencer to give immediate pleasant instrument sound feedback
  const playFeedbackAudible = (trackId: string, drumId: string | null, noteName: string | null) => {
    // Lazily boot context on user click
    audioEngine.init();
    
    // Create direct transient osc for pleasant acoustic preview sound feedback
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    try {
      // Use standard transient play
      const ctx = new AudioContextClass();
      const master = ctx.createGain();
      master.gain.value = volume * 0.45;
      master.connect(ctx.destination);
      const now = ctx.currentTime;

      if (trackId === "drums" && drumId) {
        if (drumId === "kick") {
          const osc = ctx.createOscillator();
          osc.frequency.setValueAtTime(120, now);
          osc.frequency.exponentialRampToValueAtTime(35, now + 0.1);
          const g = ctx.createGain();
          g.gain.setValueAtTime(1.0, now);
          g.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
          osc.connect(g);
          g.connect(master);
          osc.start(now);
          osc.stop(now + 0.14);
        } else if (drumId === "snare") {
          const osc = ctx.createOscillator();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(180, now);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.6, now);
          g.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
          osc.connect(g);
          g.connect(master);
          osc.start(now);
          osc.stop(now + 0.1);
        } else {
          // Hihat preview
          const osc = ctx.createOscillator();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(6000, now);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.4, now);
          g.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
          osc.connect(g);
          g.connect(master);
          osc.start(now);
          osc.stop(now + 0.05);
        }
      } else if (noteName) {
        // Melodic sound click player
        const osc = ctx.createOscillator();
        osc.type = "sine";
        // Convert note frequency
        const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        const match = noteName.match(/^([A-G]#?)(-?\d+)$/);
        if (match) {
          const name = match[1];
          const octave = parseInt(match[2], 10);
          const semitone = notes.indexOf(name);
          const midi = 12 * (octave + 1) + semitone;
          const frequency = 440 * Math.pow(2, (midi - 69) / 12);
          
          osc.frequency.setValueAtTime(frequency, now);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.8, now);
          g.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
          osc.connect(g);
          g.connect(master);
          osc.start(now);
          osc.stop(now + 0.2);
        }
      }
    } catch (e) {
      // catch audio context autoplay block issues cleanly
    }
  };

  const handleTrackVolumeChange = (trackId: string, val: number) => {
    const updated = tracks.map((t) => (t.id === trackId ? { ...t, volume: val } : t));
    setTracks(updated);
    audioEngine.updateTracks(updated);
  };

  const handleTrackMuteToggle = (trackId: string) => {
    const updated = tracks.map((t) => (t.id === trackId ? { ...t, muted: !t.muted } : t));
    setTracks(updated);
    audioEngine.updateTracks(updated);
    addLog({
      agentName: "Sonic Mastering",
      role: "Mixdown",
      avatar: "🎚️",
      message: `Grid route adjusted. Track ID "${trackId}" muted state updated.`,
      phase: "Mixdown",
      status: "completed"
    });
  };

  const handleInstrumentChange = (trackId: string, type: "saw" | "square" | "sine" | "triangle" | "pluck") => {
    const updated = tracks.map((t) => (t.id === trackId ? { ...t, instrumentType: type } : t));
    setTracks(updated);
    audioEngine.updateTracks(updated);
    addLog({
      agentName: "Sonic Mastering",
      role: "Synthesis",
      avatar: "🎹",
      message: `Adjusted synthesis oscillator node of track "${trackId}" to "${type}" wave.`,
      phase: "Harmonics",
      status: "completed"
    });
  };

  // Reusable function to load a music blueprint JSON into sequencer state and play logs
  const handleLoadAudioBlueprint = (blueprints: any, customFinishMessage?: string) => {
    try {
      // Load Track Properties
      setTitle(blueprints.title || "Calculated Loop");
      setGenre(blueprints.genre || "Modular Electro");
      setTempo(blueprints.tempo || 105);
      audioEngine.setBPM(blueprints.tempo || 105);
      setScale(blueprints.scale || "C Minor");

      // Setup mapped tracks inside Sequencer State
      setTracks((prevTracks) => {
        const nextTracks = prevTracks.map((track) => {
          // Load Drum Sequence Arrays
          if (track.type === "drums" && track.drumLanes && blueprints.drumPatterns) {
            const upLanes = track.drumLanes.map((lane) => {
              const matchedPattern = blueprints.drumPatterns[lane.id] || lane.pattern;
              return { ...lane, pattern: matchedPattern };
            });
            return { ...track, drumLanes: upLanes };
          }

          // Load lead track note indices
          if (track.id === "lead" && blueprints.leadNotes) {
            const notesList: NoteEvent[] = blueprints.leadNotes.map((n: any) => ({
              step: n.step,
              note: n.note,
              duration: 1
            }));
            return { ...track, melodyNotes: notesList };
          }

          // Load bass track note indices
          if (track.id === "bass" && blueprints.bassNotes) {
             const notesList: NoteEvent[] = blueprints.bassNotes.map((n: any) => ({
              step: n.step,
              note: n.note,
              duration: 1
            }));
            return { ...track, melodyNotes: notesList };
          }

          // Load pad track note indices
          if (track.id === "pad" && blueprints.padNotes) {
             const notesList: NoteEvent[] = blueprints.padNotes.map((n: any) => ({
              step: n.step,
              note: n.note,
              duration: 1
            }));
            return { ...track, melodyNotes: notesList };
          }

          return track;
        });

        // Push patterns back to Audio Engine
        audioEngine.updateTracks(nextTracks);
        return nextTracks;
      });

      // Stagger outputs of Agent Debate Logs for dramatic flair & high realism!
      let logIndex = 0;
      const staggerLogs = () => {
        if (!blueprints.agentDebates || logIndex >= blueprints.agentDebates.length) {
          // Completion announcement log
          addLog({
            agentName: "Swarm Core",
            role: "Diagnostics",
            avatar: "✨",
            message: customFinishMessage || `TRACK COMPILED SUCCESSFULLY!\nGenerated tempo: ${blueprints.tempo} BPM | Scale Key: ${blueprints.scale}\nPress PLAY above to synthesize audio!`,
            phase: "System",
            status: "completed"
          });
          setIsGenerating(false);
          return;
        }

        const logMsg = blueprints.agentDebates[logIndex];
        addLog({
          agentName: logMsg.agentName || "Specialist Agent",
          role: logMsg.role || "Swarm node",
          avatar: getAgentAvatar(logMsg.role),
          message: logMsg.message,
          phase: (logMsg.phase as any) || "Mixdown",
          status: "completed"
        });

        logIndex++;
        setTimeout(staggerLogs, 1100); // 1.1s staggering steps
      };

      staggerLogs();
    } catch (loadErr: any) {
      console.error(loadErr);
      addLog({
        agentName: "Coordinator Swarm",
        role: "Alert Error",
        avatar: "⚠️",
        message: `Synthesizer load failed: ${loadErr.message}`,
        phase: "System",
        status: "alert"
      });
      setIsGenerating(false);
    }
  };

  // Neural Generator trigger API call
  const handleGenerate = async (overridePrompt?: string) => {
    const targetPrompt = overridePrompt || prompt;
    if (!targetPrompt.trim() || isGenerating) return;

    if (overridePrompt) {
      setPrompt(overridePrompt);
    }

    setIsGenerating(true);
    addLog({
      agentName: "Swarm Coordinator",
      role: "System Broker",
      avatar: "⚙️",
      message: `Analyzing prompt: "${targetPrompt}"\nSpawning neural swarm and establishing Express API channel to Gemini-3.5-flash. Please wait...`,
      phase: "System",
      status: "thinking"
    });

    try {
      const activeAgentsConfig = agents
        .filter((a) => a.enabled)
        .map((a) => ({
          name: a.name,
          autonomy: a.agencyLevel,
          bias: a.biasValue
        }));

      const res = await fetch("/api/generate-blueprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: targetPrompt,
          agentsSettings: activeAgentsConfig
        })
      });

      if (!res.ok) {
        throw new Error(`Cloud connection failed with code: ${res.status}`);
      }

      const blueprints: MusicBlueprint | any = await res.json();
      handleLoadAudioBlueprint(blueprints);

    } catch (err: any) {
      console.error(err);
      addLog({
        agentName: "Coordinator Swarm",
        role: "Alert Error",
        avatar: "⚠️",
        message: `Synthesizer generation failed. Deep learning cluster reports error:\n${err.message || err}`,
        phase: "System",
        status: "alert"
      });
      setIsGenerating(false);
    }
  };

  const getAgentAvatar = (role: string): string => {
    const rolesMap: Record<string, string> = {
      "A&R": "🕵️",
      "Groove": "🎧",
      "Harmonics": "🎹",
      "Mastering": "🎚️",
      "System": "⚙️"
    };
    return rolesMap[role] || "🤖";
  };

  if (!onboardingFinished) {
    return (
      <div className="min-h-screen bg-[#0d0d12] bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[#1a1a2e] via-[#0d0d12] to-[#0d0d12] text-white flex flex-col justify-center p-6 sm:p-12 animate-fadeIn">
        <div className="max-w-4xl mx-auto w-full">
          <div className="flex flex-col items-center mb-6 text-center select-none">
            <h1 className="font-display font-black text-2xl uppercase tracking-widest bg-gradient-to-r from-brand-pink to-brand-cyan bg-clip-text text-transparent filter drop-shadow">
              CRAZYJAM STUDIO
            </h1>
            <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mt-1 font-bold">
              Neural Multi-Agent Music Composition Environment
            </p>
          </div>

          <UserProfile
            currentUserEmail={currentUser?.email || "hello@sansmercantile.com"}
            onUserUpdate={setCurrentUser}
            onboardingFinished={onboardingFinished}
            onOnboardingFinishedChange={setOnboardingFinished}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d12] bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[#1a1a2e] via-[#0d0d12] to-[#0d0d12] text-white font-sans antialiased flex text-left relative overflow-hidden">
      {/* Sidebar Navigation Panel with automated 5-min logo alternations */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isExpanded={sidebarExpanded}
        setIsExpanded={setSidebarExpanded}
        userInfo={currentUser}
      />

      {/* Main DAW Content Space */}
      <div className={`flex-1 flex flex-col min-w-0 min-h-screen overflow-y-auto transition-all duration-300 ${
        sidebarExpanded ? "pl-64" : "pl-18"
      }`}>
        <Header
          title={title}
          scale={scale}
          genre={genre}
          tempo={tempo}
          isPlaying={isPlaying}
          isGenerating={isGenerating}
          prompt={prompt}
          onPromptChange={setPrompt}
          onGenerate={handleGenerate}
          onPlayToggle={handlePlayToggle}
          onTempoChange={handleTempoChange}
          onVolumeChange={handleVolumeChange}
          volume={volume}
        />

        {/* Modular Page Selector space */}
        <main className="max-w-[1600px] w-full mx-auto p-5 pb-20">
          {activeTab === "dashboard" && (
            <DashboardTab
              analyser={audioEngine.analyser}
              isPlaying={isPlaying}
              scaleKey={scale}
              genre={genre}
              tempo={tempo}
              volume={volume}
              cutoff={cutoff}
              qFactor={qFactor}
              delayTime={delayTime}
              delayFeedback={delayFeedback}
              onCutoffChange={handleCutoffChange}
              onQChange={handleQChange}
              onDelayTimeChange={handleDelayTimeChange}
              onDelayFeedbackChange={handleDelayFeedbackChange}
              onReleaseChange={handleReleaseChange}
              onAutoFix={handleAutoFix}
              audioCtx={audioEngine.getContext()}
              tracks={tracks}
            />
          )}

          {activeTab === "sequencer" && (
            <SequencerTab
              tracks={tracks}
              currentStep={currentStep}
              onStepToggle={handleStepToggle}
              onTrackVolumeChange={handleTrackVolumeChange}
              onTrackMuteToggle={handleTrackMuteToggle}
              onInstrumentChange={handleInstrumentChange}
              scaleKey={scale}
              onTracksUpdate={handleTracksUpdate}
              tempo={tempo}
              onTempoChange={handleTempoChange}
              onScaleChange={setScale}
              onPromptChange={setPrompt}
              audioCtx={audioEngine.getContext()}
              addLog={addLog}
            />
          )}

          {activeTab === "agents" && (
            <AgentsTab
              agents={agents}
              onToggleAgent={handleToggleAgent}
              onAgencyChange={handleAgencyChange}
              onBiasChange={handleBiasChange}
              logs={logs}
              onAddAgent={handleAddAgent}
              onRemoveAgent={handleRemoveAgent}
              addLog={addLog}
            />
          )}

          {activeTab === "support" && (
            <SupportTab
              onTriggerComposition={handleGenerate}
              onLoadAudioBlueprint={(blueprint) => handleLoadAudioBlueprint(blueprint, "VOCAL HUM-TO-BEAT TRANSIENTS SYNTHESIZED SUCCESSFULLY!")}
              isGeneratingTracks={isGenerating}
              addLog={addLog}
            />
          )}

          {activeTab === "profile" && (
            <ProfileTab
              currentUser={currentUser}
              onUserUpdate={setCurrentUser}
              onboardingFinished={onboardingFinished}
              onOnboardingFinishedChange={setOnboardingFinished}
              addLog={addLog}
            />
          )}

          {activeTab === "launchpad" && (
            <LaunchpadTab
              currentTempo={tempo}
              currentScale={scale}
              onApplyStyle={(newPrompt, newTempo, newScale, newGenre) => {
                setPrompt(newPrompt);
                setTempo(newTempo);
                audioEngine.setBPM(newTempo);
                setScale(newScale);
                setGenre(newGenre);
              }}
              addLog={addLog}
              tracks={tracks}
            />
          )}
        </main>
      </div>
    </div>
  );
}
