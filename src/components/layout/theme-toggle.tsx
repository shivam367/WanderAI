
// src/components/layout/theme-toggle.tsx
"use client";

import * as React from "react";
import { Moon, Sun, Laptop } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Theme = "light" | "dark" | "system";

export function ThemeToggle() {
  const [theme, setThemeState] = React.useState<Theme>("system");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const storedTheme = localStorage.getItem("wanderai-theme") as Theme | null;
    if (storedTheme) {
      setThemeState(storedTheme);
    } else {
      setThemeState("system");
    }
  }, []);

  React.useEffect(() => {
    if (!mounted) return;

    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
      localStorage.setItem("wanderai-theme", "system");
      return;
    }

    root.classList.add(theme);
    localStorage.setItem("wanderai-theme", theme);
  }, [theme, mounted]);

  // Listener for system theme changes
  React.useEffect(() => {
    if (!mounted || theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const systemTheme = mediaQuery.matches ? "dark" : "light";
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(systemTheme);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, mounted]);


  if (!mounted) {
    // Render a placeholder or null until mounted to avoid hydration mismatch
    return (
        <Button variant="outline" size="icon" disabled>
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
        </Button>
    );
  }

  const CurrentIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Laptop;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className={`h-[1.2rem] w-[1.2rem] transition-all ${theme === 'light' && mounted ? 'rotate-0 scale-100' : 'rotate-90 scale-0'}`} />
          <Moon className={`absolute h-[1.2rem] w-[1.2rem] transition-all ${theme === 'dark' && mounted ? 'rotate-0 scale-100' : 'rotate-90 scale-0'}`} />
          <Laptop className={`absolute h-[1.2rem] w-[1.2rem] transition-all ${theme === 'system' && mounted ? 'rotate-0 scale-100' : 'rotate-90 scale-0'}`} />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setThemeState("light")}>
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setThemeState("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setThemeState("system")}>
          <Laptop className="mr-2 h-4 w-4" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
