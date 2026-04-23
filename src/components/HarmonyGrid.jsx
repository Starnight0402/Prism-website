import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollStore } from '../hooks/useScroll';

function smoothstep(x, a, b) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/**
 * A 3D grid of glowing glass panels snapping into place. Used in Section 4 (Harmony).
 * Reads scroll progress from scrollStore each frame — no re-renders needed.
 */
export default function HarmonyGrid() {
  const group = useRef();
  const rows = 5;
  const cols = 7;
  const total = rows * cols;

  const items = useMemo(() => {
    const arr = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const x = (c - (cols - 1) / 2) * 1.05;
        const y = (r - (rows - 1) / 2) * 0.7;
        arr.push({
          i,
          target: [x, y, 0],
          rand: [
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 14,
            (Math.random() - 0.5) * 18 - 4,
          ],
          rot: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
          delay: i / total,
        });
      }
    }
    return arr;
  }, [total]);

  useFrame((state) => {
    if (!group.current) return;
    const t = smoothstep(scrollStore.progress, 0.5, 0.66);
    group.current.children.forEach((m, idx) => {
      const it = items[idx];
      if (!it) return;
      const local = Math.min(1, Math.max(0, (t - it.delay * 0.5) * 2));
      const e = easeInOutCubic(local);
      m.position.x = THREE.MathUtils.lerp(it.rand[0], it.target[0], e);
      m.position.y = THREE.MathUtils.lerp(it.rand[1], it.target[1], e);
      m.position.z = THREE.MathUtils.lerp(it.rand[2], it.target[2], e);
      m.rotation.x = THREE.MathUtils.lerp(it.rot[0], 0, e);
      m.rotation.y = THREE.MathUtils.lerp(it.rot[1], 0, e);
      m.rotation.z = THREE.MathUtils.lerp(it.rot[2], 0, e);
      const mat = m.material;
      if (mat) {
        mat.opacity = 0.08 + 0.22 * e;
        mat.emissiveIntensity = 0.08 + 0.55 * e;
      }
    });
    group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
  });

  return (
    <group ref={group}>
      {items.map((it) => (
        <mesh key={it.i}>
          <planeGeometry args={[0.95, 0.6]} />
          <meshStandardMaterial
            color={'#0a0f18'}
            emissive={'#00D1FF'}
            emissiveIntensity={0.15}
            transparent
            opacity={0.2}
            side={THREE.DoubleSide}
            metalness={0.2}
            roughness={0.4}
          />
        </mesh>
      ))}
    </group>
  );
}

function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
