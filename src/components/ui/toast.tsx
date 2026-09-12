"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  toast: (options: { type?: ToastType; title: string; message?: string }) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type = "info", title, message }: { type?: ToastType; title: string; message?: string }) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: Toast = { id, type, title, message };
      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        removeToast(id);
      }, 4500);
    },
    [removeToast]
  );

  const success = useCallback(
    (title: string, message?: string) => addToast({ type: "success", title, message }),
    [addToast]
  );
  const error = useCallback(
    (title: string, message?: string) => addToast({ type: "error", title, message }),
    [addToast]
  );
  const info = useCallback(
    (title: string, message?: string) => addToast({ type: "info", title, message }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, info }}>
      {children}
      {/* Toast viewport */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none p-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-elevated border backdrop-blur-xl transition-all animate-in slide-in-from-bottom-5 duration-200",
              t.type === "success" && "bg-white/95 dark:bg-[#0e192d]/95 border-emerald-500/30 text-slate-900 dark:text-slate-100 shadow-[0_4px_20px_-2px_rgba(16,185,129,0.15)]",
              t.type === "error" && "bg-white/95 dark:bg-[#0e192d]/95 border-red-500/30 text-slate-900 dark:text-slate-100 shadow-[0_4px_20px_-2px_rgba(239,68,68,0.15)]",
              t.type === "info" && "bg-white/95 dark:bg-[#0e192d]/95 border-sky-500/30 text-slate-900 dark:text-slate-100 shadow-[0_4px_20px_-2px_rgba(14,165,233,0.15)]"
            )}
          >
            {t.type === "success" && (
              <div className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 border border-emerald-200 dark:border-emerald-800/40">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            )}
            {t.type === "error" && (
              <div className="p-1 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 shrink-0 mt-0.5 border border-red-200 dark:border-red-800/40">
                <AlertCircle className="h-4 w-4" />
              </div>
            )}
            {t.type === "info" && (
              <div className="p-1 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5 border border-sky-200 dark:border-sky-800/40">
                <Info className="h-4 w-4" />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold tracking-tight">{t.title}</h4>
              {t.message && <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed break-words">{t.message}</p>}
            </div>

            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
