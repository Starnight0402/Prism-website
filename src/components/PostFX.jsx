import { EffectComposer, Bloom, ChromaticAberration, Noise, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { Vector2 } from 'three';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { scrollStore } from '../hooks/useScroll';

export default function PostFX() {
  const caRef = useRef();
  const smoothed = useRef(0);

  useFrame((_, dt) => {
    if (caRef.current) {
      const absV = Math.abs(scrollStore.velocity);
      const target = Math.min(1, absV * 0.00028);
      // Slower, buttery smoothing (~0.3s tau)
      const k = 1 - Math.exp(-dt / 0.3);
      smoothed.current += (target - smoothed.current) * k;

      const p = scrollStore.progress;
      // Soft zone envelope — no hard boundaries
      const zone = 0.15 + 0.35 * Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, (p - 0.18) / 0.34))));
      const amt = 0.00008 + smoothed.current * 0.00055 + zone * 0.00015;
      caRef.current.offset = new Vector2(amt, amt);
    }
  });

  return (
    <EffectComposer multisampling={0} disableNormalPass>
      <Bloom
        intensity={0.22}
        luminanceThreshold={0.62}
        luminanceSmoothing={0.92}
        mipmapBlur
      />
      <ChromaticAberration
        ref={caRef}
        offset={new Vector2(0.00008, 0.00008)}
        radialModulation
        modulationOffset={0.2}
        blendFunction={BlendFunction.NORMAL}
      />
      <Noise opacity={0.006} premultiply blendFunction={BlendFunction.ADD} />
      <Vignette eskil={false} offset={0.18} darkness={0.88} />
    </EffectComposer>
  );
}
