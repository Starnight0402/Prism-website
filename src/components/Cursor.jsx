import { useEffect, useRef } from 'react';

export default function Cursor() {
  const ringRef = useRef(null);
  const dotRef = useRef(null);

  useEffect(() => {
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let tx = x, ty = y;
    let lastX = x, lastY = y;
    const lerp = (a, b, n) => a + (b - a) * n;

    const onMove = (e) => {
      tx = e.clientX;
      ty = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${tx}px, ${ty}px) translate(-50%, -50%)`;
      }
    };

    const onDown = (e) => {
      if (ringRef.current) {
        ringRef.current.style.width = '28px';
        ringRef.current.style.height = '28px';
      }
      window.dispatchEvent(new CustomEvent('prism:cursor', { detail: { kind: 'down' } }));
    };
    const onUp = () => {
      if (ringRef.current) {
        ringRef.current.style.width = '18px';
        ringRef.current.style.height = '18px';
      }
      window.dispatchEvent(new CustomEvent('prism:cursor', { detail: { kind: 'up' } }));
    };

    // Hover-state change → soft swoosh
    const onHover = (e) => {
      const t = e.target;
      if (!t || !t.matches) return;
      if (t.matches('a, button, .sv-btn, [data-clink], [data-hoverable]')) {
        if (ringRef.current && !ringRef.current.classList.contains('is-near')) {
          ringRef.current.classList.add('is-near');
          window.dispatchEvent(new CustomEvent('prism:cursor', { detail: { kind: 'near' } }));
        }
      }
    };
    const onLeave = (e) => {
      const t = e.target;
      if (!t || !t.matches) return;
      if (t.matches('a, button, .sv-btn, [data-clink], [data-hoverable]')) {
        if (ringRef.current) ringRef.current.classList.remove('is-near');
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    document.addEventListener('mouseover', onHover);
    document.addEventListener('mouseout', onLeave);

    let raf;
    let tickCounter = 0;
    const tick = () => {
      x = lerp(x, tx, 0.18);
      y = lerp(y, ty, 0.18);
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      }
      // Emit a low-frequency velocity pulse for audio (every ~6 frames)
      tickCounter++;
      if (tickCounter % 6 === 0) {
        const dx = tx - lastX;
        const dy = ty - lastY;
        const v = Math.sqrt(dx * dx + dy * dy);
        if (v > 2) {
          window.dispatchEvent(new CustomEvent('prism:cursor', { detail: { kind: 'move', v } }));
        }
        lastX = tx; lastY = ty;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      document.removeEventListener('mouseover', onHover);
      document.removeEventListener('mouseout', onLeave);
    };
  }, []);

  return (
    <>
      <div ref={ringRef} className="cursor" />
      <div ref={dotRef} className="cursor dot" />
    </>
  );
}
