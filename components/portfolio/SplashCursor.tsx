'use client';
import { useEffect, useRef } from 'react';

export function SplashCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let isActive = true;

    // ── config ──────────────────────────────────────────────
    const config = {
      SIM_RESOLUTION: 128,
      DYE_RESOLUTION: 512,   // 1024→512: 4x less GPU memory bandwidth
      DENSITY_DISSIPATION: 2.8,
      VELOCITY_DISSIPATION: 0.55,
      PRESSURE: 0.1,
      PRESSURE_ITERATIONS: 20,
      CURL: 3,
      SPLAT_RADIUS: 0.25,
      SPLAT_FORCE: 6000,
      SHADING: true,
      COLOR_UPDATE_SPEED: 10,
      BACK_COLOR: { r: 0, g: 0, b: 0 },
      TRANSPARENT: true,
    };

    // ── pointer ─────────────────────────────────────────────
    const pointers = [{ id: -1, texcoordX: 0, texcoordY: 0, prevTexcoordX: 0, prevTexcoordY: 0, deltaX: 0, deltaY: 0, down: false, moved: false, color: [0,0,0] as number[] }];

    // ── WebGL init ───────────────────────────────────────────
    const params = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false };
    const gl = (canvas.getContext('webgl2', params) || canvas.getContext('webgl', params)) as WebGL2RenderingContext;
    if (!gl) return;
    const isWebGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;

    let halfFloat: number;
    let supportLinearFiltering = false;
    if (isWebGL2) {
      gl.getExtension('EXT_color_buffer_float');
      supportLinearFiltering = !!gl.getExtension('OES_texture_float_linear');
      halfFloat = gl.HALF_FLOAT;
    } else {
      const hfExt = gl.getExtension('OES_texture_half_float') as { HALF_FLOAT_OES: number } | null;
      supportLinearFiltering = !!gl.getExtension('OES_texture_half_float_linear');
      halfFloat = hfExt ? hfExt.HALF_FLOAT_OES : 0;
    }
    if (!supportLinearFiltering) { config.DYE_RESOLUTION = 256; config.SHADING = false; }

    function supportFmt(iF: number, fmt: number, t: number): { internalFormat: number; format: number } | null {
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      ['MIN_FILTER','MAG_FILTER'].forEach(f => gl.texParameteri(gl.TEXTURE_2D, (gl as any)[f], gl.NEAREST));
      ['WRAP_S','WRAP_T'].forEach(f => gl.texParameteri(gl.TEXTURE_2D, (gl as any)['TEXTURE_'+f], gl.CLAMP_TO_EDGE));
      gl.texImage2D(gl.TEXTURE_2D, 0, iF, 4, 4, 0, fmt, t, null);
      const fbo = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        if (isWebGL2) {
          if (iF === (gl as WebGL2RenderingContext).R16F)   return supportFmt((gl as WebGL2RenderingContext).RG16F,   (gl as WebGL2RenderingContext).RG,   t);
          if (iF === (gl as WebGL2RenderingContext).RG16F)  return supportFmt((gl as WebGL2RenderingContext).RGBA16F, gl.RGBA, t);
        }
        return null;
      }
      return { internalFormat: iF, format: fmt };
    }

    let fmtRGBA: { internalFormat: number; format: number } | null;
    let fmtRG:   { internalFormat: number; format: number } | null;
    let fmtR:    { internalFormat: number; format: number } | null;
    if (isWebGL2) {
      const g2 = gl as WebGL2RenderingContext;
      fmtRGBA = supportFmt(g2.RGBA16F, gl.RGBA,  halfFloat);
      fmtRG   = supportFmt(g2.RG16F,   g2.RG,    halfFloat);
      fmtR    = supportFmt(g2.R16F,    g2.RED,   halfFloat);
    } else {
      fmtRGBA = supportFmt(gl.RGBA, gl.RGBA, halfFloat);
      fmtRG   = fmtRGBA;
      fmtR    = fmtRGBA;
    }

    // ── shader helpers ───────────────────────────────────────
    function compileShader(type: number, src: string, kws?: string[] | null) {
      let s = src;
      if (kws?.length) s = kws.map(k => `#define ${k}\n`).join('') + s;
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, s); gl.compileShader(sh);
      return sh;
    }
    function createProgram(vs: WebGLShader, fs: WebGLShader) {
      const p = gl.createProgram()!;
      gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
      return p;
    }
    function getUniforms(p: WebGLProgram) {
      const u: Record<string, WebGLUniformLocation | null> = {};
      const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) {
        const name = gl.getActiveUniform(p, i)!.name;
        u[name] = gl.getUniformLocation(p, name);
      }
      return u;
    }

    const baseVS = compileShader(gl.VERTEX_SHADER, `
      precision highp float;
      attribute vec2 aPosition;
      varying vec2 vUv, vL, vR, vT, vB;
      uniform vec2 texelSize;
      void main() {
        vUv = aPosition * 0.5 + 0.5;
        vL = vUv - vec2(texelSize.x, 0.0);
        vR = vUv + vec2(texelSize.x, 0.0);
        vT = vUv + vec2(0.0, texelSize.y);
        vB = vUv - vec2(0.0, texelSize.y);
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `);

    class Program {
      program: WebGLProgram; uniforms: Record<string, WebGLUniformLocation | null>;
      constructor(vs: WebGLShader, fs: WebGLShader) {
        this.program = createProgram(vs, fs);
        this.uniforms = getUniforms(this.program);
      }
      bind() { gl.useProgram(this.program); }
    }
    class Material {
      vs: WebGLShader; fsSrc: string;
      programs: Record<number, WebGLProgram> = {};
      activeProgram: WebGLProgram | null = null;
      uniforms: Record<string, WebGLUniformLocation | null> = {};
      constructor(vs: WebGLShader, fsSrc: string) { this.vs = vs; this.fsSrc = fsSrc; }
      setKeywords(kws: string[]) {
        let hash = 0;
        kws.forEach(k => { for (let i = 0; i < k.length; i++) hash = (hash << 5) - hash + k.charCodeAt(i) | 0; });
        let prog = this.programs[hash];
        if (!prog) {
          prog = createProgram(this.vs, compileShader(gl.FRAGMENT_SHADER, this.fsSrc, kws));
          this.programs[hash] = prog;
        }
        if (prog === this.activeProgram) return;
        this.uniforms = getUniforms(prog);
        this.activeProgram = prog;
      }
      bind() { gl.useProgram(this.activeProgram); }
    }

    // ── fragment shaders ─────────────────────────────────────
    const copyFS = compileShader(gl.FRAGMENT_SHADER, `
      precision mediump float; precision mediump sampler2D;
      varying highp vec2 vUv; uniform sampler2D uTexture;
      void main() { gl_FragColor = texture2D(uTexture, vUv); }`);
    const clearFS = compileShader(gl.FRAGMENT_SHADER, `
      precision mediump float; precision mediump sampler2D;
      varying highp vec2 vUv; uniform sampler2D uTexture; uniform float value;
      void main() { gl_FragColor = value * texture2D(uTexture, vUv); }`);
    const splatFS = compileShader(gl.FRAGMENT_SHADER, `
      precision highp float; precision highp sampler2D;
      varying vec2 vUv; uniform sampler2D uTarget;
      uniform float aspectRatio; uniform vec3 color; uniform vec2 point; uniform float radius;
      void main() {
        vec2 p = vUv - point.xy; p.x *= aspectRatio;
        vec3 splat = exp(-dot(p,p)/radius)*color;
        gl_FragColor = vec4(texture2D(uTarget,vUv).xyz + splat, 1.0); }`);
    const advectionFS = compileShader(gl.FRAGMENT_SHADER, `
      precision highp float; precision highp sampler2D;
      varying vec2 vUv; uniform sampler2D uVelocity, uSource;
      uniform vec2 texelSize, dyeTexelSize; uniform float dt, dissipation;
      vec4 bilerp(sampler2D s, vec2 uv, vec2 ts) {
        vec2 st=uv/ts-0.5; vec2 iu=floor(st); vec2 fu=fract(st);
        vec4 a=texture2D(s,(iu+vec2(0.5,0.5))*ts); vec4 b=texture2D(s,(iu+vec2(1.5,0.5))*ts);
        vec4 c=texture2D(s,(iu+vec2(0.5,1.5))*ts); vec4 d=texture2D(s,(iu+vec2(1.5,1.5))*ts);
        return mix(mix(a,b,fu.x),mix(c,d,fu.x),fu.y);
      }
      void main() {
        #ifdef MANUAL_FILTERING
          vec2 coord=vUv-dt*bilerp(uVelocity,vUv,texelSize).xy*texelSize;
          vec4 result=bilerp(uSource,coord,dyeTexelSize);
        #else
          vec2 coord=vUv-dt*texture2D(uVelocity,vUv).xy*texelSize;
          vec4 result=texture2D(uSource,coord);
        #endif
        gl_FragColor = result / (1.0 + dissipation*dt);
      }`, supportLinearFiltering ? null : ['MANUAL_FILTERING']);
    const divergenceFS = compileShader(gl.FRAGMENT_SHADER, `
      precision mediump float; precision mediump sampler2D;
      varying highp vec2 vUv,vL,vR,vT,vB; uniform sampler2D uVelocity;
      void main() {
        float L=texture2D(uVelocity,vL).x, R=texture2D(uVelocity,vR).x,
              T=texture2D(uVelocity,vT).y, B=texture2D(uVelocity,vB).y;
        vec2 C=texture2D(uVelocity,vUv).xy;
        if(vL.x<0.0)L=-C.x; if(vR.x>1.0)R=-C.x; if(vT.y>1.0)T=-C.y; if(vB.y<0.0)B=-C.y;
        gl_FragColor = vec4(0.5*(R-L+T-B),0,0,1); }`);
    const curlFS = compileShader(gl.FRAGMENT_SHADER, `
      precision mediump float; precision mediump sampler2D;
      varying highp vec2 vUv,vL,vR,vT,vB; uniform sampler2D uVelocity;
      void main() {
        float L=texture2D(uVelocity,vL).y, R=texture2D(uVelocity,vR).y,
              T=texture2D(uVelocity,vT).x, B=texture2D(uVelocity,vB).x;
        gl_FragColor = vec4(0.5*(R-L-T+B),0,0,1); }`);
    const vorticityFS = compileShader(gl.FRAGMENT_SHADER, `
      precision highp float; precision highp sampler2D;
      varying vec2 vUv,vL,vR,vT,vB; uniform sampler2D uVelocity,uCurl;
      uniform float curl, dt;
      void main() {
        float L=texture2D(uCurl,vL).x, R=texture2D(uCurl,vR).x,
              T=texture2D(uCurl,vT).x, B=texture2D(uCurl,vB).x, C=texture2D(uCurl,vUv).x;
        vec2 force=0.5*vec2(abs(T)-abs(B), abs(R)-abs(L));
        force /= length(force)+0.0001; force *= curl*C; force.y *= -1.0;
        vec2 v=texture2D(uVelocity,vUv).xy + force*dt;
        gl_FragColor = vec4(clamp(v,-1000.0,1000.0),0,1); }`);
    const pressureFS = compileShader(gl.FRAGMENT_SHADER, `
      precision mediump float; precision mediump sampler2D;
      varying highp vec2 vUv,vL,vR,vT,vB; uniform sampler2D uPressure,uDivergence;
      void main() {
        float L=texture2D(uPressure,vL).x, R=texture2D(uPressure,vR).x,
              T=texture2D(uPressure,vT).x, B=texture2D(uPressure,vB).x;
        float div=texture2D(uDivergence,vUv).x;
        gl_FragColor = vec4((L+R+B+T-div)*0.25,0,0,1); }`);
    const gradSubtractFS = compileShader(gl.FRAGMENT_SHADER, `
      precision mediump float; precision mediump sampler2D;
      varying highp vec2 vUv,vL,vR,vT,vB; uniform sampler2D uPressure,uVelocity;
      void main() {
        float L=texture2D(uPressure,vL).x, R=texture2D(uPressure,vR).x,
              T=texture2D(uPressure,vT).x, B=texture2D(uPressure,vB).x;
        vec2 v=texture2D(uVelocity,vUv).xy - vec2(R-L,T-B);
        gl_FragColor = vec4(v,0,1); }`);

    const displayShaderSrc = `
      precision highp float; precision highp sampler2D;
      varying vec2 vUv,vL,vR,vT,vB; uniform sampler2D uTexture; uniform vec2 texelSize;
      void main() {
        vec3 c = texture2D(uTexture, vUv).rgb;
        #ifdef SHADING
          vec3 lc=texture2D(uTexture,vL).rgb, rc=texture2D(uTexture,vR).rgb,
               tc=texture2D(uTexture,vT).rgb, bc=texture2D(uTexture,vB).rgb;
          float dx=length(rc)-length(lc), dy=length(tc)-length(bc);
          vec3 n=normalize(vec3(dx,dy,length(texelSize)));
          c *= clamp(dot(n,vec3(0,0,1))+0.7, 0.7, 1.0);
        #endif
        float a = max(c.r, max(c.g, c.b));
        gl_FragColor = vec4(c, a);
      }`;

    const copyProg       = new Program(baseVS, copyFS);
    const clearProg      = new Program(baseVS, clearFS);
    const splatProg      = new Program(baseVS, splatFS);
    const advProg        = new Program(baseVS, advectionFS);
    const divProg        = new Program(baseVS, divergenceFS);
    const curlProg       = new Program(baseVS, curlFS);
    const vortProg       = new Program(baseVS, vorticityFS);
    const presProg       = new Program(baseVS, pressureFS);
    const gradProg       = new Program(baseVS, gradSubtractFS);
    const displayMat     = new Material(baseVS, displayShaderSrc);

    // ── blit quad ────────────────────────────────────────────
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()!);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,-1,1,1,1,1,-1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer()!);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0,1,2,0,2,3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    // ── FBO helpers ──────────────────────────────────────────
    interface FBO { texture: WebGLTexture; fbo: WebGLFramebuffer; width: number; height: number; texelSizeX: number; texelSizeY: number; attach(id: number): number }
    interface DFBO { read: FBO; write: FBO; width: number; height: number; texelSizeX: number; texelSizeY: number; swap(): void }

    function blit(target: FBO | null, clear = false) {
      if (!target) {
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      } else {
        gl.viewport(0, 0, target.width, target.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      }
      if (clear) { gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT); }
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }
    function createFBO(w: number, h: number, iF: number, fmt: number, type: number, param: number): FBO {
      gl.activeTexture(gl.TEXTURE0);
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, iF, w, h, 0, fmt, type, null);
      const fbo = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.viewport(0,0,w,h); gl.clear(gl.COLOR_BUFFER_BIT);
      return {
        texture: tex, fbo, width: w, height: h,
        texelSizeX: 1/w, texelSizeY: 1/h,
        attach(id: number) { gl.activeTexture(gl.TEXTURE0+id); gl.bindTexture(gl.TEXTURE_2D, tex); return id; }
      };
    }
    function createDFBO(w: number, h: number, iF: number, fmt: number, type: number, param: number): DFBO {
      let r = createFBO(w,h,iF,fmt,type,param);
      let wr = createFBO(w,h,iF,fmt,type,param);
      return {
        width: w, height: h, texelSizeX: 1/w, texelSizeY: 1/h,
        get read() { return r; }, set read(v) { r = v; },
        get write() { return wr; }, set write(v) { wr = v; },
        swap() { const t=r; r=wr; wr=t; }
      };
    }
    function resizeFBO(t: FBO, w: number, h: number, iF: number, fmt: number, type: number, param: number): FBO {
      const n = createFBO(w,h,iF,fmt,type,param);
      copyProg.bind(); gl.uniform1i(copyProg.uniforms.uTexture, t.attach(0)); blit(n); return n;
    }
    function resizeDFBO(t: DFBO, w: number, h: number, iF: number, fmt: number, type: number, param: number): DFBO {
      if (t.width===w && t.height===h) return t;
      t.read = resizeFBO(t.read,w,h,iF,fmt,type,param);
      t.write = createFBO(w,h,iF,fmt,type,param);
      t.width=w; t.height=h; t.texelSizeX=1/w; t.texelSizeY=1/h; return t;
    }
    function getRes(res: number) {
      const ar = Math.max(gl.drawingBufferWidth/gl.drawingBufferHeight, gl.drawingBufferHeight/gl.drawingBufferWidth);
      const mn = Math.round(res), mx = Math.round(res*ar);
      return gl.drawingBufferWidth > gl.drawingBufferHeight ? { width: mx, height: mn } : { width: mn, height: mx };
    }

    let dye!: DFBO, velocity!: DFBO, divergence!: FBO, curl!: FBO, pressure!: DFBO;
    function initFBOs() {
      const sr = getRes(config.SIM_RESOLUTION), dr = getRes(config.DYE_RESOLUTION);
      const fil = supportLinearFiltering ? gl.LINEAR : gl.NEAREST;
      gl.disable(gl.BLEND);
      if (!dye) dye = createDFBO(dr.width,dr.height,fmtRGBA!.internalFormat,fmtRGBA!.format,halfFloat,fil);
      else dye = resizeDFBO(dye,dr.width,dr.height,fmtRGBA!.internalFormat,fmtRGBA!.format,halfFloat,fil);
      if (!velocity) velocity = createDFBO(sr.width,sr.height,fmtRG!.internalFormat,fmtRG!.format,halfFloat,fil);
      else velocity = resizeDFBO(velocity,sr.width,sr.height,fmtRG!.internalFormat,fmtRG!.format,halfFloat,fil);
      divergence = createFBO(sr.width,sr.height,fmtR!.internalFormat,fmtR!.format,halfFloat,gl.NEAREST);
      curl       = createFBO(sr.width,sr.height,fmtR!.internalFormat,fmtR!.format,halfFloat,gl.NEAREST);
      pressure   = createDFBO(sr.width,sr.height,fmtR!.internalFormat,fmtR!.format,halfFloat,gl.NEAREST);
    }

    // Set canvas dimensions before first FBO init
    canvas.width  = Math.floor((canvas.clientWidth  || window.innerWidth)  * (window.devicePixelRatio || 1));
    canvas.height = Math.floor((canvas.clientHeight || window.innerHeight) * (window.devicePixelRatio || 1));

    displayMat.setKeywords(config.SHADING ? ['SHADING'] : []);
    initFBOs();

    // ── theme-aware color generation ─────────────────────────
    function HSVtoRGB(h: number, s: number, v: number) {
      const i=Math.floor(h*6), f=h*6-i, p=v*(1-s), q=v*(1-f*s), t=v*(1-(1-f)*s);
      const m = [[v,t,p],[q,v,p],[p,v,t],[p,q,v],[t,p,v],[v,p,q]];
      const [r,g,b] = m[i%6];
      return { r, g, b };
    }
    function generateColor() {
      const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
      if (isDark) {
        // blue → cyan band, accent-matching
        const c = HSVtoRGB(0.55 + Math.random() * 0.10, 0.9, 1.0);
        return { r: c.r * 0.4, g: c.g * 0.4, b: c.b * 0.4 };
      } else {
        // muted steel-blue for light mode
        const c = HSVtoRGB(0.58 + Math.random() * 0.06, 0.4, 0.6);
        return { r: c.r * 0.3, g: c.g * 0.3, b: c.b * 0.3 };
      }
    }

    // ── simulation helpers ───────────────────────────────────
    function scaleByDPR(v: number) { return Math.floor(v * (window.devicePixelRatio || 1)); }
    function correctRadius(r: number) { const ar=canvas!.width/canvas!.height; return ar>1 ? r*ar : r; }
    function correctDeltaX(d: number) { const ar=canvas!.width/canvas!.height; return ar<1 ? d*ar : d; }
    function correctDeltaY(d: number) { const ar=canvas!.width/canvas!.height; return ar>1 ? d/ar : d; }

    function splat(x: number, y: number, dx: number, dy: number, color: { r:number;g:number;b:number }) {
      splatProg.bind();
      gl.uniform1i(splatProg.uniforms.uTarget, velocity.read.attach(0));
      gl.uniform1f(splatProg.uniforms.aspectRatio, canvas!.width/canvas!.height);
      gl.uniform2f(splatProg.uniforms.point, x, y);
      gl.uniform3f(splatProg.uniforms.color, dx, dy, 0);
      gl.uniform1f(splatProg.uniforms.radius, correctRadius(config.SPLAT_RADIUS/100));
      blit(velocity.write); velocity.swap();
      gl.uniform1i(splatProg.uniforms.uTarget, dye.read.attach(0));
      gl.uniform3f(splatProg.uniforms.color, color.r, color.g, color.b);
      blit(dye.write); dye.swap();
    }

    function step(dt: number) {
      gl.disable(gl.BLEND);
      curlProg.bind();
      gl.uniform2f(curlProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(curlProg.uniforms.uVelocity, velocity.read.attach(0)); blit(curl);
      vortProg.bind();
      gl.uniform2f(vortProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(vortProg.uniforms.uVelocity, velocity.read.attach(0));
      gl.uniform1i(vortProg.uniforms.uCurl, curl.attach(1));
      gl.uniform1f(vortProg.uniforms.curl, config.CURL);
      gl.uniform1f(vortProg.uniforms.dt, dt);
      blit(velocity.write); velocity.swap();
      divProg.bind();
      gl.uniform2f(divProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(divProg.uniforms.uVelocity, velocity.read.attach(0)); blit(divergence);
      clearProg.bind();
      gl.uniform1i(clearProg.uniforms.uTexture, pressure.read.attach(0));
      gl.uniform1f(clearProg.uniforms.value, config.PRESSURE);
      blit(pressure.write); pressure.swap();
      presProg.bind();
      gl.uniform2f(presProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(presProg.uniforms.uDivergence, divergence.attach(0));
      for (let i=0; i<config.PRESSURE_ITERATIONS; i++) {
        gl.uniform1i(presProg.uniforms.uPressure, pressure.read.attach(1));
        blit(pressure.write); pressure.swap();
      }
      gradProg.bind();
      gl.uniform2f(gradProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(gradProg.uniforms.uPressure, pressure.read.attach(0));
      gl.uniform1i(gradProg.uniforms.uVelocity, velocity.read.attach(1));
      blit(velocity.write); velocity.swap();
      advProg.bind();
      gl.uniform2f(advProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      if (!supportLinearFiltering) gl.uniform2f(advProg.uniforms.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY);
      const vId = velocity.read.attach(0);
      gl.uniform1i(advProg.uniforms.uVelocity, vId);
      gl.uniform1i(advProg.uniforms.uSource, vId);
      gl.uniform1f(advProg.uniforms.dt, dt);
      gl.uniform1f(advProg.uniforms.dissipation, config.VELOCITY_DISSIPATION);
      blit(velocity.write); velocity.swap();
      if (!supportLinearFiltering) gl.uniform2f(advProg.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
      gl.uniform1i(advProg.uniforms.uVelocity, velocity.read.attach(0));
      gl.uniform1i(advProg.uniforms.uSource, dye.read.attach(1));
      gl.uniform1f(advProg.uniforms.dissipation, config.DENSITY_DISSIPATION);
      blit(dye.write); dye.swap();
    }

    // ── main loop ────────────────────────────────────────────
    let lastTime = Date.now(), colorTimer = 0, rafId = 0;
    function frame() {
      if (!isActive) return;
      const now = Date.now();
      const dt = Math.min((now-lastTime)/1000, 0.016666);
      lastTime = now;
      const w = scaleByDPR(canvas!.clientWidth), h = scaleByDPR(canvas!.clientHeight);
      if (canvas!.width!==w || canvas!.height!==h) { canvas!.width=w; canvas!.height=h; initFBOs(); }
      colorTimer += dt * config.COLOR_UPDATE_SPEED;
      if (colorTimer >= 1) { colorTimer %= 1; pointers.forEach(p => { p.color = Object.values(generateColor()); }); }
      pointers.forEach(p => { if (p.moved) { p.moved=false; splat(p.texcoordX, p.texcoordY, p.deltaX*config.SPLAT_FORCE, p.deltaY*config.SPLAT_FORCE, { r:p.color[0], g:p.color[1], b:p.color[2] }); } });
      step(dt);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.BLEND);
      displayMat.bind();
      if (config.SHADING) gl.uniform2f(displayMat.uniforms.texelSize, 1/gl.drawingBufferWidth, 1/gl.drawingBufferHeight);
      gl.uniform1i(displayMat.uniforms.uTexture, dye.read.attach(0));
      blit(null);
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);

    // ── tab visibility ───────────────────────────────────────
    const onVisibility = () => {
      if (document.hidden) { cancelAnimationFrame(rafId); rafId = 0; }
      else if (rafId === 0) { lastTime = Date.now(); rafId = requestAnimationFrame(frame); }
    };

    // ── events ───────────────────────────────────────────────
    function onMouseDown(e: MouseEvent) {
      const p = pointers[0];
      const x = scaleByDPR(e.clientX), y = scaleByDPR(e.clientY);
      p.down=true; p.moved=false;
      p.texcoordX=x/canvas!.width; p.texcoordY=1-y/canvas!.height;
      p.prevTexcoordX=p.texcoordX; p.prevTexcoordY=p.texcoordY;
      p.deltaX=0; p.deltaY=0;
      const c = generateColor();
      p.color = [c.r*10, c.g*10, c.b*10];
      splat(p.texcoordX, p.texcoordY, (Math.random()-0.5)*10, (Math.random()-0.5)*30, { r:c.r*10, g:c.g*10, b:c.b*10 });
    }
    let firstMove = false;
    function onMouseMove(e: MouseEvent) {
      const p = pointers[0];
      const x = scaleByDPR(e.clientX), y = scaleByDPR(e.clientY);
      const nx = x/canvas!.width, ny = 1-y/canvas!.height;
      if (!firstMove) { p.texcoordX=nx; p.texcoordY=ny; p.prevTexcoordX=nx; p.prevTexcoordY=ny; firstMove=true; return; }
      p.prevTexcoordX=p.texcoordX; p.prevTexcoordY=p.texcoordY;
      p.texcoordX=nx; p.texcoordY=ny;
      p.deltaX=correctDeltaX(p.texcoordX-p.prevTexcoordX);
      p.deltaY=correctDeltaY(p.texcoordY-p.prevTexcoordY);
      p.moved=Math.abs(p.deltaX)>0||Math.abs(p.deltaY)>0;
    }
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      isActive = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9998, pointerEvents:'none' }}>
      <canvas ref={canvasRef} style={{ width:'100vw', height:'100vh', display:'block' }} />
    </div>
  );
}
