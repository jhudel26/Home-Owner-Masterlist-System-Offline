"use client";

import React from "react";
import { useApp } from "@/context/app-context";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/layout/page-header";
import { UserTable } from "@/components/users/user-table";
import { ShieldAlert } from "lucide-react";

export default function UsersManagementPage() {
  const { currentUser, allProfiles } = useApp();
  const canManage = hasPermission(currentUser, "can_manage_users");

  if (!canManage) {
    return (
      <div className="p-12 text-center rounded-2xl border border-slate-200 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d]">
        <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Restricted Administration Area</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
          User & Permission Management is restricted to the HOA Super Admin (President) or administrators with explicitly granted administrative rights.
        </p>
      </div>
    );
  }

  // Super admin accounts are only visible to other super admins
  const isSuperAdmin = currentUser?.role === "super_admin";
  const visibleProfiles = isSuperAdmin
    ? allProfiles
    : allProfiles.filter((p) => p.role !== "super_admin");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin & User Account Management"
        description="Configure board member roles, staff permissions, and account access status"
      />

      <UserTable profiles={visibleProfiles} />
    </div>
  );
}
