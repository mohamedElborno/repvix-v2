"use client";

import { CSSProperties, ReactNode, useState, useMemo, useEffect } from "react";
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
  const [isMobile, setIsMobile] = useState(false);
  const [clicked, setClicked] = useState(false);

  // استخدام useEffect لتحديد isMobile بعد hydration
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const mobileBlur = blur * 0.5; // خفف إلى نصف القيمة
  const mobileDepth = baseDepth * 1;
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
    WebkitBackdropFilter: `blur(${isMobile ? mobileBlur : blur}px) url('${displacementFilter}')`,
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
