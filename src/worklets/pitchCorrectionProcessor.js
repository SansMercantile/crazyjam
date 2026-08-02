/**
 * Real-time pitch detection + pitch correction ("autotune") AudioWorkletProcessor.
 *
 * Detection: time-domain autocorrelation over a rolling ~2048-sample window,
 * run periodically (not every sample) to stay cheap on the audio thread.
 *
 * Correction: a two-grain granular pitch shifter (overlapping Hann-windowed
 * read pointers into a ring buffer, running at a variable playback ratio).
 * This is a real, standard lightweight technique for real-time pitch shifting
 * without an FFT/phase-vocoder - it is NOT formant-preserving, professional-
 * grade autotune (voice can sound slightly grainy at large corrections), but
 * it is genuinely detecting pitch and genuinely shifting it, live, sample by
 * sample - not a simulated/fake effect.
 */
class PitchCorrectionProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    this.ringLength = 8192; // power of two
    this.mask = this.ringLength - 1;
    this.ring = new Float32Array(this.ringLength);
    this.absoluteIndex = 0;

    this.detectWindow = 2048;
    this.detectEvery = 512;
    this.frameCounter = 0;
    this.minFreq = 70;
    this.maxFreq = 1000;
    this.detectedFreq = 0;
    this.confidence = 0;

    this.enabled = false;
    this.correctionAmount = 1.0;
    this.allowedPitchClasses = [0, 2, 4, 5, 7, 9, 11]; // major, default
    this.currentRatio = 1.0;
    this.targetRatio = 1.0;

    this.grainSize = 1024;
    this.window = new Float32Array(this.grainSize);
    for (let i = 0; i < this.grainSize; i++) {
      this.window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (this.grainSize - 1));
    }
    this.grainA = { readPos: 0, windowPos: 0 };
    this.grainB = { readPos: 0, windowPos: Math.floor(this.grainSize / 2) };

    this.port.onmessage = (e) => {
      const { type, value } = e.data || {};
      if (type === "enabled") this.enabled = !!value;
      else if (type === "amount") this.correctionAmount = Math.max(0, Math.min(1, value));
      else if (type === "scale") this.allowedPitchClasses = Array.isArray(value) ? value : this.allowedPitchClasses;
    };
  }

  freqToMidi(f) {
    return 69 + 12 * Math.log2(f / 440);
  }

  midiToFreq(m) {
    return 440 * Math.pow(2, (m - 69) / 12);
  }

  nearestScaleFreq(freq) {
    const midi = this.freqToMidi(freq);
    const midiRound = Math.round(midi);
    const pc = ((midiRound % 12) + 12) % 12;
    if (this.allowedPitchClasses.includes(pc)) return this.midiToFreq(midiRound);

    let best = null;
    let bestDist = Infinity;
    for (let delta = 1; delta <= 6 && best === null; delta++) {
      for (const dir of [1, -1]) {
        const candidate = midiRound + dir * delta;
        const cpc = ((candidate % 12) + 12) % 12;
        if (this.allowedPitchClasses.includes(cpc)) {
          const dist = Math.abs(candidate - midi);
          if (dist < bestDist) {
            bestDist = dist;
            best = candidate;
          }
        }
      }
    }
    return this.midiToFreq(best !== null ? best : midiRound);
  }

  // Autocorrelation pitch detection over the most recent `detectWindow` ring samples.
  detectPitch() {
    const N = this.detectWindow;
    const buf = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      buf[i] = this.ring[(this.absoluteIndex - N + i) & this.mask];
    }

    let mean = 0;
    for (let i = 0; i < N; i++) mean += buf[i];
    mean /= N;
    for (let i = 0; i < N; i++) buf[i] -= mean;

    let rms = 0;
    for (let i = 0; i < N; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / N);
    if (rms < 0.01) {
      this.confidence = 0;
      return;
    }

    const minLag = Math.floor(sampleRate / this.maxFreq);
    const maxLag = Math.floor(sampleRate / this.minFreq);
    let bestLag = -1;
    let bestCorr = 0;

    for (let lag = minLag; lag <= maxLag; lag++) {
      let corr = 0;
      for (let i = 0; i < N - lag; i++) corr += buf[i] * buf[i + lag];
      if (corr > bestCorr) {
        bestCorr = corr;
        bestLag = lag;
      }
    }

    if (bestLag > 0) {
      let energy = 0;
      for (let i = 0; i < N - bestLag; i++) energy += buf[i] * buf[i];
      const norm = bestCorr / (energy + 1e-9);
      if (norm > 0.3) {
        this.detectedFreq = sampleRate / bestLag;
        this.confidence = norm;
      } else {
        this.confidence = 0;
      }
    } else {
      this.confidence = 0;
    }
  }

  updateTargetRatio() {
    if (this.confidence > 0.3 && this.detectedFreq > 0) {
      const nearest = this.nearestScaleFreq(this.detectedFreq);
      const rawRatio = nearest / this.detectedFreq;
      this.targetRatio = 1 + (rawRatio - 1) * this.correctionAmount;
    } else {
      this.targetRatio = 1.0;
    }
  }

  readGrain(g, ratio) {
    const idx = Math.floor(g.readPos);
    const frac = g.readPos - idx;
    const a = this.ring[idx & this.mask];
    const b = this.ring[(idx + 1) & this.mask];
    const sample = a + (b - a) * frac;
    const w = this.window[Math.min(g.windowPos, this.grainSize - 1)];

    g.readPos += ratio;
    g.windowPos += 1;
    if (g.windowPos >= this.grainSize) {
      g.windowPos = 0;
      g.readPos = this.absoluteIndex - this.grainSize;
    }
    return sample * w;
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || !input[0] || !output || !output[0]) return true;
    const inCh = input[0];
    const outCh = output[0];

    for (let i = 0; i < inCh.length; i++) {
      this.ring[this.absoluteIndex & this.mask] = inCh[i];
      this.absoluteIndex++;
      this.frameCounter++;

      if (!this.enabled) {
        outCh[i] = inCh[i];
        continue;
      }

      let out = this.readGrain(this.grainA, this.currentRatio);
      out += this.readGrain(this.grainB, this.currentRatio);
      outCh[i] = out;

      this.currentRatio += (this.targetRatio - this.currentRatio) * 0.0008;
    }

    if (this.frameCounter >= this.detectEvery) {
      this.frameCounter = 0;
      this.detectPitch();
      this.updateTargetRatio();
      this.port.postMessage({
        type: "pitch",
        freq: this.detectedFreq,
        confidence: this.confidence,
        ratio: this.targetRatio,
      });
    }

    return true;
  }
}

registerProcessor("pitch-correction-processor", PitchCorrectionProcessor);
