import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Production-ready scroll-linked reveals.
 * - Soft power4.out ease, tight stagger (feels confident, not bouncy)
 * - No rotation / overshoot — brutalist calm
 * - prefers-reduced-motion respected
 * - Idempotent (splits once per element)
 */
export function useReveals(lenisRef) {
  useEffect(() => {
    const lenis = lenisRef.current;
    if (!lenis) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const onScroll = () => ScrollTrigger.update();
    lenis.on('scroll', onScroll);

    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    const splitWords = (el) => {
      if (el.dataset.split === 'done') return;
      const html = el.innerHTML.replace(/<br\s*\/?>/g, '|BR|');
      const words = html.split(/\s+/);
      el.innerHTML = words
        .map((w) => (w === '|BR|' ? '<br/>' : `<span class="word"><span class="word-inner">${w}</span></span>`))
        .join(' ');
      el.dataset.split = 'done';
    };

    if (reduced) {
      document.querySelectorAll('[data-reveal]').forEach(splitWords);
      return () => {
        lenis.off('scroll', onScroll);
        ScrollTrigger.getAll().forEach((t) => t.kill());
      };
    }

    document.querySelectorAll('[data-reveal]').forEach((el) => {
      splitWords(el);
      const inners = el.querySelectorAll('.word-inner');
      gsap.set(inners, { yPercent: 100, opacity: 0 });

      ScrollTrigger.create({
        trigger: el,
        start: 'top 86%',
        end: 'bottom 18%',
        onEnter: () => {
          gsap.to(inners, {
            yPercent: 0,
            opacity: 1,
            duration: 1.0,
            ease: 'power4.out',
            stagger: 0.04,
            overwrite: true,
          });
        },
        onLeaveBack: () => {
          gsap.to(inners, {
            yPercent: 100,
            opacity: 0,
            duration: 0.5,
            ease: 'power3.in',
            stagger: 0.02,
            overwrite: true,
          });
        },
      });
    });

    document.querySelectorAll('[data-fade]').forEach((el) => {
      gsap.set(el, { opacity: 0, y: 16 });
      ScrollTrigger.create({
        trigger: el,
        start: 'top 90%',
        onEnter: () => gsap.to(el, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', overwrite: true }),
        onLeaveBack: () => gsap.to(el, { opacity: 0, y: 16, duration: 0.4, ease: 'power2.in', overwrite: true }),
      });
    });

    document.querySelectorAll('[data-stagger]').forEach((el) => {
      const kids = el.children;
      gsap.set(kids, { opacity: 0, y: 14 });
      ScrollTrigger.create({
        trigger: el,
        start: 'top 82%',
        onEnter: () => gsap.to(kids, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08, overwrite: true }),
        onLeaveBack: () => gsap.to(kids, { opacity: 0, y: 14, duration: 0.35, ease: 'power2.in', stagger: 0.03, overwrite: true }),
      });
    });

    return () => {
      lenis.off('scroll', onScroll);
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, [lenisRef]);
}
