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

  // Volume set via setVolume() before the AudioContext exists (e.g. on mount,
  // before any user gesture); applied to masterGain once init() actually runs.
  private pendingVolume: number = 0.8;

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

  // --- Real per-track mixer chain: gain (fader) -> pan -> analyser (VU) -> master.
  // Created lazily per track ID and kept alive for the life of the AudioContext, so
  // fader/pan moves affect currently-sounding audio in real time and the analyser
  // reflects actual signal, not a simulated value. ---
  private trackNodes: Record<string, { gain: GainNode; panner: StereoPannerNode; analyser: AnalyserNode }> = {};

  private getOrCreateTrackNodes(trackId: string, ctx: AudioContext) {
    let nodes = this.trackNodes[trackId];
    if (nodes) return nodes;
    const gain = ctx.createGain();
    const panner = ctx.createStereoPanner();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.35;
    gain.gain.value = 0.8;
    gain.connect(panner);
    panner.connect(analyser);
    if (this.masterGain) analyser.connect(this.masterGain);
    nodes = { gain, panner, analyser };
    this.trackNodes[trackId] = nodes;
    return nodes;
  }

  /** Live AnalyserNode for a track's post-fader signal, for real VU metering. Null until the context exists. */
  public getTrackAnalyser(trackId: string): AnalyserNode | null {
    this.init();
    if (!this.ctx) return null;
    return this.getOrCreateTrackNodes(trackId, this.ctx).analyser;
  }

  /** Effective 0..1 gain for a track given mute + the whole-session solo state. */
  private computeEffectiveGain(track: TrackState, allTracks: TrackState[]): number {
    if (track.muted) return 0;
    const anySoloed = allTracks.some((t) => t.soloed);
    if (anySoloed && !track.soloed) return 0;
    return Math.max(0, Math.min(1, track.volume));
  }

  /** Routes a track's synthesis output through its persistent mixer chain (live playback),
   * or a one-off pan node (offline stem/mix render, where persistent nodes don't apply since
   * each render uses its own throwaway OfflineAudioContext). Returns the node to treat as
   * "destination" for that track's EQ chain / synthesis nodes. */
  private routeThroughTrackMixer(track: TrackState, ctx: BaseAudioContext, destination: AudioNode): AudioNode {
    if (this.ctx && ctx === (this.ctx as unknown as BaseAudioContext)) {
      return this.getOrCreateTrackNodes(track.id, this.ctx).gain;
    }
    const panner = (ctx as OfflineAudioContext).createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, track.pan ?? 0));
    panner.connect(destination);
    return panner;
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
    this.masterGain.gain.value = this.pendingVolume;

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
    // Don't force-create the AudioContext here — this is called on mount to sync
    // UI state, before any user gesture, and Chrome/Edge block context creation/
    // resume outside a gesture (logs a console warning, though harmless). Cache
    // the value; init() applies it once the context is actually created by a
    // real interaction (e.g. hitting Play).
    this.pendingVolume = val;
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
    // Sync the live per-track mixer chain immediately, so moving a fader/pan/mute/solo
    // control in the UI affects currently-sounding audio right away rather than waiting
    // for the next scheduled note.
    if (this.ctx) {
      for (const track of newTracks) {
        const nodes = this.getOrCreateTrackNodes(track.id, this.ctx);
        const eff = this.computeEffectiveGain(track, newTracks);
        nodes.gain.gain.setTargetAtTime(eff, this.ctx.currentTime, 0.015);
        nodes.panner.pan.setValueAtTime(Math.max(-1, Math.min(1, track.pan ?? 0)), this.ctx.currentTime);
      }
    }
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
    const isLive = !!this.ctx && ctx === (this.ctx as unknown as BaseAudioContext);

    for (const track of tracks) {
      const eff = this.computeEffectiveGain(track, tracks);
      if (eff <= 0) continue; // muted, or another track is soloed, or fader at zero

      const mixerInput = this.routeThroughTrackMixer(track, ctx, destination);
      const trackDestination = this.routeThroughTrackEQ(track.id, ctx, mixerInput);
      // Live: the persistent per-track gain node already applies the fader/mute/solo in
      // real time, so notes are scheduled at unity. Offline (stem/mix export): there's no
      // persistent node, so bake the effective volume into the note envelope directly.
      const volumeFactor = isLive ? 1.0 : eff;

      if (track.type === "drums" && track.drumLanes) {
        for (const lane of track.drumLanes) {
          if (lane.pattern[step]) {
            this.playDrum(lane.id as any, now, volumeFactor, ctx, trackDestination);
          }
        }
      }

      if (track.type === "synth" && track.melodyNotes) {
        const matchedNote = track.melodyNotes.find((n) => n.step === step);
        if (matchedNote) {
          this.playSynthNote(track.id, matchedNote.note, now, volumeFactor, track.instrumentType || "saw", ctx, trackDestination);
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

  // --- Live pitch correction ("autotune") monitor: real AudioWorklet-based
  // pitch detection (autocorrelation) + real granular pitch shifting, snapped
  // to a given musical scale. See src/worklets/pitchCorrectionProcessor.js. ---
  private pitchWorkletReady: Promise<void> | null = null;
  private pitchNode: AudioWorkletNode | null = null;
  private pitchMicStream: MediaStream | null = null;
  private pitchMicSource: MediaStreamAudioSourceNode | null = null;
  private pitchListeners: Array<(info: { freq: number; note: string | null; confidence: number }) => void> = [];

  private freqToNoteName(freq: number): string | null {
    if (!freq || freq <= 0) return null;
    const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const midi = Math.round(69 + 12 * Math.log2(freq / 440));
    const name = notes[((midi % 12) + 12) % 12];
    const octave = Math.floor(midi / 12) - 1;
    return `${name}${octave}`;
  }

  public async startPitchCorrection(
    scalePitchClasses: number[],
    onUpdate?: (info: { freq: number; note: string | null; confidence: number }) => void
  ): Promise<{ ok: boolean; error?: string }> {
    this.init();
    if (!this.ctx) return { ok: false, error: "Audio engine not initialized" };

    try {
      if (!this.pitchWorkletReady) {
        const workletUrl = new URL("../worklets/pitchCorrectionProcessor.js", import.meta.url);
        this.pitchWorkletReady = this.ctx.audioWorklet.addModule(workletUrl);
      }
      await this.pitchWorkletReady;

      if (!this.pitchMicStream) {
        this.pitchMicStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
      }

      if (!this.pitchNode) {
        this.pitchNode = new AudioWorkletNode(this.ctx, "pitch-correction-processor", {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [1],
        });
        this.pitchNode.port.onmessage = (e: MessageEvent) => {
          if (e.data?.type === "pitch") {
            const info = {
              freq: e.data.freq as number,
              note: this.freqToNoteName(e.data.freq),
              confidence: e.data.confidence as number,
            };
            for (const l of this.pitchListeners) l(info);
          }
        };
        this.pitchMicSource = this.ctx.createMediaStreamSource(this.pitchMicStream);
        this.pitchMicSource.connect(this.pitchNode);
        this.pitchNode.connect(this.ctx.destination);
        this.pitchNode.port.postMessage({ type: "scale", value: scalePitchClasses });
      }

      this.pitchNode.port.postMessage({ type: "enabled", value: true });
      if (onUpdate) this.pitchListeners.push(onUpdate);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || String(e) };
    }
  }

  public setPitchCorrectionAmount(amount: number) {
    this.pitchNode?.port.postMessage({ type: "amount", value: Math.max(0, Math.min(1, amount)) });
  }

  public setPitchCorrectionScale(scalePitchClasses: number[]) {
    this.pitchNode?.port.postMessage({ type: "scale", value: scalePitchClasses });
  }

  public stopPitchCorrection() {
    this.pitchNode?.port.postMessage({ type: "enabled", value: false });
    this.pitchMicStream?.getTracks().forEach((t) => t.stop());
    this.pitchMicStream = null;
    if (this.pitchMicSource) {
      this.pitchMicSource.disconnect();
      this.pitchMicSource = null;
    }
    if (this.pitchNode) {
      this.pitchNode.disconnect();
      this.pitchNode = null;
    }
    this.pitchListeners = [];
  }
}

// Singleton instance shared across the whole app.
export const audioEngine = new AudioEngine();
