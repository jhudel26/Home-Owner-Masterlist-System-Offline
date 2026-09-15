"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { useApp } from "@/context/app-context";
import { OfflineBanner } from "@/components/ui/offline-banner";
import { KeyboardShortcutsModal } from "@/components/layout/keyboard-shortcuts-modal";
import { ConsoleWarning } from "@/components/security/console-warning";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, isLoading, loadingStage } = useApp();
  const [isNavigating, setIsNavigating] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  // Trigger brief page transition loader when pathname changes
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  // Mark when component has mounted
  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    // Only redirect after mount and only if not loading and definitely no user
    if (hasMounted && !isLoading && !currentUser) {
      router.push("/login");
    }
  }, [currentUser, isLoading, router, hasMounted]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070c14] p-4 font-sans selection:bg-emerald-500 selection:text-white">
        <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d1522]/90 backdrop-blur-2xl shadow-2xl p-7 text-center space-y-6">
          <div className="relative flex items-center justify-center mx-auto">
            <div className="w-16 h-16 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin" />
            <div className="absolute w-10 h-10 rounded-full border-2 border-emerald-500/30 border-b-emerald-300 animate-spin [animation-direction:reverse]" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-white tracking-tight">
              Initializing HOA Masterlist
            </h3>
            <p className="text-xs text-emerald-400 font-mono transition-all animate-pulse">
              {loadingStage}
            </p>
          </div>

          {/* Live system status indicators */}
          <div className="space-y-2 text-left pt-3 border-t border-slate-800/80 text-[11px] font-mono">
            <div className="flex items-center justify-between text-slate-400">
              <span>Database Gateway</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Local MySQL
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Security Layer</span>
              <span className="text-emerald-400">256-Bit SSL/TLS</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Registry Availability</span>
              <span className="text-emerald-400">Checking...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#060c18] text-slate-900 dark:text-slate-100 flex relative transition-colors duration-200">
      {/* Top Route Navigation Progress Bar */}
      {isNavigating && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-emerald-950 z-50 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-teal-300 animate-top-progress" />
        </div>
      )}

      {/* Sidebar (desktop fixed, mobile drawer) */}
      <Sidebar onNavigate={() => setIsNavigating(true)} />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 xl:pl-72 flex flex-col min-w-0">
        <OfflineBanner />
        <Navbar />
        <main key={pathname} className="flex-1 p-4 sm:p-6 lg:p-8 animate-fade-in">
          {children}
        </main>
      </div>

      {/* Global Accessible Keyboard Shortcuts Helper */}
      <KeyboardShortcutsModal />

      {/* Console Security Warning */}
      <ConsoleWarning />
    </div>
  );
}


