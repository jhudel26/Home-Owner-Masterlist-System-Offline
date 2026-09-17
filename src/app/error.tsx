"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("App Error Boundary caught runtime error", { digest: error.digest }, error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-3xl border border-red-200 dark:border-red-900/50 bg-white dark:bg-[#0e192d] p-8 text-center shadow-xl space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Something went wrong
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            An unexpected error occurred while loading this view. The system has safely captured this event.
          </p>
          {error.digest && (
            <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 py-1 px-2 rounded-md inline-block">
              Error Digest: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button variant="primary" size="sm" onClick={() => reset()} className="w-full sm:w-auto gap-2 bg-emerald-600 hover:bg-emerald-700">
            <RefreshCw className="h-4 w-4" />
            <span>Try Again</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => (window.location.href = "/")} className="w-full sm:w-auto gap-2">
            <Home className="h-4 w-4" />
            <span>Dashboard</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

