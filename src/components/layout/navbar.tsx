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
    <header className="hidden lg:flex items-center justify-between h-20 min-h-[5rem] px-8 border-b border-slate-200/90 dark:border-white/10 bg-white/80 dark:bg-[#070d18]/80 backdrop-blur-xl sticky top-0 z-20 shadow-xs transition-colors duration-200">
      {/* Left: Date & Community Identifier */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <Calendar className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
          <span>{currentDate}</span>
        </div>
        <span className="text-slate-300 dark:text-slate-700">&bull;</span>
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50/90 dark:bg-emerald-950/60 px-3.5 py-1.5 rounded-full border border-emerald-200/90 dark:border-emerald-800/70 shadow-xs">
          <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Residential Masterlist</span>
        </div>
      </div>

      {/* Right: Theme toggle + User Profile summary */}
      <div className="flex items-center gap-4">
        <ThemeToggle />

        <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-800">
          <div className="h-10 w-10 rounded-2xl bg-emerald-700/20 text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center text-sm shadow-xs border border-emerald-500/30 shrink-0">
            {currentUser?.full_name?.charAt(0) || "U"}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              {currentUser?.full_name || "Board Officer"}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 capitalize flex items-center gap-1 mt-0.5">
              <Shield className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              {currentUser?.role?.replace("_", " ") || "Authorized"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
