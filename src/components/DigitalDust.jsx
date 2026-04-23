import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { dustVertex, dustFragment } from '../shaders/dust';

export default function DigitalDust({ count = 1800, radius = 10, color = '#7B61FF', size = 2.2, breath = 0 }) {
  const mat = useRef();
  const points = useRef();

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocity = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = Math.cbrt(Math.random()) * radius;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i*3+0] = r * Math.sin(phi) * Math.cos(theta);
      positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i*3+2] = r * Math.cos(phi);
      velocity[i*3+0] = (Math.random() - 0.5) * 0.4;
      velocity[i*3+1] = (Math.random() - 0.5) * 0.4;
      velocity[i*3+2] = (Math.random() - 0.5) * 0.4;
      seed[i] = Math.random();
    }
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('aVelocity', new THREE.BufferAttribute(velocity, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    return g;
  }, [count, radius]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uSize: { value: size },
    uBreath: { value: breath },
    uColor: { value: new THREE.Color(color) },
    uOpacity: { value: 1 },
  }), [color, size, breath]);

  useFrame((s) => {
    if (mat.current) {
      mat.current.uniforms.uTime.value = s.clock.elapsedTime;
      mat.current.uniforms.uBreath.value = breath;
    }
  });

  return (
    <points ref={points} geometry={geometry}>
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        vertexShader={dustVertex}
        fragmentShader={dustFragment}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
