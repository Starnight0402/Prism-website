// Volumetric Light Beam — noise dust in laser cylinder.

export const beamVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

export const beamFragment = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uIntensity;
  uniform float uOpacity;
  uniform vec3  uColor;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  // hash / noise
  float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898,78.233,45.164))) * 43758.5453); }
  float noise(vec3 p) {
    vec3 i = floor(p); vec3 f = fract(p);
    f = f*f*(3.0-2.0*f);
    float n = mix(
      mix(mix(hash(i+vec3(0,0,0)), hash(i+vec3(1,0,0)), f.x),
          mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
          mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
    return n;
  }

  void main() {
    float radial = 1.0 - abs(vUv.x - 0.5) * 2.0;
    radial = pow(radial, 2.0);
    float taper = smoothstep(0.0, 0.1, vUv.y) * smoothstep(1.0, 0.75, vUv.y);
    float dust = noise(vec3(vUv * vec2(8.0, 40.0), uTime * 0.6));
    float a = radial * taper * (0.35 + 0.65 * dust) * uIntensity * uOpacity;
    vec3 col = uColor * (0.6 + 0.8 * dust);
    gl_FragColor = vec4(col, a);
  }
`;
