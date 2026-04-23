import { useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';

/**
 * Provides a single global Lenis instance + a shared scroll progress ref (0..1).
 * Sections read progress via context or directly via the exported store.
 */
export const scrollStore = {
  progress: 0,
  velocity: 0,
  mouse: { x: 0, y: 0, nx: 0, ny: 0 },
  // section progress 0..1 calculated per section count (8 sections)
  section: 0,
};

export function useLenis() {
  const lenisRef = useRef(null);
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.6,
      smoothWheel: true,
      smoothTouch: false,
      lerp: 0.075,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.2,
    });
    lenisRef.current = lenis;

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    const onScroll = (e) => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? e.scroll / max : 0;
      scrollStore.progress = p;
      scrollStore.velocity = e.velocity || 0;
    };
    lenis.on('scroll', onScroll);

    const onMouse = (e) => {
      scrollStore.mouse.x = e.clientX;
      scrollStore.mouse.y = e.clientY;
      scrollStore.mouse.nx = (e.clientX / window.innerWidth) * 2 - 1;
      scrollStore.mouse.ny = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('mousemove', onMouse);

    return () => {
      window.removeEventListener('mousemove', onMouse);
      lenis.destroy();
    };
  }, []);
  return lenisRef;
}

export function useScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf;
    const tick = () => {
      setP(scrollStore.progress);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return p;
}
