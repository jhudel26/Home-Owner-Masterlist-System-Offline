import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { dbTransaction } from "@/lib/db/mysql";
import { hasPermission } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/error-utils";
import { getCurrentUser } from "@/lib/auth/local-auth";

export const dynamic = "force-dynamic";

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

    // Wrap the entire restore in a transaction so the database is never left in a partial state.
    await dbTransaction(async (conn) => {
      // Clear existing data
      await conn.execute("DELETE FROM household_members");
      await conn.execute("DELETE FROM activity_logs");
      try {
        await conn.execute("UPDATE homeowners SET is_active = 0");
      } catch {
        // is_active column doesn't exist - hard delete instead
        await conn.execute("DELETE FROM homeowners");
      }

      // Restore homeowners
      for (const homeowner of homeowners) {
        const homeownerId = homeowner.id || randomUUID();

        // 39 columns -> 39 placeholders (primary, includes is_active)
        try {
          await conn.execute(
            `INSERT INTO homeowners (id, first_name, middle_name, last_name, suffix, full_name, ownership_type, tenure_date, owner_first_name, owner_middle_name, owner_last_name, owner_suffix, home_number, block_number, lot_number, street_name, barangay, gender, birthdate, age, contact_number, email, registered_pets, photo_path, ga_proxy_designated, ga_proxy_first_name, ga_proxy_middle_name, ga_proxy_last_name, ga_proxy_suffix, ga_proxy_birthdate, ga_proxy_gender, ga_proxy_mobile, ga_proxy_email, ga_proxy_photo_path, notes, created_by, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
              homeowner.updated_at || null,
            ]
          );
        } catch {
          // Fallback without is_active column -> 38 columns -> 38 placeholders
          await conn.execute(
            `INSERT INTO homeowners (id, first_name, middle_name, last_name, suffix, full_name, ownership_type, tenure_date, owner_first_name, owner_middle_name, owner_last_name, owner_suffix, home_number, block_number, lot_number, street_name, barangay, gender, birthdate, age, contact_number, email, registered_pets, photo_path, ga_proxy_designated, ga_proxy_first_name, ga_proxy_middle_name, ga_proxy_last_name, ga_proxy_suffix, ga_proxy_birthdate, ga_proxy_gender, ga_proxy_mobile, ga_proxy_email, ga_proxy_photo_path, notes, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
              homeowner.updated_at || null,
            ]
          );
        }

        // Restore household members
        if (Array.isArray(homeowner.household_members)) {
          for (const member of homeowner.household_members) {
            const memberId = member.id || randomUUID();
            await conn.execute(
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
          await conn.execute(
            "INSERT INTO activity_logs (id, user_id, user_name, action, details, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            [logId, log.user_id, log.user_name, log.action, JSON.stringify(log.details), log.created_at || new Date().toISOString()]
          );
        }
      }

      // Log the restore action itself
      await conn.execute(
        "INSERT INTO activity_logs (id, user_id, user_name, action, details) VALUES (?, ?, ?, ?, ?)",
        [randomUUID(), actor.id, actor.full_name, "RESTORED_BACKUP", JSON.stringify({ version, database, exported_at, count: homeowners.length })]
      );
    });

    return NextResponse.json({ 
      success: true, 
      count: homeowners.length 
    });
  } catch (error) {
    console.error("Restore backup error:", error);
    return NextResponse.json({ error: getErrorMessage(error) || "Failed to restore backup" }, { status: 500 });
  }
}
