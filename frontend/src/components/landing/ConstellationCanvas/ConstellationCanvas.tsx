// Full-viewport decorative constellation canvas for the landing hero background.

"use client";

import { useRef } from "react";

import type { ConstellationCanvasProps } from "./ConstellationCanvas.types";
import { useConstellationCanvas } from "./useConstellationCanvas";

export function ConstellationCanvas({ className }: ConstellationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useConstellationCanvas(canvasRef);

  const baseClass =
    "pointer-events-auto absolute left-0 top-0 z-[1] h-screen w-full max-w-none";

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={className ? `${baseClass} ${className}` : baseClass}
    />
  );
}
