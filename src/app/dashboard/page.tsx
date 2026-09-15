"use client";

import React, { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useApp } from "@/context/app-context";
import { hasPermission } from "@/lib/permissions";
import { StatCard } from "@/components/dashboard/stat-card";
import { ChartSkeleton } from "@/components/ui/card-skeleton";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import {
  Users,
  Home,
  Heart,
  PawPrint,
  UserPlus,
  ShieldCheck,
  Building,
  FileSpreadsheet,
  Sparkles,
  Database,
} from "lucide-react";
import { exportHomeownersToExcel } from "@/lib/excel-export";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/error-utils";
import { BackupRestoreModal } from "@/components/dashboard/backup-restore-modal";

const DemographicsCharts = dynamic(
  () => import("@/components/dashboard/demographics-chart").then((mod) => mod.DemographicsCharts),
  { loading: () => <ChartSkeleton />, ssr: false }
);

export default function DashboardPage() {
  const { currentUser, homeowners, activityLogs } = useApp();
  const { success, error: toastError } = useToast();
  const [isBackupOpen, setIsBackupOpen] = useState(false);

  const canViewStats = hasPermission(currentUser, "can_view_dashboard_stats");
  const canCreateHomeowner = hasPermission(currentUser, "can_create_homeowner");
  const canExport = hasPermission(currentUser, "can_export_excel");
  const canBackupRestore = hasPermission(currentUser, "can_backup_restore");
  const canViewAuditTrail = hasPermission(currentUser, "can_view_audit_trail");

  // Metrics calculations
  const totalHomeowners = homeowners.length;
  const activeHomeowners = homeowners.filter((h) => h.is_active === 1).length;
  const inactiveHomeowners = homeowners.filter((h) => h.is_active === 0).length;

  const totalHouseholdMembers = homeowners.reduce(
    (acc, curr) => acc + (curr.household_members?.length || 0),
    0
  );
  const totalResidents = totalHomeowners + totalHouseholdMembers;

  const ownersCount = homeowners.filter((h) => h.ownership_type === "owner").length;
  const rentersCount = homeowners.filter((h) => h.ownership_type === "renter").length;
  const ownerPercent = totalHomeowners > 0 ? Math.round((ownersCount / totalHomeowners) * 100) : 0;
  const activePercent = totalHomeowners > 0 ? Math.round((activeHomeowners / totalHomeowners) * 100) : 0;

  const totalPets = homeowners.reduce((acc, curr) => acc + (curr.registered_pets || 0), 0);
  const homeownersVsResidentsPercent = totalResidents > 0 
    ? Math.round((totalHomeowners / totalResidents) * 100) 
    : 0;

  // Time-based greeting
  const hour = new Date().getHours();
  const timeGreeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const handleExport = async () => {
    try {
      await exportHomeownersToExcel(homeowners);
      success("Export Complete", "Exported full homeowners registry to Excel.");
    } catch (err: unknown) {
      toastError("Export Failed", getErrorMessage(err));
    }
  };

  if (!canViewStats) {
    return (
      <div className="p-12 text-center rounded-3xl border border-slate-200/80 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] shadow-subtle max-w-lg mx-auto my-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-600 dark:text-amber-400 mx-auto mb-4">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Dashboard Restricted</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
          Your staff account does not currently have permissions to view community analytics.
          Contact the HOA Super Admin to request access.
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-0 min-w-0 -m-4 sm:-m-6 lg:-m-8">
      {/* Left: Main Dashboard Content */}
      <div className="flex-1 min-w-0 overflow-x-hidden p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Executive Welcome Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0f3460] via-[#1a4d7a] to-[#1e5c96] dark:from-[#040d1c] dark:via-[#07162c] dark:to-[#0c2340] text-white p-7 sm:p-9 shadow-glass border border-white/10 transition-colors duration-300">
          <div className="absolute -right-16 -top-16 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute right-1/3 -bottom-16 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-emerald-300 font-medium">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                <span>St. Joseph Village 6 Phase 4 &bull; Executive Portal</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-sans">
                {timeGreeting}, {currentUser?.full_name?.split(" ")[0] || "Officer"}
              </h1>
              <p className="text-xs sm:text-sm text-white/75 max-w-xl leading-relaxed">
                Phase 4 Homeowners Masterlist is currently tracking <span className="font-bold text-white">{totalHomeowners} residential properties</span> and <span className="font-bold text-white">{totalResidents} total occupants</span>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {canBackupRestore && (
                <button
                  type="button"
                  onClick={() => setIsBackupOpen(true)}
                  className="inline-flex items-center gap-2 h-10 px-3.5 rounded-lg bg-white/20 hover:bg-white/30 active:scale-[0.98] text-white border border-white/30 text-xs font-semibold backdrop-blur-md transition-all shadow-sm"
                >
                  <Database className="h-4 w-4 text-emerald-300" />
                  <span>Backup / Restore</span>
                </button>
              )}

              {canExport && (
                <button
                  type="button"
                  onClick={handleExport}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-white/20 hover:bg-white/30 active:scale-[0.98] text-white border border-white/30 text-xs font-semibold backdrop-blur-md transition-all shadow-sm"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-300" />
                  <span>Export Masterlist</span>
                </button>
              )}

              {canCreateHomeowner && (
                <Link href="/dashboard/homeowners/new">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white border border-emerald-300/40 shadow-lg shadow-emerald-950/40 text-xs font-bold transition-all"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Register Homeowner</span>
                  </button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* 5 Core Metric Cards in Modern Bento Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
          <StatCard
            title="Total Homeowners"
            value={totalHomeowners}
            subtitle={`${activeHomeowners} Active / ${inactiveHomeowners} Archived`}
            icon={Building}
            variant="emerald"
            badgeText={`${totalHomeowners} Units`}
            progressPercent={activePercent}
          />

          <StatCard
            title="Total Residents"
            value={totalResidents}
            subtitle={`${totalHomeowners} Houses`}
            icon={Users}
            variant="emerald"
            progressPercent={homeownersVsResidentsPercent}
          />

          <StatCard
            title="Occupancy Profile"
            value={`${ownerPercent}%`}
            subtitle={`${ownersCount} Owners / ${rentersCount} Renters`}
            icon={Home}
            variant="navy"
            progressPercent={ownerPercent}
          />

          <StatCard
            title="Active Registry"
            value={`${activePercent}%`}
            subtitle={`${activeHomeowners} in Good Standing`}
            icon={Heart}
            variant="gold"
            progressPercent={activePercent}
          />

          <StatCard
            title="Registered Pets"
            value={totalPets}
            subtitle="Phase 4 Canine & Feline Census"
            icon={PawPrint}
            variant="slate"
            badgeText="Verified"
          />
        </div>

        {/* Visual Demographics & Interactive Analytics */}
        <DemographicsCharts homeowners={homeowners} />
      </div>

      {/* Right: Activity Sidebar — visible only on xl+ screens when user has audit trail access */}
      {canViewAuditTrail && (
        <aside className="hidden xl:flex flex-col w-72 2xl:w-80 shrink-0 border-l border-slate-200/80 dark:border-[#1e2f4d]/80 bg-white dark:bg-[#0e192d] self-stretch">
          <div className="sticky top-0 h-screen overflow-y-auto p-4">
            <RecentActivity logs={activityLogs} />
          </div>
        </aside>
      )}

      {/* Backup & Disaster Recovery Modal */}
      <BackupRestoreModal isOpen={isBackupOpen} onClose={() => setIsBackupOpen(false)} />
    </div>
  );
}
