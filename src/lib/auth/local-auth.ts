import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { cookies } from "next/headers";
import { dbQuery } from "@/lib/db/mysql";
import { DEFAULT_PERMISSIONS_BY_ROLE } from "@/lib/permissions";
import type { Profile, UserPermissions, UserRole } from "@/types/database";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [salt, key] = hash.split(":");
  if (!salt || !key) return false;
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return timingSafeEqual(Buffer.from(key, "hex"), derivedKey);
}

export function publicProfile(profile: any): Profile {
  const { password_hash, ...rest } = profile;
  return rest as Profile;
}

/**
 * Canonical server-side function to retrieve the currently authenticated user
 * from the session cookie, verified against active sessions in MySQL.
 */
export async function getCurrentUser(): Promise<Profile | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");
    if (!sessionCookie || !sessionCookie.value) return null;

    const rows = await dbQuery<any>(
      `SELECT s.id as session_id, s.expires_at, 
              p.id, p.full_name, p.email, p.role, p.permissions, p.status, p.created_at, p.updated_at 
       FROM sessions s 
       JOIN profiles p ON s.user_id = p.id 
       WHERE s.id = ? AND s.expires_at > NOW() AND p.status = 'Active' 
       LIMIT 1`,
      [sessionCookie.value]
    );

    if (!rows || rows.length === 0) {
      return null;
    }

    const userData = rows[0];

    // Safely parse permissions
    let parsedPermissions: UserPermissions = userData.permissions;
    if (typeof parsedPermissions === "string") {
      try {
        parsedPermissions = JSON.parse(parsedPermissions);
      } catch {
        parsedPermissions =
          DEFAULT_PERMISSIONS_BY_ROLE[userData.role as UserRole] ||
          DEFAULT_PERMISSIONS_BY_ROLE.user;
      }
    } else if (!parsedPermissions) {
      parsedPermissions =
        DEFAULT_PERMISSIONS_BY_ROLE[userData.role as UserRole] ||
        DEFAULT_PERMISSIONS_BY_ROLE.user;
    }

    return {
      id: userData.id,
      full_name: userData.full_name,
      email: userData.email,
      role: userData.role,
      permissions: parsedPermissions,
      status: userData.status,
      created_at: userData.created_at,
      updated_at: userData.updated_at,
    };
  } catch (error) {
    console.error("getCurrentUser error:", error);
    return null;
  }
}

export async function getCurrentProfile(): Promise<Profile | null> {
  try {
    const response = await fetch("/api/auth/me", { cache: "no-store" });
    if (!response.ok) return null;
    const result = await response.json();
    return result.currentUser || null;
  } catch {
    return null;
  }
}

