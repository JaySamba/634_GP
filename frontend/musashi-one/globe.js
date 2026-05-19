// Musashi One GPT — Interactive globe layer (v2).
// Each region is a spherical cap (center direction + angular radius + color).
// - setHovered(name)  → brightens that cap and adds outline
// - setRegion(name)   → rotates the globe to face that region + beacon lights up
// - zoomTo(name)      → animates a zoom-in over `duration` ms (returns Promise)
// - setOpacity(a)     → fade-out helper
//
// All transitions are smooth (lerp toward target every frame).

(function (global) {
  const REGIONS = {
    japan:    { lat: 36,  lon: 138,  radius: 0.18, color: [1.00, 0.36, 0.30], name: 'Japan'    },
    americas: { lat: 38,  lon: -95,  radius: 0.50, color: [0.30, 0.75, 1.00], name: 'Americas' },
    asia:     { lat: 8,   lon: 102,  radius: 0.32, color: [0.30, 1.00, 0.78], name: 'Asia'     },
    china:    { lat: 36,  lon: 104,  radius: 0.25, color: [1.00, 0.78, 0.30], name: 'China'    },
    europe:   { lat: 52,  lon: 12,   radius: 0.32, color: [0.78, 0.45, 1.00], name: 'Europe'   },
  };
  const REGION_KEYS = ['japan', 'americas', 'asia', 'china', 'europe'];

  function regionDir(r) {
    const lat = r.lat * Math.PI / 180;
    const lon = r.lon * Math.PI / 180;
    return [
      Math.cos(lat) * Math.sin(lon),
      Math.sin(lat),
      Math.cos(lat) * Math.cos(lon),
    ];
  }

  const VERT = `attribute vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }`;

  const FRAG = `
precision highp float;
#define N 5
uniform vec2  u_resolution;
uniform float u_time;
uniform vec2  u_center;
uniform float u_radius;
uniform float u_yaw;
uniform float u_pitch;
uniform float u_alpha;

uniform vec3  u_regionDirs[N];
uniform vec3  u_regionColors[N];
uniform float u_regionRadii[N];
uniform float u_regionHovered[N];   // 0..1
uniform float u_regionSelected[N];  // 0..1
uniform float u_globalGlow;         // boosts everything during zoom

float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float noise3(vec3 p){
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash(i);
  float n100 = hash(i + vec3(1, 0, 0));
  float n010 = hash(i + vec3(0, 1, 0));
  float n110 = hash(i + vec3(1, 1, 0));
  float n001 = hash(i + vec3(0, 0, 1));
  float n101 = hash(i + vec3(1, 0, 1));
  float n011 = hash(i + vec3(0, 1, 1));
  float n111 = hash(i + vec3(1, 1, 1));
  return mix(
    mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
    f.z
  );
}
float fbm3(vec3 p){
  float v = 0.0, a = 0.5;
  for(int i = 0; i < 4; i++){ v += a * noise3(p); p *= 2.02; a *= 0.5; }
  return v;
}
mat3 rotY(float a){ return mat3(cos(a),0,sin(a), 0,1,0, -sin(a),0,cos(a)); }
mat3 rotX(float a){ return mat3(1,0,0, 0,cos(a),-sin(a), 0,sin(a),cos(a)); }

void main(){
  vec2 frag = gl_FragCoord.xy;
  vec2 d    = frag - u_center;
  float r   = length(d);

  vec3 col = vec3(0.0);
  float outA = 0.0;

  // Atmosphere outside sphere
  if (r > u_radius) {
    float atm = smoothstep(u_radius * 1.55, u_radius * 1.0, r) - smoothstep(u_radius * 1.0, u_radius * 0.96, r);
    atm = max(atm, 0.0);
    // tint atmosphere by strongest hovered/selected region color
    vec3 atmCol = vec3(0.18, 0.32, 0.65);
    float best = 0.0;
    for (int i = 0; i < N; i++) {
      float w = max(u_regionHovered[i], u_regionSelected[i] * 1.3);
      if (w > best) { best = w; atmCol = mix(atmCol, u_regionColors[i], 0.85); }
    }
    col += atm * atmCol * (0.55 + u_globalGlow * 0.6);

    // Screen-space halo around selected region
    for (int i = 0; i < N; i++) {
      float sel = u_regionSelected[i];
      if (sel < 0.001) continue;
      // beacon dir in view space:
      vec3 w = u_regionDirs[i];
      vec3 vw = rotX(u_pitch) * rotY(u_yaw) * w;
      if (vw.z < 0.0) continue;
      vec2 sp = u_center + vw.xy * u_radius;
      float halo = exp(-length(frag - sp) / (u_radius * 1.1));
      col += halo * sel * 0.35 * u_regionColors[i];
    }
    gl_FragColor = vec4(col, u_alpha * max(atm + length(col) * 0.5, 0.0));
    return;
  }

  // Inside sphere
  vec2 q = d / u_radius;
  float z = sqrt(max(0.0, 1.0 - q.x*q.x - q.y*q.y));
  vec3 view = vec3(q.x, q.y, z);

  // World coord under this pixel: undo camera rotation
  vec3 world = rotY(-u_yaw) * rotX(-u_pitch) * view;

  // Procedural land/sea — coarse and dark so regions read clearly
  float h = fbm3(world * 2.2);
  h += 0.5 * fbm3(world * 4.4 + 4.0);
  float land = smoothstep(0.58, 0.62, h);

  vec3 ocean = mix(vec3(0.02, 0.06, 0.13), vec3(0.05, 0.12, 0.22), smoothstep(0.4, 0.62, h));
  vec3 landC = mix(vec3(0.10, 0.17, 0.22), vec3(0.20, 0.30, 0.34), smoothstep(0.62, 0.85, h));
  vec3 surf  = mix(ocean, landC, land);

  // Faint lat/lon grid (every 30°)
  float lat = asin(world.y);
  float lon = atan(world.z, world.x);
  float gLat = abs(fract(lat * 6.0 / 3.14159) - 0.5);
  float gLon = abs(fract(lon * 12.0 / 3.14159) - 0.5);
  float grid = smoothstep(0.50, 0.49, max(gLat, gLon));
  surf += grid * 0.05 * vec3(0.4, 0.6, 1.0);

  // Lighting
  vec3 lightDir = normalize(vec3(-0.35, 0.45, 0.85));
  float lambert = max(dot(view, lightDir), 0.0);
  surf *= 0.30 + 0.85 * lambert;

  // ── Region caps ───────────────────────────────────────────────────
  vec3 regionCol = vec3(0.0);
  float regionInk = 0.0;
  for (int i = 0; i < N; i++) {
    float ang = acos(clamp(dot(world, u_regionDirs[i]), -1.0, 1.0));
    float R = u_regionRadii[i];
    float hover = u_regionHovered[i];
    float sel   = u_regionSelected[i];
    float on    = max(hover, sel);

    // Fill inside the cap (very subtle when idle, brighter on hover/select)
    float inside = 1.0 - smoothstep(R * 0.95, R, ang);
    float fill = inside * (0.05 + on * 0.30);
    regionCol += fill * u_regionColors[i];

    // Boundary ring
    float ringWidth = 0.012 + on * 0.008;
    float ring = smoothstep(ringWidth, 0.0, abs(ang - R));
    float ringIntensity = 0.25 + hover * 0.7 + sel * 1.0;
    regionCol += ring * ringIntensity * u_regionColors[i] * 1.6;
    regionInk = max(regionInk, ring * ringIntensity);

    // Pulsing animated dashed outline for selected
    if (sel > 0.01) {
      float dash = 0.5 + 0.5 * sin(ang * 80.0 - u_time * 4.0);
      float pulseRing = smoothstep(0.02, 0.0, abs(ang - R)) * dash * sel;
      regionCol += pulseRing * u_regionColors[i] * 0.8;
    }

    // Beacon dot at center
    float dot_ = exp(-ang * ang * 80.0) * (0.6 * hover + sel * 1.5);
    regionCol += dot_ * u_regionColors[i] * 2.0;
  }

  surf += regionCol;

  // Rim glow
  float rim = pow(1.0 - z, 2.5);
  vec3 rimCol = vec3(0.2, 0.4, 0.7);
  // bias rim to selected region color
  for (int i = 0; i < N; i++) {
    rimCol = mix(rimCol, u_regionColors[i], u_regionSelected[i] * 0.6);
  }
  surf += rim * 0.5 * rimCol;
  surf += u_globalGlow * 0.15 * rimCol;

  col = surf;
  gl_FragColor = vec4(col, u_alpha);
}`;

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  function link(gl, vsrc, fsrc) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vsrc));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fsrc));
    gl.bindAttribLocation(p, 0, 'a_pos');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(p)); return null; }
    return p;
  }

  class Globe {
    constructor(canvas) {
      this.canvas = canvas;
      this.gl = canvas.getContext('webgl', { antialias: true, premultipliedAlpha: false, alpha: true });
      if (!this.gl) { this.broken = true; return; }
      const gl = this.gl;
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

      this.program = link(gl, VERT, FRAG);

      // pre-compute region directions
      this.regionDirs   = REGION_KEYS.map(k => regionDir(REGIONS[k]));
      this.regionColors = REGION_KEYS.map(k => REGIONS[k].color);
      this.regionRadii  = REGION_KEYS.map(k => REGIONS[k].radius);

      // smoothed state
      this.yaw = 0;             this.targetYaw = 0;
      this.pitch = -0.18;       this.targetPitch = -0.18;
      this.zoom = 0;            this.targetZoom = 0;   // 0..1
      this.alpha = 1.0;         this.targetAlpha = 1.0;
      this.hovered = REGION_KEYS.map(() => 0);
      this.targetHovered = REGION_KEYS.map(() => 0);
      this.selected = REGION_KEYS.map(() => 0);
      this.targetSelected = REGION_KEYS.map(() => 0);

      this.region = null;
      this.startTime = performance.now();
      this.running = true;

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
        this.canvas.width = w; this.canvas.height = h;
      }
      if (this.gl) this.gl.viewport(0, 0, w, h);
    }

    setHovered(name) {
      this.targetHovered = REGION_KEYS.map(k => k === name ? 1 : 0);
      // If nothing selected, also rotate to hovered for preview
      if (this.targetSelected.every(v => v === 0)) {
        if (name && REGIONS[name]) {
          this.targetYaw   = -REGIONS[name].lon * Math.PI / 180;
          this.targetPitch =  REGIONS[name].lat * Math.PI / 180 - 0.05;
        } else {
          this.targetYaw = this.yaw - 0.001; // hold roughly
        }
      }
    }

    setRegion(name) {
      this.region = name;
      this.targetSelected = REGION_KEYS.map(k => k === name ? 1 : 0);
      if (name && REGIONS[name]) {
        this.targetYaw   = -REGIONS[name].lon * Math.PI / 180;
        this.targetPitch =  REGIONS[name].lat * Math.PI / 180 - 0.05;
      }
    }

    setZoom(z) { this.targetZoom = z; }
    setOpacity(a) { this.targetAlpha = a; }

    // Animate a smooth zoom-in into a region, return a Promise that resolves when done
    zoomTo(name, duration = 1400) {
      this.setRegion(name);
      const start = performance.now();
      return new Promise(resolve => {
        const step = () => {
          const t = Math.min(1, (performance.now() - start) / duration);
          // ease-in-out cubic
          const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
          this.targetZoom = eased;
          if (t < 1) requestAnimationFrame(step);
          else resolve();
        };
        step();
      });
    }

    _loop() {
      if (!this.running || this.broken) return;
      const gl = this.gl;
      this.resize();

      // idle gentle drift when nothing active
      const anyActive = this.targetHovered.some(v => v > 0) || this.targetSelected.some(v => v > 0);
      if (!anyActive) {
        this.targetYaw -= 0.0012;
      }

      const k = 0.07;
      this.yaw   += (this.targetYaw   - this.yaw)   * k;
      this.pitch += (this.targetPitch - this.pitch) * k;
      this.zoom  += (this.targetZoom  - this.zoom)  * k;
      this.alpha += (this.targetAlpha - this.alpha) * k;
      for (let i = 0; i < this.hovered.length; i++) {
        this.hovered[i]  += (this.targetHovered[i]  - this.hovered[i])  * 0.15;
        this.selected[i] += (this.targetSelected[i] - this.selected[i]) * 0.10;
      }

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const p = this.program;
      if (!p) return;
      gl.useProgram(p);
      const u = (n) => gl.getUniformLocation(p, n);

      const cw = this.canvas.width, ch = this.canvas.height;
      const cx = cw * 0.5, cy = ch * 0.5;
      const baseRadius = Math.min(cw, ch) * 0.32;
      const zoomRadius = baseRadius * (1.0 + this.zoom * 2.8);

      gl.uniform2f(u('u_resolution'), cw, ch);
      gl.uniform1f(u('u_time'), (performance.now() - this.startTime) / 1000);
      gl.uniform2f(u('u_center'), cx, cy);
      gl.uniform1f(u('u_radius'), zoomRadius);
      gl.uniform1f(u('u_yaw'),   this.yaw);
      gl.uniform1f(u('u_pitch'), this.pitch);
      gl.uniform1f(u('u_alpha'), this.alpha);
      gl.uniform1f(u('u_globalGlow'), this.zoom);

      // arrays
      const dirs = new Float32Array(15);
      const cols = new Float32Array(15);
      const rad  = new Float32Array(5);
      const hov  = new Float32Array(5);
      const sel  = new Float32Array(5);
      for (let i = 0; i < 5; i++) {
        dirs[i*3]   = this.regionDirs[i][0];
        dirs[i*3+1] = this.regionDirs[i][1];
        dirs[i*3+2] = this.regionDirs[i][2];
        cols[i*3]   = this.regionColors[i][0];
        cols[i*3+1] = this.regionColors[i][1];
        cols[i*3+2] = this.regionColors[i][2];
        rad[i]      = this.regionRadii[i];
        hov[i]      = this.hovered[i];
        sel[i]      = this.selected[i];
      }
      gl.uniform3fv(u('u_regionDirs[0]'),   dirs);
      gl.uniform3fv(u('u_regionColors[0]'), cols);
      gl.uniform1fv(u('u_regionRadii[0]'),  rad);
      gl.uniform1fv(u('u_regionHovered[0]'),  hov);
      gl.uniform1fv(u('u_regionSelected[0]'), sel);

      gl.drawArrays(gl.TRIANGLES, 0, 3);

      this._raf = requestAnimationFrame(() => this._loop());
    }

    destroy() {
      this.running = false;
      cancelAnimationFrame(this._raf);
      window.removeEventListener('resize', this._onResize);
    }
  }

  global.Globe = Globe;
  global.GLOBE_REGIONS = REGIONS;
})(window);
