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
      "inline-flex items-center justify-center font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none rounded-lg";

    const variants = {
      primary:
        "bg-teal-700 hover:bg-teal-800 text-white focus-visible:ring-teal-600 shadow-sm border border-teal-800/30",
      secondary:
        "bg-[#07162c] dark:bg-[#0c2447] text-white hover:bg-[#0c2447] dark:hover:bg-[#13325c] focus-visible:ring-teal-600 shadow-sm border border-white/10",
      gold:
        "bg-teal-600 hover:bg-teal-500 text-white focus-visible:ring-teal-500 font-semibold shadow-sm",
      outline:
        "border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c182c] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#13233f] focus-visible:ring-slate-400 shadow-subtle",
      destructive:
        "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 shadow-sm",
      ghost:
        "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white focus-visible:ring-slate-300",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs gap-1.5",
      md: "h-10 px-4 text-sm gap-2",
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
