import { useEffect, useRef } from 'react';

export type OrbMode = 'idle' | 'listening' | 'speaking' | 'saving';

interface BreathOrbProps {
  mode: OrbMode;
  /** Analyseur du micro : fait réagir les lignes à la voix de la personne. */
  analyserNode?: AnalyserNode | null;
  /** Fond sombre (séance en cours) ou clair. */
  tone?: 'light' | 'dark';
  size?: number;
  className?: string;
}

const RINGS = 9;

/**
 * Lignes de souffle : des contours concentriques qui respirent lentement
 * au repos, ondulent avec la voix de la personne et s'animent quand Marie parle.
 */
export function BreathOrb({ mode, analyserNode, tone = 'light', size = 280, className = '' }: BreathOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef(mode);
  const analyserRef = useRef(analyserNode);
  modeRef.current = mode;
  analyserRef.current = analyserNode;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    let energy = 0; // lissage de l'amplitude
    let data: Uint8Array<ArrayBuffer> | null = null;
    const start = performance.now();

    const palette =
      tone === 'dark'
        ? { line: [220, 235, 236], accent: [227, 154, 95] }
        : { line: [30, 33, 64], accent: [31, 107, 114] };

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      const m = modeRef.current;

      // Amplitude cible selon l'état
      let target = 0.08;
      if (m === 'listening') {
        const analyser = analyserRef.current;
        if (analyser) {
          if (!data || data.length !== analyser.frequencyBinCount) data = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += data[i];
          target = 0.1 + Math.min(1, (sum / data.length) / 70) * 0.9;
        } else target = 0.12;
      } else if (m === 'speaking') {
        target = 0.45 + 0.35 * Math.abs(Math.sin(t * 3.1) * Math.sin(t * 1.7 + 1));
      } else if (m === 'saving') {
        target = 0.18;
      }
      energy += (target - energy) * 0.12;

      const c = size / 2;
      const maxR = size * 0.44;
      // Respiration lente : environ 6 cycles par minute
      const breath = reduceMotion ? 0 : Math.sin(t * ((2 * Math.PI) / 10));
      const spin = m === 'saving' ? t * 0.9 : t * 0.12;

      ctx.clearRect(0, 0, size, size);

      for (let i = 1; i <= RINGS; i++) {
        const k = i / RINGS;
        const baseR = maxR * (0.18 + 0.82 * k) * (1 + breath * 0.035 * (1 - k * 0.4));
        const wobble = (reduceMotion ? 0.3 : 1) * energy * maxR * 0.085 * (0.4 + k);
        const isAccent = i === RINGS - 2;
        const [r, g, b] = isAccent ? palette.accent : palette.line;
        const alpha = isAccent ? 0.85 : 0.12 + 0.5 * (1 - Math.abs(k - 0.55) * 1.4);

        ctx.beginPath();
        const steps = 120;
        for (let s = 0; s <= steps; s++) {
          const a = (s / steps) * Math.PI * 2;
          const n =
            Math.sin(a * 3 + spin + i * 0.7) * 0.55 +
            Math.sin(a * 5 - t * 0.8 + i * 1.3) * 0.3 +
            Math.sin(a * 2 + t * 0.5 - i) * 0.15;
          const rr = baseR + n * wobble;
          const x = c + Math.cos(a) * rr;
          const y = c + Math.sin(a) * rr;
          if (s === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.lineWidth = isAccent ? 2 : 1.25;
        ctx.strokeStyle = `rgba(${r},${g},${b},${Math.max(0.08, Math.min(1, alpha))})`;
        ctx.stroke();
      }

      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [size, tone]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{ width: size, maxWidth: '100%', height: 'auto', aspectRatio: '1 / 1' }}
    />
  );
}
