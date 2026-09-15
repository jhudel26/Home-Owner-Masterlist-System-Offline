import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, icon, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200/90 dark:border-white/10 mb-8">
      <div className="flex items-start gap-3.5 min-w-0">
        {icon && (
          <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/40 shrink-0 mt-0.5">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 font-sans truncate">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{description}</p>
          )}
        </div>
      </div>
      {children && <div className="flex items-center gap-2.5 shrink-0 flex-wrap">{children}</div>}
    </div>
  );
}
