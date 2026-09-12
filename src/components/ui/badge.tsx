import React from "react";
import { cn } from "@/lib/utils";
import { UserRole, RecordStatus, OwnershipType } from "@/types/database";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "gold" | "outline";
  size?: "sm" | "md";
}

export function Badge({ className, variant = "default", size = "md", children, ...props }: BadgeProps) {
  const variants = {
    default: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700",
    success: "bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800/60",
    warning: "bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60",
    danger: "bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/60",
    info: "bg-sky-50 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800/60",
    gold: "bg-teal-50 dark:bg-teal-950/60 text-teal-900 dark:text-teal-200 border-teal-300 dark:border-teal-700/60",
    outline: "bg-transparent text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-[11px] font-medium",
    md: "px-2.5 py-1 text-xs font-medium",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border transition-colors",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function RoleBadge({ role }: { role: UserRole }) {
  if (role === "super_admin") {
    return (
      <Badge variant="gold" className="font-semibold tracking-wide">
        👑 Super Admin
      </Badge>
    );
  }
  if (role === "admin") {
    return (
      <Badge variant="info" className="font-medium">
        🛡️ Admin
      </Badge>
    );
  }
  return (
    <Badge variant="default">
      👤 User / Staff
    </Badge>
  );
}

export function StatusBadge({ status }: { status: RecordStatus }) {
  if (status === "Active") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60">
        <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
      Inactive
    </span>
  );
}

export function OwnershipBadge({ type }: { type: OwnershipType }) {
  if (type === "owner") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60">
        Owner
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
      Renter
    </span>
  );
}
