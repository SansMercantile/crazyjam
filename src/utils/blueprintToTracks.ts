/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Converts a stored/generated blueprint (drumPatterns + leadNotes/bassNotes/
 * padNotes) into a full TrackState[] the audio engine can play - shared by
 * the main sequencer and any standalone player (public release pages,
 * artist pages) so playback logic isn't duplicated.
 */
import { TrackState, NoteEvent } from "../types";

export function blueprintToTracks(blueprint: any): TrackState[] {
  const toNotes = (arr: any[] | undefined): NoteEvent[] =>
    (arr || []).map((n: any) => ({ step: n.step, note: n.note, duration: 1 }));

  const coreTracks: TrackState[] = [
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
        { id: "kick", name: "Kick", pattern: blueprint?.drumPatterns?.kick || Array(16).fill(false), color: "bg-rose-500" },
        { id: "snare", name: "Snare", pattern: blueprint?.drumPatterns?.snare || Array(16).fill(false), color: "bg-purple-500" },
        { id: "hihat", name: "Hi-Hat", pattern: blueprint?.drumPatterns?.hihat || Array(16).fill(false), color: "bg-amber-400" },
        { id: "perc", name: "Perc", pattern: blueprint?.drumPatterns?.perc || Array(16).fill(false), color: "bg-teal-400" },
      ],
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
      melodyNotes: toNotes(blueprint?.leadNotes),
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
      melodyNotes: toNotes(blueprint?.bassNotes),
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
      melodyNotes: toNotes(blueprint?.padNotes),
    },
  ];

  // Split-off tracks (guitar/keyboard/extra vocals/etc) saved alongside the
  // core 4 - already in full TrackState shape, just appended as-is.
  const customTracks: TrackState[] = Array.isArray(blueprint?.customTracks) ? blueprint.customTracks : [];

  return [...coreTracks, ...customTracks];
}
