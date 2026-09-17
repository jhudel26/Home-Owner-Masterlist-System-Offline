"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { logger } from "@/lib/logger";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("Global Root Error Boundary caught crash", { digest: error.digest }, error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 p-8 rounded-3xl text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white">Application Error</h1>
            <p className="text-xs text-slate-300">
              A critical application error occurred. You can attempt to recover by refreshing.
            </p>
          </div>
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/30 rounded-xl text-sm font-semibold transition-all inline-flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}

