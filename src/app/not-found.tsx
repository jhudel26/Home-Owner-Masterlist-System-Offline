import React from "react";
import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#060c18] p-6 text-slate-900 dark:text-slate-100">
      <div className="max-w-md w-full rounded-3xl border border-slate-200/80 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] p-8 text-center shadow-xl space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto border border-teal-200/80 dark:border-teal-800/60">
          <FileQuestion className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold font-sans">Page Not Found</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            The masterlist registry page or record you requested does not exist or has been moved.
          </p>
        </div>
        <Link href="/" className="inline-block">
          <Button variant="primary" size="sm" className="gap-2 bg-teal-600 hover:bg-teal-700">
            <Home className="h-4 w-4" />
            <span>Return to Dashboard</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}