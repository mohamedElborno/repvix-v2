// getDisplacementMap.ts
import { DisplacementOptions } from "./getDisplacementFilter";

export const getDisplacementMap = ({
  height,
  width,
  radius,
  depth,
}: Omit<DisplacementOptions, "chromaticAberration" | "strength">) =>
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Gradients to produce edge distortion -->
    <linearGradient id="X" x1="0" x2="100%" y1="0" y2="0">
      <stop offset="0%" stop-color="#FF0000"/>
      <stop offset="50%" stop-color="#808080"/>
      <stop offset="100%" stop-color="#FF0000"/>
    </linearGradient>
    <linearGradient id="Y" x1="0" x2="0" y1="0" y2="100%">
      <stop offset="0%" stop-color="#FF0000"/>
      <stop offset="50%" stop-color="#808080"/>
      <stop offset="100%" stop-color="#FF0000"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="#808080"/>
  <g filter="blur(${depth}px)">
    <rect width="${width}" height="${height}" fill="url(#X)"/>
    <rect width="${width}" height="${height}" fill="url(#Y)"/>
    <rect x="${depth}" y="${depth}" width="${width - 2 * depth}" height="${
    height - 2 * depth
  }" rx="${radius}" ry="${radius}" fill="#808080"/>
  </g>
</svg>
`);
