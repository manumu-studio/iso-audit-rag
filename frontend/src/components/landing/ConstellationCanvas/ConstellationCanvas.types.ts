// Shared props and layer/star models for the landing constellation canvas animation.

export interface DepthLayer {
  depth: number;
  pointsPerCluster: number;
  size: number;
  opacity: number;
  radiusXFactor: number;
  radiusYFactor: number;
}

export interface Star {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  size: number;
  opacity: number;
  layer: number;
}

export interface ConstellationCanvasProps {
  className?: string;
}
