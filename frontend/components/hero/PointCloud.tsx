"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

import { HeroFallback } from "./HeroFallback";

// Same-origin on purpose: the pixels are read back from a canvas, which a cross-origin image would taint.
const ARTWORK = "/demo/cybernetic-horizon.png";
const COLUMNS = 150;
const ROWS = 100;
const WIDTH = 34;
const HEIGHT = (WIDTH * ROWS) / COLUMNS;
const RELIEF = 4.5;
const SIGNAL = new THREE.Color("#ff5a1f");

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uScan;
  uniform float uSize;
  attribute vec3 aColor;
  attribute float aLuma;
  varying vec3 vColor;
  varying float vGlow;
  varying float vLuma;

  void main() {
    vec3 p = position;
    p.z += sin(p.x * 0.35 + uTime * 0.8) * 0.3 + cos(p.y * 0.45 + uTime * 0.6) * 0.22;
    float band = 1.0 - smoothstep(0.0, 1.4, abs(p.y - uScan));
    p.z += band * 1.4;
    vGlow = band;
    vColor = aColor;
    vLuma = aLuma;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * (0.6 + aLuma * 0.9 + band * 0.9) * (40.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uSignal;
  varying vec3 vColor;
  varying float vGlow;
  varying float vLuma;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = dot(c, c);
    if (d > 0.25) discard;
    vec3 color = mix(vColor, uSignal, vGlow * 0.85);
    float alpha = (1.0 - d * 3.2) * (0.45 + vLuma * 0.55 + vGlow * 0.5);
    gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
  }
`;

async function sampleArtwork(): Promise<{ positions: Float32Array; colors: Float32Array; luma: Float32Array }> {
  const image = new Image();
  image.src = ARTWORK;
  await image.decode();

  const canvas = document.createElement("canvas");
  canvas.width = COLUMNS;
  canvas.height = ROWS;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("2D canvas unavailable");
  context.drawImage(image, 0, 0, COLUMNS, ROWS);
  const { data } = context.getImageData(0, 0, COLUMNS, ROWS);

  const count = COLUMNS * ROWS;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const luma = new Float32Array(count);
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLUMNS; col += 1) {
      const index = row * COLUMNS + col;
      const r = data[index * 4] / 255;
      const g = data[index * 4 + 1] / 255;
      const b = data[index * 4 + 2] / 255;
      const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      positions[index * 3] = (col / (COLUMNS - 1) - 0.5) * WIDTH;
      positions[index * 3 + 1] = (0.5 - row / (ROWS - 1)) * HEIGHT;
      positions[index * 3 + 2] = brightness * RELIEF;
      // Mostly paper-white, with a trace of the artwork's own hue.
      const lift = 0.35 + brightness * 0.65;
      colors[index * 3] = (brightness * 0.7 + r * 0.3) * lift + 0.15;
      colors[index * 3 + 1] = (brightness * 0.7 + g * 0.3) * lift + 0.15;
      colors[index * 3 + 2] = (brightness * 0.7 + b * 0.3) * lift + 0.15;
      luma[index] = brightness;
    }
  }
  return { positions, colors, luma };
}

/**
 * The registered artwork as a field of points in relief, crossed by the agent's orange scan band.
 * Pauses off-screen and in hidden tabs, draws a single still frame for reduced motion, and falls
 * back to a CSS dot matrix when WebGL is unavailable.
 */
export function PointCloud() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let disposed = false;
    let frame = 0;
    let onScreen = true;
    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "low-power" });
    } catch {
      setFailed(true);
      return;
    }
    const pixelRatio = Math.min(window.devicePixelRatio, 1.5);
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(0x000000, 0);
    const canvas = renderer.domElement;
    canvas.style.display = "block";
    container.appendChild(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
    camera.position.set(0, 0, 40);
    const group = new THREE.Group();
    scene.add(group);

    const geometry = new THREE.BufferGeometry();
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uScan: { value: HEIGHT },
        // Point sizes are in device pixels, so scale them with the pixel ratio.
        uSize: { value: 3 * pixelRatio },
        uSignal: { value: SIGNAL },
      },
    });
    const points = new THREE.Points(geometry, material);
    group.add(points);

    const pointer = { x: 0, y: 0 };
    const startedAt = performance.now();

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      renderer.setSize(width, height, false);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      camera.aspect = width / height;
      // Keep the whole artwork in view on narrow screens.
      camera.position.z = width / height < 1.2 ? 52 : 40;
      camera.updateProjectionMatrix();
      if (reducedMotion) renderer.render(scene, camera);
    };

    const tick = () => {
      frame = 0;
      if (disposed || !onScreen || document.hidden) return;
      const elapsed = (performance.now() - startedAt) / 1000;
      material.uniforms.uTime.value = elapsed;
      material.uniforms.uScan.value = Math.sin(elapsed * 0.45) * (HEIGHT / 2 + 1.5);
      group.rotation.y += (pointer.x * 0.28 + Math.sin(elapsed * 0.12) * 0.08 - group.rotation.y) * 0.05;
      group.rotation.x += (-pointer.y * 0.16 - 0.12 - group.rotation.x) * 0.05;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (!reducedMotion && !frame && !disposed) frame = requestAnimationFrame(tick);
    };

    const onPointerMove = (event: PointerEvent) => {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
    };

    const onVisibility = () => {
      if (!document.hidden) start();
    };

    const onContextLost = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(frame);
      frame = 0;
    };

    const onContextRestored = () => {
      resize();
      if (reducedMotion) renderer.render(scene, camera);
      else start();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    const intersection = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) start();
    });
    intersection.observe(container);
    document.addEventListener("visibilitychange", onVisibility);
    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", onContextRestored);
    if (!reducedMotion) window.addEventListener("pointermove", onPointerMove, { passive: true });

    sampleArtwork()
      .then(({ positions, colors, luma }) => {
        if (disposed) return;
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute("aLuma", new THREE.BufferAttribute(luma, 1));
        geometry.computeBoundingSphere();
        resize();
        if (reducedMotion) {
          material.uniforms.uScan.value = HEIGHT * 0.12;
          group.rotation.set(-0.12, 0.1, 0);
          renderer.render(scene, camera);
        } else {
          start();
        }
      })
      .catch(() => {
        if (!disposed) setFailed(true);
      });

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0" aria-hidden="true">
      {failed && <HeroFallback />}
    </div>
  );
}
