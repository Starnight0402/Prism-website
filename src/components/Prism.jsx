import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { CubeCamera } from '@react-three/drei';
import * as THREE from 'three';
import { prismVertex, prismFragment } from '../shaders/prism';
import { scrollStore } from '../hooks/useScroll';

/**
 * Hyper-realistic double-pyramid glass prism.
 * Uses a high-poly octahedron with sharp facets and a custom dispersion shader.
 */
export default function Prism({ position = [0, 0, 0], scale = 1, rotationSpeed = 0.25, emphasize = 0 }) {
  const group = useRef();
  const mat = useRef();
  const glowMat = useRef();
  const coreMat = useRef();
  const glowIntensity = useRef(0);

  // Geometry: octahedron subdivided, then pole-stretched for a diamond silhouette.
  const geometry = useMemo(() => {
    const g = new THREE.OctahedronGeometry(1, 4);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const yAbs = Math.abs(y);
      const stretch = 1.0 + yAbs * 0.22;
      pos.setY(i, y * stretch);
      // Flatten facets — snap normals toward primary crystal planes
      const facet = 0.015 * Math.sin(x * 6.0) * Math.cos(z * 6.0);
      pos.setX(i, x + facet);
      pos.setZ(i, z + facet);
    }
    // Keep the original crystalline normals for sharper refraction, then re-smooth lightly
    g.computeVertexNormals();
    return g;
  }, []);

  const uniforms = useMemo(() => ({
    uEnvMap: { value: null },
    uIOR: { value: 2.0 },           // Between glass (1.52) and diamond (2.42) — luxurious
    uDispersion: { value: 0.04 },   // Visible but refined
    uFresnelF0: { value: 0.08 },    // Glass-like base reflectance
    uTime: { value: 0 },
    uTint: { value: new THREE.Color('#7B61FF') },
    uTintStrength: { value: 0.22 },
  }), []);

  useFrame((state, dt) => {
    if (group.current) {
      group.current.rotation.y += dt * rotationSpeed;
      group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.08;
    }
    if (mat.current) {
      mat.current.uniforms.uTime.value = state.clock.elapsedTime;
      mat.current.uniforms.uDispersion.value = 0.04 + emphasize * 0.02;
    }

    // Glow drive: peaks while the white beam is inside the prism (p ≈ 0.04-0.1),
    // trailing off softly as VIBGYOR fades (by p ≈ 0.18)
    const p = scrollStore.progress;
    const ss = (x, a, b) => {
      const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    };
    const target = ss(p, 0.02, 0.06) * (1 - ss(p, 0.1, 0.18));
    // Smooth toward target
    glowIntensity.current += (target - glowIntensity.current) * Math.min(1, dt * 6);
    const breathe = 0.85 + 0.15 * Math.sin(state.clock.elapsedTime * 3.2);
    const g = glowIntensity.current * breathe;

    // Baseline ambient glow so the prism is never "lights off" at the hero.
    // Gentle breathing pulse layered over a soft constant.
    const ambient = 0.28 + 0.08 * Math.sin(state.clock.elapsedTime * 1.4);
    if (glowMat.current) {
      // Inner heart: ambient baseline + scroll-driven surge during beam entry
      glowMat.current.opacity = ambient + 0.7 * g;
    }
    if (coreMat.current) {
      coreMat.current.opacity = 0.22 + 0.55 * g;
    }
  });

  return (
    <group position={position} scale={scale}>
      <CubeCamera resolution={512} frames={Infinity} far={50} near={0.1}>
        {(texture) => {
          uniforms.uEnvMap.value = texture;
          return (
            <mesh ref={group} geometry={geometry}>
              <shaderMaterial
                ref={mat}
                uniforms={uniforms}
                vertexShader={prismVertex}
                fragmentShader={prismFragment}
                transparent={false}
              />
            </mesh>
          );
        }}
      </CubeCamera>

      {/* Inner luminous heart — a smaller octahedron inside the prism itself.
          Additive blending + rendered AFTER the glass means you see it refracted
          through the faces as a living light source trapped within the crystal. */}
      <mesh geometry={geometry} scale={0.55}>
        <meshBasicMaterial
          ref={glowMat}
          color={'#ffffff'}
          toneMapped={false}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Central spark — tiny bright point at the exact center */}
      <mesh>
        <sphereGeometry args={[0.12, 24, 24]} />
        <meshBasicMaterial
          ref={coreMat}
          color={'#ffffff'}
          toneMapped={false}
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
