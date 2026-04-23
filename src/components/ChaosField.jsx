import { useMemo, useRef } from 'react';
import { RigidBody } from '@react-three/rapier';
import { useFrame } from '@react-three/fiber';
import { scrollStore } from '../hooks/useScroll';

/**
 * Chaos field — debris vortex using a pool of RigidBodies.
 * Shapes: flat "paper" cuboids, warning tetrahedra, checklist tablets.
 */
export default function ChaosField({ count = 40, active = 1 }) {
  const bodies = useRef([]);

  const items = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 3 + Math.random() * 7;
      const kind = Math.floor(Math.random() * 3);
      arr.push({
        id: i,
        kind,
        pos: [Math.cos(a) * r, (Math.random() - 0.5) * 6, Math.sin(a) * r - 4],
        rot: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
        scl: 0.22 + Math.random() * 0.3,
      });
    }
    return arr;
  }, [count]);

  useFrame((state) => {
    const mx = scrollStore.mouse.nx * 4;
    const my = scrollStore.mouse.ny * 2;
    for (let i = 0; i < bodies.current.length; i++) {
      const b = bodies.current[i];
      if (!b) continue;
      const t = state.clock.elapsedTime + i * 0.3;
      const pos = b.translation();
      b.applyImpulse(
        {
          x: (mx - pos.x) * 0.002 * active + Math.sin(t) * 0.004,
          y: (my - pos.y) * 0.002 * active + Math.cos(t * 0.7) * 0.004,
          z: Math.sin(t * 0.5) * 0.003,
        },
        true
      );
      const lv = b.linvel();
      b.setLinvel({ x: lv.x * 0.97, y: lv.y * 0.97, z: lv.z * 0.97 }, true);
    }
  });

  return (
    <group>
      {items.map((it) => (
        <RigidBody
          key={it.id}
          ref={(ref) => (bodies.current[it.id] = ref)}
          position={it.pos}
          rotation={it.rot}
          gravityScale={0}
          linearDamping={1.5}
          angularDamping={1.2}
          colliders="cuboid"
          type="dynamic"
        >
          {it.kind === 0 && (
            <mesh scale={[it.scl * 1.2, it.scl * 0.04, it.scl * 0.9]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color={'#2a2a30'} roughness={0.9} metalness={0.0} emissive={'#1a1a1f'} transparent opacity={1} />
            </mesh>
          )}
          {it.kind === 1 && (
            <mesh scale={it.scl * 0.6}>
              <tetrahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color={'#200000'} emissive={'#FF2D3D'} emissiveIntensity={0.55} roughness={0.3} transparent opacity={1} />
            </mesh>
          )}
          {it.kind === 2 && (
            <mesh scale={[it.scl * 0.7, it.scl * 0.06, it.scl * 1.0]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color={'#0e0e12'} emissive={'#3a2d88'} emissiveIntensity={0.22} roughness={0.4} transparent opacity={1} />
            </mesh>
          )}
        </RigidBody>
      ))}
    </group>
  );
}
