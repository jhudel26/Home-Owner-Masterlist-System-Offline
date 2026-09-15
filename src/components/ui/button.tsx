import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "destructive" | "ghost" | "gold";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97] select-none rounded-xl tracking-tight";

    const variants = {
      primary:
        "bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white focus-visible:ring-emerald-500 shadow-sm hover:shadow-[0_0_20px_-3px_rgba(16,185,129,0.4)] border border-emerald-500/30",
      secondary:
        "bg-slate-900 dark:bg-[#0e192d] text-white hover:bg-slate-800 dark:hover:bg-[#15243e] focus-visible:ring-emerald-500 shadow-sm border border-slate-800 dark:border-white/10",
      gold:
        "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white focus-visible:ring-emerald-500 font-semibold shadow-sm hover:shadow-[0_0_22px_-2px_rgba(16,185,129,0.45)] border border-emerald-400/30",
      outline:
        "border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#0e192d]/90 backdrop-blur-md text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:border-emerald-500/40 focus-visible:ring-slate-400 shadow-subtle",
      destructive:
        "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white focus-visible:ring-red-500 shadow-sm border border-red-700/30",
      ghost:
        "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white focus-visible:ring-slate-300",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs gap-1.5",
      md: "h-9.5 px-4 text-sm gap-2",
      lg: "h-11 px-6 text-base gap-2.5",
      icon: "h-9 w-9 p-0",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-current" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
