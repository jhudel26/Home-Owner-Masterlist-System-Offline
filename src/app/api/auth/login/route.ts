import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { dbQuery, dbExecute } from "@/lib/db/mysql";
import { verifyPassword } from "@/lib/auth/local-auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { cookies } from "next/headers";
import type { Profile, UserRole, UserPermissions } from "@/types/database";
import { DEFAULT_PERMISSIONS_BY_ROLE } from "@/lib/permissions";

export const dynamic = "force-dynamic";

function isPrivateIP(hostname: string): boolean {
  // Check for localhost
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  
  // Check for private IP ranges
  const parts = hostname.split(".");
  if (parts.length !== 4) return false;
  
  const first = parseInt(parts[0], 10);
  const second = parseInt(parts[1], 10);
  
  // 10.0.0.0 - 10.255.255.255
  if (first === 10) return true;
  
  // 172.16.0.0 - 172.31.255.255
  if (first === 172 && second >= 16 && second <= 31) return true;
  
  // 192.168.0.0 - 192.168.255.255
  if (first === 192 && second === 168) return true;
  
  return false;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 10 attempts per minute per IP
    const clientIp = getClientIp(request.headers);
    const rateCheck = rateLimit(`login_${clientIp}`, { limit: 10, windowMs: 60 * 1000 });
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many login attempts. Please try again in ${rateCheck.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

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
    const isProduction = process.env.NODE_ENV === "production";
    const isLocalhost = request.nextUrl.hostname === "localhost" || request.nextUrl.hostname === "127.0.0.1";
    const isPrivateNetwork = isPrivateIP(request.nextUrl.hostname);

    // For LAN access, use non-secure cookies with lax sameSite to work across devices
    const cookieOptions = {
      httpOnly: true,
      secure: false, // Always false for LAN access compatibility
      sameSite: "lax" as const,
      expires: expiresAt,
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    };

    cookieStore.set("session", sessionId, cookieOptions);

    // Parse permissions for current user
    let userPermissions: UserPermissions = profile.permissions;
    if (typeof (userPermissions as any) === "string") {
      try {
        userPermissions = JSON.parse(userPermissions as unknown as string);
      } catch {
        userPermissions = DEFAULT_PERMISSIONS_BY_ROLE[profile.role as UserRole] || DEFAULT_PERMISSIONS_BY_ROLE.user;
      }
    } else if (!userPermissions) {
      userPermissions = DEFAULT_PERMISSIONS_BY_ROLE[profile.role as UserRole] || DEFAULT_PERMISSIONS_BY_ROLE.user;
    }

    const userPublic = {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      role: profile.role,
      permissions: userPermissions,
      status: profile.status,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    };

    // Log login activity
    try {
      await dbExecute(
        "INSERT INTO activity_logs (id, user_id, user_name, action, details) VALUES (?, ?, ?, ?, ?)",
        [
          randomUUID(),
          profile.id,
          profile.full_name,
          "LOGGED_IN",
          JSON.stringify({ email: profile.email, role: profile.role }),
        ]
      );
    } catch (_) {}

    return NextResponse.json({
      success: true,
      user: userPublic,
      profile: userPublic,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

