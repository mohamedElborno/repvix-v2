"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { GlassElement } from "./GlassElement/GlassElement";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    if (theme === "dark") {
      setTheme("light");
    } else {
      setTheme("dark");
    }
  };

  if (!mounted) {
    return (
      <GlassElement
        className="flex items-center justify-center transition-all duration-300 aspect-square"
        styles={{
          background: "rgba(99, 99, 99, 0.089)",
          boxShadow: "inset 0 0 4px 0px rgba(255, 255, 255, 0.192)",
        }}
        height={55}
        width={55}
        radius={999}
        depth={2}
      >
        <Button
          className="flex items-center justify-center bg-transparent hover:bg-transparent my-0 py-0 px-0 h-full w-full cursor-pointer aspect-square rounded-full"
          disabled
        >
          <Sun
            size={16}
            className="shrink-0 w-4 h-4 text-white/80 rounded-full"
            style={{
              boxShadow: "0 0 8px 4px rgba(255, 255, 255, 0.192)",
            }}
          />
        </Button>
      </GlassElement>
    );
  }

  const isDark = theme === "dark";

  return (
    <GlassElement
      className="flex items-center justify-center transition-all duration-300 hover:scale-[0.96] active:scale-90 aspect-square"
      styles={{
        background: "rgba(99, 99, 99, 0.089)",
        boxShadow: "inset 0 0 4px 0px rgba(255, 255, 255, 0.192)",
      }}
      height={55}
      width={55}
      radius={999}
      depth={2}
    >
      <Button
        className="flex items-center justify-center bg-transparent hover:bg-transparent my-0 py-0 px-0 h-full w-full cursor-pointer active:scale-95 transition-transform duration-150 ease-out group aspect-square rounded-full"
        onClick={toggleTheme}
        aria-label="Toggle theme"
      >
        {/* Theme Icon */}
        {isDark ? (
          <Sun
            size={16}
            className="shrink-0 w-4 h-4 text-white/80 rounded-full group-hover:text-white transition-colors duration-300 drop-shadow-[0_0_4px_rgba(168,85,247,0.3)]"
            style={{
              boxShadow: "0 0 8px 4px rgba(255, 255, 255, 0.192)",
            }}
          />
        ) : (
          <Moon
            size={16}
            className="shrink-0 w-4 h-4 text-black/80 rounded-full group-hover:text-black transition-colors duration-300 drop-shadow-[0_0_4px_rgba(168,85,247,0.3)]"
            style={{
              boxShadow: "0 0 8px 4px rgba(255, 255, 255, 0.192)",
            }}
          />
        )}

        {/* Animated gradient border */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/20 via-transparent to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

        {/* Glow effect */}
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.1)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      </Button>
    </GlassElement>
  );
}
