"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// Canvas is OVERFLOW× larger than the logical size so rim spheres
// (r up to 1.22) render fully without frustum clipping.
const OVERFLOW  = 1.42;
const CAM_HALF  = 1.1 * OVERFLOW; // orthographic frustum half-extent ≈ 1.562

// Accent colours per theme
const ACCENT_DARK  = new THREE.Vector3(0.369, 0.416, 0.824); // #5E6AD2
const ACCENT_LIGHT = new THREE.Vector3(0.40,  0.40,  0.45);  // neutral gray

function getAccent() {
  return document.documentElement.getAttribute("data-theme") === "light"
    ? ACCENT_LIGHT : ACCENT_DARK;
}

// ── Vertex shader ─────────────────────────────────────────
const VERT = /* glsl */`
  uniform sampler2D u_map_tex;
  uniform float u_dot_size;
  uniform float u_time_since_hover;
  uniform vec3  u_pointer;
  #define PI 3.14159265359
  varying float vOpacity;
  varying vec2  vUv;

  void main() {
    vUv = uv;

    // land mask: only show dots over land
    float visibility = step(.2, texture2D(u_map_tex, uv).r);
    gl_PointSize = visibility * u_dot_size;

    // depth-based opacity (back dots = dimmer)
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vOpacity = 1.0 / length(mvPosition.xyz) - .7;
    vOpacity = clamp(vOpacity, .04, 1.0);

    // hover ripple (replaces click ripple from original)
    float t    = max(0., u_time_since_hover - .1);
    float dist = 1. - .5 * length(position - u_pointer);
    float damp = 1. / (1. + 20. * t);
    float amp  = .07 * damp * sin(5. * t * (1. + 2. * dist) - PI);
    amp *= 1. - smoothstep(.8, 1., dist);

    vec3 pos = position * (1. + amp);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.);
  }
`;

// ── Fragment shader ───────────────────────────────────────
const FRAG = /* glsl */`
  uniform vec3  u_color;
  varying float vOpacity;

  void main() {
    float d   = length(gl_PointCoord.xy - vec2(.5));
    // Soft alpha falloff — no hard discard, prevents sharp dot edges
    float dot = 1. - smoothstep(.28, .50, d);
    if (dot < 0.01) discard;
    gl_FragColor = vec4(u_color, dot * vOpacity);
  }
`;

interface GlobeProps { size?: number }

export function Globe({ size = 360 }: GlobeProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // ── Renderer ────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);   // fully transparent clear — required for alpha:true
    container.appendChild(renderer.domElement);

    // ── Scene / Camera ──────────────────────────────────────
    const scene  = new THREE.Scene();
    // CAM_HALF expanded so rim spheres (r≤1.22) never hit the frustum edge
    const camera = new THREE.OrthographicCamera(-CAM_HALF, CAM_HALF, CAM_HALF, -CAM_HALF, 0, 3);
    camera.position.z = 1.1;

    // ── OrbitControls ───────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan    = false;
    controls.enableZoom   = false;
    controls.enableDamping = true;
    controls.autoRotate   = true;
    controls.autoRotateSpeed = 0.6;
    controls.minPolarAngle = 0.4 * Math.PI;
    controls.maxPolarAngle = 0.4 * Math.PI;

    // ── Shader material (created before texture loads) ──────
    const material = new THREE.ShaderMaterial({
      vertexShader:   VERT,
      fragmentShader: FRAG,
      uniforms: {
        u_map_tex:         { value: null },
        u_dot_size:        { value: 0 },
        u_color:           { value: getAccent() },
        u_pointer:         { value: new THREE.Vector3(0, 0, 1) },
        u_time_since_hover:{ value: 99 },   // large → no initial ripple
      },
      transparent: true,
      depthWrite:  false,
    });

    // ── Globe geometry ──────────────────────────────────────
    const geo   = new THREE.IcosahedronGeometry(1, 22);
    const globe = new THREE.Points(geo, material);
    scene.add(globe);

    // invisible sphere for raycasting
    const meshMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
    const mesh    = new THREE.Mesh(geo, meshMat);
    scene.add(mesh);

    // ── Sphere behind dots (color adapts to theme) ────────────
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x050508, transparent: true, opacity: 0.88 });
    const bgSphere = new THREE.Mesh(new THREE.SphereGeometry(0.98, 32, 32), bgMat);
    scene.add(bgSphere);

    // ── Atmospheric rim glow (Fresnel shader) ────────────────
    // vNormal.z ≈ 1 at center, ≈ 0 at edges → rim = 1 - |vNormal.z|
    const rimVert = /* glsl */`
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const isLight = () => document.documentElement.getAttribute("data-theme") === "light";

    // Tight bright rim (tight Fresnel, high power)
    const rimFrag1 = /* glsl */`
      varying vec3 vNormal;
      uniform float u_light;
      void main() {
        float rim = 1.0 - abs(vNormal.z);
        float alpha = pow(rim, 3.5) * 0.88;
        vec3  col   = mix(vec3(0.88, 0.93, 1.0), vec3(0.15, 0.15, 0.2), u_light);
        gl_FragColor = vec4(col, alpha);
      }
    `;
    // Mid soft glow
    const rimFrag2 = /* glsl */`
      varying vec3 vNormal;
      uniform float u_light;
      void main() {
        float rim = 1.0 - abs(vNormal.z);
        float alpha = pow(rim, 2.0) * 0.32;
        vec3  col   = mix(vec3(0.55, 0.65, 1.0), vec3(0.2, 0.2, 0.25), u_light);
        gl_FragColor = vec4(col, alpha);
      }
    `;
    // Wide outer atmosphere
    const rimFrag3 = /* glsl */`
      varying vec3 vNormal;
      uniform float u_light;
      void main() {
        float rim = 1.0 - abs(vNormal.z);
        float alpha = pow(rim, 1.3) * 0.12;
        vec3  col   = mix(vec3(0.4, 0.55, 1.0), vec3(0.25, 0.25, 0.3), u_light);
        gl_FragColor = vec4(col, alpha);
      }
    `;

    const rimProps = {
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
    };

    const uLight = { value: isLight() ? 1.0 : 0.0 };

    const rim1 = new THREE.Mesh(
      new THREE.SphereGeometry(1.01, 48, 48),
      new THREE.ShaderMaterial({ vertexShader: rimVert, fragmentShader: rimFrag1, uniforms: { u_light: uLight }, ...rimProps })
    );
    scene.add(rim1);

    const rim2 = new THREE.Mesh(
      new THREE.SphereGeometry(1.10, 48, 48),
      new THREE.ShaderMaterial({ vertexShader: rimVert, fragmentShader: rimFrag2, uniforms: { u_light: uLight }, ...rimProps })
    );
    scene.add(rim2);

    const rim3 = new THREE.Mesh(
      new THREE.SphereGeometry(1.22, 48, 48),
      new THREE.ShaderMaterial({ vertexShader: rimVert, fragmentShader: rimFrag3, uniforms: { u_light: uLight }, ...rimProps })
    );
    scene.add(rim3);

    // ── Load texture ────────────────────────────────────────
    new THREE.TextureLoader().load("/earth-map.png", (tex) => {
      material.uniforms.u_map_tex.value = tex;
      updateSize();
    });

    // ── Interaction ─────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    raycaster.far   = 1.15;
    const mouse     = new THREE.Vector2(-2, -2);
    let   rippleStart  = -99;   // time of last ripple trigger
    let   wasHovering  = false; // prevents re-trigger on every frame

    function updateMouse(clientX: number, clientY: number) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x =  ((clientX - rect.left) / rect.width)  * 2 - 1;
      mouse.y = -((clientY - rect.top)  / rect.height) * 2 + 1;
    }

    function triggerRipple(normal: THREE.Vector3) {
      material.uniforms.u_pointer.value = normal;
      rippleStart = performance.now() / 1000;
    }

    function onMouseMove(e: MouseEvent) {
      updateMouse(e.clientX, e.clientY);
    }

    function onClick(e: MouseEvent) {
      updateMouse(e.clientX, e.clientY);
      const hits = raycaster.intersectObject(mesh);
      if (hits.length) triggerRipple(hits[0].face!.normal.clone());
    }

    renderer.domElement.addEventListener("mousemove", onMouseMove, { passive: true });
    renderer.domElement.addEventListener("click", onClick);

    // ── Resize ──────────────────────────────────────────────
    function updateSize() {
      const s = container?.clientWidth || size * OVERFLOW;
      renderer.setSize(s, s);
      // Divide by OVERFLOW so dots appear the same visual size as in the
      // original 1:1 canvas — the camera is wider but dots stay proportional.
      material.uniforms.u_dot_size.value = (0.036 / OVERFLOW) * s;
    }

    const ro = new ResizeObserver(updateSize);
    ro.observe(container);
    updateSize();

    // ── Render loop ─────────────────────────────────────────
    let rafId = 0;
    function render() {
      rafId = requestAnimationFrame(render);

      // hover: trigger ripple once on enter (not every frame)
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObject(mesh);
      if (hits.length) {
        if (!wasHovering) {
          // first frame over globe → trigger subtle hover ripple
          triggerRipple(hits[0].face!.normal.clone());
          wasHovering = true;
        }
        renderer.domElement.style.cursor = "grab";
      } else {
        wasHovering = false;
        renderer.domElement.style.cursor = "default";
      }
      material.uniforms.u_time_since_hover.value =
        performance.now() / 1000 - rippleStart;

      // sync theme-aware colours each frame (cheap attr read)
      const light = isLight();
      material.uniforms.u_color.value = getAccent();
      uLight.value = light ? 1.0 : 0.0;
      bgMat.color.setHex(light ? 0xf0f0f4 : 0x050508);
      bgMat.opacity = light ? 0.72 : 0.88;

      controls.update();
      renderer.render(scene, camera);
    }
    render();

    // ── Cleanup ─────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      renderer.domElement.removeEventListener("mousemove", onMouseMove);
      renderer.domElement.removeEventListener("click", onClick);
      controls.dispose();
      geo.dispose();
      material.dispose();
      meshMat.dispose();
      bgSphere.geometry.dispose(); bgMat.dispose();
      rim1.geometry.dispose(); (rim1.material as THREE.Material).dispose();
      rim2.geometry.dispose(); (rim2.material as THREE.Material).dispose();
      rim3.geometry.dispose(); (rim3.material as THREE.Material).dispose();
      renderer.dispose();
      container?.removeChild(renderer.domElement);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The canvas render area is OVERFLOW× the logical size so glow
  // has room. Negative half-offset re-centres it in the logical footprint.
  const renderSize = Math.round(size * OVERFLOW);
  const offset     = Math.round((renderSize - size) / 2);

  return (
    <div className="globe" style={{ width: size, height: size }}>
      {/* Three.js canvas — OVERFLOW× larger, centred via negative offset.
          CSS mask creates a radial soft fade so no hard canvas edge is visible. */}
      <div
        ref={mountRef}
        style={{
          width:  renderSize,
          height: renderSize,
          position: "absolute",
          left: -offset,
          top:  -offset,
          // Radial mask: opaque through the globe + full glow, then
          // fades to transparent before the canvas edge — eliminates box feel.
          maskImage:       "radial-gradient(circle closest-side at 50% 50%, black 72%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(circle closest-side at 50% 50%, black 72%, transparent 100%)",
        }}
      />
      {/* CSS rim ring — ABOVE canvas (z-index 1), screen-blends for physical light */}
      <div className="globe-glow" aria-hidden />
    </div>
  );
}
