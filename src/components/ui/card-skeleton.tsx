import React from "react";

export function CardSkeleton() {
  return (
    <div className="rounded-3xl border border-slate-200/80 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] p-6 shadow-subtle animate-pulse space-y-4">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="w-16 h-5 rounded-full bg-slate-200 dark:bg-slate-800" />
      </div>
      <div className="space-y-2">
        <div className="w-20 h-4 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="w-28 h-7 rounded bg-slate-300 dark:bg-slate-700" />
      </div>
      <div className="w-36 h-3 rounded bg-slate-100 dark:bg-slate-800/60" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="rounded-3xl border border-slate-200/80 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] p-7 shadow-subtle animate-pulse space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-[#1e2f4d]">
        <div className="space-y-2">
          <div className="w-44 h-5 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="w-64 h-3 rounded bg-slate-100 dark:bg-slate-800/60" />
        </div>
        <div className="w-32 h-8 rounded-xl bg-slate-200 dark:bg-slate-800" />
      </div>
      <div className="h-64 rounded-2xl bg-slate-100 dark:bg-[#0c182c] flex items-center justify-center">
        <div className="w-36 h-36 rounded-full border-4 border-slate-200 dark:border-slate-800 border-t-transparent animate-spin" />
      </div>
    </div>
  );
}