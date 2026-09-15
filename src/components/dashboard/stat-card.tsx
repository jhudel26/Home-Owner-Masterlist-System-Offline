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
  variant = "emerald",
  progressPercent,
  badgeText,
}: StatCardProps) {
  const iconVariants = {
    emerald: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60 shadow-xs",
    teal: "bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800/60 shadow-xs",
    navy: "bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800/60 shadow-xs",
    gold: "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/60 shadow-xs",
    slate: "bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 shadow-xs",
  };

  const barVariants = {
    emerald: "bg-gradient-to-r from-emerald-600 to-teal-500",
    teal: "bg-gradient-to-r from-teal-600 to-emerald-500",
    navy: "bg-gradient-to-r from-sky-600 to-teal-500",
    gold: "bg-gradient-to-r from-amber-500 to-emerald-500",
    slate: "bg-gradient-to-r from-slate-600 to-slate-400",
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0e192d]/90 backdrop-blur-xl p-5 shadow-subtle hover:shadow-card hover:border-emerald-500/30 dark:hover:border-emerald-500/30 hover:-translate-y-0.5 transition-all duration-200">
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
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80">
              {badgeText}
            </span>
          )}
        </div>

        {/* Progress Mini-Bar */}
        {progressPercent !== undefined && (
          <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", barVariants[variant])}
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />
          </div>
        )}

        {subtitle && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 leading-normal">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
});
