let audioContext: AudioContext | undefined;
let masterOutput: GainNode | undefined;
let audioPrimed = false;
let primePromise: Promise<void> | undefined;
const lastPlayedAt = new Map<string, number>();
const noiseBuffers = new Map<string, AudioBuffer>();
const MASTER_GAIN = 2.25;
const FIRST_AUDIO_WARMUP_MS = 90;
const WARM_NOISE_DURATIONS = [0.032, 0.048, 0.052, 0.062, 0.07, 0.2];

function getAudioContext(): AudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  audioContext ??= new AudioContext();
  return audioContext;
}

async function resumeAudioContext(context: AudioContext): Promise<void> {
  if (context.state === "suspended") {
    await context.resume();
  }
}

function getOutputNode(): AudioNode | undefined {
  const context = getAudioContext();
  if (!context) return undefined;
  if (masterOutput) return masterOutput;

  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.knee.value = 18;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.16;

  masterOutput = context.createGain();
  masterOutput.gain.value = 0.92;
  masterOutput.connect(compressor);
  compressor.connect(context.destination);
  return masterOutput;
}

export async function primeAudio(muted: boolean): Promise<void> {
  if (muted) return;
  if (audioPrimed) return;
  if (primePromise) return primePromise;
  primePromise = primeAudioOnce().finally(() => {
    primePromise = undefined;
  });
  return primePromise;
}

async function primeAudioOnce(): Promise<void> {
  const context = getAudioContext();
  if (!context) return;
  await resumeAudioContext(context);
  getOutputNode();
  for (const duration of WARM_NOISE_DURATIONS) {
    getNoiseBuffer(duration);
  }
  const gain = context.createGain();
  const oscillator = context.createOscillator();
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  oscillator.frequency.setValueAtTime(40, context.currentTime);
  oscillator.connect(gain);
  const output = getOutputNode();
  if (!output) return;
  gain.connect(output);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.025);
  await new Promise((resolve) => window.setTimeout(resolve, FIRST_AUDIO_WARMUP_MS));
  audioPrimed = true;
}

function envelope(gain: GainNode, start: number, peak: number, duration: number) {
  gain.gain.cancelScheduledValues(start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
}

function canPlay(key: string, cooldown = 0.045): boolean {
  const context = getAudioContext();
  if (!context) return false;
  if (context.state !== "running") return false;
  const last = lastPlayedAt.get(key) ?? -Infinity;
  if (context.currentTime - last < cooldown) return false;
  lastPlayedAt.set(key, context.currentTime);
  return true;
}

function tone(frequency: number, duration: number, peak = 0.12, type: OscillatorType = "sine", destination?: AudioNode) {
  const context = getAudioContext();
  if (!context) return;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, context.currentTime);
  oscillator.connect(gain);
  gain.connect(destination ?? getOutputNode() ?? context.destination);
  envelope(gain, context.currentTime, peak * MASTER_GAIN, duration);
  oscillator.start();
  oscillator.stop(context.currentTime + duration + 0.04);
}

function getNoiseBuffer(duration: number) {
  const context = getAudioContext();
  if (!context) return undefined;
  const key = `${context.sampleRate}:${duration}`;
  const cached = noiseBuffers.get(key);
  if (cached) return cached;
  const length = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) {
    data[index] = Math.random() * 2 - 1;
  }
  noiseBuffers.set(key, buffer);
  return buffer;
}

function noiseHit(duration: number, peak: number, filterFrequency: number, filterType: BiquadFilterType = "lowpass") {
  const context = getAudioContext();
  const buffer = getNoiseBuffer(duration);
  if (!context || !buffer) return;
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = buffer;
  filter.type = filterType;
  filter.frequency.value = filterFrequency;
  source.connect(filter);
  filter.connect(gain);
  const output = getOutputNode();
  if (!output) return;
  gain.connect(output);
  envelope(gain, context.currentTime, peak * MASTER_GAIN, duration);
  source.start();
  source.stop(context.currentTime + duration + 0.04);
}

function softChime(baseFrequency: number, muted: boolean) {
  if (muted) return;
  const context = getAudioContext();
  if (!context) return;
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 2600;
  const output = getOutputNode();
  if (!output) return;
  filter.connect(output);
  tone(baseFrequency, 0.15, 0.024, "sine", filter);
  tone(baseFrequency * 1.5, 0.11, 0.012, "triangle", filter);
}

export function playBounce(muted: boolean) {
  if (muted || !canPlay("bumper")) return;
  noiseHit(0.048, 0.074, 1060, "bandpass");
  tone(126, 0.06, 0.034, "triangle");
}

export function playCueStrike(muted: boolean) {
  if (muted || !canPlay("cue", 0.12)) return;
  noiseHit(0.052, 0.086, 1320, "bandpass");
  tone(102, 0.085, 0.046, "triangle");
}

export function playSolidBounce(muted: boolean) {
  if (muted || !canPlay("solid")) return;
  noiseHit(0.062, 0.088, 620, "lowpass");
  tone(82, 0.09, 0.044, "sine");
}

export function playRailBounce(muted: boolean) {
  if (muted || !canPlay("rail")) return;
  noiseHit(0.052, 0.078, 900, "bandpass");
  tone(106, 0.065, 0.034, "triangle");
}

export function playGlassTick(muted: boolean) {
  if (muted || !canPlay("glass", 0.07)) return;
  noiseHit(0.032, 0.024, 2200, "highpass");
  softChime(500, muted);
}

export function playGlassBreak(muted: boolean) {
  if (muted || !canPlay("glass-break", 0.09)) return;
  noiseHit(0.07, 0.032, 2500, "highpass");
  softChime(620, muted);
}

export function playPocket(muted: boolean) {
  if (muted || !canPlay("pocket", 0.12)) return;
  noiseHit(0.2, 0.084, 500, "lowpass");
  tone(68, 0.34, 0.078, "sine");
  tone(104, 0.2, 0.034, "triangle");
}
