// RAF-driven constellation canvas: rhombus-masked radial burst (calibre.ac-style), parallax, optional motion.

"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";

import type { DepthLayer, Star } from "./ConstellationCanvas.types";

const LAYERS: readonly DepthLayer[] = [
  {
    depth: 60,
    pointsPerCluster: 8,
    size: 2.0,
    opacity: 0.5,
    radiusXFactor: 1.5,
    radiusYFactor: 0.9,
  },
  {
    depth: 80,
    pointsPerCluster: 6,
    size: 2.5,
    opacity: 0.35,
    radiusXFactor: 1.7,
    radiusYFactor: 1.0,
  },
  {
    depth: 90,
    pointsPerCluster: 5,
    size: 1.8,
    opacity: 0.25,
    radiusXFactor: 1.5,
    radiusYFactor: 0.9,
  },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Desktop ~1k points (~4k fewer than the prior 5k pass); mobile scaled for the same visual density ratio. */
const STAR_TARGET_DESKTOP = 1000;
const STAR_TARGET_MOBILE = 360;

/**
 * Calibre-style field: axis-aligned rhombus (|Δx|/rx + |Δy|/ry ≤ 1) centered on the hero,
 * filled via radial “arms” so dots form diamond silhouette + streaky rays (not quadrant blobs).
 */
function buildStars(cssWidth: number, cssHeight: number): Star[] {
  const P = Math.min(cssWidth, cssHeight);
  const shortestSide = Math.min(cssWidth, cssHeight);
  const target =
    cssWidth > 0 && cssHeight > 0
      ? shortestSide < 640
        ? STAR_TARGET_MOBILE
        : STAR_TARGET_DESKTOP
      : STAR_TARGET_MOBILE;

  const cx = cssWidth * 0.5;
  const cy = cssHeight * 0.5;
  // Wider than tall: horizontal span dominates (matches calibre.ac diamond behind headline).
  const rx = cssWidth * 0.48;
  const ry = cssHeight * 0.36;

  const arms = clamp(Math.round(Math.sqrt(target) * 1.35), 36, 120);
  const stars: Star[] = [];
  let seq = 0;

  while (stars.length < target) {
    const layerIndex = stars.length % LAYERS.length;
    const layer = LAYERS[layerIndex];
    if (!layer) break;

    const arm = seq % arms;
    seq += 1;

    const slice = (Math.PI * 2) / arms;
    const baseTheta = arm * slice;
    const theta = baseTheta + (Math.random() - 0.5) * slice * 0.65;

    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const denom = Math.abs(cosT) / rx + Math.abs(sinT) / ry;
    const sMax = denom > 1e-10 ? 1 / denom : Math.max(rx, ry);

    // Dense core, softer toward diamond rim (firework density falloff).
    const radial = Math.pow(Math.random(), 0.5);
    const s = radial * sMax * (0.82 + Math.random() * 0.16);

    let bx = cx + s * cosT;
    let by = cy + s * sinT;

    const perpScale = P * 0.022;
    bx += -sinT * (Math.random() - 0.5) * perpScale;
    by += cosT * (Math.random() - 0.5) * perpScale;

    const nx = Math.abs(bx - cx) / rx;
    const ny = Math.abs(by - cy) / ry;
    if (nx + ny > 1.02) {
      continue;
    }

    stars.push({
      x: bx,
      y: by,
      baseX: bx,
      baseY: by,
      size: layer.size,
      opacity: layer.opacity,
      layer: layerIndex,
    });
  }

  return stars;
}

function project(
  baseX: number,
  baseY: number,
  depth: number,
  centerX: number,
  centerY: number,
  parallaxX: number,
  parallaxY: number,
  driftX: number,
  driftY: number,
): { x: number; y: number } {
  const k = 100 / depth;
  const wx = baseX + parallaxX + driftX;
  const wy = baseY + parallaxY + driftY;
  return {
    x: (wx - centerX) * k + centerX,
    y: (wy - centerY) * k + centerY,
  };
}

type ProjectedStar = { x: number; y: number; star: Star };

export function useConstellationCanvas(canvasRef: RefObject<HTMLCanvasElement | null>): void {
  const starsRef = useRef<Star[]>([]);
  const reducedMotionRef = useRef(false);
  const parallaxRef = useRef({ x: 0, y: 0 });
  const mouseTargetRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | undefined>(undefined);
  const startRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return undefined;
    }

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");

    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    let cssW = 1;
    let cssH = 1;
    let dpr = 1;

    const renderScene = (now: number) => {
      if (startRef.current === undefined) {
        startRef.current = now;
      }
      const elapsed = now - startRef.current;
      const reveal = reducedMotionRef.current ? 1 : Math.min(1, elapsed / 900);
      const drawGate = reveal > 0.9 ? 1 : reveal / 0.9;

      const centerX = cssW / 2;
      const centerY = cssH / 2;

      const target = mouseTargetRef.current;
      parallaxRef.current = {
        x:
          parallaxRef.current.x +
          (target.x - parallaxRef.current.x) * (reducedMotionRef.current ? 1 : 0.035),
        y:
          parallaxRef.current.y +
          (target.y - parallaxRef.current.y) * (reducedMotionRef.current ? 1 : 0.035),
      };

      const px = reducedMotionRef.current ? 0 : parallaxRef.current.x;
      const py = reducedMotionRef.current ? 0 : parallaxRef.current.y;

      const time = reducedMotionRef.current ? 0 : now;
      const driftAmp = 0.35;

      ctx.clearRect(0, 0, cssW, cssH);

      const stars = starsRef.current;
      const projected: ProjectedStar[] = [];

      for (const star of stars) {
        const layerCfg = LAYERS[star.layer];
        if (!layerCfg) continue;
        const driftX =
          Math.sin(time * 0.00012 + star.baseX * 0.002 + star.baseY * 0.0015) * driftAmp;
        const driftY =
          Math.cos(time * 0.0001 + star.baseY * 0.002 + star.baseX * 0.0012) * driftAmp;
        const { x, y } = project(
          star.baseX,
          star.baseY,
          layerCfg.depth,
          centerX,
          centerY,
          px,
          py,
          driftX,
          driftY,
        );
        projected.push({ x, y, star });
      }

      for (const { x, y, star } of projected) {
        const layerCfg = LAYERS[star.layer];
        if (!layerCfg) continue;
        const alpha = star.opacity * drawGate;
        ctx.fillStyle = `rgba(227, 242, 255, ${alpha})`;
        ctx.strokeStyle = `rgba(227, 242, 255, ${alpha * 0.1})`;
        ctx.beginPath();
        ctx.arc(x, y, star.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    };

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      cssW = Math.max(1, rect.width);
      cssH = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio ?? 1, 2);
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      starsRef.current = buildStars(cssW, cssH);
      if (reducedMotionRef.current) {
        renderScene(performance.now());
      }
    };

    const scheduleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resizeTimer = undefined;
        resize();
      }, 120);
    };

    reducedMotionRef.current = mq.matches;
    resize();

    const ro = new ResizeObserver(scheduleResize);
    ro.observe(canvas.parentElement ?? canvas);

    const onMove = (ev: MouseEvent) => {
      if (reducedMotionRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const nx = ((ev.clientX - rect.left) / cssW) * 2 - 1;
      const ny = ((ev.clientY - rect.top) / cssH) * 2 - 1;
      mouseTargetRef.current = {
        x: clamp(nx, -1, 1) * 0.12 * cssW,
        y: clamp(ny, -1, 1) * 0.12 * cssH,
      };
    };

    const onLeave = () => {
      mouseTargetRef.current = { x: 0, y: 0 };
    };

    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);

    const tick = (now: number) => {
      renderScene(now);
      if (!reducedMotionRef.current) {
        rafRef.current = window.requestAnimationFrame(tick);
      }
    };

    const kick = () => {
      startRef.current = undefined;
      if (rafRef.current !== undefined) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = undefined;
      }
      reducedMotionRef.current = mq.matches;
      if (reducedMotionRef.current) {
        renderScene(performance.now());
      } else {
        rafRef.current = window.requestAnimationFrame(tick);
      }
    };

    kick();

    const onMqChange = () => {
      kick();
    };

    mq.addEventListener("change", onMqChange);

    return () => {
      mq.removeEventListener("change", onMqChange);
      ro.disconnect();
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
      if (resizeTimer) clearTimeout(resizeTimer);
      if (rafRef.current !== undefined) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [canvasRef]);
}
