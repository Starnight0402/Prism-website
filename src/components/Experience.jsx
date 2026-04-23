import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import * as THREE from 'three';
import Prism from './Prism';
import LightBeam from './LightBeam';
import DigitalDust from './DigitalDust';
import ChaosField from './ChaosField';
import HarmonyGrid from './HarmonyGrid';
import NeuralMap from './NeuralMap';
import PostFX from './PostFX';
import ScrollBeamRefraction from './ScrollBeamRefraction';
import { scrollStore } from '../hooks/useScroll';

function smoothstep(x, a, b) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function CameraRig() {
  const { camera } = useThree();
  const desired = useRef(new THREE.Vector3(0, 0, 6));
  const lookAt = useRef(new THREE.Vector3(0, 0, 0));
  const tmp = useRef(new THREE.Vector3());
  const tmpLook = useRef(new THREE.Vector3());

  useFrame(() => {
    const p = scrollStore.progress;
    const mx = scrollStore.mouse.nx;
    const my = scrollStore.mouse.ny;
    const pos = tmp.current;
    const lk = tmpLook.current;
    pos.set(0, 0, 6);
    lk.set(0, 0, 0);

    if (p < 0.1) {
      pos.set(0, 0, 4 + (0.1 - p) * 40);
    } else if (p < 0.22) {
      const t = (p - 0.1) / 0.12;
      pos.set(Math.sin(t * 0.6) * 1.5, 0.2, 5 - t * 1.5);
    } else if (p < 0.4) {
      const t = (p - 0.22) / 0.18;
      pos.set(Math.sin(t * 2.0) * 2.0, Math.cos(t * 1.3) * 1.2, 5 - t * 8);
      lk.set(0, 0, -6);
    } else if (p < 0.52) {
      const t = (p - 0.4) / 0.12;
      pos.set(0, 0, -3 - t * 2.5);
      lk.set(0, 0, -20);
    } else if (p < 0.68) {
      const t = (p - 0.52) / 0.16;
      pos.set(0, 0, -2 + t * 7);
    } else if (p < 0.82) {
      const t = (p - 0.68) / 0.14;
      pos.set(Math.sin(t * Math.PI) * 3.5, 0.4, 4.5);
    } else if (p < 0.94) {
      const t = (p - 0.82) / 0.12;
      pos.set(0, 0.6, 7 + t * 1.5);
    } else {
      const t = (p - 0.94) / 0.06;
      const a = t * Math.PI * 2;
      pos.set(Math.sin(a) * 6, 0.4, Math.cos(a) * 6);
    }

    pos.x += mx * 0.3;
    pos.y += my * 0.2;

    desired.current.lerp(pos, 0.06);
    camera.position.copy(desired.current);
    lookAt.current.lerp(lk, 0.06);
    camera.lookAt(lookAt.current);
  });
  return null;
}

function DataSparks() {
  const g = useRef();
  const count = 24;
  const seeds = useRef(
    Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 10,
      y: (Math.random() - 0.5) * 6,
      z: -2 - Math.random() * 8,
      s: Math.random() * 10,
    }))
  );
  useFrame((st) => {
    if (!g.current) return;
    const t = st.clock.elapsedTime;
    g.current.children.forEach((m, i) => {
      const s = seeds.current[i];
      m.position.x = s.x + Math.sin(t + s.s) * 0.4;
      m.position.y = s.y + Math.cos(t * 0.7 + s.s) * 0.3;
      m.position.z = s.z;
      // Soft, slow breathing — not flicker
      const breath = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.6 + s.s * 1.4));
      if (m.material) m.material.opacity = breath;
    });
  });
  return (
    <group ref={g}>
      {Array.from({ length: count }).map((_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.012, 8, 8]} />
          <meshBasicMaterial color={'#ffffff'} transparent opacity={0.5} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function StageController({ refs }) {
  // Smoothed weights — exponentially damped toward target values to avoid pops
  const smoothed = useRef({
    provocation: 0, entropy: 0, eventHorizon: 0, harmony: 0,
    cognitive: 0, sovereignty: 0, engine: 0, contactsFade: 1,
  });
  const prismTint = useRef(new THREE.Color('#7B61FF'));
  const targetTint = useRef(new THREE.Color('#7B61FF'));
  const fogNear = useRef(4);
  const fogFar = useRef(30);
  const entropyCrimedRef = useRef(false); // fire chime once when prism turns red

  // Palette: accent color per stage — prism tint blends these by weight
  const palette = {
    provocation: new THREE.Color('#ffffff'),
    entropy: new THREE.Color('#FF4455'),
    eventHorizon: new THREE.Color('#9B7BFF'),
    harmony: new THREE.Color('#00D1FF'),
    cognitive: new THREE.Color('#FFD400'),   // warm gold — anchor of clarity
    sovereignty: new THREE.Color('#7B61FF'),
    engine: new THREE.Color('#C0B6FF'),
  };
  const base = new THREE.Color('#7B61FF');

  // Apply smoothed weight to a group: caches baseOpacity/baseIntensity on first touch,
  // then scales every material's opacity / uOpacity / uIntensity by weight.
  const applyWeight = (grp, weight) => {
    if (!grp || !grp.current) return;
    grp.current.visible = weight > 0.003;
    if (!grp.current.visible) return;
    // Soft scale-in (not translation — no jumps)
    const s = 0.985 + 0.015 * weight;
    grp.current.scale.setScalar(s);
    grp.current.traverse((obj) => {
      const mat = obj.material;
      if (!mat) return;
      // Handle arrays of materials
      const mats = Array.isArray(mat) ? mat : [mat];
      mats.forEach((m) => {
        if (!m.userData) m.userData = {};
        if (m.userData._baseOpacity === undefined) {
          m.userData._baseOpacity = m.opacity !== undefined ? m.opacity : 1;
        }
        m.transparent = true;
        // ShaderMaterial with uOpacity: preferred path
        if (m.uniforms && m.uniforms.uOpacity) {
          m.uniforms.uOpacity.value = weight;
        } else {
          m.opacity = m.userData._baseOpacity * weight;
        }
      });
    });
  };

  useFrame((_, dt) => {
    const p = scrollStore.progress;
    // Wide, overlapping gates → cross-fades instead of hard swaps
    const tgt = {
      provocation: smoothstep(p, 0.02, 0.2) * (1 - smoothstep(p, 0.22, 0.34)),
      entropy: smoothstep(p, 0.14, 0.3) * (1 - smoothstep(p, 0.34, 0.48)),
      eventHorizon: smoothstep(p, 0.3, 0.46) * (1 - smoothstep(p, 0.48, 0.6)),
      harmony: smoothstep(p, 0.42, 0.56) * (1 - smoothstep(p, 0.58, 0.68)),
      cognitive: smoothstep(p, 0.56, 0.72) * (1 - smoothstep(p, 0.76, 0.86)),
      sovereignty: smoothstep(p, 0.68, 0.82) * (1 - smoothstep(p, 0.86, 0.94)),
      engine: smoothstep(p, 0.78, 0.88) * (1 - smoothstep(p, 0.9, 0.96)),
      contactsFade: 1 - smoothstep(p, 0.9, 0.97),
    };

    // Exponential damping — tau ~0.35s for lusciously smooth crossfades
    const k = 1 - Math.exp(-dt / 0.35);
    const sm = smoothed.current;
    for (const key in tgt) sm[key] += (tgt[key] - sm[key]) * k;

    // Chime when the prism first fully turns red (entropy peak)
    if (!entropyCrimedRef.current && sm.entropy > 0.55) {
      entropyCrimedRef.current = true;
      if (typeof window.__prismChimeActivate === 'function') window.__prismChimeActivate();
    }
    if (sm.entropy < 0.1) entropyCrimedRef.current = false; // reset when gone

    applyWeight(refs.provocationGroup, sm.provocation);
    applyWeight(refs.entropyGroup, sm.entropy);
    applyWeight(refs.eventHorizonGroup, sm.eventHorizon);
    applyWeight(refs.harmonyGroup, sm.harmony);
    applyWeight(refs.cognitiveGroup, sm.cognitive);
    applyWeight(refs.sovereigntyGroup, sm.sovereignty);
    applyWeight(refs.engineGroup, sm.engine);

    // Lights — smoothed, so they no longer flash on
    if (refs.pointA.current) refs.pointA.current.intensity = 1.2 * sm.provocation;
    if (refs.pointB.current) refs.pointB.current.intensity = 1.5 * sm.harmony;
    if (refs.pointC.current) refs.pointC.current.intensity = 1.8 * sm.cognitive;

    // Prism: smooth tint blend from weighted accent colors
    const totalW = sm.provocation + sm.entropy + sm.eventHorizon + sm.harmony
                 + sm.cognitive + sm.sovereignty + sm.engine;
    targetTint.current.copy(base);
    if (totalW > 0.001) {
      const inv = 1 / Math.max(totalW, 0.001);
      const r = (palette.provocation.r * sm.provocation + palette.entropy.r * sm.entropy
              + palette.eventHorizon.r * sm.eventHorizon + palette.harmony.r * sm.harmony
              + palette.cognitive.r * sm.cognitive + palette.sovereignty.r * sm.sovereignty
              + palette.engine.r * sm.engine) * inv;
      const g = (palette.provocation.g * sm.provocation + palette.entropy.g * sm.entropy
              + palette.eventHorizon.g * sm.eventHorizon + palette.harmony.g * sm.harmony
              + palette.cognitive.g * sm.cognitive + palette.sovereignty.g * sm.sovereignty
              + palette.engine.g * sm.engine) * inv;
      const b = (palette.provocation.b * sm.provocation + palette.entropy.b * sm.entropy
              + palette.eventHorizon.b * sm.eventHorizon + palette.harmony.b * sm.harmony
              + palette.cognitive.b * sm.cognitive + palette.sovereignty.b * sm.sovereignty
              + palette.engine.b * sm.engine) * inv;
      // Mix weighted palette into base by total presence
      const mix = Math.min(1, totalW);
      targetTint.current.setRGB(
        base.r * (1 - mix) + r * mix,
        base.g * (1 - mix) + g * mix,
        base.b * (1 - mix) + b * mix,
      );
    }
    prismTint.current.lerp(targetTint.current, k);

    if (refs.prism.current) {
      const t = performance.now() * 0.0008;
      const breath = 0.02 * Math.sin(t);
      const sc = (0.9 + 0.25 * sm.provocation + breath) * sm.contactsFade;
      refs.prism.current.scale.setScalar(sc);
      refs.prism.current.visible = sm.contactsFade > 0.01;
      // Push blended tint + subtle dispersion swell on provocation/entropy
      refs.prism.current.traverse((o) => {
        if (o.material && o.material.uniforms) {
          const u = o.material.uniforms;
          if (u.uTint) u.uTint.value.copy(prismTint.current);
          if (u.uTintStrength) u.uTintStrength.value = 0.1 + 0.18 * (sm.entropy + sm.eventHorizon);
          if (u.uDispersion) u.uDispersion.value = 0.035 + 0.03 * (sm.eventHorizon + sm.cognitive);
        }
      });
    }
    if (refs.ring1.current && refs.ring1.current.material) {
      refs.ring1.current.material.opacity = sm.engine;
    }
    if (refs.ring2.current && refs.ring2.current.material) {
      refs.ring2.current.material.opacity = sm.engine;
    }
    if (refs.ringGroup.current) {
      refs.ringGroup.current.rotation.z += 0.005 * sm.engine;
    }

    // Fog depth morph — pulls horizon closer on entropy, deeper on harmony/cognitive
    const fogFarTarget = 30 - 8 * sm.entropy + 6 * sm.harmony + 4 * sm.cognitive;
    const fogNearTarget = 4 - 1.5 * sm.entropy + 1 * sm.harmony;
    fogFar.current += (fogFarTarget - fogFar.current) * k;
    fogNear.current += (fogNearTarget - fogNear.current) * k;
    if (refs.fog && refs.fog.current) {
      refs.fog.current.near = fogNear.current;
      refs.fog.current.far = fogFar.current;
    }
  }, 1); // priority=1: runs AFTER component useFrames so our opacity wins

  return null;
}

export default function Experience() {
  const refs = {
    provocationGroup: useRef(),
    entropyGroup: useRef(),
    eventHorizonGroup: useRef(),
    harmonyGroup: useRef(),
    cognitiveGroup: useRef(),
    sovereigntyGroup: useRef(),
    engineGroup: useRef(),
    pointA: useRef(),
    pointB: useRef(),
    pointC: useRef(),
    prism: useRef(),
    ring1: useRef(),
    ring2: useRef(),
    ringGroup: useRef(),
    fog: useRef(),
  };

  return (
    <>
      <CameraRig />
      <StageController refs={refs} />
      <color attach="background" args={[0x000000]} />
      <fog ref={refs.fog} attach="fog" args={[0x000000, 4, 30]} />

      <ambientLight intensity={0.05} />
      <directionalLight position={[4, 6, 4]} intensity={0.2} color={'#ffffff'} />
      <pointLight ref={refs.pointA} position={[0, 0, 0]} intensity={0} color={'#ffffff'} distance={10} />
      <pointLight ref={refs.pointB} position={[0, 0, 0]} intensity={0} color={'#00D1FF'} distance={12} />
      <pointLight ref={refs.pointC} position={[0, 0, 0]} intensity={0} color={'#FFD400'} distance={14} />

      <group ref={refs.prism}>
        <Prism position={[0, 0, 0]} scale={1} rotationSpeed={0.25} emphasize={0.4} />
      </group>

      {/* Scroll-driven beam → prism → spectral refraction */}
      <ScrollBeamRefraction />

      <group ref={refs.provocationGroup}>
        <DataSparks />
      </group>

      <group ref={refs.entropyGroup}>
        <Physics gravity={[0, 0, 0]}>
          <ChaosField count={14} active={1} />
        </Physics>
        <DigitalDust count={500} radius={11} color={'#FF2D3D'} size={1.2} breath={0.5} />
      </group>

      <group ref={refs.eventHorizonGroup}>
        <DigitalDust count={800} radius={6} color={'#7B61FF'} size={1.0} breath={0.6} />
        <LightBeam
          position={[0, 0, -6]}
          rotation={[Math.PI / 2, 0, 0]}
          color={'#7B61FF'}
          intensity={1.0}
          length={14}
          radius={0.5}
        />
      </group>

      <group ref={refs.harmonyGroup} position={[0, 0, -9]} scale={0.72}>
        <HarmonyGrid />
        <DigitalDust count={380} radius={8} color={'#00D1FF'} size={0.8} breath={0.5} />
      </group>

      <group ref={refs.cognitiveGroup}>
        <NeuralMap position={[0, 0, 0]} scale={2.6} active={1} />
      </group>

      <group ref={refs.sovereigntyGroup}>
        <gridHelper args={[20, 40, '#4a3a8c', '#15112a']} position={[0, -2, 0]} />
        <DigitalDust count={220} radius={9} color={'#7B61FF'} size={0.7} breath={0.3} />
      </group>

      <group ref={refs.engineGroup}>
        <group ref={refs.ringGroup}>
          <mesh ref={refs.ring1} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[3.2, 0.02, 32, 200]} />
            <meshBasicMaterial color={'#7B61FF'} toneMapped={false} transparent opacity={0} />
          </mesh>
          <mesh ref={refs.ring2} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[3.5, 0.008, 32, 200]} />
            <meshBasicMaterial color={'#00D1FF'} toneMapped={false} transparent opacity={0} />
          </mesh>
        </group>
      </group>

      <RippleWave />

      <PostFX />
    </>
  );
}

/**
 * Expanding violet shockwave triggered by Sovereignty buttons.
 * Subscribes to window 'prism:ripple' events and animates a ring + light flash.
 */
function RippleWave() {
  const ring = useRef();
  const light = useRef();
  const active = useRef(0);

  useEffect(() => {
    const onRipple = () => {
      active.current = 1;
    };
    window.addEventListener('prism:ripple', onRipple);
    return () => window.removeEventListener('prism:ripple', onRipple);
  }, []);

  useFrame((_, dt) => {
    if (active.current > 0) {
      active.current = Math.max(0, active.current - dt * 0.55);
      const t = 1 - active.current; // 0..1
      const s = 0.2 + t * 14;
      if (ring.current) {
        ring.current.scale.setScalar(s);
        if (ring.current.material) ring.current.material.opacity = active.current;
      }
      if (light.current) {
        light.current.intensity = active.current * 3;
      }
    } else {
      if (ring.current && ring.current.material) ring.current.material.opacity = 0;
      if (light.current) light.current.intensity = 0;
    }
  });

  return (
    <group>
      <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.98, 1.0, 128]} />
        <meshBasicMaterial color={'#7B61FF'} toneMapped={false} transparent opacity={0} />
      </mesh>
      <pointLight ref={light} color={'#7B61FF'} intensity={0} distance={40} position={[0, 0, 0]} />
    </group>
  );
}
