"use client";

import React from "react";
import { useApp } from "@/context/app-context";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/layout/page-header";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { ShieldAlert } from "lucide-react";

export default function ActivityLogPage() {
  const { currentUser, activityLogs } = useApp();
  const canView = hasPermission(currentUser, "can_view_audit_trail");

  if (!canView) {
    return (
      <div className="p-12 text-center rounded-2xl border border-slate-200 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d]">
        <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Access Restricted</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          You do not have permission to view the audit log trail.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Board Activity & Audit Trail"
        description="Chronological log of all system actions — additions, updates, exports, logins, and permission changes"
      />

      <RecentActivity logs={activityLogs} fullPage={true} />
    </div>
  );
}
