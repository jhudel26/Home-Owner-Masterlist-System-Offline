import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { dbExecute, dbQuery } from "@/lib/db/mysql";
import { hashPassword, publicProfile } from "@/lib/auth/local-auth";
import { DEFAULT_PERMISSIONS_BY_ROLE, canManageRole, hasPermission } from "@/lib/permissions";
import { CreateUserSchema } from "@/lib/validations/schemas";
import { getErrorMessage } from "@/lib/error-utils";
import { cookies } from "next/headers";
import type { Profile, UserPermissions, UserRole } from "@/types/database";

export const dynamic = "force-dynamic";

type ProfileRow = Profile & { password_hash?: string };

async function getCurrentUser(): Promise<Profile | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie) return null;

    const session = await dbQuery<any>(
      "SELECT s.*, p.id, p.full_name, p.email, p.role, p.permissions, p.status, p.created_at, p.updated_at FROM sessions s JOIN profiles p ON s.user_id = p.id WHERE s.id = ? AND s.expires_at > NOW()",
      [sessionCookie.value]
    );

    if (!session || session.length === 0) return null;

    const sessionData = session[0];

    // Parse permissions if they're stored as JSON string
    let permissions = sessionData.permissions;
    if (typeof permissions === 'string') {
      try {
        permissions = JSON.parse(permissions);
      } catch {
        permissions = {};
      }
    }

    return {
      id: sessionData.id,
      full_name: sessionData.full_name,
      email: sessionData.email,
      role: sessionData.role,
      permissions: permissions,
      status: sessionData.status,
      created_at: sessionData.created_at,
      updated_at: sessionData.updated_at
    };
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const actor = await getCurrentUser();
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(actor, "can_manage_users")) return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    const rows = await dbQuery<ProfileRow>("SELECT id, full_name, email, role, permissions, status, created_at, updated_at FROM profiles ORDER BY created_at ASC");

    // Parse permissions for each profile with error handling
    const parsedProfiles = rows.map(profile => {
      let parsedPermissions: any = profile.permissions;
      if (typeof parsedPermissions === 'string') {
        try {
          parsedPermissions = JSON.parse(parsedPermissions);
        } catch {
          console.error(`Failed to parse permissions for profile ${profile.id}:`, String(parsedPermissions).substring(0, 100));
          parsedPermissions = DEFAULT_PERMISSIONS_BY_ROLE[profile.role] || DEFAULT_PERMISSIONS_BY_ROLE.user;
        }
      }
      return {
        ...profile,
        permissions: parsedPermissions
      };
    });

    return NextResponse.json({ profiles: parsedProfiles });
  } catch { return NextResponse.json({ error: "Local MySQL is unavailable." }, { status: 503 }); }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await getCurrentUser();
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const raw = await request.json();
    const parsed = CreateUserSchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: getErrorMessage(parsed.error) }, { status: 400 });
    const { full_name, email, password, role, permissions } = parsed.data;
    if (!canManageRole(actor, role as UserRole)) return NextResponse.json({ error: "You do not have permission to create this role." }, { status: 403 });

    const existing = await dbQuery<Profile[]>("SELECT id FROM profiles WHERE LOWER(email)=LOWER(?) LIMIT 1", [email.trim()]);
    if (existing.length) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });

    const userId = randomUUID();
    const userPermissions = (permissions || DEFAULT_PERMISSIONS_BY_ROLE[role as UserRole]) as UserPermissions;
    const passwordHash = await hashPassword(password);

    await dbExecute(
      `INSERT INTO profiles (id, full_name, email, password_hash, role, permissions, status) VALUES (?, ?, ?, ?, ?, ?, 'Active')`,
      [userId, full_name.trim(), email.trim().toLowerCase(), passwordHash, role, JSON.stringify(userPermissions)]
    );

    const rows = await dbQuery<ProfileRow[]>("SELECT id, full_name, email, role, permissions, status, created_at, updated_at FROM profiles WHERE id=?", [userId]);
    await dbExecute("INSERT INTO activity_logs (id, user_id, user_name, action, details) VALUES (?, ?, ?, ?, ?)", [randomUUID(), actor.id, actor.full_name, "CREATED_USER", JSON.stringify({ email: email.trim(), role })]);
    return NextResponse.json({ success: true, profile: publicProfile(rows[0]) }, { status: 201 });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: getErrorMessage(error) || "Failed to create user." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const actor = await getCurrentUser();
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(actor, "can_manage_users") && !hasPermission(actor, "can_grant_permissions")) return NextResponse.json({ error: "Permission denied" }, { status: 403 });

    const body = await request.json();
    const userId = String(body.id || "");
    if (!userId) return NextResponse.json({ error: "User ID is required." }, { status: 400 });

    const rows = await dbQuery<Profile>("SELECT id, full_name, email, role, permissions, status, created_at, updated_at FROM profiles WHERE id=? LIMIT 1", [userId]);
    const target = rows[0];
    if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

    if (body.permissions !== undefined) {
      if (!hasPermission(actor, "can_grant_permissions")) return NextResponse.json({ error: "Grant Permissions permission required." }, { status: 403 });
      await dbExecute("UPDATE profiles SET permissions=?, updated_at=UTC_TIMESTAMP() WHERE id=?", [JSON.stringify(body.permissions as UserPermissions), userId]);
    }
    if (body.status !== undefined) {
      if (!hasPermission(actor, "can_manage_users")) return NextResponse.json({ error: "Manage Accounts permission required." }, { status: 403 });
      if (target.id === actor.id && body.status === "Inactive") return NextResponse.json({ error: "You cannot deactivate your own account." }, { status: 400 });
      await dbExecute("UPDATE profiles SET status=?, updated_at=UTC_TIMESTAMP() WHERE id=?", [body.status, userId]);
    }

    // Super admin only: update identity fields (full_name, email, password)
    if (body.full_name !== undefined || body.email !== undefined || body.password !== undefined) {
      if (actor.role !== "super_admin") {
        return NextResponse.json({ error: "Only the Super Admin can edit account identity fields." }, { status: 403 });
      }
      if (target.role === "super_admin" && target.id !== actor.id) {
        return NextResponse.json({ error: "Cannot edit another Super Admin account." }, { status: 403 });
      }

      // Check email uniqueness if being changed
      if (body.email !== undefined && body.email.trim().toLowerCase() !== (target.email || "").toLowerCase()) {
        const existing = await dbQuery<Profile[]>("SELECT id FROM profiles WHERE LOWER(email)=LOWER(?) AND id != ? LIMIT 1", [body.email.trim(), userId]);
        if (existing.length) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
      }

      if (body.full_name !== undefined && body.email !== undefined && body.password !== undefined) {
        // Update all three
        const passwordHash = await hashPassword(body.password);
        await dbExecute(
          "UPDATE profiles SET full_name=?, email=?, password_hash=?, updated_at=UTC_TIMESTAMP() WHERE id=?",
          [body.full_name.trim(), body.email.trim().toLowerCase(), passwordHash, userId]
        );
      } else if (body.full_name !== undefined && body.email !== undefined) {
        // Update name + email only
        await dbExecute(
          "UPDATE profiles SET full_name=?, email=?, updated_at=UTC_TIMESTAMP() WHERE id=?",
          [body.full_name.trim(), body.email.trim().toLowerCase(), userId]
        );
      } else if (body.full_name !== undefined) {
        await dbExecute("UPDATE profiles SET full_name=?, updated_at=UTC_TIMESTAMP() WHERE id=?", [body.full_name.trim(), userId]);
      } else if (body.email !== undefined) {
        await dbExecute("UPDATE profiles SET email=?, updated_at=UTC_TIMESTAMP() WHERE id=?", [body.email.trim().toLowerCase(), userId]);
      }
      if (body.password !== undefined && !(body.full_name !== undefined && body.email !== undefined)) {
        const passwordHash = await hashPassword(body.password);
        await dbExecute("UPDATE profiles SET password_hash=?, updated_at=UTC_TIMESTAMP() WHERE id=?", [passwordHash, userId]);
      }

      // Log the edit action
      await dbExecute(
        "INSERT INTO activity_logs (id, user_id, user_name, action, details) VALUES (?, ?, ?, ?, ?)",
        [randomUUID(), actor.id, actor.full_name, "EDITED_USER", JSON.stringify({ target_user: body.full_name || target.full_name, email: body.email || target.email })]
      );
    }

    const updated = await dbQuery<ProfileRow[]>("SELECT id, full_name, email, role, permissions, status, created_at, updated_at FROM profiles WHERE id=?", [userId]);
    return NextResponse.json({ success: true, profile: publicProfile(updated[0]) });
  } catch (error) { return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 }); }
}

