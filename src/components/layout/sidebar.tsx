"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import Swal from "sweetalert2";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Menu,
  X,
  BarChart3,
  DollarSign,
  Settings,
  Clock,
  Shield,
} from "lucide-react";
import { useApp } from "@/context/app-context";
import { hasPermission } from "@/lib/permissions";
import { ThemeToggle } from "./theme-toggle";
import { getVillageSettingsClient } from "@/lib/village-settings-client";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { currentUser, logout } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [villageName, setVillageName] = useState("Residential Masterlist");
  const [villageLogo, setVillageLogo] = useState("/icon.png");

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await getVillageSettingsClient();
      if (settings.hoa_name) {
        setVillageName(settings.hoa_name);
      }
      if (settings.village_logo) {
        setVillageLogo(settings.village_logo);
      }
    };
    loadSettings();
  }, []);

  const canViewDashboard = hasPermission(currentUser, "can_view_dashboard_stats");
  const canViewHomeowners = hasPermission(currentUser, "can_view_homeowner");
  const canCreateHomeowner = hasPermission(currentUser, "can_create_homeowner");
  const canManageMonthlyDues = hasPermission(currentUser, "can_manage_monthly_dues");
  const canManageOfficers = hasPermission(currentUser, "can_manage_officers");
  const canManageUsers = hasPermission(currentUser, "can_manage_users");
  const canViewAnalytics = hasPermission(currentUser, "can_view_analytics");
  const canViewAuditTrail = hasPermission(currentUser, "can_view_audit_trail");
  const canManageSettings =
    currentUser?.role === "super_admin" ||
    currentUser?.role === "admin" ||
    hasPermission(currentUser, "can_backup_restore") ||
    hasPermission(currentUser, "can_manage_monthly_dues");

  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      show: canViewDashboard,
    },
    {
      name: "Homeowners Registry",
      href: "/dashboard/homeowners",
      icon: Users,
      show: canViewHomeowners,
    },
    {
      name: "Register Homeowner",
      href: "/dashboard/homeowners/new",
      icon: UserPlus,
      show: canCreateHomeowner,
    },
    {
      name: "Monthly Dues",
      href: "/dashboard/monthly-dues",
      icon: DollarSign,
      show: canManageMonthlyDues,
    },
    {
      name: "HOA Officers",
      href: "/dashboard/officers",
      icon: Shield,
      show: canManageOfficers || canViewHomeowners,
    },
    {
      name: "Demographics & Analytics",
      href: "/dashboard/analytics",
      icon: BarChart3,
      show: canViewAnalytics,
    },
    {
      name: "Board & Accounts",
      href: "/dashboard/users",
      icon: ShieldCheck,
      show: canManageUsers,
    },
    {
      name: "Audit Trail",
      href: "/dashboard/activity",
      icon: Clock,
      show: canViewAuditTrail,
    },
    {
      name: "System Settings",
      href: "/dashboard/settings",
      icon: Settings,
      show: canManageSettings,
    },
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-white dark:bg-[#070d18] text-slate-700 dark:text-slate-200 border-r border-slate-200/90 dark:border-white/10 transition-colors duration-200">
      {/* Brand Header */}
      <div>
        <div className="flex items-center gap-4 px-6 py-6 border-b border-slate-200/90 dark:border-white/10 bg-slate-50/70 dark:bg-[#050a14]/60">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white dark:bg-[#0e192d] shadow-md border border-slate-200/80 dark:border-white/10 shrink-0 p-1 overflow-hidden">
            <Image
              src={villageLogo}
              alt="Village Logo"
              width={48}
              height={48}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <div className="flex flex-col min-w-0">
            <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight font-sans whitespace-normal">
              {villageName}
            </h2>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
              Masterlist
            </span>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Homeowners Association
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="px-4 py-5 space-y-1.5">
          <p className="px-3.5 pb-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Management
          </p>
          {navItems
            .filter((item) => item.show)
            .map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    setMobileOpen(false);
                    if (pathname !== item.href && onNavigate) {
                      onNavigate();
                    }
                  }}
                  className={`group flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm shadow-emerald-900/30 border border-emerald-400/30 translate-x-0.5"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <Icon
                      className={`h-5 w-5 transition-colors shrink-0 ${
                        isActive ? "text-white" : "text-slate-400 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400"
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>
                  {isActive && <ChevronRight className="h-4 w-4 text-emerald-100 shrink-0" />}
                </Link>
              );
            })}
        </nav>
      </div>

      {/* User Footer Profile & Sign Out */}
      <div className="p-4 border-t border-slate-200/90 dark:border-white/10 space-y-3 bg-slate-50/50 dark:bg-[#050a14]/40">
        <div className="flex items-center justify-between px-2 py-1 rounded-xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-2xl bg-emerald-700/20 text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center text-sm shrink-0 border border-emerald-500/30">
              {currentUser?.full_name?.charAt(0) || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {currentUser?.full_name || "Authorized User"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {currentUser?.role === "super_admin" ? "Super Admin" : currentUser?.role === "admin" ? "Admin" : "Staff User"}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={async () => {
            const result = await Swal.fire({
              title: "Sign Out?",
              text: "Are you sure you want to sign out of the system?",
              icon: "question",
              showCancelButton: true,
              confirmButtonColor: "#ef4444",
              cancelButtonColor: "#64748b",
              confirmButtonText: "Yes, sign out",
              cancelButtonText: "Cancel",
              customClass: {
                popup: "rounded-2xl",
                confirmButton: "rounded-xl px-5 py-2.5 font-bold",
                cancelButton: "rounded-xl px-5 py-2.5 font-bold",
              },
            });
            if (result.isConfirmed) {
              logout();
            }
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-300 border border-transparent hover:border-red-200 dark:hover:border-red-950/40 transition-all duration-150"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>

        <div className="text-center pt-1">
          <span className="text-[10px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
            v1.2.0 • LAN Edition
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden flex items-center justify-between bg-white dark:bg-[#070d18] px-5 py-4 border-b border-slate-200/90 dark:border-white/10 sticky top-0 z-40 transition-colors duration-200">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-[#0e192d] shadow-sm border border-slate-200/80 dark:border-white/10 p-1 overflow-hidden">
            <Image
              src="/icon.png"
              alt="Logo"
              width={40}
              height={40}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <div>
            <span className="font-bold text-sm text-slate-900 dark:text-white block whitespace-normal">
              {villageName}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Masterlist</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-xs transition-colors"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex animate-fade-in" role="dialog" aria-modal="true" aria-label="Mobile Navigation">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <nav aria-label="Mobile navigation" className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-slide-up">
            {sidebarContent}
          </nav>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 xl:w-72 shrink-0 border-r border-slate-200/90 dark:border-white/10 flex-col fixed inset-y-0 left-0 z-30">
        {sidebarContent}
      </aside>
    </>
  );
}
