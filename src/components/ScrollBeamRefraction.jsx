/**
 * ScrollBeamRefraction
 *
 * White beam travels from off-screen left toward the prism as the user scrolls.
 * When the tip reaches the prism it refracts into 7 spectral rays that fan to the right.
 * Everything is driven by scrollStore.progress (p ≈ 0 → 0.18).
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollStore } from '../hooks/useScroll';
import { beamVertex, beamFragment } from '../shaders/beam';

// ── helpers ─────────────────────────────────────────────────────────────────
function ss(x, a, b) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// ── constants ────────────────────────────────────────────────────────────────
const SPECTRUM = [
  '#FF0000', // red
  '#FF8000', // orange
  '#FFEE00', // yellow
  '#00CC44', // green
  '#0066FF', // blue
  '#4400BB', // indigo
  '#9900FF', // violet
];

const HALF_INCOMING = 5;  // half-length of the incoming beam cylinder
const HALF_RAY      = 5;  // half-length of each refracted ray cylinder

// Tight vertical fan — overlapping rays merge into a continuous rainbow swath
const SPREAD = 0.55;

// Fat, overlapping ray radii give the diffuse-beam look
const RAY_RADIUS_NEAR = 0.22;
const RAY_RADIUS_FAR  = 0.48;

// ── component ────────────────────────────────────────────────────────────────
export default function ScrollBeamRefraction() {
  const beamMeshRef   = useRef();
  const rayGroupsRef  = useRef([]);   // one Group ref per ray

  // ── uniforms (one object per mesh, so each can animate opacity independently)
  const beamUniforms = useMemo(() => ({
    uTime:      { value: 0 },
    uIntensity: { value: 2.2 },
    uOpacity:   { value: 0 },
    uColor:     { value: new THREE.Color('#ffffff') },
  }), []);

  const rayUniforms = useMemo(() =>
    SPECTRUM.map(c => ({
      uTime:      { value: 0 },
      uIntensity: { value: 3.2 },
      uOpacity:   { value: 0 },
      uColor:     { value: new THREE.Color(c) },
    })), []);

  // ── animation ────────────────────────────────────────────────────────────
  useFrame(({ clock }) => {
    const p = scrollStore.progress;
    const t = clock.elapsedTime;

    // ── incoming beam visibility ─────────────────────────────────────────
    // Fades in immediately, fades out at p ≈ 0.14
    const beamVis = ss(p, 0.0, 0.025) * (1 - ss(p, 0.13, 0.18));

    // ── beam approach ────────────────────────────────────────────────────
    // mesh.position.x is the CENTER of the cylinder.
    // We want the RIGHT TIP (= center + HALF_INCOMING) to travel from -6 → 0.
    // So center travels from (-6 - HALF_INCOMING) → (-HALF_INCOMING).
    //   = from -(6 + HALF_INCOMING) → -HALF_INCOMING
    const approachT   = ss(p, 0.0, 0.065);
    const centerStart = -(6 + HALF_INCOMING);          // -11
    const centerEnd   = -HALF_INCOMING;                // -5  → right tip = 0
    const centerX     = centerStart + approachT * (centerEnd - centerStart);

    if (beamMeshRef.current) {
      beamMeshRef.current.position.x          = centerX;
      beamUniforms.uOpacity.value              = beamVis;
      beamUniforms.uTime.value                 = t;
    }

    // ── refracted rays ───────────────────────────────────────────────────
    // Appear when beam is close (p ≈ 0.04), fully bright at p ≈ 0.08,
    // fade with the beam
    const rayVis = ss(p, 0.04, 0.08) * (1 - ss(p, 0.13, 0.18));

    rayUniforms.forEach((u) => {
      u.uOpacity.value = rayVis;
      u.uTime.value    = t;
    });
  });

  return (
    <group>
      {/* ── Incoming white beam ──────────────────────────────────────────── */}
      {/*
        Cylinder is vertical by default. rotation [0,0,PI/2] makes it horizontal.
        The mesh's local Y becomes world X, so "top" = right, "bottom" = left.
        We shift the center left so the RIGHT TIP starts at x ≈ -6 (off-prism).
        useFrame animates position.x toward -HALF_INCOMING (tip at origin).
      */}
      <mesh
        ref={beamMeshRef}
        position={[-(6 + HALF_INCOMING), 0, 0]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.045, 0.015, HALF_INCOMING * 2, 32, 1, true]} />
        <shaderMaterial
          uniforms={beamUniforms}
          vertexShader={beamVertex}
          fragmentShader={beamFragment}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* ── 7 refracted rays fanning right from prism ────────────────────── */}
      {/*
        Each ray is a horizontal cylinder that starts at the prism (origin).
        Strategy:
          - Group  : rotated by spreadAngle on Z → fans the whole ray
          - Mesh   : rotation [0,0,PI/2] inside the group → makes it horizontal
          - Mesh   : position [HALF_RAY, 0, 0] in group-local space →
                     shifts the cylinder so its LEFT TIP sits at group origin (= world origin)
        After group rotation by spreadAngle, the left tip stays at (0,0,0) and
        the right tip fans out to (8*cos(a), 8*sin(a), 0).
      */}
      {SPECTRUM.map((_, i) => {
        const spreadAngle = (i / (SPECTRUM.length - 1) - 0.5) * SPREAD;
        return (
          <group
            key={i}
            ref={el => { rayGroupsRef.current[i] = el; }}
            rotation={[0, 0, spreadAngle]}
          >
            <mesh
              position={[HALF_RAY, 0, 0]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[RAY_RADIUS_FAR, RAY_RADIUS_NEAR, HALF_RAY * 2, 24, 1, true]} />
              <shaderMaterial
                uniforms={rayUniforms[i]}
                vertexShader={beamVertex}
                fragmentShader={beamFragment}
                transparent
                depthWrite={false}
                side={THREE.DoubleSide}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
