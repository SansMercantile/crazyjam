/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TrackState, NoteEvent } from "../types";

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayGain: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  public analyser: AnalyserNode | null = null;

  private isRunning: boolean = false;
  private tempo: number = 110;
  private currentStep: number = 0;
  private timerId: any = null;
  private lastStepTime: number = 0;
  private stepListeners: Array<(step: number) => void> = [];

  // Real-time custom FX parameters
  private masterFilterCutoff: number = 20000; // default wide open (Hz)
  private masterFilterQ: number = 1.0;
  private delayFeedback: number = 0.25;
  private delayTimeValue: number = 0.35;
  private synthReleaseTime: number = 0.28;
  private masterFilterNode: BiquadFilterNode | null = null;

  // Track data cache
  private tracks: TrackState[] = [];

  // Per-track 6-band EQ (gain in dB, -15 to +15, default flat). Applied at
  // note-trigger time rather than via a persistent bus - cheap enough at
  // 16th-note resolution, and it means the exact same code path works for
  // both live playback and offline stem/mix rendering.
  private trackEQSettings: Record<string, number[]> = {};

  public static readonly EQ_BANDS: { freq: number; type: BiquadFilterType; label: string }[] = [
    { freq: 60, type: "lowshelf", label: "60 Hz" },
    { freq: 150, type: "peaking", label: "150 Hz" },
    { freq: 500, type: "peaking", label: "500 Hz" },
    { freq: 2000, type: "peaking", label: "2 kHz" },
    { freq: 6000, type: "peaking", label: "6 kHz" },
    { freq: 12000, type: "highshelf", label: "12 kHz" },
  ];

  public setTrackEQBand(trackId: string, bandIndex: number, gainDb: number) {
    if (!this.trackEQSettings[trackId]) this.trackEQSettings[trackId] = [0, 0, 0, 0, 0, 0];
    this.trackEQSettings[trackId][bandIndex] = Math.max(-15, Math.min(15, gainDb));
  }

  public getTrackEQ(trackId: string): number[] {
    return this.trackEQSettings[trackId] ? [...this.trackEQSettings[trackId]] : [0, 0, 0, 0, 0, 0];
  }

  public resetTrackEQ(trackId: string) {
    this.trackEQSettings[trackId] = [0, 0, 0, 0, 0, 0];
  }

  /** Builds a fresh 6-band filter chain for this trigger and returns its
   * input node, or `destination` unchanged if every band is flat (skips
   * the extra nodes entirely - most triggers, most of the time). */
  private routeThroughTrackEQ(trackId: string, ctx: BaseAudioContext, destination: AudioNode): AudioNode {
    const bands = this.trackEQSettings[trackId];
    if (!bands || bands.every((g) => g === 0)) return destination;

    let previous: AudioNode | null = null;
    let firstNode: AudioNode | null = null;

    AudioEngine.EQ_BANDS.forEach((band, i) => {
      const filter = ctx.createBiquadFilter();
      filter.type = band.type;
      filter.frequency.value = band.freq;
      filter.gain.value = bands[i];
      if (band.type === "peaking") filter.Q.value = 1;

      if (!firstNode) firstNode = filter;
      if (previous) previous.connect(filter);
      previous = filter;
    });

    (previous as unknown as AudioNode).connect(destination);
    return firstNode as unknown as AudioNode;
  }

  constructor() {
    // Lazy initialized on first user interaction
  }

  public getContext(): AudioContext | null {
    this.init();
    return this.ctx;
  }

  public init() {
    if (this.ctx) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      console.warn("Web Audio API not supported in this browser.");
      return;
    }

    this.ctx = new AudioContextClass();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.8;

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;

    this.delayNode = this.ctx.createDelay(1.0);
    this.delayNode.delayTime.value = this.delayTimeValue;
    this.delayGain = this.ctx.createGain();
    this.delayGain.gain.value = this.delayFeedback;

    this.masterFilterNode = this.ctx.createBiquadFilter();
    this.masterFilterNode.type = "lowpass";
    this.masterFilterNode.frequency.value = this.masterFilterCutoff;
    this.masterFilterNode.Q.value = this.masterFilterQ;

    this.masterGain.connect(this.masterFilterNode);
    this.masterFilterNode.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    this.masterFilterNode.connect(this.delayNode);
    this.delayNode.connect(this.delayGain);
    this.delayGain.connect(this.delayNode);
    this.delayGain.connect(this.analyser);

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public setVolume(val: number) {
    this.init();
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(val, this.ctx.currentTime);
    }
  }

  public setMasterFilterCutoff(freq: number) {
    this.masterFilterCutoff = freq;
    if (this.masterFilterNode && this.ctx) {
      this.masterFilterNode.frequency.setValueAtTime(freq, this.ctx.currentTime);
    }
  }

  public setMasterFilterQ(q: number) {
    this.masterFilterQ = q;
    if (this.masterFilterNode && this.ctx) {
      this.masterFilterNode.Q.setValueAtTime(q, this.ctx.currentTime);
    }
  }

  public setDelayFeedback(val: number) {
    this.delayFeedback = val;
    if (this.delayGain && this.ctx) {
      this.delayGain.gain.setValueAtTime(val, this.ctx.currentTime);
    }
  }

  public setDelayTime(timeSec: number) {
    this.delayTimeValue = timeSec;
    if (this.delayNode && this.ctx) {
      this.delayNode.delayTime.setValueAtTime(timeSec, this.ctx.currentTime);
    }
  }

  public setSynthReleaseTime(releaseSec: number) {
    this.synthReleaseTime = releaseSec;
  }

  public setBPM(bpm: number) {
    this.tempo = bpm;
  }

  public getBPM(): number {
    return this.tempo;
  }

  public updateTracks(newTracks: TrackState[]) {
    this.tracks = newTracks;
  }

  /** Legacy single-listener API (kept for backward compatibility - overwrites any listeners set this way) */
  public setOnStep(cb: (step: number) => void) {
    this.stepListeners = [cb];
  }

  /** Register an additional step listener without clobbering others (used by the multitrack timeline for arrangement auto-advance alongside the main UI's step display). */
  public addStepListener(cb: (step: number) => void) {
    this.stepListeners.push(cb);
  }

  public removeStepListener(cb: (step: number) => void) {
    this.stepListeners = this.stepListeners.filter((l) => l !== cb);
  }

  public start() {
    this.init();
    if (this.isRunning) return;

    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    this.isRunning = true;
    this.currentStep = 0;
    this.lastStepTime = this.ctx ? this.ctx.currentTime : 0;

    const stepIntervalMs = () => (60 / this.tempo / 4) * 1000;

    const runScheduler = () => {
      if (!this.isRunning) return;

      this.triggerStep(this.currentStep);

      for (const listener of this.stepListeners) {
        listener(this.currentStep);
      }

      this.currentStep = (this.currentStep + 1) % 16;
      this.timerId = setTimeout(runScheduler, stepIntervalMs());
    };

    runScheduler();
  }

  public stop() {
    this.isRunning = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  public isPlaying() {
    return this.isRunning;
  }

  private triggerStep(step: number) {
    if (!this.ctx || !this.masterGain) return;
    this.triggerStepInto(this.tracks, step, this.ctx, this.masterGain);
  }

  /** Core step-trigger logic, parameterized over context/destination so it
   * can drive either live playback or an OfflineAudioContext render. */
  private triggerStepInto(tracks: TrackState[], step: number, ctx: BaseAudioContext, destination: AudioNode, timeOverride?: number) {
    const now = timeOverride ?? (ctx as AudioContext).currentTime;

    for (const track of tracks) {
      if (track.muted) continue;
      const trackDestination = this.routeThroughTrackEQ(track.id, ctx, destination);

      if (track.type === "drums" && track.drumLanes) {
        const volumeFactor = track.volume;
        for (const lane of track.drumLanes) {
          if (lane.pattern[step]) {
            this.playDrum(lane.id as any, now, volumeFactor, ctx, trackDestination);
          }
        }
      }

      if (track.type === "synth" && track.melodyNotes) {
        const matchedNote = track.melodyNotes.find((n) => n.step === step);
        if (matchedNote) {
          this.playSynthNote(track.id, matchedNote.note, now, track.volume, track.instrumentType || "saw", ctx, trackDestination);
        }
      }
    }
  }

  // --- Synthesis primitives, parameterized over ctx/destination ---

  private playKick(time: number, volume: number, ctx: BaseAudioContext, destination: AudioNode) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(destination);
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.15);
    gain.gain.setValueAtTime(volume * 1.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
    osc.start(time);
    osc.stop(time + 0.22);
  }

  private playSnare(time: number, volume: number, ctx: BaseAudioContext, destination: AudioNode) {
    const bufferSize = ctx.sampleRate * 0.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1000, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume * 0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    const toneOsc = ctx.createOscillator();
    const toneGain = ctx.createGain();
    toneOsc.type = "triangle";
    toneOsc.frequency.setValueAtTime(180, time);
    toneGain.gain.setValueAtTime(volume * 0.4, time);
    toneGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    toneOsc.connect(toneGain);
    toneGain.connect(destination);

    noise.start(time);
    noise.stop(time + 0.2);
    toneOsc.start(time);
    toneOsc.stop(time + 0.12);
  }

  private playHihat(time: number, volume: number, ctx: BaseAudioContext, destination: AudioNode) {
    const bufferSize = ctx.sampleRate * 0.05;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(7000, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume * 0.6, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    noise.start(time);
    noise.stop(time + 0.05);
  }

  private playPerc(time: number, volume: number, ctx: BaseAudioContext, destination: AudioNode) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.frequency.value = 800;
    osc2.frequency.value = 1200;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1000;

    gain.gain.setValueAtTime(volume * 0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + 0.15);
    osc2.stop(time + 0.15);
  }

  private playDrum(id: "kick" | "snare" | "hihat" | "perc", time: number, volumeFactor: number, ctx: BaseAudioContext, destination: AudioNode) {
    switch (id) {
      case "kick": this.playKick(time, volumeFactor, ctx, destination); break;
      case "snare": this.playSnare(time, volumeFactor, ctx, destination); break;
      case "hihat": this.playHihat(time, volumeFactor, ctx, destination); break;
      case "perc": this.playPerc(time, volumeFactor, ctx, destination); break;
    }
  }

  private playSynthNote(
    trackId: string, noteName: string, time: number, volume: number,
    type: "saw" | "square" | "sine" | "triangle" | "pluck",
    ctx: BaseAudioContext, destination: AudioNode
  ) {
    const frequency = this.noteNameToFrequency(noteName);
    if (!frequency) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    osc.type = type === "pluck" ? "sawtooth" : (type as OscillatorType);
    osc.frequency.setValueAtTime(frequency, time);

    if (trackId === "bass") {
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(150, time);
      filter.frequency.exponentialRampToValueAtTime(80, time + 0.25);
      gain.gain.setValueAtTime(volume * 1.3, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
      osc.start(time);
      osc.stop(time + 0.32);
    } else if (trackId === "lead") {
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1800, time);
      filter.Q.value = 3;
      if (type === "pluck") {
        filter.frequency.exponentialRampToValueAtTime(300, time + 0.15);
        gain.gain.setValueAtTime(volume * 0.9, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + this.synthReleaseTime * 0.7);
        osc.start(time);
        osc.stop(time + this.synthReleaseTime * 0.7 + 0.02);
      } else {
        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(volume * 0.6, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, time + this.synthReleaseTime);
        osc.start(time);
        osc.stop(time + this.synthReleaseTime + 0.02);
      }
    } else {
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1000, time);
      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(volume * 0.5, time + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.45);
      osc.start(time);
      osc.stop(time + 0.5);
    }
  }

  private noteNameToFrequency(note: string): number | null {
    const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const regex = /^([A-G]#?)(-?\d+)$/;
    const match = note.match(regex);
    if (!match) return null;

    const name = match[1];
    const octave = parseInt(match[2], 10);
    const semitone = notes.indexOf(name);
    if (semitone === -1) return null;

    const midi = 12 * (octave + 1) + semitone;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // --- Stem export (offline rendering, no ML separation needed - each
  // instrument is already a distinct synthesis track, so "extraction" is
  // just rendering each one in isolation to its own WAV file) ---

  /** Render a single track (all its lanes/notes) as a standalone WAV, looped `loops` times. */
  public async exportStemWav(tracks: TrackState[], tempo: number, targetTrackId: string, loops: number = 4): Promise<Blob> {
    const track = tracks.find((t) => t.id === targetTrackId);
    if (!track) throw new Error(`Track "${targetTrackId}" not found.`);

    const stepDuration = 60 / tempo / 4;
    const totalSteps = 16 * loops;
    const tailSeconds = 1.0;
    const totalDuration = stepDuration * totalSteps + tailSeconds;
    const sampleRate = 44100;

    const OfflineCtxClass = (window as any).OfflineAudioContext || (window as any).webkitOfflineAudioContext;
    if (!OfflineCtxClass) throw new Error("OfflineAudioContext is not supported in this browser.");

    const offlineCtx: OfflineAudioContext = new OfflineCtxClass(2, Math.ceil(totalDuration * sampleRate), sampleRate);
    const destination = offlineCtx.createGain();
    destination.gain.value = 1;
    destination.connect(offlineCtx.destination);

    for (let i = 0; i < totalSteps; i++) {
      const step = i % 16;
      const time = i * stepDuration;
      this.triggerStepInto([track], step, offlineCtx, destination, time);
    }

    const rendered = await offlineCtx.startRendering();
    return this.audioBufferToWavBlob(rendered);
  }

  /** Render every track in `tracks` to its own WAV stem. */
  public async exportAllStems(tracks: TrackState[], tempo: number, loops: number = 4): Promise<Record<string, Blob>> {
    const result: Record<string, Blob> = {};
    for (const track of tracks) {
      result[track.id] = await this.exportStemWav(tracks, tempo, track.id, loops);
    }
    return result;
  }

  /** Render the full mix (all tracks together) as a single WAV. */
  public async exportMixWav(tracks: TrackState[], tempo: number, loops: number = 4): Promise<Blob> {
    const stepDuration = 60 / tempo / 4;
    const totalSteps = 16 * loops;
    const tailSeconds = 1.0;
    const totalDuration = stepDuration * totalSteps + tailSeconds;
    const sampleRate = 44100;

    const OfflineCtxClass = (window as any).OfflineAudioContext || (window as any).webkitOfflineAudioContext;
    if (!OfflineCtxClass) throw new Error("OfflineAudioContext is not supported in this browser.");

    const offlineCtx: OfflineAudioContext = new OfflineCtxClass(2, Math.ceil(totalDuration * sampleRate), sampleRate);
    const destination = offlineCtx.createGain();
    destination.gain.value = 1;
    destination.connect(offlineCtx.destination);

    for (let i = 0; i < totalSteps; i++) {
      const step = i % 16;
      const time = i * stepDuration;
      this.triggerStepInto(tracks, step, offlineCtx, destination, time);
    }

    const rendered = await offlineCtx.startRendering();
    return this.audioBufferToWavBlob(rendered);
  }

  private audioBufferToWavBlob(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const dataLength = buffer.length * blockAlign;
    const bufferLength = 44 + dataLength;
    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, "data");
    view.setUint32(40, dataLength, true);

    let offset = 44;
    const channelData: Float32Array[] = [];
    for (let ch = 0; ch < numChannels; ch++) channelData.push(buffer.getChannelData(ch));
    for (let i = 0; i < buffer.length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        let sample = Math.max(-1, Math.min(1, channelData[ch][i]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(offset, sample, true);
        offset += 2;
      }
    }
    return new Blob([arrayBuffer], { type: "audio/wav" });
  }
}

// Singleton instance shared across the whole app.
export const audioEngine = new AudioEngine();
