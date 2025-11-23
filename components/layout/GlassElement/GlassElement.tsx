"use client";

import { CSSProperties, ReactNode, useState, useMemo } from "react";
import {
  getDisplacementFilter,
  DisplacementOptions,
} from "./getDisplacementFilter";

type GlassElementProps = DisplacementOptions & {
  children?: ReactNode;
  blur?: number;
  className?: string;
  styles?: CSSProperties;
};

export const GlassElement = ({
  height,
  width,
  depth: baseDepth,
  radius,
  children,
  strength,
  blur = 2,
  className,
  styles,
}: GlassElementProps) => {
  const isBrowser = typeof window !== "undefined";
  const isMobile = isBrowser ? window.innerWidth < 768 : false;
  const mobileBlur = blur * 0.5; // خفف إلى نصف القيمة
  const mobileDepth = baseDepth * 1;
  const [clicked, setClicked] = useState(false);
  const depth = isMobile ? mobileDepth : baseDepth / (clicked ? 0.7 : 1);

  // نستخدم useMemo لتجنب إعادة توليد الفلتر عند كل إعادة رسم
  const displacementFilter = useMemo(
    () =>
      getDisplacementFilter({
        height,
        width,
        radius,
        depth,
        strength,
      }),
    [height, width, radius, depth, strength]
  );

  const style: CSSProperties = {
    height: `${height}px`,
    width: `${width}px`,
    borderRadius: `${radius}px`,
    // blur خفيف + displacement filter
    backdropFilter: `blur(${
      isMobile ? mobileBlur : blur
    }px) url('${displacementFilter}')`,
    WebkitBackdropFilter: `blur(${blur}px) url('${displacementFilter}')`,
    // تحسين الأداء قليلاً
    willChange: "transform, backdrop-filter",
  };

  return (
    <div
      className={className}
      style={{ ...style, ...styles }}
      onMouseDown={() => setClicked(true)}
      onMouseUp={() => setClicked(false)}
    >
      {children}
    </div>
  );
};
