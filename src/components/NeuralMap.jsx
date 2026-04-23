import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Neural Map wireframe — icosahedron with animated vertex glow, symbolizing cognition.
 */
export default function NeuralMap({ position = [0, 0, 0], scale = 2.4, active = 1 }) {
  const group = useRef();
  const nodes = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 2);
    const pts = [];
    const pos = g.attributes.position;
    const seen = new Set();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const key = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
      if (!seen.has(key)) {
        seen.add(key);
        pts.push([x, y, z]);
      }
    }
    return { geometry: g, pts };
  }, []);

  useFrame((s) => {
    if (group.current) {
      group.current.rotation.y += 0.003;
      group.current.rotation.x = Math.sin(s.clock.elapsedTime * 0.4) * 0.15;
    }
  });

  return (
    <group ref={group} position={position} scale={scale}>
      <mesh geometry={nodes.geometry}>
        <meshBasicMaterial color={'#7B61FF'} wireframe transparent opacity={0.35 * active} />
      </mesh>
      {nodes.pts.map((p, i) => (
        <mesh key={i} position={p} scale={0.03}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color={'#00D1FF'} toneMapped={false} transparent opacity={1} />
        </mesh>
      ))}
    </group>
  );
}
