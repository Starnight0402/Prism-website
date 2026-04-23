import { useEffect, useState } from 'react';

export default function ScrollIndicator() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setHidden(window.scrollY > 2);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className={`scroll-indicator${hidden ? ' is-hidden' : ''}`} aria-hidden="true">
      <span className="si-label">SCROLL TO ANALYZE</span>
      <span className="si-track">
        <span className="si-dot" />
      </span>
      <span className="si-arrow">▽</span>
    </div>
  );
}
