let audioContext: AudioContext | undefined;
let rollNodes: { source: AudioBufferSourceNode; gain: GainNode } | undefined;
const lastPlayedAt = new Map<string, number>();
const MASTER_GAIN = 1.75;

function getAudioContext(): AudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  audioContext ??= new AudioContext();
  if (audioContext.state === "suspended") void audioContext.resume();
  return audioContext;
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
  gain.connect(destination ?? context.destination);
  envelope(gain, context.currentTime, peak * MASTER_GAIN, duration);
  oscillator.start();
  oscillator.stop(context.currentTime + duration + 0.04);
}

function noiseBuffer(duration: number) {
  const context = getAudioContext();
  if (!context) return undefined;
  const length = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) {
    data[index] = Math.random() * 2 - 1;
  }
  return buffer;
}

function noiseHit(duration: number, peak: number, filterFrequency: number, filterType: BiquadFilterType = "lowpass") {
  const context = getAudioContext();
  const buffer = noiseBuffer(duration);
  if (!context || !buffer) return;
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = buffer;
  filter.type = filterType;
  filter.frequency.value = filterFrequency;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
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
  filter.connect(context.destination);
  tone(baseFrequency, 0.16, 0.035, "sine", filter);
  tone(baseFrequency * 1.5, 0.12, 0.018, "triangle", filter);
}

export function playBounce(muted: boolean) {
  if (muted || !canPlay("bumper")) return;
  noiseHit(0.042, 0.046, 980, "bandpass");
  tone(128, 0.05, 0.02, "sine");
}

export function playCueStrike(muted: boolean) {
  if (muted || !canPlay("cue", 0.12)) return;
  noiseHit(0.045, 0.062, 1450, "bandpass");
  tone(104, 0.075, 0.034, "triangle");
}

export function playSolidBounce(muted: boolean) {
  if (muted || !canPlay("solid")) return;
  noiseHit(0.052, 0.054, 650, "lowpass");
  tone(86, 0.07, 0.022, "sine");
}

export function playRailBounce(muted: boolean) {
  if (muted || !canPlay("rail")) return;
  noiseHit(0.046, 0.048, 850, "bandpass");
  tone(108, 0.055, 0.019, "sine");
}

export function playGlassTick(muted: boolean) {
  if (muted || !canPlay("glass", 0.07)) return;
  noiseHit(0.034, 0.026, 2100, "highpass");
  softChime(500, muted);
}

export function playGlassBreak(muted: boolean) {
  if (muted || !canPlay("glass-break", 0.09)) return;
  noiseHit(0.075, 0.034, 2600, "highpass");
  softChime(620, muted);
}

export function playPocket(muted: boolean) {
  if (muted || !canPlay("pocket", 0.12)) return;
  noiseHit(0.18, 0.056, 540, "lowpass");
  tone(70, 0.3, 0.055, "sine");
  tone(105, 0.18, 0.022, "triangle");
}

export function startRoll(muted: boolean) {
  if (muted || rollNodes) return;
  const context = getAudioContext();
  const buffer = noiseBuffer(1.2);
  if (!context || !buffer) return;
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = buffer;
  source.loop = true;
  filter.type = "bandpass";
  filter.frequency.value = 165;
  filter.Q.value = 0.55;
  gain.gain.value = 0.022;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  source.start();
  rollNodes = { source, gain };
}

export function stopRoll() {
  if (!rollNodes || !audioContext) return;
  const { source, gain } = rollNodes;
  gain.gain.cancelScheduledValues(audioContext.currentTime);
  gain.gain.setValueAtTime(gain.gain.value, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.08);
  source.stop(audioContext.currentTime + 0.1);
  rollNodes = undefined;
}
