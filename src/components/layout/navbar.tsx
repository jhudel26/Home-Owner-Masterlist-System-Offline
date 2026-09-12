"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/app-context";
import { Shield, Calendar } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function Navbar() {
  const { currentUser } = useApp();

  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    const now = new Date();
    setCurrentDate(
      now.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    );
  }, []);

  return (
    <header className="hidden lg:flex items-center justify-between h-16 px-8 border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-[#07162c]/90 backdrop-blur-md sticky top-0 z-20 shadow-xs transition-colors duration-200">
      {/* Left: Date & Portal Badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <Calendar className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
          <span>{currentDate}</span>
        </div>
        <span className="text-slate-300 dark:text-slate-700">&bull;</span>
        <span className="text-xs font-bold text-teal-900 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-3 py-1 rounded-full border border-teal-200/80 dark:border-teal-800/60 shadow-xs">
          St. Joseph Village 6 Phase 4
        </span>
      </div>

      {/* Right: Theme toggle + User info */}
      <div className="flex items-center gap-3.5">
        <ThemeToggle />

        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200 dark:border-slate-800">
          <div className="h-8 w-8 rounded-xl bg-[#07162c] dark:bg-[#0c2340] text-teal-300 font-bold flex items-center justify-center text-xs shadow-xs border border-teal-500/20">
            {currentUser?.full_name?.charAt(0) || "U"}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
              {currentUser?.full_name || "Board Officer"}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize flex items-center gap-1">
              <Shield className="h-3 w-3 text-teal-600 dark:text-teal-400" />
              {currentUser?.role?.replace("_", " ") || "Guest"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
