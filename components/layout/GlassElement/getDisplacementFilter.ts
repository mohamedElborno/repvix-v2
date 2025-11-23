// getDisplacementFilter.ts
import { getDisplacementMap } from "./getDisplacementMap";

export type DisplacementOptions = {
  height: number;
  width: number;
  radius: number;
  depth: number;
  strength?: number;
  chromaticAberration?: number; // نخليها اختيارية لكن لن نستخدمها
};

export const getDisplacementFilter = ({
  height,
  width,
  radius,
  depth,
  strength = 30, // قوة الانكسار
}: DisplacementOptions) =>
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="displace" color-interpolation-filters="sRGB">
      <feImage x="0" y="0" width="${width}" height="${height}" href="${getDisplacementMap(
    {
      height,
      width,
      radius,
      depth,
    }
  )}" result="dispMap"/>
      <feDisplacementMap in="SourceGraphic" in2="dispMap" scale="${strength}" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  </defs>
</svg>
`) +
  "#displace";
