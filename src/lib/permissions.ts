import { Profile, UserPermissions, UserRole } from "@/types/database";

export const PERMISSION_DEFINITIONS: Record<
  keyof UserPermissions,
  { label: string; description: string; category: "Homeowners" | "System" }
> = {
  can_view_homeowner: {
    label: "View Homeowners",
    description: "View homeowner registry, details, and household members",
    category: "Homeowners",
  },
  can_create_homeowner: {
    label: "Add Homeowners",
    description: "Register new homeowners and household members to the system",
    category: "Homeowners",
  },
  can_edit_homeowner: {
    label: "Edit Homeowners",
    description: "Update homeowner information, address, and household list",
    category: "Homeowners",
  },
  can_delete_homeowner: {
    label: "Delete / Archive Homeowners",
    description: "Soft-delete or deactivate homeowner records",
    category: "Homeowners",
  },
  can_export_excel: {
    label: "Export to Excel",
    description: "Download filtered or complete homeowner masterlist as .xlsx",
    category: "Homeowners",
  },
  can_manage_monthly_dues: {
    label: "Manage Monthly Dues",
    description: "View and update monthly dues payment status for homeowners",
    category: "Homeowners",
  },
  can_manage_deductions: {
    label: "Manage Deductions",
    description: "Add, edit, and remove homeowner deduction privileges (e.g., electricity, services)",
    category: "Homeowners",
  },
  can_manage_officers: {
    label: "Manage HOA Officers",
    description: "Add, edit, and remove HOA officers and their exemption settings",
    category: "Homeowners",
  },
  can_view_dashboard_stats: {
    label: "View Dashboard Statistics",
    description: "Access high-level demographic charts, metrics, and activity logs",
    category: "System",
  },
  can_manage_users: {
    label: "Manage Accounts",
    description: "Create, edit, and deactivate Admin and User staff accounts",
    category: "System",
  },
  can_grant_permissions: {
    label: "Grant Permissions",
    description: "Adjust individual permission toggles for Admin and User accounts",
    category: "System",
  },
  can_backup_restore: {
    label: "Backup & Restore",
    description: "Export a full database backup or restore data from a backup snapshot",
    category: "System",
  },
  can_view_analytics: {
    label: "View Analytics",
    description: "Access application analytics, performance metrics, and usage data",
    category: "System",
  },
  can_view_audit_trail: {
    label: "View Audit Trail",
    description: "Access official activity log trail and historical system operations",
    category: "System",
  },
};

export const DEFAULT_PERMISSIONS_BY_ROLE: Record<UserRole, UserPermissions> = {
  super_admin: {
    can_create_homeowner: true,
    can_edit_homeowner: true,
    can_delete_homeowner: true,
    can_view_homeowner: true,
    can_export_excel: true,
    can_manage_monthly_dues: true,
    can_manage_deductions: true,
    can_manage_officers: true,
    can_manage_users: true,
    can_grant_permissions: true,
    can_view_dashboard_stats: true,
    can_backup_restore: true,
    can_view_analytics: true,
    can_view_audit_trail: true,
  },
  admin: {
    can_create_homeowner: true,
    can_edit_homeowner: true,
    can_delete_homeowner: false,
    can_view_homeowner: true,
    can_export_excel: true,
    can_manage_monthly_dues: true,
    can_manage_deductions: false,
    can_manage_officers: false,
    can_manage_users: false,
    can_grant_permissions: false,
    can_view_dashboard_stats: true,
    can_backup_restore: false,
    can_view_analytics: false,
    can_view_audit_trail: false,
  },
  user: {
    can_create_homeowner: false,
    can_edit_homeowner: false,
    can_delete_homeowner: false,
    can_view_homeowner: true,
    can_export_excel: false,
    can_manage_monthly_dues: false,
    can_manage_deductions: false,
    can_manage_officers: false,
    can_manage_users: false,
    can_grant_permissions: false,
    can_view_dashboard_stats: true,
    can_backup_restore: false,
    can_view_analytics: false,
    can_view_audit_trail: false,
  },
};

export function hasPermission(
  profile: Profile | null | undefined,
  permission: keyof UserPermissions
): boolean {
  if (!profile || profile.status === "Inactive") return false;
  // Super Admin has all permissions unconditionally
  if (profile.role === "super_admin") return true;
  return Boolean(profile.permissions?.[permission]);
}

export function canManageRole(
  actorProfile: Profile | null | undefined,
  targetRole: UserRole
): boolean {
  if (!actorProfile || actorProfile.status === "Inactive") return false;
  if (actorProfile.role === "super_admin") return true;
  if (actorProfile.role === "admin") {
    // Admin can only manage 'user' accounts if granted 'can_manage_users', but never super_admin or other admins
    return hasPermission(actorProfile, "can_manage_users") && targetRole === "user";
  }
  return false;
}
