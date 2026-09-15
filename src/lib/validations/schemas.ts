import { z } from "zod";

export const UserRoleSchema = z.enum(["super_admin", "admin", "user"]);

export const OwnershipTypeSchema = z.preprocess(
  (val) => (typeof val === "string" ? val.toLowerCase().trim() : val),
  z.enum(["owner", "renter"]).default("owner")
);

export const GenderTypeSchema = z.preprocess(
  (val) => (typeof val === "string" ? val.toLowerCase().trim() : val),
  z.enum(["male", "female", "other"]).default("male")
);

export const RecordStatusSchema = z.enum(["Active", "Inactive"]);

export const UserPermissionsSchema = z.object({
  can_create_homeowner: z.boolean().default(false),
  can_edit_homeowner: z.boolean().default(false),
  can_delete_homeowner: z.boolean().default(false),
  can_view_homeowner: z.boolean().default(true),
  can_export_excel: z.boolean().default(false),
  can_manage_users: z.boolean().default(false),
  can_grant_permissions: z.boolean().default(false),
  can_view_dashboard_stats: z.boolean().default(true),
  can_backup_restore: z.boolean().default(false),
  can_view_analytics: z.boolean().default(false),
  can_manage_monthly_dues: z.boolean().default(false),
});

export const CreateUserSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name cannot exceed 100 characters"),
  email: z
    .string()
    .trim()
    .email("A valid email address is required")
    .toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  role: z.enum(["admin", "user"]).default("user"),
  permissions: UserPermissionsSchema.optional(),
});

export const HouseholdMemberSchema = z.object({
  id: z.string().optional(),
  homeowner_id: z.string().optional(),
  member_name: z.string().trim().min(1, "Member name is required"),
  relationship: z.string().trim().min(1, "Relationship is required"),
});

export const HomeownerSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required"),
  middle_name: z.string().trim().optional().nullable(),
  last_name: z.string().trim().min(1, "Last name is required"),
  suffix: z.string().trim().optional().nullable(),
  full_name: z.string().optional(),
  ownership_type: OwnershipTypeSchema,
  tenure_date: z.string().optional().nullable(),
  owner_first_name: z.string().optional().nullable(),
  owner_middle_name: z.string().optional().nullable(),
  owner_last_name: z.string().optional().nullable(),
  owner_suffix: z.string().optional().nullable(),
  home_number: z.string().optional().nullable(),
  block_number: z.string().trim().min(1, "Block number is required"),
  lot_number: z.string().trim().min(1, "Lot number is required"),
  street_name: z.string().trim().min(1, "Street name is required"),
  barangay: z.string().trim().default("Cabuyao, Laguna"),
  gender: GenderTypeSchema,
  birthdate: z.string().min(1, "Birthdate is required"),
  age: z.number().int().min(0).max(130).optional().nullable(),
  contact_number: z.string().trim().optional().nullable(),
  email: z.string().trim().email("Invalid email format").or(z.literal("")).optional().nullable(),
  registered_pets: z.number().int().min(0).default(0),
  photo_path: z.string().optional().nullable(),
  ga_proxy_designated: z.string().optional().nullable(),
  ga_proxy_first_name: z.string().optional().nullable(),
  ga_proxy_middle_name: z.string().optional().nullable(),
  ga_proxy_last_name: z.string().optional().nullable(),
  ga_proxy_suffix: z.string().optional().nullable(),
  ga_proxy_birthdate: z.string().optional().nullable(),
  ga_proxy_gender: GenderTypeSchema.optional().nullable(),
  ga_proxy_mobile: z.string().optional().nullable(),
  ga_proxy_email: z.string().optional().nullable(),
  ga_proxy_photo_path: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  is_active: z.number().int().min(0).max(1).default(1),
  household_members: z.array(HouseholdMemberSchema).optional().default([]),
});

export const BulkImportRowSchema = z.object({
  first_name: z.string().trim().min(1, "First Name is required"),
  middle_name: z.string().trim().optional().default(""),
  last_name: z.string().trim().min(1, "Last Name is required"),
  suffix: z.string().trim().optional().default(""),
  ownership_type: z
    .string()
    .transform((v) => (v.toLowerCase().trim() === "renter" ? "renter" : "owner")),
  gender: z.string().transform((v) => {
    const l = v.toLowerCase().trim();
    return l === "female" || l === "other" ? l : "male";
  }),
  birthdate: z.string().optional().default(""),
  tenure_date: z.string().optional().default(""),
  home_number: z.string().trim().optional().default(""),
  block_number: z.string().trim().min(1, "Block Number is required"),
  lot_number: z.string().trim().min(1, "Lot Number is required"),
  street_name: z.string().trim().min(1, "Street Name is required"),
  barangay: z.string().trim().optional().default("Cabuyao, Laguna"),
  contact_number: z.string().trim().optional().default(""),
  email: z.string().trim().optional().default(""),
  registered_pets: z.coerce.number().int().min(0).default(0),
  ga_proxy_first_name: z.string().trim().optional().default(""),
  ga_proxy_middle_name: z.string().trim().optional().default(""),
  ga_proxy_last_name: z.string().trim().optional().default(""),
  ga_proxy_suffix: z.string().trim().optional().default(""),
  ga_proxy_mobile: z.string().trim().optional().default(""),
  ga_proxy_email: z.string().trim().optional().default(""),
  household_members: z.string().optional().default(""),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type HomeownerInput = z.infer<typeof HomeownerSchema>;
export type HouseholdMemberInput = z.infer<typeof HouseholdMemberSchema>;
export type BulkImportRowInput = z.infer<typeof BulkImportRowSchema>;