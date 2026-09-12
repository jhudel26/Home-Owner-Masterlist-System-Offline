"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/app-context";
import { Shield, Calendar, Activity } from "lucide-react";
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
    <header className="hidden lg:flex items-center justify-between h-16 px-8 border-b border-slate-200/90 dark:border-white/10 bg-white/80 dark:bg-[#070d18]/80 backdrop-blur-xl sticky top-0 z-20 shadow-xs transition-colors duration-200">
      {/* Left: Date & Live Community Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <Calendar className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
          <span>{currentDate}</span>
        </div>
        <span className="text-slate-300 dark:text-slate-700">&bull;</span>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/50 px-3 py-1 rounded-full border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          St. Joseph Village 6 Phase 4 HOA
        </span>
      </div>

      {/* Right: Theme toggle + User Profile summary */}
      <div className="flex items-center gap-3.5">
        <ThemeToggle />

        <div className="flex items-center gap-2.5 pl-3.5 border-l border-slate-200 dark:border-slate-800">
          <div className="h-8 w-8 rounded-full bg-emerald-700/20 text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center text-xs shadow-xs border border-emerald-500/30">
            {currentUser?.full_name?.charAt(0) || "U"}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
              {currentUser?.full_name || "Board Officer"}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize flex items-center gap-1">
              <Shield className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              {currentUser?.role?.replace("_", " ") || "Authorized"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
