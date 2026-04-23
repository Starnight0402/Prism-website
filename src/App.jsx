import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import Experience from './components/Experience';
import Sections from './components/Sections';
import Preloader from './components/Preloader';
import Cursor from './components/Cursor';
import HUD from './components/HUD';
import AudioMixer from './components/AudioMixer';
import ScrollIndicator from './components/ScrollIndicator';
import { useLenis } from './hooks/useScroll';
import { useReveals } from './hooks/useReveals';
import useAudio from './hooks/useAudio';

export default function App() {
  const lenisRef = useLenis();
  useReveals(lenisRef);
  useAudio();
  const [ready, setReady] = useState(false);
  const [mixerOpen, setMixerOpen] = useState(false);
  const [audioOn, setAudioOn] = useState(false);

  return (
    <>
      <Preloader onDone={() => setReady(true)} />

      <div className="canvas-root">
        <Canvas
          dpr={[1, 1.75]}
          gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
          camera={{ position: [0, 0, 6], fov: 42, near: 0.1, far: 100 }}
        >
          <Suspense fallback={null}>
            <Experience />
          </Suspense>
        </Canvas>
      </div>

      <div className="scrim" aria-hidden="true" />

      <Sections />
      <HUD />
      <Cursor />
      <AudioMixer open={mixerOpen} onClose={() => setMixerOpen(false)} />
      <ScrollIndicator />
      <button
        className="mix-btn"
        data-clink
        onClick={() => setMixerOpen(o => !o)}
        aria-label="Toggle audio mixer"
      >
        ◈ SYSTEM LAYERS
      </button>
      <button
        className="audio-toggle"
        data-clink
        aria-pressed={audioOn}
        onClick={() => {
          const next = !audioOn;
          if (typeof window.__prismSetAudioEnabled === 'function') {
            window.__prismSetAudioEnabled(next);
          } else if (next && typeof window.__prismStartAudio === 'function') {
            window.__prismStartAudio();
          }
          setAudioOn(next);
        }}
      >
        {audioOn ? '● SOUND / ON' : '● SOUND / OFF'}
      </button>
    </>
  );
}
