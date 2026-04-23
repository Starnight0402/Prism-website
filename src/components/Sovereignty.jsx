import { useEffect } from 'react';
import { ripple } from '../utils/ripple';

/**
 * Section 6 buttons — 10ms intentional latency, then dispatch a
 * "violet ripple" CustomEvent that the 3D scene listens for.
 */
export default function Sovereignty() {
  useEffect(() => {
    const buttons = document.querySelectorAll('[data-sv]');
    const handlers = [];
    buttons.forEach((b) => {
      const onClick = (e) => {
        b.classList.add('is-calc');
        setTimeout(() => {
          b.classList.remove('is-calc');
          ripple(e.clientX, e.clientY, b.dataset.sv);
        }, 10);
      };
      b.addEventListener('click', onClick);
      handlers.push([b, onClick]);

      const onEnter = () => {
        b.classList.add('is-hover');
        setTimeout(() => b.classList.add('is-hover-confirmed'), 10);
      };
      const onLeave = () => {
        b.classList.remove('is-hover');
        b.classList.remove('is-hover-confirmed');
      };
      b.addEventListener('mouseenter', onEnter);
      b.addEventListener('mouseleave', onLeave);
      handlers.push([b, onEnter, 'mouseenter']);
      handlers.push([b, onLeave, 'mouseleave']);
    });
    return () => {
      handlers.forEach(([el, fn, ev]) => el.removeEventListener(ev || 'click', fn));
    };
  }, []);
  return null;
}
