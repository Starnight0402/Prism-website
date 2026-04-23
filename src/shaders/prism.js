// Hyper-realistic glass prism shader.
// Physically-based Schlick Fresnel, multi-sample RGB dispersion for chromatic refraction,
// internal back-face reflection approximation, subtle iridescence, sharp highlights.

export const prismVertex = /* glsl */ `
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;

  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vLocalPos = position;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

export const prismFragment = /* glsl */ `
  precision highp float;
  uniform samplerCube uEnvMap;
  uniform float uIOR;           // index of refraction, ~1.52 for crown glass, 2.42 for diamond
  uniform float uDispersion;    // Abbe-like split (~0.02 subtle, ~0.06 diamond-like)
  uniform float uFresnelF0;     // base reflectance (Schlick), 0.04..0.17
  uniform float uTime;
  uniform vec3  uTint;
  uniform float uTintStrength;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;

  // Schlick Fresnel (physically plausible)
  float fresnelSchlick(float cosT, float F0) {
    float x = clamp(1.0 - cosT, 0.0, 1.0);
    float x2 = x * x;
    return F0 + (1.0 - F0) * x2 * x2 * x;
  }

  // Iridescent thin-film shimmer — subtle
  vec3 iridescence(float cosT, float t) {
    float p = cosT * 6.2831 + t * 0.25;
    return vec3(
      0.5 + 0.5 * sin(p),
      0.5 + 0.5 * sin(p + 2.094),
      0.5 + 0.5 * sin(p + 4.188)
    );
  }

  // Multi-sample chromatic dispersion — split refraction into N color bands
  vec3 dispersedRefraction(vec3 V, vec3 N, float eta, float disp) {
    vec3 acc = vec3(0.0);
    const int BANDS = 7;
    for (int i = 0; i < BANDS; i++) {
      float t = float(i) / float(BANDS - 1); // 0..1
      // Bell-shaped weighting for each band
      float w = 1.0;
      // Color weighting roughly matching visible spectrum
      vec3 bandColor = vec3(
        smoothstep(0.0, 0.5, 1.0 - abs(t - 0.15)),   // R ~ long wavelength
        smoothstep(0.0, 0.5, 1.0 - abs(t - 0.5)),    // G
        smoothstep(0.0, 0.5, 1.0 - abs(t - 0.85))    // B ~ short wavelength
      );
      float etaBand = eta + disp * (t - 0.5);
      vec3 r = refract(-V, N, etaBand);
      vec3 c = textureCube(uEnvMap, r).rgb;
      acc += c * bandColor * w;
    }
    return acc / 3.0; // normalize by channel sum approximation
  }

  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(vViewDir);
    float cosT = clamp(dot(N, V), 0.0, 1.0);

    float eta = 1.0 / uIOR;

    // --- DISPERSED REFRACTION (front face) ---
    vec3 refr = dispersedRefraction(V, N, eta, uDispersion);

    // --- REFLECTION (environment) ---
    vec3 R = reflect(-V, N);
    vec3 refl = textureCube(uEnvMap, R).rgb;

    // --- INTERNAL REFLECTION BOUNCE (fake second-surface reflection) ---
    // Refract once, reflect inside, sample env — approximates back-face caustics
    vec3 inside = refract(-V, N, eta);
    vec3 insideRefl = reflect(inside, -N);
    vec3 secondary = textureCube(uEnvMap, insideRefl).rgb * 0.35;

    // Fresnel (Schlick)
    float F = fresnelSchlick(cosT, uFresnelF0);

    // Compose: mostly refraction through glass, Fresnel-blended with sky reflection,
    // plus internal bounce for depth, plus iridescent rim.
    vec3 color = refr + secondary;
    color = mix(color, refl, F);

    // Iridescent rim — only at extreme grazing angles
    float rim = pow(1.0 - cosT, 6.0);
    color += iridescence(cosT, uTime) * rim * 0.18;

    // Subtle tint ( energy-conserving, only at rim)
    color += uTint * (F * uTintStrength);

    // Specular sparkle — high-frequency detail based on position (facet catch)
    float sparkle = pow(max(0.0, dot(N, normalize(vec3(0.3, 0.9, 0.3)))), 64.0);
    color += vec3(sparkle) * 0.4;

    // Tone-down: glass is not a light source
    color = color * 0.92;

    gl_FragColor = vec4(color, 1.0);
  }
`;
