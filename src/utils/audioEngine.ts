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
  private onStepCallback: ((step: number) => void) | null = null;

  // Real-time custom FX parameters
  private masterFilterCutoff: number = 20000; // default wide open (Hz)
  private masterFilterQ: number = 1.0;
  private delayFeedback: number = 0.25;
  private delayTimeValue: number = 0.35;
  private synthReleaseTime: number = 0.28;
  private masterFilterNode: BiquadFilterNode | null = null;

  // Track data cache
  private tracks: TrackState[] = [];

  constructor() {
    // Lazy initialized on first user interaction
  }

  public getContext(): AudioContext | null {
    this.init();
    return this.ctx;
  }

  public init() {
    if (this.ctx) return;

    // Create AudioContext
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      console.warn("Web Audio API not supported in this browser.");
      return;
    }

    this.ctx = new AudioContextClass();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.8; // default moderate volume

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;

    // Build delay node
    this.delayNode = this.ctx.createDelay(1.0);
    this.delayNode.delayTime.value = this.delayTimeValue; // customized delay time
    this.delayGain = this.ctx.createGain();
    this.delayGain.gain.value = this.delayFeedback; // customized feedback gain

    // Build Master Resonant Filter node
    this.masterFilterNode = this.ctx.createBiquadFilter();
    this.masterFilterNode.type = "lowpass";
    this.masterFilterNode.frequency.value = this.masterFilterCutoff;
    this.masterFilterNode.Q.value = this.masterFilterQ;

    // Connect pipeline:
    // masterGain -> masterFilterNode -> analyser -> destination
    this.masterGain.connect(this.masterFilterNode);
    this.masterFilterNode.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    // Patch delay node inside master path (feedback echo)
    this.masterFilterNode.connect(this.delayNode);
    this.delayNode.connect(this.delayGain);
    this.delayGain.connect(this.delayNode); // feedback
    this.delayGain.connect(this.analyser); // output to analyzer

    // Auto-resume if state was suspended by autoplay guard
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

  public updateTracks(newTracks: TrackState[]) {
    this.tracks = newTracks;
  }

  public setOnStep(cb: (step: number) => void) {
    this.onStepCallback = cb;
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

      if (this.onStepCallback) {
        this.onStepCallback(this.currentStep);
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
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    for (const track of this.tracks) {
      if (track.muted) continue;

      // Handle drum triggers
      if (track.type === "drums" && track.drumLanes) {
        const volumeFactor = track.volume;
        for (const lane of track.drumLanes) {
          if (lane.pattern[step]) {
            this.playDrum(lane.id, now, volumeFactor);
          }
        }
      }

      // Handle synthesized elements (lead, bass, pad)
      if (track.type === "synth" && track.melodyNotes) {
        const matchedNote = track.melodyNotes.find((n) => n.step === step);
        if (matchedNote) {
          this.playSynthNote(track.id, matchedNote.note, now, track.volume, track.instrumentType || "saw");
        }
      }
    }
  }

  // Pure Web Audio Synth - Kick drum generator
  private playKick(time: number, volume: number) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.masterGain);

    // Rapid pitch downward drop
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.15);

    // Exponential volume envelope
    gain.gain.setValueAtTime(volume * 1.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

    osc.start(time);
    osc.stop(time + 0.22);
  }

  // Snare drum generator using White Noise and band filter
  private playSnare(time: number, volume: number) {
    if (!this.ctx || !this.masterGain) return;

    // Custom noise buffer
    const bufferSize = this.ctx.sampleRate * 0.2; // 200ms
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume * 0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    // Snare tone backbone
    const toneOsc = this.ctx.createOscillator();
    const toneGain = this.ctx.createGain();
    toneOsc.type = "triangle";
    toneOsc.frequency.setValueAtTime(180, time);
    toneGain.gain.setValueAtTime(volume * 0.4, time);
    toneGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    toneOsc.connect(toneGain);
    toneGain.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + 0.2);

    toneOsc.start(time);
    toneOsc.stop(time + 0.12);
  }

  // Crisp Hi-Hat Synthesis
  private playHihat(time: number, volume: number) {
    if (!this.ctx || !this.masterGain) return;

    const bufferSize = this.ctx.sampleRate * 0.05; // extremely short (50ms)
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
       data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(7000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume * 0.6, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + 0.05);
  }

  // Short electronic Cowbell/Rimshot
  private playPerc(time: number, volume: number) {
    if (!this.ctx || !this.masterGain) return;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.frequency.value = 800;
    osc2.frequency.value = 1200;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1000;

    gain.gain.setValueAtTime(volume * 0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + 0.15);
    osc2.stop(time + 0.15);
  }

  private playDrum(id: "kick" | "snare" | "hihat" | "perc", time: number, volumeFactor: number) {
    switch (id) {
      case "kick":
        this.playKick(time, volumeFactor);
        break;
      case "snare":
        this.playSnare(time, volumeFactor);
        break;
      case "hihat":
        this.playHihat(time, volumeFactor);
        break;
       case "perc":
        this.playPerc(time, volumeFactor);
        break;
    }
  }

  // Synthesizes individual note frequencies based on standard MIDI note pitches
  private playSynthNote(trackId: string, noteName: string, time: number, volume: number, type: "saw" | "square" | "sine" | "triangle" | "pluck") {
    if (!this.ctx || !this.masterGain) return;

    const frequency = this.noteNameToFrequency(noteName);
    if (!frequency) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    // Setup waveform
    if (type === "pluck") {
      osc.type = "sawtooth";
    } else {
      osc.type = type as OscillatorType;
    }

    osc.frequency.setValueAtTime(frequency, time);

    // Bass specific styling
    if (trackId === "bass") {
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(150, time);
      filter.frequency.exponentialRampToValueAtTime(80, time + 0.25);

      gain.gain.setValueAtTime(volume * 1.3, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
      osc.start(time);
      osc.stop(time + 0.32);
    } 
    // Lead styling
    else if (trackId === "lead") {
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
        // Sustaining note
        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(volume * 0.6, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, time + this.synthReleaseTime);
        osc.start(time);
        osc.stop(time + this.synthReleaseTime + 0.02);
      }
    } 
    // Chord pad style
    else {
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1000, time);
      
      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(volume * 0.5, time + 0.08); // slow build
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.45); // long release
      
      osc.start(time);
      osc.stop(time + 0.5);
    }
  }

  // Translates scientific note names (e.g. "C4") into frequencies in Hz representing real scales
  private noteNameToFrequency(note: string): number | null {
    const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const regex = /^([A-G]#?)(-?\d+)$/;
    const match = note.match(regex);
    if (!match) return null;

    const name = match[1];
    const octave = parseInt(match[2], 10);
    const semitone = notes.indexOf(name);
    if (semitone === -1) return null;

    // MIDI Pitch value = 12 * (octave + 1) + semitone
    const midi = 12 * (octave + 1) + semitone;
    // frequency = 440 * 2^((midi - 69)/12)
    return 440 * Math.pow(2, (midi - 69) / 12);
  }
}
