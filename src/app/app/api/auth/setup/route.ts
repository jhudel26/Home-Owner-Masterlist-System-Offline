import { NextResponse, NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { dbExecute, dbQuery } from "@/lib/db/mysql";
import { hashPassword } from "@/lib/auth/local-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { full_name, email, password } = body;

    // Validate input
    if (!full_name || !email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long" }, { status: 400 });
    }

    // Check if setup is still needed (no users exist)
    const existingUsers = await dbQuery<any>("SELECT COUNT(*) as count FROM profiles");
    const userData = Array.isArray(existingUsers) ? existingUsers[0] : existingUsers;
    const userCount = userData?.count || 0;

    if (userCount > 0) {
      return NextResponse.json({ error: "Setup already completed" }, { status: 400 });
    }

    // Check if email already exists (shouldn't happen, but safety check)
    const existingEmail = await dbQuery<any>("SELECT id FROM profiles WHERE email = ?", [email]);
    if (existingEmail && (Array.isArray(existingEmail) ? existingEmail.length > 0 : existingEmail)) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create admin account with full permissions
    const adminId = randomUUID();
    const permissions = JSON.stringify({
      can_create_homeowner: true,
      can_edit_homeowner: true,
      can_delete_homeowner: true,
      can_view_homeowner: true,
      can_export_excel: true,
      can_manage_users: true,
      can_grant_permissions: true,
      can_view_dashboard_stats: true,
      can_backup_restore: true,
      can_view_analytics: true,
      can_manage_monthly_dues: true,
    });

    await dbExecute(
      `INSERT INTO profiles (id, full_name, email, password_hash, role, permissions, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [adminId, full_name.trim(), email.trim().toLowerCase(), passwordHash, 'super_admin', permissions, 'Active']
    );

    // Log the setup activity
    const activityId = randomUUID();
    await dbExecute(
      "INSERT INTO activity_logs (id, user_id, user_name, action, details) VALUES (?, ?, ?, ?, ?)",
      [activityId, adminId, full_name, "SYSTEM_SETUP", JSON.stringify({ action: "Initial admin account created" })]
    );

    return NextResponse.json({ 
      success: true,
      message: "Admin account created successfully"
    });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json({ error: "Failed to create admin account" }, { status: 500 });
  }
}
