import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: "teal" | "emerald" | "navy" | "gold" | "slate";
  progressPercent?: number;
  badgeText?: string;
}

export const StatCard = React.memo(function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "teal",
  progressPercent,
  badgeText,
}: StatCardProps) {
  const iconVariants = {
    teal: "bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200/80 dark:border-teal-800/60 shadow-sm",
    emerald: "bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200/80 dark:border-teal-800/60 shadow-sm",
    navy: "bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200/80 dark:border-teal-800/60 shadow-sm",
    gold: "bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-200/80 dark:border-teal-800/60 shadow-sm",
    slate: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 shadow-sm",
  };

  const barVariants = {
    teal: "bg-gradient-to-r from-slate-600 dark:from-slate-900 to-teal-600 dark:to-teal-700",
    emerald: "bg-gradient-to-r from-slate-600 dark:from-slate-900 to-teal-600 dark:to-teal-700",
    navy: "bg-gradient-to-r from-slate-600 dark:from-slate-900 to-teal-600 dark:to-teal-700",
    gold: "bg-gradient-to-r from-slate-600 dark:from-slate-900 to-teal-600 dark:to-teal-700",
    slate: "bg-gradient-to-r from-slate-600 to-slate-400",
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#1e2f4d]/80 bg-white dark:bg-[#0e192d] p-5 shadow-subtle hover:shadow-card hover:-translate-y-0.5 transition-all duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </span>
        <div className={cn("p-2.5 rounded-xl border transition-transform duration-200 group-hover:scale-105", iconVariants[variant])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      {/* Main Metric */}
      <div className="mt-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-sans tracking-tight font-mono">
            {value}
          </span>
          {badgeText && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {badgeText}
            </span>
          )}
        </div>

        {/* Optional Progress Mini-Bar */}
        {progressPercent !== undefined && (
          <div className="mt-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", barVariants[variant])}
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />
          </div>
        )}

        {subtitle && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
});
