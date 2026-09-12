import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { dbQuery, dbExecute } from "@/lib/db/mysql";
import { verifyPassword, publicProfile } from "@/lib/auth/local-auth";
import { cookies } from "next/headers";
import type { Profile, UserRole, UserPermissions } from "@/types/database";
import { DEFAULT_PERMISSIONS_BY_ROLE } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Find user by email
    const profiles = await dbQuery<Profile & { password_hash: string }>(
      "SELECT * FROM profiles WHERE LOWER(email) = LOWER(?) AND status = 'Active' LIMIT 1",
      [email.trim()]
    );

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const profile = Array.isArray(profiles) ? profiles[0] : profiles;

    // Verify password
    const isValidPassword = await verifyPassword(password, profile.password_hash);
    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Create session
    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await dbExecute(
      "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)",
      [sessionId, profile.id, expiresAt]
    );

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set("session", sessionId, {
      httpOnly: true,
      secure: false, // Set to false for localhost development
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    // Get all profiles for demo role switching
    const allProfiles = await dbQuery<any>(
      "SELECT id, full_name, email, role, permissions, status, created_at, updated_at FROM profiles WHERE status = 'Active' ORDER BY created_at ASC"
    );

    // Parse permissions for all profiles with error handling
    const parsedProfiles = allProfiles.map(profile => {
      const profileData = typeof profile === 'object' && '0' in profile ? profile[0] : profile;
      let parsedPermissions = profileData.permissions;
      if (typeof parsedPermissions === 'string') {
        try {
          parsedPermissions = JSON.parse(parsedPermissions);
        } catch {
          console.error(`Failed to parse permissions for profile ${profileData.id}:`, parsedPermissions?.substring(0, 100));
          parsedPermissions = DEFAULT_PERMISSIONS_BY_ROLE[profileData.role as UserRole] || DEFAULT_PERMISSIONS_BY_ROLE.user;
        }
      }
      return {
        id: profileData.id,
        full_name: profileData.full_name,
        email: profileData.email,
        role: profileData.role,
        permissions: parsedPermissions,
        status: profileData.status,
        created_at: profileData.created_at,
        updated_at: profileData.updated_at
      };
    });

    // Parse permissions for current user
    let userPermissions: UserPermissions = profile.permissions;
    if (typeof (userPermissions as any) === 'string') {
      try {
        userPermissions = JSON.parse(userPermissions as unknown as string);
      } catch {
        userPermissions = DEFAULT_PERMISSIONS_BY_ROLE[profile.role] || DEFAULT_PERMISSIONS_BY_ROLE.user;
      }
    }

    const userPublic = {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      role: profile.role,
      permissions: userPermissions,
      status: profile.status,
      created_at: profile.created_at,
      updated_at: profile.updated_at
    };

    return NextResponse.json({
      success: true,
      user: userPublic,
      profile: userPublic,
      profiles: parsedProfiles
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
