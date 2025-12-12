"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

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
      <Button
        variant="ghost"
        size="icon"
        className="rounded-3xl h-10 w-10 bg-transparent hover:bg-transparent"
        disabled
      >
        <Sun className="h-5 w-5" />
      </Button>
    );
  }

  const isDark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-3xl cursor-pointer h-10 w-10 bg-transparent hover:bg-purple-100/50 dark:hover:bg-purple-900/20 hover:scale-110 active:scale-95 transition-all duration-300 group"
      onClick={toggleTheme}
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="h-5 w-5 text-black dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300" />
      ) : (
        <Moon className="h-5 w-5 text-black dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300" />
      )}
    </Button>
  );
}
