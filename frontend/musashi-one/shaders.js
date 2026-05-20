// Musashi One GPT — Shader wallpaper engine.
// Five interactive WebGL fragment-shader backgrounds: switch with setShader(id).
// All shaders share a fullscreen-quad vertex shader + the same uniform set:
//   u_time, u_resolution, u_mouse (px, with y-flip), u_mouseSmooth, u_click (decays 1→0)
// Public:
//   const bg = new ShaderBG(canvas);
//   bg.setShader('mercury' | 'plasma' | 'topo' | 'particles' | 'glass');
//   bg.click(x, y); bg.destroy();

(function (global) {
  const VERT = `attribute vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }`;

  // ── Shared GLSL helpers ───────────────────────────────────────────────
  const COMMON = `
precision highp float;
uniform vec2  u_resolution;
uniform vec2  u_mouse;       // raw px (origin bottom-left)
uniform vec2  u_mouseSmooth; // smoothed
uniform float u_time;
uniform float u_click;       // 0..1 decaying

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for(int i = 0; i < 5; i++){ v += a * noise(p); p *= 2.02; a *= 0.5; }
  return v;
}
mat2 rot(float a){ return mat2(cos(a), -sin(a), sin(a), cos(a)); }
`;

  // ── 1. Liquid Mercury ─────────────────────────────────────────────────
  const FRAG_MERCURY = COMMON + `
void main(){
  vec2 res = u_resolution;
  vec2 uv  = (gl_FragCoord.xy - 0.5 * res) / min(res.x, res.y);
  vec2 m   = (u_mouseSmooth - 0.5 * res) / min(res.x, res.y);

  // ripple from cursor
  float d = length(uv - m);
  float ripple = sin(d * 22.0 - u_time * 3.0) * exp(-d * 2.2) * 0.5;
  vec2 q = uv + ripple * normalize(uv - m + 0.001) * 0.08;

  // mercury surface
  float t = u_time * 0.15;
  float n = fbm(q * 2.4 + vec2(t, -t * 0.7));
  n      += 0.5 * fbm(q * 5.5 - vec2(t * 1.3, t));
  float h = smoothstep(0.2, 1.2, n);

  // metallic gradient: deep navy → silver → steel
  vec3 deep   = vec3(0.04, 0.06, 0.11);
  vec3 mid    = vec3(0.18, 0.22, 0.32);
  vec3 bright = vec3(0.78, 0.84, 0.94);
  vec3 col    = mix(deep, mid, h);
  col         = mix(col, bright, smoothstep(0.65, 0.95, h));

  // chromatic aberration on click
  float ca = u_click * 0.02;
  float nr = fbm((q + vec2(ca, 0.0)) * 2.4 + vec2(t, -t * 0.7));
  float nb = fbm((q - vec2(ca, 0.0)) * 2.4 + vec2(t, -t * 0.7));
  col.r = mix(col.r, smoothstep(0.4, 1.2, nr), u_click * 0.6);
  col.b = mix(col.b, smoothstep(0.4, 1.2, nb), u_click * 0.6);

  // cursor highlight
  col += 0.18 * exp(-d * 3.0) * vec3(0.6, 0.75, 1.0);
  col += u_click * 0.25 * exp(-d * 1.6) * vec3(0.5, 0.8, 1.0);

  // vignette
  col *= 1.0 - 0.55 * length(uv);
  gl_FragColor = vec4(col, 1.0);
}`;

  // ── 2. Plasma Field ───────────────────────────────────────────────────
  const FRAG_PLASMA = COMMON + `
void main(){
  vec2 res = u_resolution;
  vec2 uv  = (gl_FragCoord.xy - 0.5 * res) / min(res.x, res.y);
  vec2 m   = (u_mouseSmooth - 0.5 * res) / min(res.x, res.y);

  // mouse pushes clouds away
  vec2 dir = uv - m;
  float dist = length(dir);
  uv += normalize(dir + 0.001) * exp(-dist * 1.8) * 0.18;

  float t = u_time * 0.18;
  float n1 = fbm(uv * 1.4 + vec2(t, -t * 0.5));
  float n2 = fbm(uv * 2.2 - vec2(t * 0.7, t * 1.1) + n1);
  float n3 = fbm(uv * 0.7 + vec2(n2, -n1) + t * 0.3);

  // tri-color plasma: deep blue, magenta, teal
  vec3 blue    = vec3(0.05, 0.12, 0.42);
  vec3 magenta = vec3(0.55, 0.10, 0.55);
  vec3 teal    = vec3(0.05, 0.55, 0.55);
  vec3 col = blue;
  col = mix(col, magenta, smoothstep(0.35, 0.75, n2));
  col = mix(col, teal,    smoothstep(0.5, 0.95, n3));

  // mouse glow
  col += 0.4 * exp(-dist * 2.5) * vec3(0.9, 0.7, 1.0);
  // click shock
  col += u_click * exp(-dist * 1.3) * 0.5 * vec3(1.0, 0.6, 0.95);

  // deep base
  col = pow(col, vec3(0.95));
  col *= 1.0 - 0.45 * length(uv);
  gl_FragColor = vec4(col, 1.0);
}`;

  // ── 3. Wireframe Topography ───────────────────────────────────────────
  const FRAG_TOPO = COMMON + `
float height(vec2 p){
  float h = fbm(p * 0.9);
  h += 0.4 * fbm(p * 2.3 + 7.0);
  return h;
}
void main(){
  vec2 res = u_resolution;
  vec2 uv  = (gl_FragCoord.xy - 0.5 * res) / min(res.x, res.y);
  vec2 m   = (u_mouseSmooth - 0.5 * res) / min(res.x, res.y);

  // cursor displaces a peak
  vec2 p = uv * 3.0 + vec2(u_time * 0.04, -u_time * 0.03);
  float lift = exp(-length(uv - m) * 2.2) * (0.55 + u_click * 0.5);
  float h = height(p) + lift;

  // contour lines
  float lines  = 0.0;
  float spacing = 0.06;
  float val = h / spacing;
  float frac = abs(fract(val) - 0.5);
  float thick = fwidth(val) * 1.5;
  lines = smoothstep(thick, 0.0, frac);

  // grid (subtle)
  vec2 g = abs(fract(uv * 14.0) - 0.5);
  float grid = smoothstep(0.48, 0.5, max(g.x, g.y)) * 0.12;
  grid += u_click * 0.4 * smoothstep(0.42, 0.5, max(g.x, g.y));

  vec3 base = mix(vec3(0.02, 0.04, 0.08), vec3(0.08, 0.14, 0.28), smoothstep(0.0, 1.6, h));
  vec3 lineCol = mix(vec3(0.4, 0.65, 1.0), vec3(0.85, 0.95, 1.0), smoothstep(0.6, 1.2, h));
  vec3 col = base + lines * lineCol * 0.6 + grid * vec3(0.4, 0.7, 1.0);

  // cursor highlight ring
  float ring = exp(-length(uv - m) * 6.0);
  col += ring * 0.4 * vec3(0.6, 0.85, 1.0);

  col *= 1.0 - 0.4 * length(uv);
  gl_FragColor = vec4(col, 1.0);
}`;

  // ── 4. Particle Constellation ─────────────────────────────────────────
  // Stars on a grid, each connected to adjacent neighbors with gray lines.
  // Both stars and lines flow toward the cursor.
  const FRAG_PARTICLES = COMMON + `

// Distance from point p to segment a-b
float segDist(vec2 p, vec2 a, vec2 b){
  vec2 ab = b - a;
  float d2 = dot(ab, ab);
  if(d2 < 0.00001) return length(p - a);
  float t = clamp(dot(p - a, ab) / d2, 0.0, 1.0);
  return length(p - a - ab * t);
}

// Star position in UV space for grid cell c, attracted toward cursor m
vec2 sPos(vec2 c, vec2 m, float t, float S){
  float h1 = hash(c);
  float h2 = hash(c + vec2(17.3, 43.7));
  vec2 j = vec2(h1, h2);
  // slow drift
  j += vec2(sin(t * 0.4 + h1 * 25.0), cos(t * 0.35 + h2 * 25.0)) * 0.2;
  j = clamp(j, 0.05, 0.95);
  vec2 pos = (c + j) / S;
  // cursor attraction — stars drift toward cursor when nearby
  vec2 d = m - pos;
  return pos + d * exp(-dot(d, d) * 7.0) * 0.25;
}

void main(){
  vec2 res = u_resolution;
  vec2 uv = (gl_FragCoord.xy - 0.5 * res) / min(res.x, res.y);
  vec2 m  = (u_mouseSmooth - 0.5 * res) / min(res.x, res.y);
  float t = u_time;

  const float S    = 4.5;          // grid density — ~60 stars on 1080p
  const float maxD = 1.85 / S;     // max distance to draw a connecting line

  vec2 gc = floor(uv * S);

  vec3  col = vec3(0.02, 0.025, 0.05);
  float sg  = 0.0;   // star glow accumulator
  float lg  = 0.0;   // line glow accumulator

  // 3×3 neighborhood: renders all stars and lines visible from this fragment
  for(int cy = -1; cy <= 1; cy++){
    for(int cx = -1; cx <= 1; cx++){
      vec2 ca = gc + vec2(float(cx), float(cy));
      vec2 pa = sPos(ca, m, t, S);

      // Star dot + halo
      float dd = length(uv - pa);
      float tw = 0.65 + 0.35 * sin(t * 2.2 + hash(ca) * 30.0); // twinkle
      sg += tw * (smoothstep(0.018, 0.0, dd) + 0.12 * smoothstep(0.1, 0.0, dd));

      // Lines to 4 "forward" neighbors — covers every edge exactly once
      // (+1,0)  (+1,+1)  (0,+1)  (-1,+1)
      vec2 pb; float fd, ld;

      pb = sPos(ca + vec2( 1.0, 0.0), m, t, S);
      fd = length(pa - pb);
      if(fd < maxD){ ld = segDist(uv, pa, pb); lg += (1.0 - fd / maxD) * smoothstep(0.005, 0.0, ld); }

      pb = sPos(ca + vec2( 1.0, 1.0), m, t, S);
      fd = length(pa - pb);
      if(fd < maxD){ ld = segDist(uv, pa, pb); lg += (1.0 - fd / maxD) * smoothstep(0.005, 0.0, ld); }

      pb = sPos(ca + vec2( 0.0, 1.0), m, t, S);
      fd = length(pa - pb);
      if(fd < maxD){ ld = segDist(uv, pa, pb); lg += (1.0 - fd / maxD) * smoothstep(0.005, 0.0, ld); }

      pb = sPos(ca + vec2(-1.0, 1.0), m, t, S);
      fd = length(pa - pb);
      if(fd < maxD){ ld = segDist(uv, pa, pb); lg += (1.0 - fd / maxD) * smoothstep(0.005, 0.0, ld); }
    }
  }

  // Blue-white stars
  col += sg * vec3(0.75, 0.88, 1.0);
  // Gray connecting lines (slightly blue-tinted so they read on dark bg)
  col += lg * 0.32 * vec3(0.48, 0.55, 0.72);

  // Soft cursor glow — illuminates nearby stars and lines
  float md = length(uv - m);
  col += 0.18 * exp(-md * md * 2.8) * vec3(0.35, 0.55, 1.0);

  // Click shockwave ring
  float shock = exp(-pow(md * 5.0 - u_click * 10.0, 2.0) * 1.5) * u_click;
  col += shock * 0.65 * vec3(0.6, 0.8, 1.0);

  // Vignette
  col *= 1.0 - 0.42 * dot(uv, uv);
  gl_FragColor = vec4(col, 1.0);
}`;

  // ── 5. Refraction Glass ───────────────────────────────────────────────
  const FRAG_GLASS = COMMON + `
void main(){
  vec2 res = u_resolution;
  vec2 uv  = (gl_FragCoord.xy - 0.5 * res) / min(res.x, res.y);
  vec2 m   = (u_mouseSmooth - 0.5 * res) / min(res.x, res.y);

  float t = u_time * 0.08;

  // lens centered on cursor
  vec2 d = uv - m;
  float dist = length(d);
  float lens = exp(-dist * 3.0);
  vec2 q = uv + d * lens * (0.35 + u_click * 0.4);

  // caustic-ish base pattern using cosines + noise
  float n  = fbm(q * 2.0 + vec2(t, -t * 0.6));
  float c1 = sin(q.x * 4.0 + n * 3.0 + t * 2.0);
  float c2 = sin(q.y * 5.0 - n * 2.5 - t * 1.7);
  float c3 = sin((q.x + q.y) * 3.5 + n * 4.0 + t);
  float caustic = (c1 + c2 + c3) / 3.0;
  caustic = smoothstep(0.2, 0.95, caustic * 0.5 + 0.5);

  // frosted glass colors — cool, prismatic
  vec3 dark   = vec3(0.03, 0.05, 0.10);
  vec3 cyan   = vec3(0.25, 0.55, 0.80);
  vec3 violet = vec3(0.45, 0.30, 0.75);
  vec3 white  = vec3(0.85, 0.92, 1.0);
  vec3 col = dark;
  col = mix(col, cyan,   smoothstep(0.4, 0.7, caustic));
  col = mix(col, violet, smoothstep(0.55, 0.85, caustic + n * 0.3));
  col = mix(col, white,  smoothstep(0.85, 1.0, caustic) * 0.6);

  // lens highlight ring
  float ring = smoothstep(0.04, 0.0, abs(dist - 0.22 - u_click * 0.05));
  col += ring * 0.3 * vec3(0.7, 0.9, 1.0);
  col += lens * 0.15 * vec3(0.8, 0.9, 1.0);

  col *= 1.0 - 0.4 * length(uv);
  gl_FragColor = vec4(col, 1.0);
}`;

  const SHADERS = {
    mercury:   FRAG_MERCURY,
    plasma:    FRAG_PLASMA,
    topo:      FRAG_TOPO,
    particles: FRAG_PARTICLES,
    glass:     FRAG_GLASS,
  };

  // ── WebGL plumbing ────────────────────────────────────────────────────
  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(s), src);
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  function link(gl, vsrc, fsrc) {
    const vs = compile(gl, gl.VERTEX_SHADER, vsrc);
    const fs = compile(gl, gl.FRAGMENT_SHADER, fsrc);
    if (!vs || !fs) return null;
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.bindAttribLocation(p, 0, 'a_pos');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.error('Link error:', gl.getProgramInfoLog(p));
      return null;
    }
    return p;
  }

  class ShaderBG {
    constructor(canvas) {
      this.canvas = canvas;
      this.gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false });
      if (!this.gl) {
        canvas.style.background = 'linear-gradient(135deg, #0a0a0f, #1a1530, #0a0a0f)';
        this.broken = true;
        return;
      }
      const gl = this.gl;
      // OES_standard_derivatives for fwidth (topo shader)
      gl.getExtension('OES_standard_derivatives');

      // Fullscreen triangle (covers viewport without artifacts)
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

      this.programs = {};
      for (const [id, src] of Object.entries(SHADERS)) {
        // Prepend the derivatives extension where needed
        const finalSrc = '#extension GL_OES_standard_derivatives : enable\n' + src;
        const p = link(gl, VERT, finalSrc);
        if (p) this.programs[id] = p;
      }

      this.current = 'mercury';
      this.startTime = performance.now();
      this.mouse = [canvas.width / 2, canvas.height / 2];
      this.mouseSmooth = [...this.mouse];
      this.clickStrength = 0;
      this.running = true;

      this._onMove = (e) => {
        const r = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        // y-flip: WebGL gl_FragCoord origin is bottom-left
        this.mouse[0] = (e.clientX - r.left) * dpr;
        this.mouse[1] = (r.height - (e.clientY - r.top)) * dpr;
      };
      window.addEventListener('pointermove', this._onMove, { passive: true });

      this._onClick = (e) => {
        this.clickStrength = 1.0;
      };
      window.addEventListener('pointerdown', this._onClick, { passive: true });

      this._onResize = () => this.resize();
      window.addEventListener('resize', this._onResize);
      this.resize();
      this._loop();
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.floor(this.canvas.clientWidth * dpr);
      const h = Math.floor(this.canvas.clientHeight * dpr);
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
      }
      if (this.gl) this.gl.viewport(0, 0, w, h);
    }

    setShader(id) {
      if (this.programs && this.programs[id]) {
        this.current = id;
        this.clickStrength = Math.max(this.clickStrength, 0.5); // soft pulse on switch
      }
    }

    click(x, y) {
      const r = this.canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (typeof x === 'number') {
        this.mouse[0] = (x - r.left) * dpr;
        this.mouse[1] = (r.height - (y - r.top)) * dpr;
      }
      this.clickStrength = 1.0;
    }

    _loop() {
      if (!this.running) return;
      if (this.broken) return;
      const gl = this.gl;
      this.resize();
      // smooth-follow mouse
      this.mouseSmooth[0] += (this.mouse[0] - this.mouseSmooth[0]) * 0.08;
      this.mouseSmooth[1] += (this.mouse[1] - this.mouseSmooth[1]) * 0.08;
      this.clickStrength *= 0.94;
      if (this.clickStrength < 0.001) this.clickStrength = 0;

      const p = this.programs[this.current];
      if (p) {
        gl.useProgram(p);
        const u = (n) => gl.getUniformLocation(p, n);
        gl.uniform2f(u('u_resolution'), this.canvas.width, this.canvas.height);
        gl.uniform1f(u('u_time'),    (performance.now() - this.startTime) / 1000);
        gl.uniform2f(u('u_mouse'),       this.mouse[0],       this.mouse[1]);
        gl.uniform2f(u('u_mouseSmooth'), this.mouseSmooth[0], this.mouseSmooth[1]);
        gl.uniform1f(u('u_click'), this.clickStrength);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      this._raf = requestAnimationFrame(() => this._loop());
    }

    destroy() {
      this.running = false;
      cancelAnimationFrame(this._raf);
      window.removeEventListener('pointermove', this._onMove);
      window.removeEventListener('pointerdown', this._onClick);
      window.removeEventListener('resize', this._onResize);
    }
  }

  global.ShaderBG = ShaderBG;
  global.SHADER_IDS = Object.keys(SHADERS);
})(window);
