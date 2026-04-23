import { useEffect, useRef, useState } from 'react';

/**
 * Section 0 — Singularity preloader.
 * A point cloud migrating from the center into the vertices of a double-pyramid prism.
 * The mouse becomes a gravity well that bends trailing points.
 */
export default function Preloader({ onDone }) {
  const ref = useRef(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let W = (canvas.width = window.innerWidth * dpr);
    let H = (canvas.height = window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';

    // Double-pyramid (octahedron) target vertices in normalized screen coords.
    const R = Math.min(W, H) * 0.18;
    const cx = W / 2, cy = H / 2;
    const verts = [
      [cx, cy - R],           // top
      [cx + R, cy],           // right
      [cx, cy + R],           // bottom
      [cx - R, cy],           // left
      [cx + R * 0.7, cy - R * 0.5], // NE bevel
      [cx + R * 0.7, cy + R * 0.5], // SE
      [cx - R * 0.7, cy + R * 0.5], // SW
      [cx - R * 0.7, cy - R * 0.5], // NW
    ];

    const N = 260;
    const pts = [];
    for (let i = 0; i < N; i++) {
      const target = verts[i % verts.length];
      pts.push({
        x: cx + (Math.random() - 0.5) * 2,
        y: cy + (Math.random() - 0.5) * 2,
        tx: target[0] + (Math.random() - 0.5) * 18,
        ty: target[1] + (Math.random() - 0.5) * 18,
        vx: 0,
        vy: 0,
        seed: Math.random(),
      });
    }

    let mouse = { x: cx, y: cy };
    const onMove = (e) => { mouse.x = e.clientX * dpr; mouse.y = e.clientY * dpr; };
    window.addEventListener('mousemove', onMove);

    const onResize = () => {
      W = (canvas.width = window.innerWidth * dpr);
      H = (canvas.height = window.innerHeight * dpr);
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
    };
    window.addEventListener('resize', onResize);

    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 2400);
      ctx.fillStyle = 'rgba(0,0,0,0.28)'; // motion trails
      ctx.fillRect(0, 0, W, H);

      // Draw migrating points
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const tx = p.tx, ty = p.ty;
        const lerp = 0.04 + 0.05 * t;
        // gravity well from mouse
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy + 0.0001;
        const g = Math.min(800 / d2, 0.4);
        p.vx += (tx - p.x) * lerp + dx * g * 0.02;
        p.vy += (ty - p.y) * lerp + dy * g * 0.02;
        p.vx *= 0.82; p.vy *= 0.82;
        p.x += p.vx; p.y += p.vy;

        ctx.fillStyle = t > 0.85 ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.8)';
        ctx.fillRect(p.x, p.y, 1.5 * dpr, 1.5 * dpr);
      }

      // Connect nearest points to form wireframe lines (hair-thin violet)
      if (t > 0.65) {
        ctx.lineWidth = 1;
        const maxD = 120 * dpr;
        for (let i = 0; i < verts.length; i++) {
          const a = verts[i];
          for (let j = i + 1; j < verts.length; j++) {
            const b = verts[j];
            const dx = a[0] - b[0], dy = a[1] - b[1];
            const d = Math.hypot(dx, dy);
            if (d < maxD * 2) {
              ctx.strokeStyle = `rgba(123, 97, 255, ${(t - 0.65) * 1.6})`;
              ctx.beginPath();
              ctx.moveTo(a[0], a[1]);
              ctx.lineTo(b[0], b[1]);
              ctx.stroke();
            }
          }
        }
      }

      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setTimeout(() => {
          setDone(true);
          onDone && onDone();
        }, 400);
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('resize', onResize);
    };
  }, [onDone]);

  return (
    <div className={`preloader ${done ? 'gone' : ''}`}>
      <img src="/logo.png" alt="PRISM INTELLIGENCE" className="preloader-logo" />
      <canvas ref={ref} />
      <div className="label" style={{ position: 'absolute', bottom: '12vh' }}>
        {done ? 'SYSTEM READY' : 'BOOTING INTELLIGENCE…'}
      </div>
    </div>
  );
}
