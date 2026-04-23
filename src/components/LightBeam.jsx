import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { beamVertex, beamFragment } from '../shaders/beam';

export default function LightBeam({ length = 24, radius = 0.25, color = '#ffffff', intensity = 1, position = [0,0,0], rotation = [0,0,0] }) {
  const mat = useRef();
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uIntensity: { value: intensity },
    uOpacity: { value: 1 },
    uColor: { value: new THREE.Color(color) },
  }), [color, intensity]);

  useFrame((s) => {
    if (mat.current) {
      mat.current.uniforms.uTime.value = s.clock.elapsedTime;
    }
  });

  return (
    <mesh position={position} rotation={rotation}>
      <cylinderGeometry args={[radius, radius * 0.4, length, 32, 1, true]} />
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        vertexShader={beamVertex}
        fragmentShader={beamFragment}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
