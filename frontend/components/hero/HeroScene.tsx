"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

import { HeroFallback } from "./HeroFallback";

const TILE_PALETTES: [string, string][] = [
  ["#00f2fe", "#7c3aed"],
  ["#7c3aed", "#00c2ff"],
  ["#22d3ee", "#4338ca"],
  ["#38bdf8", "#a855f7"],
  ["#06b6d4", "#6d28d9"],
  ["#67e8f9", "#8b5cf6"],
  ["#00c2ff", "#9333ea"],
];

function makeGlowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(0,242,254,0.95)");
    gradient.addColorStop(0.4, "rgba(0,242,254,0.35)");
    gradient.addColorStop(1, "rgba(0,242,254,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function makeTileTexture(colors: [string, string]): THREE.CanvasTexture {
  const w = 128;
  const h = 88;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, w, h);
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(1, colors[1]);
    ctx.fillStyle = grad;
    roundRectPath(ctx, 2, 2, w - 4, h - 4, 16);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w - 22, 22, 8, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Vanilla three.js hero centerpiece: an extruded gem/shield with a glowing
 * core, orbited by procedurally-textured "artwork tiles" that flash cyan
 * when a sweeping scan ring passes them. See the design brief for the full
 * interaction/performance contract (parallax tilt, hover, drag, pausing,
 * reduced motion, disposal).
 */
export function HeroScene({ className = "" }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setSupported(false);
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0.35, 6.4);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);

    const setSize = () => {
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    setSize();

    // ---- lighting ----
    // decay: 0 keeps these as stylized, non-physically-attenuated point lights so a
    // modest intensity still reaches the gem a few units away instead of reading as
    // near-black under physically-correct inverse-square falloff.
    scene.add(new THREE.AmbientLight(0x93a8d9, 1.1));
    const cyanLight = new THREE.PointLight(0x00f2fe, 2.6, 16, 0);
    cyanLight.position.set(-3, 2, 3);
    scene.add(cyanLight);
    const violetLight = new THREE.PointLight(0x7c3aed, 2.4, 16, 0);
    violetLight.position.set(3, -1.5, 2.5);
    scene.add(violetLight);
    const rimLight = new THREE.DirectionalLight(0xdbeeff, 1.4);
    rimLight.position.set(-2, 3, -4);
    scene.add(rimLight);

    // ---- groups: parallax (whole scene tilt) > centerpiece (auto + drag rotation) ----
    const parallaxGroup = new THREE.Group();
    scene.add(parallaxGroup);
    const centerGroup = new THREE.Group();
    parallaxGroup.add(centerGroup);

    // ---- centerpiece: extruded hex-shield gem ----
    const shape = new THREE.Shape();
    shape.moveTo(0, 1.15);
    shape.lineTo(0.95, 0.62);
    shape.lineTo(0.95, -0.55);
    shape.lineTo(0, -1.2);
    shape.lineTo(-0.95, -0.55);
    shape.lineTo(-0.95, 0.62);
    shape.lineTo(0, 1.15);

    const gemGeometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.42,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.06,
      bevelSegments: 4,
      curveSegments: 3,
    });
    gemGeometry.center();

    const gemMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x2a7fa8,
      metalness: 0.5,
      roughness: 0.28,
      clearcoat: 1,
      clearcoatRoughness: 0.15,
      iridescence: 0.55,
      iridescenceIOR: 1.3,
      reflectivity: 0.7,
      emissive: 0x0a3d52,
      emissiveIntensity: 0.6,
    });
    const gem = new THREE.Mesh(gemGeometry, gemMaterial);
    centerGroup.add(gem);

    const edgesGeometry = new THREE.EdgesGeometry(gemGeometry, 25);
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0x8be9ff,
      transparent: true,
      opacity: 0.85,
      toneMapped: false,
    });
    const edgeLines = new THREE.LineSegments(edgesGeometry, edgeMaterial);
    centerGroup.add(edgeLines);

    const coreGeometry = new THREE.IcosahedronGeometry(0.32, 1);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      transparent: true,
      opacity: 0.9,
      toneMapped: false,
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    centerGroup.add(core);

    const glowTexture = makeGlowTexture();
    const glowMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0x00f2fe,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const glowSprite = new THREE.Sprite(glowMaterial);
    glowSprite.scale.set(4.4, 4.4, 1);
    glowSprite.position.z = -0.35;
    centerGroup.add(glowSprite);

    // ---- scan ring ----
    const ringGeometry = new THREE.TorusGeometry(1.7, 0.02, 12, 96);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    parallaxGroup.add(ring);

    // ---- orbiting artwork tiles ----
    const tileCount = 7;
    const tileGeometry = new THREE.PlaneGeometry(0.62, 0.42);
    const tiles = Array.from({ length: tileCount }, (_, i) => {
      const texture = makeTileTexture(TILE_PALETTES[i % TILE_PALETTES.length]);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        color: 0xffffff,
        toneMapped: false,
      });
      const mesh = new THREE.Mesh(tileGeometry, material);
      parallaxGroup.add(mesh);
      return {
        mesh,
        material,
        angle: (i / tileCount) * Math.PI * 2,
        radius: 2.5 + (i % 2) * 0.3,
        yOffset: i * 0.7,
        speed: 0.15 + (i % 3) * 0.04,
        hoverScale: 1,
      };
    });

    // ---- pointer / drag interaction state ----
    const pointerNDC = new THREE.Vector2(2, 2); // start off-screen so nothing is "hovered" at rest
    const parallaxTarget = { x: 0, y: 0 };
    let dragging = false;
    let lastPointer = { x: 0, y: 0 };
    const dragRotation = { x: 0, y: 0 };
    let autoYaw = 0;
    const raycaster = new THREE.Raycaster();

    const onPointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      pointerNDC.set(nx, -ny);
      parallaxTarget.x = ny * 0.18;
      parallaxTarget.y = nx * 0.28;

      if (dragging) {
        const dx = event.clientX - lastPointer.x;
        const dy = event.clientY - lastPointer.y;
        dragRotation.y += dx * 0.006;
        dragRotation.x = THREE.MathUtils.clamp(dragRotation.x + dy * 0.006, -0.6, 0.6);
        lastPointer = { x: event.clientX, y: event.clientY };
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      dragging = true;
      lastPointer = { x: event.clientX, y: event.clientY };
    };
    const endDrag = () => {
      dragging = false;
    };
    const onPointerLeave = () => {
      pointerNDC.set(2, 2);
      parallaxTarget.x = 0;
      parallaxTarget.y = 0;
    };

    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);

    // ---- resize handling ----
    const resizeObserver = new ResizeObserver(() => setSize());
    resizeObserver.observe(container);

    // ---- pause when off-screen or tab hidden ----
    let isIntersecting = true;
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        isIntersecting = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.05 },
    );
    intersectionObserver.observe(container);

    const clock = new THREE.Clock();
    let rafId = 0;

    if (prefersReducedMotion) {
      renderer.render(scene, camera);
    } else {
      const animate = () => {
        rafId = requestAnimationFrame(animate);
        if (!isIntersecting || document.hidden) return;

        const dt = Math.min(clock.getDelta(), 0.05);
        const t = clock.elapsedTime;

        parallaxGroup.rotation.x += (parallaxTarget.x - parallaxGroup.rotation.x) * 0.06;
        parallaxGroup.rotation.y += (parallaxTarget.y - parallaxGroup.rotation.y) * 0.06;

        autoYaw += dt * 0.35;
        centerGroup.rotation.y = autoYaw + dragRotation.y;
        centerGroup.rotation.x = THREE.MathUtils.lerp(centerGroup.rotation.x, dragRotation.x, 0.12);
        core.rotation.y -= dt * 0.6;
        core.rotation.x += dt * 0.3;
        core.scale.setScalar(1 + Math.sin(t * 2) * 0.06);

        ring.position.y = Math.sin(t * 0.6) * 1.3;
        ring.rotation.z += dt * 0.15;

        raycaster.setFromCamera(pointerNDC, camera);
        const hovered = new Set(raycaster.intersectObjects(tiles.map((tile) => tile.mesh)).map((hit) => hit.object));

        for (const tile of tiles) {
          tile.angle += dt * tile.speed;
          const bob = Math.sin(t * 0.8 + tile.yOffset) * 0.35;
          tile.mesh.position.set(Math.cos(tile.angle) * tile.radius, bob, Math.sin(tile.angle) * tile.radius);
          tile.mesh.lookAt(camera.position);

          const isHovered = hovered.has(tile.mesh);
          tile.hoverScale = THREE.MathUtils.lerp(tile.hoverScale, isHovered ? 1.35 : 1, 0.15);
          tile.mesh.scale.setScalar(tile.hoverScale);

          const distanceToRing = Math.abs(tile.mesh.position.y - ring.position.y);
          const flash = distanceToRing < 0.45 ? 1 - distanceToRing / 0.45 : 0;
          tile.material.color.setRGB(1, 1, 1).lerp(new THREE.Color(0x00f2fe), flash * 0.85);
        }

        renderer.render(scene, camera);
      };
      rafId = requestAnimationFrame(animate);
    }

    return () => {
      cancelAnimationFrame(rafId);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();

      gemGeometry.dispose();
      gemMaterial.dispose();
      edgesGeometry.dispose();
      edgeMaterial.dispose();
      coreGeometry.dispose();
      coreMaterial.dispose();
      glowTexture.dispose();
      glowMaterial.dispose();
      ringGeometry.dispose();
      ringMaterial.dispose();
      tileGeometry.dispose();
      for (const tile of tiles) {
        tile.material.map?.dispose();
        tile.material.dispose();
      }
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  if (!supported) {
    return <HeroFallback className={className} />;
  }

  return <div ref={containerRef} className={`h-full w-full ${className}`} aria-hidden="true" />;
}
