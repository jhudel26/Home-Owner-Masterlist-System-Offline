"use client";

import React from "react";
import { useApp } from "@/context/app-context";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/layout/page-header";
import { HomeownerTable } from "@/components/homeowners/homeowner-table";
import { ShieldAlert } from "lucide-react";

export default function HomeownersPage() {
  const { currentUser, homeowners } = useApp();
  const canViewHomeowners = hasPermission(currentUser, "can_view_homeowner");

  if (!canViewHomeowners) {
    return (
      <div className="p-12 text-center rounded-2xl border border-slate-200 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d]">
        <ShieldAlert className="h-12 w-12 text-red-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Access Restricted</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          You do not have the required permissions to view the homeowners masterlist registry.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Homeowners Masterlist Registry"
        description="Official residential census and member directory of St. Joseph Village 6 Phase 4"
      />

      <HomeownerTable homeowners={homeowners} />
    </div>
  );
}
