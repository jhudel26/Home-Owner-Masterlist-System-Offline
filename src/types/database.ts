export type UserRole = 'super_admin' | 'admin' | 'user';
export type OwnershipType = 'owner' | 'renter';
export type GenderType = 'male' | 'female' | 'other';
export type RecordStatus = 'Active' | 'Inactive';
export type PaymentStatus = 'paid' | 'unpaid';

export interface UserPermissions {
  can_create_homeowner: boolean;
  can_edit_homeowner: boolean;
  can_delete_homeowner: boolean;
  can_view_homeowner: boolean;
  can_export_excel: boolean;
  can_manage_users: boolean;
  can_grant_permissions: boolean;
  can_view_dashboard_stats: boolean;
  can_backup_restore: boolean;
  can_view_analytics: boolean;
  can_manage_monthly_dues: boolean;
  can_view_audit_trail?: boolean;
}

export interface Profile {
  id: string;
  full_name: string;
  email?: string;
  role: UserRole;
  permissions: UserPermissions;
  status: RecordStatus;
  created_at: string;
  updated_at?: string;
}

export interface HouseholdMember {
  id: string;
  homeowner_id: string;
  member_name: string;
  relationship: string;
  created_at?: string;
}

export interface Homeowner {
  id: string;
  hoa_number?: string; // Auto-assigned HOA# in format SJV6PH4-XXXXX
  // Name fields
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  suffix?: string;
  full_name?: string;
  // Ownership fields
  ownership_type: OwnershipType;
  tenure_date?: string; // YYYY-MM-DD
  // Property owner information (for renters)
  owner_first_name?: string;
  owner_middle_name?: string;
  owner_last_name?: string;
  owner_suffix?: string;
  // Address fields
  home_number?: string;
  block_number?: string;
  lot_number?: string;
  street_name?: string;
  barangay?: string;
  address?: string; // Legacy field for compatibility
  // Existing fields
  gender: GenderType;
  birthdate: string; // YYYY-MM-DD
  age?: number;
  contact_number?: string;
  email?: string;
  registered_pets?: number;
  photo_path?: string;
  // GA Proxy fields
  ga_proxy_designated?: string;
  ga_proxy_first_name?: string;
  ga_proxy_middle_name?: string;
  ga_proxy_last_name?: string;
  ga_proxy_suffix?: string;
  ga_proxy_birthdate?: string;
  ga_proxy_gender?: GenderType;
  ga_proxy_mobile?: string;
  ga_proxy_email?: string;
  ga_proxy_photo_path?: string;
  notes?: string;
  created_by?: string;
  is_active?: number;
  created_at: string;
  updated_at?: string;
  household_members?: HouseholdMember[];

  // Legacy fields for backward compatibility
  status?: RecordStatus;
  household_count?: number;
  pet_count?: number;
  ga_proxy_name?: string;
  ga_proxy_relationship?: string;
  contact_mobile?: string;
  contact_email?: string;
}

export interface ActivityLog {
  id: string;
  user_id?: string;
  user_name: string;
  action: string;
  details?: Record<string, any>;
  created_at: string;
}

export interface MonthlyDue {
  id: string;
  homeowner_id: string;
  year: number;
  month: number;
  amount: number;
  status: PaymentStatus;
  official_receipt_number?: string;
  payment_date?: string;
  created_by?: string;
  created_at: string;
  updated_at?: string;
  homeowner?: Homeowner;
}
