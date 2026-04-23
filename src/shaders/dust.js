// Digital Dust — breathing point cloud.

export const dustVertex = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uBreath;
  attribute float aSeed;
  attribute vec3 aVelocity;
  varying float vSeed;

  void main() {
    vSeed = aSeed;
    vec3 p = position;
    // orbital drift
    float t = uTime * 0.25 + aSeed * 6.2831;
    p += aVelocity * sin(t);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float s = uSize * (0.6 + 0.8 * sin(uTime * 1.2 + aSeed * 12.56));
    s *= (1.0 + uBreath * 0.6);
    gl_PointSize = s * (300.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

export const dustFragment = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vSeed;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float a = smoothstep(0.5, 0.0, d);
    vec3 col = uColor * (0.7 + 0.6 * fract(vSeed * 13.17));
    gl_FragColor = vec4(col, a * uOpacity);
  }
`;
