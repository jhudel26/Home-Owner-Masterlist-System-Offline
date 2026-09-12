"use client";

import React, { useState, useEffect } from "react";
import { Profile, UserPermissions } from "@/types/database";
import { PERMISSION_DEFINITIONS, DEFAULT_PERMISSIONS_BY_ROLE } from "@/lib/permissions";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RoleBadge } from "@/components/ui/badge";
import { ShieldAlert, Check, Sparkles, RotateCcw } from "lucide-react";

interface ManagePermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: Profile | null;
  onSave: (userId: string, permissions: UserPermissions) => Promise<{ success: boolean; error?: string }>;
}

export function ManagePermissionsModal({
  isOpen,
  onClose,
  targetUser,
  onSave,
}: ManagePermissionsModalProps) {
  const [permissions, setPermissions] = useState<UserPermissions>(
    targetUser?.permissions || DEFAULT_PERMISSIONS_BY_ROLE.user
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (targetUser) {
      setPermissions(targetUser.permissions);
    }
  }, [targetUser]);

  if (!targetUser) return null;

  const isSuperAdmin = targetUser.role === "super_admin";

  const handleToggle = (key: keyof UserPermissions, val: boolean) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  const grantAll = () => {
    setPermissions(DEFAULT_PERMISSIONS_BY_ROLE.super_admin);
  };

  const resetToRoleDefaults = () => {
    if (targetUser) {
      setPermissions(DEFAULT_PERMISSIONS_BY_ROLE[targetUser.role]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await onSave(targetUser.id, permissions);
      if (res.success) {
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  const homeownerPerms = Object.entries(PERMISSION_DEFINITIONS).filter(
    ([, def]) => def.category === "Homeowners"
  ) as [keyof UserPermissions, (typeof PERMISSION_DEFINITIONS)[keyof UserPermissions]][];

  const systemPerms = Object.entries(PERMISSION_DEFINITIONS).filter(
    ([, def]) => def.category === "System"
  ) as [keyof UserPermissions, (typeof PERMISSION_DEFINITIONS)[keyof UserPermissions]][];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Security & Permission Configuration"
      description={`Manage granular system authority and access capabilities for ${targetUser.full_name}`}
      maxWidth="xl"
    >
      <div className="space-y-6">
        {/* User Info Bar */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-[#0a1526] border border-slate-200 dark:border-[#1e2f4d]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#07162c] text-teal-300 border border-teal-500/20 font-bold flex items-center justify-center text-sm shadow-xs">
              {targetUser.full_name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{targetUser.full_name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{targetUser.email || "No email"}</p>
            </div>
          </div>
          <RoleBadge role={targetUser.role} />
        </div>

        {isSuperAdmin ? (
          <div className="p-4 rounded-2xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 text-teal-950 dark:text-teal-200 flex items-start gap-3 shadow-xs">
            <ShieldAlert className="h-5 w-5 text-teal-700 dark:text-teal-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold">Super Admin Full Inherent Authority</p>
              <p className="text-teal-800 dark:text-teal-300 leading-relaxed">
                As the HOA President (Super Admin), this account inherently commands all 8 permissions. Permissions cannot be revoked for the Super Admin to preserve system continuity.
              </p>
            </div>
          </div>
        ) : (
          /* Presets / Shortcut Toolbar */
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-[#0a1526] border border-slate-200 dark:border-[#1e2f4d] text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium pl-1.5">Permission Presets:</span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={resetToRoleDefaults}
                className="h-7 text-xs text-slate-600 dark:text-slate-300 gap-1 hover:bg-slate-200/60 dark:hover:bg-slate-800"
              >
                <RotateCcw className="h-3 w-3 text-slate-400" />
                <span>Reset Defaults</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={grantAll}
                className="h-7 text-xs text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-800/60 hover:bg-teal-50 dark:hover:bg-teal-950/40 gap-1 font-semibold"
              >
                <Sparkles className="h-3 w-3 text-teal-600 dark:text-teal-400" />
                <span>Grant Full Access</span>
              </Button>
            </div>
          </div>
        )}

        {/* Homeowner Permissions Group */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-teal-900 dark:text-teal-300">
            Homeowner Masterlist Capabilities
          </h4>
          <div className="divide-y divide-slate-100 dark:divide-[#1e2f4d] rounded-2xl border border-slate-200 dark:border-[#1e2f4d] p-3.5 bg-white dark:bg-[#0e192d]">
            {homeownerPerms.map(([key, def]) => (
              <Switch
                key={key}
                label={def.label}
                description={def.description}
                checked={isSuperAdmin ? true : Boolean(permissions[key])}
                disabled={isSuperAdmin}
                onCheckedChange={(val) => handleToggle(key, val)}
              />
            ))}
          </div>
        </div>

        {/* System & Administrative Privileges */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
            System & Board Privileges
          </h4>
          <div className="divide-y divide-slate-100 dark:divide-[#1e2f4d] rounded-2xl border border-slate-200 dark:border-[#1e2f4d] p-3.5 bg-white dark:bg-[#0e192d]">
            {systemPerms.map(([key, def]) => (
              <Switch
                key={key}
                label={def.label}
                description={def.description}
                checked={isSuperAdmin ? true : Boolean(permissions[key])}
                disabled={isSuperAdmin}
                onCheckedChange={(val) => handleToggle(key, val)}
              />
            ))}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-[#1e2f4d]">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          {!isSuperAdmin && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              isLoading={saving}
              className="gap-1.5 font-bold shadow-sm bg-teal-700 hover:bg-teal-800 text-white"
            >
              <Check className="h-4 w-4" />
              <span>Apply Security Permissions</span>
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
