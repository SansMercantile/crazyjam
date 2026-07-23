/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hand-written Standard MIDI File (SMF format 1) encoder. No external
 * dependency - the format is simple enough to write directly: a header
 * chunk plus one track chunk per instrument, each a stream of
 * delta-time + event bytes. Drums go on GM channel 10 (index 9) using
 * standard GM drum note numbers; melodic tracks get their own channel
 * and a General MIDI program change for a reasonable default timbre.
 */
import { TrackState, SongSection } from "../types";

const TICKS_PER_STEP = 120; // 480 ticks/quarter note, 4 steps per quarter (16th notes)

const GM_DRUM_NOTES: Record<string, number> = {
  kick: 36,   // Bass Drum 1
  snare: 38,  // Acoustic Snare
  hihat: 42,  // Closed Hi-Hat
  perc: 39,   // Hand Clap
};

const GM_PROGRAM: Record<string, number> = {
  lead: 80,  // Lead 1 (square) - 0-indexed program numbers
  bass: 38,  // Synth Bass 1
  pad: 88,   // Pad 1 (new age)
};

function noteNameToMidi(note: string): number | null {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const match = note.match(/^([A-G]#?)(-?\d+)$/);
  if (!match) return null;
  const semitone = names.indexOf(match[1]);
  if (semitone === -1) return null;
  const octave = parseInt(match[2], 10);
  return 12 * (octave + 1) + semitone;
}

function writeVarLen(value: number): number[] {
  const bytes: number[] = [value & 0x7f];
  value >>= 7;
  while (value > 0) {
    bytes.unshift((value & 0x7f) | 0x80);
    value >>= 7;
  }
  return bytes;
}

class MidiTrackBuilder {
  events: { tick: number; bytes: number[] }[] = [];

  noteOn(tick: number, channel: number, note: number, velocity = 100) {
    this.events.push({ tick, bytes: [0x90 | channel, note, velocity] });
  }
  noteOff(tick: number, channel: number, note: number) {
    this.events.push({ tick, bytes: [0x80 | channel, note, 0] });
  }
  programChange(tick: number, channel: number, program: number) {
    this.events.push({ tick, bytes: [0xc0 | channel, program] });
  }
  tempoMeta(tick: number, bpm: number) {
    const microsPerBeat = Math.round(60_000_000 / bpm);
    this.events.push({
      tick,
      bytes: [0xff, 0x51, 0x03, (microsPerBeat >> 16) & 0xff, (microsPerBeat >> 8) & 0xff, microsPerBeat & 0xff],
    });
  }

  toBytes(): number[] {
    this.events.sort((a, b) => a.tick - b.tick);
    const out: number[] = [];
    let lastTick = 0;
    for (const ev of this.events) {
      out.push(...writeVarLen(ev.tick - lastTick));
      out.push(...ev.bytes);
      lastTick = ev.tick;
    }
    // End of track
    out.push(0x00, 0xff, 0x2f, 0x00);

    const header = [0x4d, 0x54, 0x72, 0x6b]; // "MTrk"
    const length = out.length;
    const lengthBytes = [(length >> 24) & 0xff, (length >> 16) & 0xff, (length >> 8) & 0xff, length & 0xff];
    return [...header, ...lengthBytes, ...out];
  }
}

/** Writes one bar (16 steps) of a track list at `tickOffset`, into the
 * given per-channel builders. Shared by both the single-loop and the
 * full-arrangement exporters so the note-placement logic isn't duplicated. */
function writeBarToTracks(
  tracks: TrackState[],
  tickOffset: number,
  drumTrack: MidiTrackBuilder,
  melodicTracks: Record<string, MidiTrackBuilder>
) {
  for (const track of tracks) {
    if (track.type === "drums" && track.drumLanes) {
      for (const lane of track.drumLanes) {
        const gmNote = GM_DRUM_NOTES[lane.id];
        if (gmNote == null) continue;
        lane.pattern.forEach((hit, step) => {
          if (!hit) return;
          const tick = tickOffset + step * TICKS_PER_STEP;
          drumTrack.noteOn(tick, 9, gmNote, 100);
          drumTrack.noteOff(tick + TICKS_PER_STEP - 5, 9, gmNote);
        });
      }
    } else if (track.type === "synth" && track.melodyNotes) {
      const builder = melodicTracks[track.id];
      if (!builder) continue;
      for (const n of track.melodyNotes) {
        const midiNote = noteNameToMidi(n.note);
        if (midiNote == null) continue;
        const tick = tickOffset + n.step * TICKS_PER_STEP;
        builder.noteOn(tick, builder === melodicTracks.lead ? 0 : builder === melodicTracks.bass ? 1 : 2, midiNote, 95);
        builder.noteOff(tick + TICKS_PER_STEP * (n.duration || 1) - 5, builder === melodicTracks.lead ? 0 : builder === melodicTracks.bass ? 1 : 2, midiNote);
      }
    }
  }
}

function assembleSmf(builders: MidiTrackBuilder[]): Blob {
  const trackChunks = builders.map((b) => b.toBytes());
  const header = [
    0x4d, 0x54, 0x68, 0x64, // "MThd"
    0x00, 0x00, 0x00, 0x06, // header length = 6
    0x00, 0x01, // format 1 (multi-track, synchronous)
    (trackChunks.length >> 8) & 0xff, trackChunks.length & 0xff,
    (TICKS_PER_STEP * 4 >> 8) & 0xff, (TICKS_PER_STEP * 4) & 0xff, // division = ticks per quarter note (480)
  ];
  const allBytes = [header, ...trackChunks].flat();
  return new Blob([new Uint8Array(allBytes)], { type: "audio/midi" });
}

function buildTrackSet() {
  const drumTrack = new MidiTrackBuilder();
  const melodicTracks: Record<string, MidiTrackBuilder> = {
    lead: new MidiTrackBuilder(),
    bass: new MidiTrackBuilder(),
    pad: new MidiTrackBuilder(),
  };
  melodicTracks.lead.programChange(0, 0, GM_PROGRAM.lead);
  melodicTracks.bass.programChange(0, 1, GM_PROGRAM.bass);
  melodicTracks.pad.programChange(0, 2, GM_PROGRAM.pad);
  return { drumTrack, melodicTracks };
}

/** Export a single 16-step loop (one bar) as a .mid file. */
export function exportLoopAsMidi(tracks: TrackState[], tempo: number): Blob {
  const tempoTrack = new MidiTrackBuilder();
  tempoTrack.tempoMeta(0, tempo);

  const { drumTrack, melodicTracks } = buildTrackSet();
  writeBarToTracks(tracks, 0, drumTrack, melodicTracks);

  return assembleSmf([tempoTrack, drumTrack, melodicTracks.lead, melodicTracks.bass, melodicTracks.pad]);
}

/** Export a full multi-section arrangement (from the timeline) as a
 * single .mid file, each section's bar placed back-to-back in order. */
export function exportArrangementAsMidi(sections: SongSection[], tempo: number): Blob {
  const tempoTrack = new MidiTrackBuilder();
  tempoTrack.tempoMeta(0, tempo);

  const { drumTrack, melodicTracks } = buildTrackSet();
  const barTicks = TICKS_PER_STEP * 16;

  sections.forEach((section, idx) => {
    writeBarToTracks(section.tracks, idx * barTicks, drumTrack, melodicTracks);
  });

  return assembleSmf([tempoTrack, drumTrack, melodicTracks.lead, melodicTracks.bass, melodicTracks.pad]);
}
