/**
 * Prism audio — cinematic ambient in the vein of igloo.inc.
 *
 * Character:
 *   - Warm musical pad (C minor: C, Eb, G, Bb) on triangle + sine, not dissonant drone
 *   - Soft analog-style sub bass on C2
 *   - Gentle granular air bed (pink noise, -26 dB peak)
 *   - Slow filter LFO (0.06 Hz) for "breathing" evolution
 *   - Musical chime on hover — plays a note in key (pentatonic scale)
 *   - Transition "sparkle" on section change
 *   - Procedural plate reverb + short slapback delay (warm, not cavernous)
 *
 * Everything gesture-gated. Master peaks ≤ 0.085.
 */
import { useEffect, useRef } from 'react';
import { scrollStore } from './useScroll';

// C minor pentatonic for interaction notes (Hz)
const PENTATONIC = [261.63, 311.13, 349.23, 392.0, 466.16, 523.25, 622.25, 698.46];

// Persistent gain scale — exists before audio starts so the mixer can write to it
if (typeof window !== 'undefined' && !window.__prismGainScale) {
  window.__prismGainScale = { pad: 1, bass: 1, air: 1, shimmer: 1, fx: 1 };
  window.__prismMixer = {
    set: (ch, v) => { window.__prismGainScale[ch] = Math.max(0, Math.min(1, v)); },
    get: (ch) => window.__prismGainScale[ch] ?? 1,
  };
}

// Lazy chime — safe to call any time; no-ops until audio is started
let _audioNodes = null;
if (typeof window !== 'undefined') {
  window.__prismChimeActivate = (freq = 110) => {
    if (_audioNodes && _audioNodes.ctx) {
      chime(_audioNodes.ctx, _audioNodes.fxBus, freq);
    }
  };
}

export default function useAudio() {
  const ctxRef = useRef(null);
  const nodes = useRef(null);
  const startedRef = useRef(false);
  const noteIdx = useRef(0);
  const lastSectionRef = useRef(-1);

  useEffect(() => {
    const start = () => {
      if (startedRef.current) return;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      ctxRef.current = ctx;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      // ---------- MASTER ----------
      const master = ctx.createGain();
      master.gain.value = 0.0001;

      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value = 24;
      comp.ratio.value = 3;
      comp.attack.value = 0.05;
      comp.release.value = 0.5;

      const tone = ctx.createBiquadFilter();
      tone.type = 'lowpass';
      tone.frequency.value = 9000;
      tone.Q.value = 0.3;

      master.connect(comp).connect(tone).connect(ctx.destination);
      master.gain.setTargetAtTime(0.082, ctx.currentTime, 1.2);

      // ---------- ANALOG SATURATION — soft-clip on FX bus for warmth/bite ----------
      const shaper = ctx.createWaveShaper();
      {
        const k = 2.4;
        const n = 4096;
        const curve = new Float32Array(n);
        for (let i = 0; i < n; i++) {
          const x = (i * 2) / n - 1;
          // tanh-style soft clip
          curve[i] = (1 + k) * x / (1 + k * Math.abs(x));
        }
        shaper.curve = curve;
        shaper.oversample = '4x';
      }

      // ---------- WARM PLATE REVERB ----------
      const ir = ctx.createBuffer(2, ctx.sampleRate * 2.4, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch);
        for (let i = 0; i < d.length; i++) {
          const t = i / d.length;
          // Warm plate — quick early reflections, smooth tail
          d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.6) * 0.7;
        }
      }
      const verb = ctx.createConvolver();
      verb.buffer = ir;
      const verbLP = ctx.createBiquadFilter();
      verbLP.type = 'lowpass';
      verbLP.frequency.value = 3800;
      const wet = ctx.createGain();
      wet.gain.value = 0.28;
      verb.connect(verbLP).connect(wet).connect(master);

      // Short slap delay for width
      const delay = ctx.createDelay(1);
      delay.delayTime.value = 0.22;
      const delayFB = ctx.createGain();
      delayFB.gain.value = 0.28;
      const delayLP = ctx.createBiquadFilter();
      delayLP.type = 'lowpass';
      delayLP.frequency.value = 2200;
      delay.connect(delayLP).connect(delayFB).connect(delay);
      const delayWet = ctx.createGain();
      delayWet.gain.value = 0.18;
      delay.connect(delayWet).connect(master);

      // Shared bus w/ dry bleed
      const bus = ctx.createGain();
      bus.gain.value = 1;
      bus.connect(master);
      bus.connect(verb);
      bus.connect(delay);

      // FX bus — interaction sounds route here so volume can be scaled independently
      const fxBus = ctx.createGain();
      fxBus.gain.value = 1;
      fxBus.connect(bus); // ambient reverb/delay tail (quiet path)

      // Direct high-gain path: fxBus → shaper → stereo widener → fxOut → comp
      // Soft-clip adds analog bite; Haas delay adds stereo depth.
      const fxOut = ctx.createGain();
      fxOut.gain.value = 0.88;

      // Stereo widener (Haas effect): split L/R, delay right ~12ms
      const splitter = ctx.createChannelSplitter(2);
      const merger = ctx.createChannelMerger(2);
      const rDelay = ctx.createDelay(0.05);
      rDelay.delayTime.value = 0.012;

      fxBus.connect(shaper);
      shaper.connect(splitter);
      splitter.connect(merger, 0, 0);   // L dry
      splitter.connect(rDelay, 0, 0);
      rDelay.connect(merger, 0, 1);     // R delayed
      merger.connect(fxOut);
      fxOut.connect(comp);

      // ---------- HELPERS ----------
      const mkOsc = (type, freq, detune = 0) => {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = freq;
        o.detune.value = detune;
        return o;
      };
      const mkGain = (v) => { const g = ctx.createGain(); g.gain.value = v; return g; };

      // ---------- PAD — C minor (C3 Eb3 G3 Bb3) triangle + sine ----------
      const padFreqs = [130.81, 155.56, 196.0, 233.08];
      const padGain = mkGain(0);
      const padLP = ctx.createBiquadFilter();
      padLP.type = 'lowpass';
      padLP.frequency.value = 900;
      padLP.Q.value = 0.7;
      const padOscs = [];
      padFreqs.forEach((f) => {
        const a = mkOsc('triangle', f, -5);
        const b = mkOsc('sine', f, +5);
        a.connect(padLP);
        b.connect(padLP);
        padOscs.push(a, b);
      });
      padLP.connect(padGain).connect(bus);
      padGain.gain.setTargetAtTime(0.09 * (window.__prismGainScale?.pad ?? 1), ctx.currentTime + 0.4, 2.0);
      padOscs.forEach((o) => o.start());

      // ---------- SUB BASS — C2 sine with LFO tremolo ----------
      const sub = mkOsc('sine', 65.41);
      const subGain = mkGain(0.18);
      const subTrem = mkOsc('sine', 0.11);
      const subTremG = mkGain(0.04);
      subTrem.connect(subTremG).connect(subGain.gain);
      sub.connect(subGain).connect(master);
      sub.start();
      subTrem.start();

      // ---------- AIR — gentle pink noise bed ----------
      const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
      {
        const d = noiseBuf.getChannelData(0);
        let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
        for (let i = 0; i < d.length; i++) {
          const w = Math.random() * 2 - 1;
          b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
          b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856;
          b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
          d[i] = (b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.06;
          b6 = w*0.115926;
        }
      }
      const air = ctx.createBufferSource();
      air.buffer = noiseBuf;
      air.loop = true;
      const airBP = ctx.createBiquadFilter();
      airBP.type = 'bandpass';
      airBP.frequency.value = 1400;
      airBP.Q.value = 0.9;
      const airGain = mkGain(0.08);
      air.connect(airBP).connect(airGain).connect(bus);
      air.start();

      // ---------- SLOW FILTER LFO (breathing) ----------
      const padLFO = mkOsc('sine', 0.06);
      const padLFOG = mkGain(320);
      padLFO.connect(padLFOG).connect(padLP.frequency);
      padLFO.start();

      const airLFO = mkOsc('sine', 0.09);
      const airLFOG = mkGain(0.025);
      airLFO.connect(airLFOG).connect(airGain.gain);
      airLFO.start();

      // ---------- HARMONIC SHIMMER LAYER (crossfades in deep sections) ----------
      const shimGain = mkGain(0);
      const shimA = mkOsc('sine', 523.25);   // C5
      const shimB = mkOsc('sine', 622.25);   // Eb5
      const shimC = mkOsc('sine', 783.99);   // G5
      [shimA, shimB, shimC].forEach((o) => {
        const g = mkGain(0.006);
        o.connect(g).connect(shimGain);
        o.start();
      });
      shimGain.connect(bus);

      // ---------- PROGRESSIVE ORCHESTRA ----------
      // 9 voices in C minor. Each starts silent; when its section is reached
      // its gain ramps up and SUSTAINS. By section 8 the whole ensemble plays together.
      // Design: consonant stacking — roots, thirds, fifths, sevenths, ninths.
      //
      //   Sec 0: (base pad + sub already running)
      //   Sec 1: Cello drone       — C2 + G2 (deep fifth, root anchor)
      //   Sec 2: Viola warmth      — Eb3 + G3 (minor third)
      //   Sec 3: Violin body       — Bb3 + Eb4 (minor seventh color)
      //   Sec 4: Choir "aah"       — G4 + C5 (vocal octave)
      //   Sec 5: Flute             — D5 (ninth — opens the sound)
      //   Sec 6: High strings      — F5 + Bb5 (luminous top)
      //   Sec 7: Celesta shimmer   — G5 + C6 (sparkle bell tones)
      //   Sec 8: Crown — Eb6 halo + gentle full-orchestra swell
      const orchestra = ctx.createGain();
      orchestra.gain.value = 1;
      orchestra.connect(bus);

      const mkVoice = (specs, peak = 0.045, lpHz = 2400, lpQ = 0.7, tremRate = 0, tremDepth = 0) => {
        const vg = mkGain(0);
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = lpHz;
        lp.Q.value = lpQ;
        lp.connect(vg).connect(orchestra);
        specs.forEach(({ type, freq, detune = 0, level = 1 }) => {
          const o = mkOsc(type, freq, detune);
          const og = mkGain(level);
          o.connect(og).connect(lp);
          o.start();
        });
        if (tremRate > 0) {
          const trem = mkOsc('sine', tremRate);
          const tremG = mkGain(tremDepth);
          trem.connect(tremG).connect(vg.gain);
          trem.start();
        }
        return { gain: vg, peak };
      };

      // Voice 1 — Cello (deep root + fifth)
      const v1 = mkVoice([
        { type: 'sine',     freq: 65.41,  level: 0.55 },      // C2
        { type: 'triangle', freq: 98.0,   level: 0.35 },      // G2
        { type: 'sine',     freq: 65.41,  detune: -7, level: 0.25 },
      ], 0.11, 520, 0.8);

      // Voice 2 — Viola (minor third warmth)
      const v2 = mkVoice([
        { type: 'triangle', freq: 155.56, level: 0.45 },      // Eb3
        { type: 'sine',     freq: 196.0,  level: 0.38 },      // G3
        { type: 'triangle', freq: 155.56, detune: +8, level: 0.22 },
      ], 0.08, 1200, 0.7, 0.12, 0.015);

      // Voice 3 — Violin body (minor seventh)
      const v3 = mkVoice([
        { type: 'sine',     freq: 233.08, level: 0.42 },      // Bb3
        { type: 'triangle', freq: 311.13, level: 0.32 },      // Eb4
        { type: 'sine',     freq: 233.08, detune: -6, level: 0.2 },
      ], 0.065, 1800, 0.8, 0.17, 0.02);

      // Voice 4 — Choir "aah" (octave vocal)
      const v4 = mkVoice([
        { type: 'sine',     freq: 392.0,  level: 0.4 },       // G4
        { type: 'sine',     freq: 523.25, level: 0.35 },      // C5
        { type: 'triangle', freq: 392.0,  detune: +5, level: 0.15 },
      ], 0.055, 2100, 0.9, 0.22, 0.03);

      // Voice 5 — Flute (ninth, sweet top-mid)
      const v5 = mkVoice([
        { type: 'sine',     freq: 587.33, level: 0.5 },       // D5
        { type: 'triangle', freq: 587.33, detune: -4, level: 0.2 },
      ], 0.042, 3200, 1.2, 0.28, 0.04);

      // Voice 6 — High strings (luminous top)
      const v6 = mkVoice([
        { type: 'sine',     freq: 698.46, level: 0.42 },      // F5
        { type: 'sine',     freq: 932.33, level: 0.32 },      // Bb5
        { type: 'triangle', freq: 698.46, detune: +6, level: 0.18 },
      ], 0.038, 3800, 1.0, 0.19, 0.03);

      // Voice 7 — Celesta shimmer (bell overtones, gently pulsing)
      const v7 = mkVoice([
        { type: 'sine',     freq: 783.99, level: 0.38 },      // G5
        { type: 'sine',     freq: 1046.5, level: 0.3 },       // C6
        { type: 'sine',     freq: 1567.98, level: 0.12 },     // G6 overtone
      ], 0.032, 5200, 1.1, 0.33, 0.05);

      // Voice 8 — Crown (Eb6 halo — final resolution note)
      const v8 = mkVoice([
        { type: 'sine',     freq: 1244.51, level: 0.4 },      // Eb6
        { type: 'sine',     freq: 1864.66, level: 0.18 },     // Bb6 ninth halo
        { type: 'triangle', freq: 1244.51, detune: -3, level: 0.15 },
      ], 0.028, 6400, 1.0, 0.41, 0.06);

      const voices = [v1, v2, v3, v4, v5, v6, v7, v8];

      nodes.current = {
        ctx, master, bus, fxBus, fxOut, padLP, padGain, airGain, airBP, subGain, shimGain, wet, delayWet,
        voices, orchestra,
      };
      _audioNodes = nodes.current; // expose for window.__prismChimeActivate
      startedRef.current = true;
    };

    const onFirst = () => start();
    window.addEventListener('pointerdown', onFirst);
    window.addEventListener('keydown', onFirst);
    window.addEventListener('click', onFirst);
    window.addEventListener('touchstart', onFirst, { passive: true });
    window.__prismStartAudio = () => {
      start();
      if (ctxRef.current && ctxRef.current.state === 'suspended') {
        ctxRef.current.resume().catch(() => {});
      }
    };

    // Enable/disable toggle: ramps master gain in ~0.25s without tearing down nodes.
    // Returns the current enabled state after the call.
    window.__prismSetAudioEnabled = (enabled) => {
      // If never started, starting counts as enabling
      if (!startedRef.current) {
        if (enabled) start();
        return !!enabled;
      }
      const n = nodes.current;
      if (!n) return false;
      if (enabled && n.ctx.state === 'suspended') {
        n.ctx.resume().catch(() => {});
      }
      const now = n.ctx.currentTime;
      const target = enabled ? 0.082 : 0.0;
      n.master.gain.cancelScheduledValues(now);
      n.master.gain.setTargetAtTime(target, now, 0.08);
      return !!enabled;
    };

    let raf;
    const tick = () => {
      const n = nodes.current;
      if (n) {
        const p = scrollStore.progress;
        const now = n.ctx.currentTime;

        // Pad filter opens with scroll (emotional arc)
        const padCutoff = 600 + p * 1800;
        n.padLP.frequency.setTargetAtTime(padCutoff, now, 1.4);

        // Per-channel gain scales (live from mixer UI)
        const gs = window.__prismGainScale || { pad:1, bass:1, air:1, shimmer:1, fx:1 };
        n.padGain.gain.setTargetAtTime(0.09 * gs.pad, now, 0.5);
        n.fxBus.gain.setTargetAtTime(gs.fx, now, 0.1);
        n.fxOut.gain.setTargetAtTime(0.88 * gs.fx, now, 0.1);

        // Shimmer strongest in cognitive / sovereignty zone (0.55 – 0.92)
        const shimT = smoothBand(p, 0.45, 0.6, 0.88, 0.95);
        n.shimGain.gain.setTargetAtTime(shimT * 0.9 * gs.shimmer, now, 1.0);

        // Velocity → air intensity + bandpass (travel feel, subtle)
        const absV = Math.abs(scrollStore.velocity);
        const vNorm = Math.min(1, absV * 0.0004);
        n.airGain.gain.setTargetAtTime((0.07 + vNorm * 0.08) * gs.air, now, 0.25);
        n.airBP.frequency.setTargetAtTime(1200 + vNorm * 1800, now, 0.3);

        // Wet reverb mod with journey depth
        const wetT = 0.22 + 0.22 * Math.sin(p * Math.PI);
        n.wet.gain.setTargetAtTime(wetT, now, 1.4);

        // Sub gain swells slightly in grounded sections (harmony, sovereignty, perpetual)
        const groundT = smoothBand(p, 0.45, 0.55, 0.94, 1.0);
        n.subGain.gain.setTargetAtTime((0.14 + groundT * 0.08) * gs.bass, now, 1.0);

        // On section change: soft transition sparkle
        const section = Math.min(8, Math.floor(p * 9));
        if (section !== lastSectionRef.current && lastSectionRef.current !== -1) {
          sparkle(n.ctx, n.fxBus, section);
        }
        lastSectionRef.current = section;

        // PROGRESSIVE ORCHESTRA — each voice fades in at its section and sustains.
        // Voices v1..v8 map to sections 1..8. By section 8 the full ensemble plays.
        // A voice's level also breathes slightly with the current scroll progress
        // within its activation band so the arrival feels musical, not stepped.
        if (n.voices) {
          const padScale = gs.pad;
          for (let i = 0; i < n.voices.length; i++) {
            const v = n.voices[i];
            const activateAt = i + 1;              // v1 arrives at sec 1, v2 at sec 2 ...
            const sectionProgress = p * 9 - activateAt;
            // Fade-in envelope: 0 below section, smooth ramp across 0.5 sections, then full sustain
            const env = Math.min(1, Math.max(0, sectionProgress / 0.5));
            const envSmooth = env * env * (3 - 2 * env);
            // Once sustained, gently breathe so the orchestra feels alive
            const phase = now * 0.23 + i * 0.9;
            const liveBreath = 0.94 + 0.06 * Math.sin(phase);
            const target = v.peak * envSmooth * liveBreath * padScale;
            v.gain.gain.setTargetAtTime(target, now, 1.6);
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onRipple = () => {
      const n = nodes.current;
      if (n) sweep(n.ctx, n.fxBus);
    };
    window.addEventListener('prism:ripple', onRipple);

    // Cursor-specific sounds: subtle click pop, hover whisper, velocity whisper
    let lastCursorMove = 0;
    const onCursor = (e) => {
      const n = nodes.current;
      if (!n) return;
      const k = e.detail && e.detail.kind;
      if (k === 'down') click(n.ctx, n.fxBus, true);
      else if (k === 'up') click(n.ctx, n.fxBus, false);
      else if (k === 'near') whisper(n.ctx, n.fxBus);
      else if (k === 'move') {
        const now = performance.now();
        if (now - lastCursorMove > 260 && e.detail.v > 40) {
          lastCursorMove = now;
          particle(n.ctx, n.fxBus);
        }
      }
    };
    window.addEventListener('prism:cursor', onCursor);

    const onOver = (e) => {
      const t = e.target;
      if (!t || !t.matches) return;
      if (t.matches('.sv-btn, [data-clink], .audio-toggle, .mix-btn')) {
        const n = nodes.current;
        if (n) {
          const note = PENTATONIC[noteIdx.current % PENTATONIC.length];
          noteIdx.current++;
          chime(n.ctx, n.fxBus, note);
        }
      }
    };
    document.addEventListener('mouseover', onOver);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('mouseover', onOver);
      window.removeEventListener('prism:ripple', onRipple);
      window.removeEventListener('prism:cursor', onCursor);
      window.removeEventListener('pointerdown', onFirst);
      window.removeEventListener('keydown', onFirst);
      window.removeEventListener('click', onFirst);
      window.removeEventListener('touchstart', onFirst);
    };
  }, []);
}

function smoothBand(p, a, b, c, d) {
  const up = Math.min(1, Math.max(0, (p - a) / (b - a)));
  const down = 1 - Math.min(1, Math.max(0, (p - c) / (d - c)));
  const t = Math.min(up, down);
  return t * t * (3 - 2 * t);
}

/**
 * Cinematic synth stab — Daft Punk/Justice vibe.
 * Detuned saw stack → resonant LP sweep → long reverb tail.
 */
function chime(ctx, bus, freq) {
  const t0 = ctx.currentTime;
  const g = ctx.createGain();
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 8;
  lp.frequency.setValueAtTime(freq * 1.2, t0);
  lp.frequency.exponentialRampToValueAtTime(freq * 6, t0 + 0.15);
  lp.frequency.exponentialRampToValueAtTime(freq * 2, t0 + 1.2);

  // Detuned saw stack
  const detunes = [-12, -7, 0, +7, +12];
  const oscs = [];
  detunes.forEach((d) => {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    o.detune.value = d;
    const og = ctx.createGain();
    og.gain.value = 0.22;
    o.connect(og).connect(lp);
    oscs.push(o);
  });
  // Sub sine underneath for body
  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.value = freq / 2;
  const subG = ctx.createGain();
  subG.gain.value = 0.5;
  sub.connect(subG).connect(lp);

  lp.connect(g);

  // Punchy attack, long release
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(0.55, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.4);
  g.connect(bus);

  oscs.forEach((o) => { o.start(t0); o.stop(t0 + 1.5); });
  sub.start(t0); sub.stop(t0 + 1.5);
}

/**
 * Section-change sting — Zimmer BRAAM style.
 * Sub-drop (60Hz → 40Hz) + metallic FM ring + reverse-swell pad.
 */
function sparkle(ctx, bus, section) {
  const t0 = ctx.currentTime;

  // (1) Sub-drop hit — big low-end punch
  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(80, t0);
  sub.frequency.exponentialRampToValueAtTime(38, t0 + 0.35);
  const subG = ctx.createGain();
  subG.gain.setValueAtTime(0.0001, t0);
  subG.gain.linearRampToValueAtTime(0.9, t0 + 0.02);
  subG.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.4);
  sub.connect(subG).connect(bus);
  sub.start(t0); sub.stop(t0 + 1.5);

  // (2) Metallic FM ring — cinematic tension
  const carrier = ctx.createOscillator();
  const mod = ctx.createOscillator();
  const modG = ctx.createGain();
  // Pick a pitch tied to section so they feel different
  const pitches = [110, 98, 87, 82, 73, 65, 58, 49, 44];
  carrier.type = 'triangle';
  carrier.frequency.value = pitches[section % pitches.length];
  mod.type = 'sine';
  mod.frequency.value = carrier.frequency.value * 2.414; // inharmonic ratio
  modG.gain.value = 280;
  mod.connect(modG).connect(carrier.frequency);
  const ringG = ctx.createGain();
  ringG.gain.setValueAtTime(0.0001, t0);
  ringG.gain.linearRampToValueAtTime(0.35, t0 + 0.08);
  ringG.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.8);
  carrier.connect(ringG).connect(bus);
  carrier.start(t0); mod.start(t0);
  carrier.stop(t0 + 2.0); mod.stop(t0 + 2.0);

  // (3) Reverse-swell — noise through highpass, volume ramps UP to the hit
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.5;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1200;
  hp.Q.value = 0.8;
  const swG = ctx.createGain();
  // Start quiet, crescendo, then cut — classic "reverse cymbal"
  swG.gain.setValueAtTime(0.0001, t0 - 0.5 < 0 ? t0 : t0 - 0.5);
  swG.gain.linearRampToValueAtTime(0.45, t0 + 0.02);
  swG.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
  src.connect(hp).connect(swG).connect(bus);
  src.start(t0); src.stop(t0 + 0.7);
}

/**
 * Cinematic whoosh — pink-noise through sweeping bandpass.
 */
function sweep(ctx, bus) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99 * b0 + w * 0.05;
    b1 = 0.96 * b1 + w * 0.15;
    b2 = 0.57 * b2 + w * 0.53;
    d[i] = (b0 + b1 + b2) * 0.4;
  }
  const src = ctx.createBufferSource(); src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(400, ctx.currentTime);
  bp.frequency.exponentialRampToValueAtTime(5200, ctx.currentTime + 1.4);
  bp.Q.value = 2.2;
  const g = ctx.createGain();
  const t0 = ctx.currentTime;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(0.7, t0 + 0.25);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.8);
  src.connect(bp).connect(g).connect(bus);
  src.start(t0); src.stop(t0 + 1.9);
}

/**
 * UI click — filtered noise transient + short resonant pluck.
 * Tight, modern, electric.
 */
function click(ctx, bus, isDown) {
  const t0 = ctx.currentTime;

  // (a) Noise transient
  const nBuf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
  const nD = nBuf.getChannelData(0);
  for (let i = 0; i < nD.length; i++) {
    const env = 1 - i / nD.length;
    nD[i] = (Math.random() * 2 - 1) * env;
  }
  const n = ctx.createBufferSource();
  n.buffer = nBuf;
  const nHp = ctx.createBiquadFilter();
  nHp.type = 'highpass';
  nHp.frequency.value = isDown ? 800 : 2400;
  const nG = ctx.createGain();
  nG.gain.setValueAtTime(0.5, t0);
  nG.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.04);
  n.connect(nHp).connect(nG).connect(bus);
  n.start(t0); n.stop(t0 + 0.06);

  // (b) Tonal pluck — short saw through resonant LP
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  const f = isDown ? 220 : 520;
  o.frequency.setValueAtTime(f * 1.5, t0);
  o.frequency.exponentialRampToValueAtTime(f, t0 + 0.03);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 10;
  lp.frequency.setValueAtTime(f * 5, t0);
  lp.frequency.exponentialRampToValueAtTime(f * 1.2, t0 + 0.1);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(isDown ? 0.55 : 0.4, t0 + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
  o.connect(lp).connect(g).connect(bus);
  o.start(t0); o.stop(t0 + 0.16);
}

/** Hover whisper: tiny breathy puff on hoverable elements */
function whisper(ctx, bus) {
  const t0 = ctx.currentTime;
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    const env = 1 - i / d.length;
    d[i] = (Math.random() * 2 - 1) * env * 0.4;
  }
  const src = ctx.createBufferSource(); src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2800;
  bp.Q.value = 3.5;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(0.55, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
  src.connect(bp).connect(g).connect(bus);
  src.start(t0); src.stop(t0 + 0.3);
}

/** Cursor motion particle: airy glint, very quiet */
function particle(ctx, bus) {
  const t0 = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = 'sine';
  const base = 1800 + Math.random() * 1600;
  o.frequency.setValueAtTime(base, t0);
  o.frequency.exponentialRampToValueAtTime(base * 0.6, t0 + 0.22);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.38, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
  o.connect(g).connect(bus);
  o.start(t0); o.stop(t0 + 0.24);
}
