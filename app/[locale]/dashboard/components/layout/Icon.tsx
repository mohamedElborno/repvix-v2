import Image from "next/image";
import React from "react";

export default function Icon() {
  return (
    <div>
      <Image
        src="/3.png"
        alt="Icon"
        width={500}
        height={500}
        className="h-10 w-auto dark:invert shrink-0 transition-opacity ease-in-out duration-400 delay-100"
      />
    </div>
  );
}
