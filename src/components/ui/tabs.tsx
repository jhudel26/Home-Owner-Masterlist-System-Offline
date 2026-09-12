"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
  size?: "sm" | "md";
}

export function Tabs({ tabs, activeTab, onChange, className, size = "md" }: TabsProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-xl bg-slate-100/90 dark:bg-[#0c182c] p-1 border border-slate-200/80 dark:border-[#1e2f4d] shadow-inner",
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex items-center gap-2 rounded-lg font-medium transition-all duration-200 select-none",
              size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-xs sm:text-sm",
              isActive
                ? "bg-white dark:bg-[#132544] text-slate-900 dark:text-slate-100 shadow-sm font-semibold border border-slate-200/60 dark:border-teal-500/30"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
            )}
          >
            {tab.icon && <span className={cn(isActive ? "text-teal-700 dark:text-teal-400" : "text-slate-400 dark:text-slate-500")}>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  "ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold",
                  isActive
                    ? "bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
