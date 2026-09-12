import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db/mysql";
import { verifyPassword, publicProfile } from "@/lib/auth/local-auth";
import { cookies } from "next/headers";
import type { Profile } from "@/types/database";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie) {
      return NextResponse.json({ 
        authenticated: false, 
        currentUser: null, 
        profiles: [] 
      });
    }

    // Check if session exists and is valid
    const session = await dbQuery<any>(
      "SELECT s.id, s.user_id, s.expires_at, s.created_at, p.id as profile_id, p.full_name, p.email, p.role, p.permissions, p.status, p.created_at as profile_created_at, p.updated_at as profile_updated_at FROM sessions s JOIN profiles p ON s.user_id = p.id WHERE s.id = ? AND s.expires_at > NOW()",
      [sessionCookie.value]
    );

    if (!session) {
      // Session expired or invalid
      cookieStore.delete("session");
      return NextResponse.json({ 
        authenticated: false, 
        currentUser: null, 
        profiles: [] 
      });
    }

    // Extract the actual user data from the array format
    const sessionData = Array.isArray(session) ? session[0] : session;

    // Parse permissions if they're stored as JSON string
    let permissions = sessionData.permissions;
    if (typeof permissions === 'string') {
      try {
        permissions = JSON.parse(permissions);
      } catch {
        permissions = {};
      }
    }

    const currentUser = {
      id: sessionData.profile_id || sessionData.id,
      full_name: sessionData.full_name,
      email: sessionData.email,
      role: sessionData.role,
      permissions: permissions,
      status: sessionData.status,
      created_at: sessionData.profile_created_at || sessionData.created_at,
      updated_at: sessionData.profile_updated_at || sessionData.updated_at
    };

    // Get all profiles for demo role switching
    const profiles = await dbQuery<any>(
      "SELECT id, full_name, email, role, permissions, status, created_at, updated_at FROM profiles WHERE status = 'Active' ORDER BY created_at ASC"
    );

    // Parse permissions for all profiles with error handling
    const parsedProfiles = profiles.map(profile => {
      const profileData = typeof profile === 'object' && '0' in profile ? profile[0] : profile;
      let parsedPermissions = profileData.permissions;
      if (typeof parsedPermissions === 'string') {
        try {
          parsedPermissions = JSON.parse(parsedPermissions);
        } catch {
          console.error(`Failed to parse permissions for profile ${profileData.id}:`, parsedPermissions?.substring(0, 100));
          parsedPermissions = {};
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

    return NextResponse.json({
      authenticated: true,
      currentUser,
      profiles: parsedProfiles
    });
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json({ 
      authenticated: false, 
      currentUser: null, 
      profiles: [] 
    });
  }
}
