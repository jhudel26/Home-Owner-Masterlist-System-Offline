import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { dbExecute, dbQuery } from "@/lib/db/mysql";
import { hasPermission } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/error-utils";
import { publicProfile } from "@/lib/auth/local-auth";
import { cookies } from "next/headers";
import type { Profile } from "@/types/database";

export const dynamic = "force-dynamic";

async function getCurrentUser(): Promise<Profile | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie) return null;

    const session = await dbQuery<any>(
      "SELECT s.*, p.id, p.full_name, p.email, p.role, p.permissions, p.status, p.created_at, p.updated_at FROM sessions s JOIN profiles p ON s.user_id = p.id WHERE s.id = ? AND s.expires_at > NOW()",
      [sessionCookie.value]
    );

    if (!session) return null;

    // Handle both array and object formats from MySQL
    const sessionData = Array.isArray(session) ? session[0] : session;
    if (!sessionData) return null;

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

export async function POST(request: NextRequest) {
  try {
    const actor = await getCurrentUser();
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(actor, "can_backup_restore")) return NextResponse.json({ error: "Permission denied" }, { status: 403 });

    const body = await request.json();
    const { version, database, exported_at, homeowners, activityLogs } = body;

    if (!Array.isArray(homeowners)) {
      return NextResponse.json({ error: "Invalid backup format. Expected homeowners array." }, { status: 400 });
    }

    // Clear existing data - try soft delete with is_active, fallback to hard delete
    try {
      await dbExecute("DELETE FROM household_members");
      await dbExecute("UPDATE homeowners SET is_active = 0");
      await dbExecute("DELETE FROM activity_logs");
    } catch (error) {
      console.log("is_active column not found in backup cleanup, using hard delete");
      await dbExecute("DELETE FROM household_members");
      await dbExecute("DELETE FROM homeowners");
      await dbExecute("DELETE FROM activity_logs");
    }

    // Restore homeowners
    for (const homeowner of homeowners) {
      const homeownerId = homeowner.id || randomUUID();

      // Try INSERT with is_active column, fallback if it doesn't exist
      try {
        await dbExecute(
          `INSERT INTO homeowners (id, first_name, middle_name, last_name, suffix, full_name, ownership_type, tenure_date, owner_first_name, owner_middle_name, owner_last_name, owner_suffix, home_number, block_number, lot_number, street_name, barangay, gender, birthdate, age, contact_number, email, registered_pets, photo_path, ga_proxy_designated, ga_proxy_first_name, ga_proxy_middle_name, ga_proxy_last_name, ga_proxy_suffix, ga_proxy_birthdate, ga_proxy_gender, ga_proxy_mobile, ga_proxy_email, ga_proxy_photo_path, notes, created_by, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            homeownerId,
            homeowner.first_name || homeowner.full_name?.split(' ')[0] || '',
            homeowner.middle_name || null,
            homeowner.last_name || homeowner.full_name?.split(' ').slice(-1)[0] || '',
            homeowner.suffix || null,
            homeowner.full_name || null,
            homeowner.ownership_type || homeowner.ownership_status || 'owner',
            homeowner.tenure_date || homeowner.residency_start_date || null,
            homeowner.owner_first_name || homeowner.property_owner_first_name || null,
            homeowner.owner_middle_name || homeowner.property_owner_middle_name || null,
            homeowner.owner_last_name || homeowner.property_owner_last_name || null,
            homeowner.owner_suffix || homeowner.property_owner_suffix || null,
            homeowner.home_number || null,
            homeowner.block_number || null,
            homeowner.lot_number || null,
            homeowner.street_name || null,
            homeowner.barangay || 'Cabuyao, Laguna',
            homeowner.gender,
            homeowner.birthdate,
            homeowner.age,
            homeowner.contact_number || homeowner.contact_mobile || null,
            homeowner.email || homeowner.contact_email || null,
            homeowner.registered_pets || homeowner.pet_count || 0,
            homeowner.photo_path || homeowner.profile_picture || null,
            homeowner.ga_proxy_designated || homeowner.ga_proxy_name || null,
            homeowner.ga_proxy_first_name || null,
            homeowner.ga_proxy_middle_name || null,
            homeowner.ga_proxy_last_name || null,
            homeowner.ga_proxy_suffix || null,
            homeowner.ga_proxy_birthdate || null,
            homeowner.ga_proxy_gender || null,
            homeowner.ga_proxy_mobile || null,
            homeowner.ga_proxy_email || null,
            homeowner.ga_proxy_photo_path || null,
            homeowner.notes || null,
            homeowner.created_by || actor.id,
            homeowner.is_active ?? (homeowner.status === 'Active' ? 1 : 0),
            homeowner.created_at || new Date().toISOString(),
            homeowner.updated_at || null
          ]
        );
      } catch (error) {
        console.log("is_active column not found in backup INSERT, using fallback query");
        await dbExecute(
          `INSERT INTO homeowners (id, first_name, middle_name, last_name, suffix, full_name, ownership_type, tenure_date, owner_first_name, owner_middle_name, owner_last_name, owner_suffix, home_number, block_number, lot_number, street_name, barangay, gender, birthdate, age, contact_number, email, registered_pets, photo_path, ga_proxy_designated, ga_proxy_first_name, ga_proxy_middle_name, ga_proxy_last_name, ga_proxy_suffix, ga_proxy_birthdate, ga_proxy_gender, ga_proxy_mobile, ga_proxy_email, ga_proxy_photo_path, notes, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            homeownerId,
            homeowner.first_name || homeowner.full_name?.split(' ')[0] || '',
            homeowner.middle_name || null,
            homeowner.last_name || homeowner.full_name?.split(' ').slice(-1)[0] || '',
            homeowner.suffix || null,
            homeowner.full_name || null,
            homeowner.ownership_type || homeowner.ownership_status || 'owner',
            homeowner.tenure_date || homeowner.residency_start_date || null,
            homeowner.owner_first_name || homeowner.property_owner_first_name || null,
            homeowner.owner_middle_name || homeowner.property_owner_middle_name || null,
            homeowner.owner_last_name || homeowner.property_owner_last_name || null,
            homeowner.owner_suffix || homeowner.property_owner_suffix || null,
            homeowner.home_number || null,
            homeowner.block_number || null,
            homeowner.lot_number || null,
            homeowner.street_name || null,
            homeowner.barangay || 'Cabuyao, Laguna',
            homeowner.gender,
            homeowner.birthdate,
            homeowner.age,
            homeowner.contact_number || homeowner.contact_mobile || null,
            homeowner.email || homeowner.contact_email || null,
            homeowner.registered_pets || homeowner.pet_count || 0,
            homeowner.photo_path || homeowner.profile_picture || null,
            homeowner.ga_proxy_designated || homeowner.ga_proxy_name || null,
            homeowner.ga_proxy_first_name || null,
            homeowner.ga_proxy_middle_name || null,
            homeowner.ga_proxy_last_name || null,
            homeowner.ga_proxy_suffix || null,
            homeowner.ga_proxy_birthdate || null,
            homeowner.ga_proxy_gender || null,
            homeowner.ga_proxy_mobile || null,
            homeowner.ga_proxy_email || null,
            homeowner.ga_proxy_photo_path || null,
            homeowner.notes || null,
            homeowner.created_by || actor.id,
            homeowner.created_at || new Date().toISOString(),
            homeowner.updated_at || null
          ]
        );
      }

      // Restore household members
      if (Array.isArray(homeowner.household_members)) {
        for (const member of homeowner.household_members) {
          const memberId = member.id || randomUUID();
          await dbExecute(
            "INSERT INTO household_members (id, homeowner_id, member_name, relationship, created_at) VALUES (?, ?, ?, ?, ?)",
            [memberId, homeownerId, member.member_name, member.relationship, member.created_at || new Date().toISOString()]
          );
        }
      }
    }

    // Restore activity logs
    if (Array.isArray(activityLogs)) {
      for (const log of activityLogs) {
        const logId = log.id || randomUUID();
        await dbExecute(
          "INSERT INTO activity_logs (id, user_id, user_name, action, details, created_at) VALUES (?, ?, ?, ?, ?, ?)",
          [logId, log.user_id, log.user_name, log.action, JSON.stringify(log.details), log.created_at || new Date().toISOString()]
        );
      }
    }

    await dbExecute(
      "INSERT INTO activity_logs (id, user_id, user_name, action, details) VALUES (?, ?, ?, ?, ?)",
      [randomUUID(), actor.id, actor.full_name, "RESTORED_BACKUP", JSON.stringify({ version, database, exported_at, count: homeowners.length })]
    );

    return NextResponse.json({ 
      success: true, 
      count: homeowners.length 
    });
  } catch (error) {
    console.error("Restore backup error:", error);
    return NextResponse.json({ error: getErrorMessage(error) || "Failed to restore backup" }, { status: 500 });
  }
}
