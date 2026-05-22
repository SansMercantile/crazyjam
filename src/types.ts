/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface NoteEvent {
  step: number; // 0 to 15
  note: string; // e.g., "A3", "C4", "E4"
  duration: number; // steps
}

export interface DrumLane {
  id: "kick" | "snare" | "hihat" | "perc";
  name: string;
  pattern: boolean[]; // size 16
  color: string;
}

export interface TrackState {
  id: string; // "drums" | "lead" | "bass" | "pad"
  name: string;
  type: "drums" | "synth";
  volume: number; // 0.0 to 1.0
  pan: number; // -1.0 (left) to 1.0 (right)
  muted: boolean;
  soloed: boolean;
  color: string;
  // Specific sequencer states
  drumLanes?: DrumLane[];
  melodyNotes?: NoteEvent[]; // synth tracks
  instrumentType?: "saw" | "square" | "sine" | "triangle" | "pluck";
}

export interface AgentLog {
  id: string;
  agentName: string;
  role: string;
  avatar: string;
  message: string;
  timestamp: string;
  phase: "A&R" | "Sequence" | "Harmonics" | "Mixdown" | "System";
  status: "idle" | "thinking" | "completed" | "alert";
}

export interface ServiceAgent {
  id: string;
  name: string;
  role: string;
  description: string;
  avatar: string;
  type: "genre" | "production" | "insights";
  enabled: boolean;
  agencyLevel: number; // 0 to 100% (autonomy)
  biasValue: number; // -50 to +50 (e.g., warmer vs colder, conservative vs experimental)
  specialty: string;
}

export interface MusicBlueprint {
  title: string;
  genre: string;
  tempo: number;
  scale: string;
  tracks: TrackState[];
  debates: AgentLog[];
}
