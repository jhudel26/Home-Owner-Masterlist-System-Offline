"use client";

import React, { useState, useMemo } from "react";
import { Profile, UserPermissions, UserRole } from "@/types/database";
import { useApp } from "@/context/app-context";
import { hasPermission, PERMISSION_DEFINITIONS } from "@/lib/permissions";
import { RoleBadge, StatusBadge } from "@/components/ui/badge";
import { ManagePermissionsModal } from "./manage-permissions-modal";
import { CreateUserModal } from "./create-user-modal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  ShieldCheck,
  UserPlus,
  Sliders,
  Power,
  Search,
  Shield,
  UserCheck,
  UserX,
} from "lucide-react";

interface UserTableProps {
  profiles: Profile[];
}

export function UserTable({ profiles }: UserTableProps) {
  const { currentUser, updateUserPermissions, updateUserStatus, createUser } = useApp();
  const { success, error: toastError } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [isPermsOpen, setIsPermsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const canManageAccounts = hasPermission(currentUser, "can_manage_users");
  const canGrantPerms = hasPermission(currentUser, "can_grant_permissions");

  // Summary counts
  const totalOfficers = profiles.length;
  const superAdminCount = profiles.filter((p) => p.role === "super_admin").length;
  const adminCount = profiles.filter((p) => p.role === "admin").length;
  const staffCount = profiles.filter((p) => p.role === "user").length;
  const activeCount = profiles.filter((p) => p.status === "Active").length;

  const filteredProfiles = useMemo(() => {
    const q = searchTerm.toLowerCase();
    if (!q) return profiles;
    return profiles.filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        (p.email && p.email.toLowerCase().includes(q)) ||
        p.role.toLowerCase().includes(q)
    );
  }, [profiles, searchTerm]);

  const handleSavePermissions = async (userId: string, permissions: UserPermissions) => {
    const res = await updateUserPermissions(userId, permissions);
    if (res.success) {
      success("Permissions Updated", "Account permissions have been saved.");
    } else {
      toastError("Update Failed", res.error);
    }
    return res;
  };

  const handleToggleStatus = async (user: Profile) => {
    if (user.role === "super_admin") {
      toastError("Action Restricted", "The Super Admin account cannot be deactivated.");
      return;
    }

    const nextStatus = user.status === "Active" ? "Inactive" : "Active";
    const res = await updateUserStatus(user.id, nextStatus);
    if (res.success) {
      success(
        "Status Changed",
        `${user.full_name} is now ${nextStatus.toLowerCase()}.`
      );
    } else {
      toastError("Failed", res.error);
    }
  };

  const handleCreateUser = async (data: {
    full_name: string;
    email: string;
    password?: string;
    role: UserRole;
  }) => {
    return await createUser(data);
  };

  const countActivePermissions = (perms: UserPermissions) => {
    return Object.values(perms || {}).filter(Boolean).length;
  };

  return (
    <div className="space-y-6">
      {/* 4 Summary Mini-Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] shadow-subtle flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase">Total Accounts</span>
            <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">{totalOfficers}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] shadow-subtle flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#07162c] text-slate-700 dark:text-teal-300 border border-slate-300 dark:border-teal-500/30">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase">Board Members</span>
            <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">{superAdminCount + adminCount}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] shadow-subtle flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase">Active Staff</span>
            <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">{activeCount}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] shadow-subtle flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <UserX className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase">Volunteer Staff</span>
            <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">{staffCount}</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl border border-slate-200/80 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] shadow-subtle">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search accounts by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-2xl border border-slate-200 dark:border-[#1e2f4d] bg-slate-50/70 dark:bg-[#0c182c] focus:bg-white dark:focus:bg-[#0e192d] focus:border-teal-600 dark:focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>

        {canManageAccounts && (
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsCreateOpen(true)}
            className="gap-1.5 h-10 px-4 font-bold shadow-sm bg-teal-700 hover:bg-teal-800 text-white"
          >
            <UserPlus className="h-4 w-4" />
            <span>Create New Account</span>
          </Button>
        )}
      </div>

      {/* Users Table */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#1e2f4d] bg-slate-50/80 dark:bg-[#0a1526]/90 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                <th className="py-3.5 px-5">Staff Member</th>
                <th className="py-3.5 px-4">Assigned Role</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Granted Privileges</th>
                <th className="py-3.5 px-5 text-right">Access Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1e2f4d] text-sm">
              {filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
                    No authorized accounts found matching your search.
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((user) => {
                  const isSuperAdmin = user.role === "super_admin";
                  const activeCount = isSuperAdmin ? 8 : countActivePermissions(user.permissions);

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/70 dark:hover:bg-[#13233d]/60 transition-colors">
                      {/* Member */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#07162c] to-[#040d1c] text-teal-300 border border-teal-500/20 flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                            {user.full_name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-slate-100">{user.full_name}</div>
                            <div className="text-xs text-slate-400 dark:text-slate-500 font-mono">{user.email || "No email"}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-4 px-4">
                        <RoleBadge role={user.role} />
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center">
                        <StatusBadge status={user.status} />
                      </td>

                      {/* Permissions badge count */}
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          <ShieldCheck className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400" />
                          {isSuperAdmin ? `Full Access (All ${Object.keys(PERMISSION_DEFINITIONS).length})` : `${activeCount} / ${Object.keys(PERMISSION_DEFINITIONS).length} Granted`}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canGrantPerms && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setIsPermsOpen(true);
                              }}
                              className="h-8 text-xs gap-1.5 font-semibold"
                            >
                              <Sliders className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                              <span>Manage Permissions</span>
                            </Button>
                          )}

                          {canManageAccounts && !isSuperAdmin && (
                            <Button
                              variant={user.status === "Active" ? "ghost" : "outline"}
                              size="sm"
                              onClick={() => handleToggleStatus(user)}
                              className={`h-8 text-xs gap-1 font-semibold ${
                                user.status === "Active"
                                  ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-700 dark:hover:text-red-300"
                                  : "text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/60"
                              }`}
                              title={user.status === "Active" ? "Deactivate Account" : "Activate Account"}
                            >
                              <Power className="h-3.5 w-3.5" />
                              <span>{user.status === "Active" ? "Deactivate" : "Activate"}</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <ManagePermissionsModal
        isOpen={isPermsOpen}
        onClose={() => setIsPermsOpen(false)}
        targetUser={selectedUser}
        onSave={handleSavePermissions}
      />

      <CreateUserModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreateUser}
      />
    </div>
  );
}
