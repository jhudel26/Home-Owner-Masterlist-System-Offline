"use client";

import React, { useEffect, useState } from "react";
import { useApp } from "@/context/app-context";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useApp();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn("h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 animate-pulse", className)} />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={cn(
        "relative flex items-center justify-center rounded-xl p-2 text-xs font-semibold transition-all duration-200 select-none",
        "border border-slate-200 dark:border-slate-800",
        "bg-white dark:bg-[#0c182c]",
        "text-slate-600 dark:text-slate-300",
        "hover:bg-slate-100 dark:hover:bg-[#13233f] hover:text-slate-900 dark:hover:text-white",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shadow-xs",
        showLabel && "px-3 gap-2",
        className
      )}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-400 transition-transform duration-300 rotate-0 scale-100" />
      ) : (
        <Moon className="h-4 w-4 text-slate-600 transition-transform duration-300 rotate-0 scale-100" />
      )}
      {showLabel && (
        <span className="text-xs font-medium">
          {isDark ? "Light Mode" : "Dark Mode"}
        </span>
      )}
    </button>
  );
}

