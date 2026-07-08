"use client";

import { useEffect, useRef } from 'react';
import { CameraState } from '@/lib/game/sim';
import { readThemeColor, RGB } from '@/lib/game/color';

// Full-screen WebGL2 fragment shader that renders the living cytoplasm field:
// a flow-warped Worley/voronoi lattice whose edges glow like membrane walls,
// tinted by a slow fbm nebula and framed with a vignette. Replaces the old
// DOM Delaunay background. Reads the live camera each frame for parallax and
// never triggers a React re-render.

const VERT = `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `#version 300 es
precision highp float;
out vec4 fragColor;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_camera;   // world-space camera center (px)
uniform float u_zoom;
uniform vec3 u_bg;       // background tint
uniform vec3 u_primary;  // membrane / edge glow
uniform vec3 u_accent;   // interior nebula tint
uniform float u_quality; // 1.0 = full, 0.0 = reduced (mobile)

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

float hash1(vec2 p) {
  return fract(sin(dot(p, vec2(41.3, 289.1))) * 24634.6345);
}

// Value-noise fbm for the domain warp and nebula.
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
  for (int i = 0; i < 4; i++) {
    v += amp * noise(p);
    p *= 2.02;
    amp *= 0.5;
  }
  return v;
}

// Worley voronoi returning F1 (cell fill) in .x and edge distance in .y.
vec2 voronoi(vec2 x, float t) {
  vec2 n = floor(x);
  vec2 f = fract(x);

  vec2 mr = vec2(0.0);
  float md = 8.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = hash2(n + g);
      o = 0.5 + 0.5 * sin(t + 6.2831 * o);
      vec2 r = g + o - f;
      float d = dot(r, r);
      if (d < md) { md = d; mr = r; }
    }
  }

  // Second pass: distance to the nearest cell border (glowing membrane).
  float me = 8.0;
  for (int j = -2; j <= 2; j++) {
    for (int i = -2; i <= 2; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = hash2(n + g);
      o = 0.5 + 0.5 * sin(t + 6.2831 * o);
      vec2 r = g + o - f;
      vec2 diff = mr - r;
      if (dot(diff, diff) > 0.00001) {
        me = min(me, dot(0.5 * (mr + r), normalize(r - mr)));
      }
    }
  }
  return vec2(sqrt(md), me);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = (frag - 0.5 * u_resolution) / u_resolution.y;

  // Background parallax: field drifts slower than the world for depth.
  vec2 world = u_camera * 0.06 + uv * (900.0 / max(u_zoom, 0.2));

  float t = u_time * 0.06;

  // Flow map: warp the sampling coords by low-freq fbm so cells swirl.
  vec2 flow = vec2(
    fbm(world * 0.0016 + vec2(0.0, t)),
    fbm(world * 0.0016 + vec2(5.2, -t))
  ) - 0.5;
  vec2 samplePos = world * 0.0052 + flow * 1.4;

  vec2 vor = voronoi(samplePos, u_time * 0.25);

  // Base gradient: darker toward the edges of the screen.
  float rad = length(uv);
  vec3 col = u_bg * (1.0 - 0.35 * rad);

  // Nebula: slow large-scale tint blending accent into the field.
  float neb = fbm(world * 0.0009 + t * 0.4);
  col = mix(col, col + u_accent * 0.10, smoothstep(0.35, 0.85, neb));

  // Cell interiors: a soft bloom of accent toward each cell center.
  float cellFill = smoothstep(0.9, 0.0, vor.x);
  col += u_accent * cellFill * 0.05;

  // Membrane edges: glowing primary-colored walls.
  float edge = 1.0 - smoothstep(0.0, 0.06, vor.y);
  col += u_primary * edge * 0.5;

  // A second, finer voronoi layer for micro-detail at full quality.
  if (u_quality > 0.5) {
    vec2 vor2 = voronoi(samplePos * 2.7 + 11.0, u_time * 0.4);
    float edge2 = 1.0 - smoothstep(0.0, 0.05, vor2.y);
    col += u_primary * edge2 * 0.12;
  }

  // Drifting bokeh motes.
  float motes = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 mp = world * 0.003 + vec2(fi * 3.1, -t * (1.0 + fi));
    vec2 cell = floor(mp);
    vec2 fp = fract(mp) - hash2(cell + fi);
    float d = length(fp);
    motes += smoothstep(0.25, 0.0, d) * 0.4;
  }
  col += u_primary * motes * 0.3;

  // Vignette.
  col *= 1.0 - 0.5 * rad * rad;

  fragColor = vec4(col, 1.0);
}
`;

type ShaderBackgroundProps = {
  camera: CameraState;
};

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function ShaderBackground({ camera }: ShaderBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
    if (!gl) {
      // Graceful fallback: a static radial gradient if WebGL2 is unavailable.
      canvas.style.background =
        'radial-gradient(circle at 50% 40%, hsl(263 60% 14%), hsl(224 71% 6%) 70%)';
      return;
    }

    const program = gl.createProgram()!;
    const vert = compile(gl, gl.VERTEX_SHADER, VERT);
    const frag = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vert || !frag) return;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const u = {
      resolution: gl.getUniformLocation(program, 'u_resolution'),
      time: gl.getUniformLocation(program, 'u_time'),
      camera: gl.getUniformLocation(program, 'u_camera'),
      zoom: gl.getUniformLocation(program, 'u_zoom'),
      bg: gl.getUniformLocation(program, 'u_bg'),
      primary: gl.getUniformLocation(program, 'u_primary'),
      accent: gl.getUniformLocation(program, 'u_accent'),
      quality: gl.getUniformLocation(program, 'u_quality'),
    };

    // Cap DPR for fill-rate; mobile also drops the fine detail layer.
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const renderScale = isMobile ? 0.75 : 1;
    const dprCap = isMobile ? 1.5 : 2;

    let width = 0;
    let height = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap) * renderScale;
      width = Math.floor(canvas.clientWidth * dpr);
      height = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };
    resize();
    window.addEventListener('resize', resize);

    // Cache theme colors; refresh occasionally since they lerp with cell size.
    let bg: RGB = readThemeColor('--background');
    let primary: RGB = readThemeColor('--primary');
    let accent: RGB = readThemeColor('--accent');
    let colorTimer = 0;

    const start = performance.now();
    let frameId: number;
    let last = start;

    const render = (now: number) => {
      frameId = requestAnimationFrame(render);
      resize();

      colorTimer += now - last;
      last = now;
      if (colorTimer > 200) {
        colorTimer = 0;
        bg = readThemeColor('--background');
        primary = readThemeColor('--primary');
        accent = readThemeColor('--accent');
      }

      gl.uniform2f(u.resolution, width, height);
      gl.uniform1f(u.time, (now - start) / 1000);
      gl.uniform2f(u.camera, camera.pos.x, camera.pos.y);
      gl.uniform1f(u.zoom, camera.zoom);
      gl.uniform3f(u.bg, bg[0], bg[1], bg[2]);
      gl.uniform3f(u.primary, primary[0], primary[1], primary[2]);
      gl.uniform3f(u.accent, accent[0], accent[1], accent[2]);
      gl.uniform1f(u.quality, isMobile ? 0 : 1);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    frameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      gl.deleteProgram(program);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
      gl.deleteBuffer(buffer);
    };
  }, [camera]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full z-0"
      style={{ display: 'block' }}
    />
  );
}
