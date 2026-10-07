import { COMPOSE_FRAG, DOWN_FRAG, FINAL_FRAG, PREFILTER_FRAG, UP_FRAG, VERT } from './shaders';

type Program = { prog: WebGLProgram; u: Record<string, WebGLUniformLocation | null> };
type Target = { fbo: WebGLFramebuffer; tex: WebGLTexture; w: number; h: number };

export type PostParams = {
  time: number;
  camX: number;
  camY: number;
  ppu: number; // render pixels per world unit
  biomeRect: [number, number, number, number];
  palette: Float32Array; // 20 vec3
  dark: number;
  fluor: number;
  electron: number;
  playerPx: [number, number];
  playerVel: [number, number];
  playerR: number;
  light: number;
  surge: number;
  waves: Float32Array; // 8 vec4
  waveCount: number;
  ca: number;
  bloomStrength: number;
  emitGain: number;
  emitSharp: number;
  vignette: number;
  hurt: number;
  flash: number;
  desat: number;
  grain: number;
  warp: number;
  threshold: number;
};

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error(`Shader compile failed: ${log}`);
  }
  return s;
}

function program(gl: WebGL2RenderingContext, frag: string, names: string[]): Program {
  const prog = gl.createProgram()!;
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, frag);
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.bindAttribLocation(prog, 0, 'a_pos');
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(`Program link failed: ${gl.getProgramInfoLog(prog)}`);
  const u: Record<string, WebGLUniformLocation | null> = {};
  for (const n of names) u[n] = gl.getUniformLocation(prog, n);
  return { prog, u };
}

export class PostFX {
  readonly gl: WebGL2RenderingContext;
  private vao: WebGLVertexArrayObject;
  private buffer: WebGLBuffer;
  private compose: Program;
  private prefilter: Program;
  private down: Program;
  private up: Program;
  private final: Program;
  private sceneTex: WebGLTexture;
  private emitTex: WebGLTexture;
  private biomeTex: WebGLTexture;
  private composeT: Target | null = null;
  private bloom: Target[] = [];
  private floatOK: boolean;
  private width = 0;
  private height = 0;
  private sceneSize = [0, 0];
  private emitSize = [0, 0];

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
    });
    if (!gl) throw new Error('WebGL2 unavailable');
    this.gl = gl;
    this.floatOK = !!gl.getExtension('EXT_color_buffer_float');
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    this.buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    this.compose = program(gl, COMPOSE_FRAG, [
      'u_scene',
      'u_biome',
      'u_resolution',
      'u_time',
      'u_cam',
      'u_ppu',
      'u_biomeRect',
      'u_pal',
      'u_dark',
      'u_fluor',
      'u_electron',
      'u_playerPx',
      'u_playerVel',
      'u_playerR',
      'u_quality',
      'u_light',
      'u_surge',
    ]);
    this.prefilter = program(gl, PREFILTER_FRAG, ['u_src', 'u_emit', 'u_texel', 'u_threshold', 'u_emitGain']);
    this.down = program(gl, DOWN_FRAG, ['u_src', 'u_texel']);
    this.up = program(gl, UP_FRAG, ['u_src', 'u_texel', 'u_scatter']);
    this.final = program(gl, FINAL_FRAG, [
      'u_compose',
      'u_bloom',
      'u_emit',
      'u_resolution',
      'u_time',
      'u_waves',
      'u_waveCount',
      'u_ca',
      'u_bloomStrength',
      'u_emitSharp',
      'u_vignette',
      'u_hurt',
      'u_flash',
      'u_desat',
      'u_grain',
      'u_warp',
    ]);

    this.sceneTex = this.makeTex(gl.LINEAR);
    this.emitTex = this.makeTex(gl.LINEAR);
    this.biomeTex = this.makeTex(gl.LINEAR);
  }

  private makeTex(filter: number) {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  private makeTarget(w: number, h: number): Target {
    const gl = this.gl;
    const tex = this.makeTex(gl.LINEAR);
    if (this.floatOK) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fbo, tex, w, h };
  }

  private freeTarget(t: Target) {
    this.gl.deleteFramebuffer(t.fbo);
    this.gl.deleteTexture(t.tex);
  }

  resize(w: number, h: number) {
    if (w === this.width && h === this.height) return;
    this.width = w;
    this.height = h;
    if (this.composeT) this.freeTarget(this.composeT);
    for (const t of this.bloom) this.freeTarget(t);
    this.composeT = this.makeTarget(w, h);
    this.bloom = [];
    let bw = Math.max(1, w >> 1);
    let bh = Math.max(1, h >> 1);
    for (let i = 0; i < 6 && bw >= 8 && bh >= 8; i++) {
      this.bloom.push(this.makeTarget(bw, bh));
      bw >>= 1;
      bh >>= 1;
    }
  }

  private upload(tex: WebGLTexture, source: TexImageSource, size: number[], w: number, h: number) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    if (size[0] !== w || size[1] !== h) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      size[0] = w;
      size[1] = h;
    } else {
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, source);
    }
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  }

  uploadScene(canvas: HTMLCanvasElement) {
    this.upload(this.sceneTex, canvas, this.sceneSize, canvas.width, canvas.height);
  }

  uploadEmit(canvas: HTMLCanvasElement) {
    this.upload(this.emitTex, canvas, this.emitSize, canvas.width, canvas.height);
  }

  uploadBiome(data: Uint8Array, size: number) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.biomeTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  }

  private bindTex(unit: number, tex: WebGLTexture) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
  }

  render(p: PostParams) {
    const gl = this.gl;
    const C = this.composeT;
    if (!C || !this.bloom.length) return;
    gl.bindVertexArray(this.vao);
    gl.disable(gl.BLEND);

    // 1. Compose background field + scene + microscope mode.
    gl.bindFramebuffer(gl.FRAMEBUFFER, C.fbo);
    gl.viewport(0, 0, C.w, C.h);
    const c = this.compose;
    gl.useProgram(c.prog);
    this.bindTex(0, this.sceneTex);
    this.bindTex(1, this.biomeTex);
    gl.uniform1i(c.u.u_scene, 0);
    gl.uniform1i(c.u.u_biome, 1);
    gl.uniform2f(c.u.u_resolution, C.w, C.h);
    gl.uniform1f(c.u.u_time, p.time);
    gl.uniform2f(c.u.u_cam, p.camX, p.camY);
    gl.uniform1f(c.u.u_ppu, p.ppu);
    gl.uniform4f(c.u.u_biomeRect, p.biomeRect[0], p.biomeRect[1], p.biomeRect[2], p.biomeRect[3]);
    gl.uniform3fv(c.u.u_pal, p.palette);
    gl.uniform1f(c.u.u_dark, p.dark);
    gl.uniform1f(c.u.u_fluor, p.fluor);
    gl.uniform1f(c.u.u_electron, p.electron);
    gl.uniform2f(c.u.u_playerPx, p.playerPx[0], p.playerPx[1]);
    gl.uniform2f(c.u.u_playerVel, p.playerVel[0], p.playerVel[1]);
    gl.uniform1f(c.u.u_playerR, p.playerR);
    gl.uniform1f(c.u.u_quality, 1);
    gl.uniform1f(c.u.u_light, p.light);
    gl.uniform1f(c.u.u_surge, p.surge);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // 2. Bright-pass prefilter into the first bloom mip (plus emissive glow).
    const b0 = this.bloom[0];
    gl.bindFramebuffer(gl.FRAMEBUFFER, b0.fbo);
    gl.viewport(0, 0, b0.w, b0.h);
    const pf = this.prefilter;
    gl.useProgram(pf.prog);
    this.bindTex(0, C.tex);
    this.bindTex(1, this.emitTex);
    gl.uniform1i(pf.u.u_src, 0);
    gl.uniform1i(pf.u.u_emit, 1);
    gl.uniform2f(pf.u.u_texel, 0.5 / C.w, 0.5 / C.h);
    gl.uniform1f(pf.u.u_threshold, p.threshold);
    gl.uniform1f(pf.u.u_emitGain, p.emitGain);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // 3. Downsample chain.
    const d = this.down;
    gl.useProgram(d.prog);
    gl.uniform1i(d.u.u_src, 0);
    for (let i = 1; i < this.bloom.length; i++) {
      const src = this.bloom[i - 1];
      const dst = this.bloom[i];
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo);
      gl.viewport(0, 0, dst.w, dst.h);
      this.bindTex(0, src.tex);
      gl.uniform2f(d.u.u_texel, 1 / src.w, 1 / src.h);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    // 4. Upsample and accumulate.
    const u = this.up;
    gl.useProgram(u.prog);
    gl.uniform1i(u.u.u_src, 0);
    gl.uniform1f(u.u.u_scatter, 0.85);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    for (let i = this.bloom.length - 2; i >= 0; i--) {
      const src = this.bloom[i + 1];
      const dst = this.bloom[i];
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo);
      gl.viewport(0, 0, dst.w, dst.h);
      this.bindTex(0, src.tex);
      gl.uniform2f(u.u.u_texel, 1 / src.w, 1 / src.h);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.disable(gl.BLEND);

    // 5. Final: distortion, chromatic aberration, bloom, grading.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    const f = this.final;
    gl.useProgram(f.prog);
    this.bindTex(0, C.tex);
    this.bindTex(1, b0.tex);
    this.bindTex(2, this.emitTex);
    gl.uniform1i(f.u.u_compose, 0);
    gl.uniform1i(f.u.u_bloom, 1);
    gl.uniform1i(f.u.u_emit, 2);
    gl.uniform2f(f.u.u_resolution, C.w, C.h);
    gl.uniform1f(f.u.u_time, p.time);
    gl.uniform4fv(f.u.u_waves, p.waves);
    gl.uniform1i(f.u.u_waveCount, p.waveCount);
    gl.uniform1f(f.u.u_ca, p.ca);
    gl.uniform1f(f.u.u_bloomStrength, p.bloomStrength);
    gl.uniform1f(f.u.u_emitSharp, p.emitSharp);
    gl.uniform1f(f.u.u_vignette, p.vignette);
    gl.uniform1f(f.u.u_hurt, p.hurt);
    gl.uniform1f(f.u.u_flash, p.flash);
    gl.uniform1f(f.u.u_desat, p.desat);
    gl.uniform1f(f.u.u_grain, p.grain);
    gl.uniform1f(f.u.u_warp, p.warp);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  dispose() {
    const gl = this.gl;
    if (this.composeT) this.freeTarget(this.composeT);
    for (const t of this.bloom) this.freeTarget(t);
    for (const p of [this.compose, this.prefilter, this.down, this.up, this.final]) gl.deleteProgram(p.prog);
    gl.deleteTexture(this.sceneTex);
    gl.deleteTexture(this.emitTex);
    gl.deleteTexture(this.biomeTex);
    gl.deleteBuffer(this.buffer);
    gl.deleteVertexArray(this.vao);
  }
}
