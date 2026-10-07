// GLSL ES 3.0 programs for the post-processing stack.
// Note: `sample` is a reserved word in GLSL ES 3.0; avoid it as an identifier.

export const VERT = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const COMMON = `
float hash1(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 24634.6345); }
vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash1(i);
  float b = hash1(i + vec2(1.0, 0.0));
  float c = hash1(i + vec2(0.0, 1.0));
  float d = hash1(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) { v += amp * noise(p); p = p * 2.03 + 17.0; amp *= 0.5; }
  return v;
}
// Worley F1 and (F2 - F1) border distance, animated seeds.
vec3 worley(vec2 x, float t) {
  vec2 n = floor(x);
  vec2 f = fract(x);
  float f1 = 8.0;
  float f2 = 8.0;
  vec2 id = vec2(0.0);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = hash2(n + g);
      o = 0.5 + 0.42 * sin(t + 6.2831 * o);
      vec2 r = g + o - f;
      float d = dot(r, r);
      if (d < f1) { f2 = f1; f1 = d; id = n + g; }
      else if (d < f2) { f2 = d; }
    }
  }
  float a = sqrt(f1);
  return vec3(a, sqrt(f2) - a, hash1(id));
}
`;

export const COMPOSE_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_scene;
uniform sampler2D u_biome;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_cam;
uniform float u_ppu;
uniform vec4 u_biomeRect;
uniform vec3 u_pal[20];
uniform float u_dark;
uniform float u_fluor;
uniform float u_electron;
uniform vec2 u_playerPx;
uniform vec2 u_playerVel;
uniform float u_playerR;
uniform float u_quality;
uniform float u_light;
uniform float u_surge;
${COMMON}

void main() {
  vec2 px = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y);
  vec2 world = u_cam + (px - 0.5 * u_resolution) / u_ppu;
  vec2 uvc = (px - 0.5 * u_resolution) / u_resolution.y;
  float t = u_time;

  // Biome weights, sampled from a small CPU-computed map.
  vec4 bw = texture(u_biome, (world - u_biomeRect.xy) / u_biomeRect.zw);
  float w4 = max(0.0, 1.0 - bw.x - bw.y - bw.z - bw.w);
  vec3 deep = u_pal[0] * bw.x + u_pal[4] * bw.y + u_pal[8] * bw.z + u_pal[12] * bw.w + u_pal[16] * w4;
  vec3 mid = u_pal[1] * bw.x + u_pal[5] * bw.y + u_pal[9] * bw.z + u_pal[13] * bw.w + u_pal[17] * w4;
  vec3 edgeC = u_pal[2] * bw.x + u_pal[6] * bw.y + u_pal[10] * bw.z + u_pal[14] * bw.w + u_pal[18] * w4;
  vec3 accent = u_pal[3] * bw.x + u_pal[7] * bw.y + u_pal[11] * bw.z + u_pal[15] * bw.w + u_pal[19] * w4;

  // The fluid parts around the cell like a wake: the field responds to motion.
  vec2 toP = px - u_playerPx;
  float pd = length(toP);
  float wake = exp(-pd * pd / max(1.0, u_playerR * u_playerR * 9.0));
  vec2 wakeOff = -u_playerVel * 0.18 * wake;

  // Base: a deep, slightly nebulous void.
  vec2 farW = (u_cam * 0.3 + (px - 0.5 * u_resolution) / u_ppu) * 0.0024 + wakeOff * 0.001;
  float rad = length(uvc);
  vec3 col = mix(deep, mid, 0.12 + 0.28 * fbm(farW * 0.35 + t * 0.01));
  col *= 1.0 - 0.28 * rad;

  // Far layer: out-of-focus cells suspended behind the focal plane.
  vec2 field = farW * 1.6;
  vec2 fcell = floor(field);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 id = fcell + vec2(float(i), float(j));
      vec2 sd = hash2(id + 12.7);
      if (sd.x < 0.35) continue;
      vec2 center = id + 0.2 + sd * 0.6 + 0.08 * vec2(sin(t * 0.2 + sd.y * 6.0), cos(t * 0.17 + sd.x * 6.0));
      vec2 q = field - center;
      float a = sd.x * 6.28 + t * 0.02;
      q = mat2(cos(a), -sin(a), sin(a), cos(a)) * q;
      q /= vec2(0.16 + sd.x * 0.16, 0.1 + sd.y * 0.11);
      float d = length(q);
      float bodyF = 1.0 - smoothstep(0.7, 1.15, d);
      float rimF = exp(-pow((d - 1.0) * 7.0, 2.0));
      vec3 tint = mix(mid * 1.6, accent * 0.5, sd.y);
      col += tint * (bodyF * 0.09 + rimF * 0.1);
      float nuc = exp(-dot(q - vec2(0.18, 0.1), q - vec2(0.18, 0.1)) * 10.0);
      col -= col * nuc * bodyF * 0.25;
    }
  }

  // Mid layer: a faint Voronoi tissue of the medium, flowing slowly.
  vec2 midW = world * 0.0075 + wakeOff * 0.01;
  vec2 flow2 = vec2(fbm(midW * 0.25 + vec2(t * 0.05, 0.0)), fbm(midW * 0.25 + vec2(3.1, t * 0.05))) - 0.5;
  vec3 net = worley(midW + flow2 * (1.4 + u_surge * 1.5), t * 0.35);
  col += mid * (net.z - 0.5) * 0.08;
  float membrane = 1.0 - smoothstep(0.012, 0.05, net.y);
  col += edgeC * membrane * (0.035 + 0.015 * sin(t + net.z * 6.28));
  col += edgeC * (1.0 - smoothstep(0.0, 0.22, net.y)) * 0.012;
  col += accent * (1.0 - smoothstep(0.0, 0.7, net.x)) * 0.012;

  // Biome signatures.
  // Shallows: sunlight caustics rippling across the water.
  if (bw.x > 0.02) {
    vec2 cw = world * 0.011 + vec2(t * 0.05, t * 0.03);
    vec3 c1 = worley(cw, t * 0.8);
    vec3 c2 = worley(cw * 1.7 + 3.0, -t * 0.6);
    float caustic = pow(1.0 - smoothstep(0.0, 0.18, c1.y), 2.0) * 0.6 + pow(1.0 - smoothstep(0.0, 0.14, c2.y), 2.0) * 0.4;
    col += vec3(0.75, 1.0, 0.7) * caustic * 0.075 * bw.x * u_light;
  }
  // Biofilm: a dense bacterial lawn.
  if (bw.y > 0.02) {
    vec3 mat = worley(world * 0.04, 0.0);
    float lawn = smoothstep(0.55, 0.0, mat.x) * (0.5 + mat.z * 0.5);
    col = mix(col, col + vec3(0.5, 0.3, 0.12) * lawn * 0.12, bw.y);
    col -= vec3(0.05) * (1.0 - smoothstep(0.0, 0.05, mat.y)) * bw.y;
  }
  // Lysis bloom: drifting magenta nebula and spilled genome.
  if (bw.z > 0.02) {
    float neb = fbm(world * 0.0012 + vec2(t * 0.02, -t * 0.015));
    col += vec3(0.9, 0.25, 0.8) * smoothstep(0.45, 0.85, neb) * 0.14 * bw.z;
  }
  // Abyss: marine snow falling slowly.
  if (bw.w > 0.02) {
    vec2 sw = world * 0.03 + vec2(0.0, -t * 0.6);
    vec2 sid = floor(sw);
    vec2 so = hash2(sid);
    float sd = length(fract(sw) - so);
    col += vec3(0.6, 0.75, 1.0) * (1.0 - smoothstep(0.02, 0.06, sd)) * step(0.82, so.x) * 0.35 * bw.w;
  }
  // Rift: pulsing tumorous veins.
  if (w4 > 0.02) {
    vec3 v = worley(world * 0.006, t * 0.2);
    float vein = 1.0 - smoothstep(0.0, 0.06, v.y);
    col += vec3(1.0, 0.15, 0.25) * vein * (0.12 + 0.08 * sin(t * 2.0 + v.z * 6.0)) * w4;
  }

  // Near motes (fast parallax) for depth.
  vec2 dw = world * 0.05 + u_cam * 0.01 + vec2(t * 0.15, -t * 0.08);
  vec2 did = floor(dw);
  vec2 ds = hash2(did + 47.2);
  float dd = length(fract(dw) - (0.12 + ds * 0.76));
  float mote = (1.0 - smoothstep(0.015, 0.05, dd)) * step(0.72, ds.x);
  col += mix(edgeC, vec3(1.0), 0.4) * mote * 0.22;

  // --- Scene composite (premultiplied).
  vec4 sc = texture(u_scene, vec2(v_uv.x, v_uv.y));
  vec3 bright = col * (1.0 - sc.a) + sc.rgb;

  // Darkfield: only scattering edges light up against a black field.
  vec2 texel = 1.5 / u_resolution;
  vec4 sl = texture(u_scene, v_uv - vec2(texel.x, 0.0));
  vec4 sr = texture(u_scene, v_uv + vec2(texel.x, 0.0));
  vec4 sd2 = texture(u_scene, v_uv - vec2(0.0, texel.y));
  vec4 su = texture(u_scene, v_uv + vec2(0.0, texel.y));
  float ea = abs(sr.a - sl.a) + abs(su.a - sd2.a);
  vec3 eg = abs(sr.rgb - sl.rgb) + abs(su.rgb - sd2.rgb);
  float edge = clamp(ea * 1.6 + dot(eg, vec3(0.45)), 0.0, 1.5);
  vec3 sceneHue = sc.a > 0.01 ? sc.rgb / sc.a : vec3(1.0);
  vec3 darkBg = col * 0.14 + mote * vec3(0.6);
  vec3 darkC = darkBg * (1.0 - sc.a * 0.85) + sc.rgb * 0.16 + mix(vec3(0.95, 0.98, 1.0), sceneHue, 0.45) * edge * 1.25;

  // Fluorescence: the field goes black; only tagged structures (emissive pass) shine.
  // A lipophilic membrane dye outlines every real silhouette in warm orange.
  vec3 fluorC = col * 0.03 + sc.rgb * 0.035 + vec3(1.0, 0.5, 0.16) * edge * 0.5;

  vec3 outC = mix(bright, darkC, u_dark);
  outC = mix(outC, fluorC, u_fluor);

  // Electron/DIC look at ultrastructure magnification: monochrome relief + grain.
  if (u_electron > 0.001) {
    float lum = dot(outC, vec3(0.2126, 0.7152, 0.0722));
    float relief = (sr.a - sl.a + su.a - sd2.a) * 0.18 + (noise(world * 0.25) - noise(world * 0.25 + 0.07)) * 0.25;
    vec3 em = worley(world * 0.05, 0.0);
    float tex = (1.0 - smoothstep(0.0, 0.08, em.y)) * 0.06;
    float grain = (hash1(px + fract(t) * 91.0) - 0.5) * 0.06;
    float g = clamp((lum - 0.1) * 1.45 + 0.12 + relief + grain - tex, 0.0, 1.0);
    outC = mix(outC, vec3(g * 0.96, g, g * 0.98), u_electron * 0.94);
  }

  fragColor = vec4(outC, 1.0);
}`;

export const PREFILTER_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_src;
uniform sampler2D u_emit;
uniform vec2 u_texel;
uniform float u_threshold;
uniform float u_emitGain;
void main() {
  vec3 c = texture(u_src, v_uv + vec2(-u_texel.x, -u_texel.y)).rgb
    + texture(u_src, v_uv + vec2(u_texel.x, -u_texel.y)).rgb
    + texture(u_src, v_uv + vec2(-u_texel.x, u_texel.y)).rgb
    + texture(u_src, v_uv + vec2(u_texel.x, u_texel.y)).rgb;
  c *= 0.25;
  float br = max(c.r, max(c.g, c.b));
  float knee = 0.25;
  float soft = clamp(br - u_threshold + knee, 0.0, 2.0 * knee);
  soft = soft * soft / (4.0 * knee + 1e-4);
  float contrib = max(soft, br - u_threshold) / max(br, 1e-4);
  vec3 e = texture(u_emit, v_uv).rgb;
  fragColor = vec4(c * contrib + e * u_emitGain, 1.0);
}`;

export const DOWN_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_src;
uniform vec2 u_texel;
void main() {
  vec2 t = u_texel;
  vec3 a = texture(u_src, v_uv + t * vec2(-2.0, -2.0)).rgb;
  vec3 b = texture(u_src, v_uv + t * vec2(0.0, -2.0)).rgb;
  vec3 c = texture(u_src, v_uv + t * vec2(2.0, -2.0)).rgb;
  vec3 d = texture(u_src, v_uv + t * vec2(-2.0, 0.0)).rgb;
  vec3 e = texture(u_src, v_uv).rgb;
  vec3 f = texture(u_src, v_uv + t * vec2(2.0, 0.0)).rgb;
  vec3 g = texture(u_src, v_uv + t * vec2(-2.0, 2.0)).rgb;
  vec3 h = texture(u_src, v_uv + t * vec2(0.0, 2.0)).rgb;
  vec3 i = texture(u_src, v_uv + t * vec2(2.0, 2.0)).rgb;
  vec3 j = texture(u_src, v_uv + t * vec2(-1.0, -1.0)).rgb;
  vec3 k = texture(u_src, v_uv + t * vec2(1.0, -1.0)).rgb;
  vec3 l = texture(u_src, v_uv + t * vec2(-1.0, 1.0)).rgb;
  vec3 m = texture(u_src, v_uv + t * vec2(1.0, 1.0)).rgb;
  vec3 o = e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
  fragColor = vec4(o, 1.0);
}`;

export const UP_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_src;
uniform vec2 u_texel;
uniform float u_scatter;
void main() {
  vec2 t = u_texel;
  vec3 s = texture(u_src, v_uv + t * vec2(-1.0, -1.0)).rgb;
  s += texture(u_src, v_uv + t * vec2(0.0, -1.0)).rgb * 2.0;
  s += texture(u_src, v_uv + t * vec2(1.0, -1.0)).rgb;
  s += texture(u_src, v_uv + t * vec2(-1.0, 0.0)).rgb * 2.0;
  s += texture(u_src, v_uv).rgb * 4.0;
  s += texture(u_src, v_uv + t * vec2(1.0, 0.0)).rgb * 2.0;
  s += texture(u_src, v_uv + t * vec2(-1.0, 1.0)).rgb;
  s += texture(u_src, v_uv + t * vec2(0.0, 1.0)).rgb * 2.0;
  s += texture(u_src, v_uv + t * vec2(1.0, 1.0)).rgb;
  fragColor = vec4(s / 16.0 * u_scatter, 1.0);
}`;

export const FINAL_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_compose;
uniform sampler2D u_bloom;
uniform sampler2D u_emit;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec4 u_waves[8];
uniform int u_waveCount;
uniform float u_ca;
uniform float u_bloomStrength;
uniform float u_emitSharp;
uniform float u_vignette;
uniform float u_hurt;
uniform float u_flash;
uniform float u_desat;
uniform float u_grain;
uniform float u_warp;
${COMMON}
void main() {
  vec2 px = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y);
  vec2 uv = v_uv;
  vec2 offset = vec2(0.0);
  // Shockwave rings (lysosome bursts, lysis, division) bend the image.
  for (int i = 0; i < 8; i++) {
    if (i >= u_waveCount) break;
    vec4 w = u_waves[i];
    vec2 d = px - w.xy;
    float len = length(d);
    float band = max(8.0, w.z * 0.16);
    float ring = exp(-pow((len - w.z) / band, 2.0));
    offset += (len > 0.0 ? d / len : vec2(0.0)) * ring * w.w * 22.0;
  }
  // Gentle fluid shimmer, stronger during current surges.
  vec2 flowUv = uv * 3.0 + vec2(u_time * 0.07, -u_time * 0.05);
  offset += (vec2(noise(flowUv), noise(flowUv + 7.3)) - 0.5) * u_warp * 6.0;
  vec2 duv = offset / u_resolution * vec2(1.0, -1.0);
  vec2 suv = uv + duv;

  vec2 dir = (uv - 0.5);
  float caAmt = u_ca * 0.006;
  vec3 col;
  col.r = texture(u_compose, suv + dir * caAmt).r;
  col.g = texture(u_compose, suv).g;
  col.b = texture(u_compose, suv - dir * caAmt).b;

  vec3 bloom = texture(u_bloom, suv).rgb;
  vec3 emit = texture(u_emit, suv).rgb;
  col += bloom * u_bloomStrength + emit * u_emitSharp;

  float r = length(dir * vec2(u_resolution.x / u_resolution.y, 1.0));
  col *= 1.0 - u_vignette * r * r;
  // Low integrity: a red heartbeat around the edges.
  float beat = 0.6 + 0.4 * sin(u_time * 6.0);
  col = mix(col, vec3(0.85, 0.05, 0.15), clamp(u_hurt * beat * smoothstep(0.35, 1.0, r), 0.0, 0.7));
  col += vec3(1.0, 0.97, 0.9) * u_flash;

  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(col, vec3(lum) * vec3(0.9, 0.85, 1.0), u_desat);
  col += (hash1(px + fract(u_time * 13.0) * 113.0) - 0.5) * u_grain;
  // Soft shoulder keeps vivid colors while taming bloom hot spots.
  col = mix(col, 1.0 - exp(-col * 1.2), smoothstep(0.75, 1.6, col));
  fragColor = vec4(col, 1.0);
}`;
