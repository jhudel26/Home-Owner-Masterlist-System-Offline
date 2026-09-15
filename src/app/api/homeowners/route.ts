import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { dbExecute, dbQuery } from "@/lib/db/mysql";
import { hasPermission } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/error-utils";
import { getCurrentUser } from "@/lib/auth/local-auth";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import type { ActivityLog } from "@/types/database";

export const dynamic = "force-dynamic";

// File upload helper - saves uploaded file to disk and returns the file path
async function saveUploadedFile(file: File | null): Promise<string | null> {
  if (!file || file.size === 0) return null;

  // In production UPLOAD_DIR points to the persistent ProgramData directory.
  // In development it falls back to <project-root>/public/uploads.
  const uploadsDir =
    process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
  if (!existsSync(/*turbopackIgnore: true*/ uploadsDir)) {
    await mkdir(uploadsDir, { recursive: true });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const safeName = path.basename(file.name).replace(/[^a-zA-Z0-9.-]/g, '_');
  const filename = `${uniqueSuffix}-${safeName}`;
  const filepath = path.join(uploadsDir, filename);

  await writeFile(filepath, buffer);

  return `/uploads/${filename}`;
}

export async function GET() {
  try {
    const actor = await getCurrentUser();
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(actor, "can_view_homeowner")) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Get all homeowners (both active and inactive)
    let homeowners;
    try {
      homeowners = await dbQuery<any>(
        "SELECT h.* FROM homeowners h ORDER BY h.created_at DESC"
      );
    } catch (error) {
      console.log("Error fetching homeowners:", error);
      homeowners = [];
    }

    // Get household members separately for compatibility with older MySQL versions
    let householdMembers;
    const homeownerIds = homeowners.map(h => h.id);
    if (homeownerIds.length > 0) {
      householdMembers = await dbQuery<any>(
        `SELECT * FROM household_members WHERE homeowner_id IN (${homeownerIds.map(() => '?').join(',')})`,
        homeownerIds
      );
    } else {
      householdMembers = [];
    }

    // Map household members to homeowners
    const homeownersWithMembers = homeowners.map(homeowner => {
      const members = householdMembers
        .filter(member => member.homeowner_id === homeowner.id)
        .map(member => ({
          id: member.id,
          homeowner_id: member.homeowner_id,
          member_name: member.member_name,
          relationship: member.relationship,
          created_at: member.created_at
        }));
      return { ...homeowner, household_members: members };
    });

    const activityLogs = await dbQuery<ActivityLog>("SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 50");

    return NextResponse.json({
      homeowners: homeownersWithMembers,
      activityLogs
    });
  } catch (error) {
    console.error("Get homeowners error:", error);
    return NextResponse.json({ error: "Failed to load homeowners data" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = await getCurrentUser();
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(actor, "can_edit_homeowner")) return NextResponse.json({ error: "Permission denied" }, { status: 403 });

    const body = await request.json();
    const { id, is_active } = body;

    if (!id || typeof is_active !== 'number') {
      return NextResponse.json({ error: "Missing required fields: id and is_active" }, { status: 400 });
    }

    // Update homeowner status
    await dbExecute(
      "UPDATE homeowners SET is_active = ?, updated_at = NOW() WHERE id = ?",
      [is_active, id]
    );

    // Log the activity
    const activityId = randomUUID();
    const homeowner = await dbQuery<any>("SELECT full_name FROM homeowners WHERE id = ?", [id]);
    const homeownerName = homeowner && homeowner.length > 0 ? homeowner[0].full_name : "Unknown";
    
    await dbExecute(
      "INSERT INTO activity_logs (id, user_id, user_name, action, details) VALUES (?, ?, ?, ?, ?)",
      [activityId, actor.id, actor.full_name, "UPDATED_STATUS", JSON.stringify({ homeowner_id: id, name: homeownerName, full_name: homeownerName, is_active })]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update status error:", error);
    return NextResponse.json({ error: getErrorMessage(error) || "Failed to update status" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await getCurrentUser();
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(actor, "can_create_homeowner")) return NextResponse.json({ error: "Permission denied" }, { status: 403 });

    const formData = await request.formData();
    
    const homeownerData = formData.get("homeowner") as string;
    const membersData = formData.get("members") as string;
    const photoFile = formData.get("photo") as File | null;
    const gaProxyPhotoFile = formData.get("ga_proxy_photo") as File | null;

    if (!homeownerData) {
      return NextResponse.json({ error: "Missing homeowner data in request" }, { status: 400 });
    }

    const homeowner = JSON.parse(homeownerData);
    const members = membersData ? JSON.parse(membersData) : [];

    const homeownerId = randomUUID();

    // Process and save images to file system
    const photoPath = await saveUploadedFile(photoFile);
    const gaProxyPath = await saveUploadedFile(gaProxyPhotoFile);

    // Combine name parts for full_name
    const fullName = [homeowner.first_name, homeowner.middle_name, homeowner.last_name, homeowner.suffix]
      .filter(Boolean)
      .join(' ');

    // Check if is_active column exists before using it in INSERT
    try {
      await dbExecute(
        `INSERT INTO homeowners (id, first_name, middle_name, last_name, suffix, full_name, ownership_type, tenure_date, owner_first_name, owner_middle_name, owner_last_name, owner_suffix, home_number, block_number, lot_number, street_name, barangay, gender, birthdate, age, contact_number, email, registered_pets, photo_path, ga_proxy_designated, ga_proxy_first_name, ga_proxy_middle_name, ga_proxy_last_name, ga_proxy_suffix, ga_proxy_birthdate, ga_proxy_gender, ga_proxy_mobile, ga_proxy_email, ga_proxy_photo_path, notes, created_by, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          homeownerId,
          homeowner.first_name,
          homeowner.middle_name || null,
          homeowner.last_name,
          homeowner.suffix || null,
          fullName,
          homeowner.ownership_type,
          homeowner.tenure_date || null,
          homeowner.owner_first_name || null,
          homeowner.owner_middle_name || null,
          homeowner.owner_last_name || null,
          homeowner.owner_suffix || null,
          homeowner.home_number || null,
          homeowner.block_number,
          homeowner.lot_number,
          homeowner.street_name || null,
          homeowner.barangay || 'Cabuyao, Laguna',
          homeowner.gender,
          homeowner.birthdate,
          homeowner.age,
          homeowner.contact_number || null,
          homeowner.email || null,
          homeowner.registered_pets || 0,
          photoPath,
          homeowner.ga_proxy_designated || null,
          homeowner.ga_proxy_first_name || null,
          homeowner.ga_proxy_middle_name || null,
          homeowner.ga_proxy_last_name || null,
          homeowner.ga_proxy_suffix || null,
          homeowner.ga_proxy_birthdate || null,
          homeowner.ga_proxy_gender || null,
          homeowner.ga_proxy_mobile || null,
          homeowner.ga_proxy_email || null,
          gaProxyPath,
          homeowner.notes || null,
          actor.id
        ]
      );
    } catch (error) {
      // Fallback if is_active column doesn't exist
      console.log("is_active column not found in INSERT, using fallback query");
      await dbExecute(
        `INSERT INTO homeowners (id, first_name, middle_name, last_name, suffix, full_name, ownership_type, tenure_date, owner_first_name, owner_middle_name, owner_last_name, owner_suffix, home_number, block_number, lot_number, street_name, barangay, gender, birthdate, age, contact_number, email, registered_pets, photo_path, ga_proxy_designated, ga_proxy_first_name, ga_proxy_middle_name, ga_proxy_last_name, ga_proxy_suffix, ga_proxy_birthdate, ga_proxy_gender, ga_proxy_mobile, ga_proxy_email, ga_proxy_photo_path, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          homeownerId,
          homeowner.first_name,
          homeowner.middle_name || null,
          homeowner.last_name,
          homeowner.suffix || null,
          fullName,
          homeowner.ownership_type,
          homeowner.tenure_date || null,
          homeowner.owner_first_name || null,
          homeowner.owner_middle_name || null,
          homeowner.owner_last_name || null,
          homeowner.owner_suffix || null,
          homeowner.home_number || null,
          homeowner.block_number,
          homeowner.lot_number,
          homeowner.street_name || null,
          homeowner.barangay || 'Cabuyao, Laguna',
          homeowner.gender,
          homeowner.birthdate,
          homeowner.age,
          homeowner.contact_number || null,
          homeowner.email || null,
          homeowner.registered_pets || 0,
          photoPath,
          homeowner.ga_proxy_designated || null,
          homeowner.ga_proxy_first_name || null,
          homeowner.ga_proxy_middle_name || null,
          homeowner.ga_proxy_last_name || null,
          homeowner.ga_proxy_suffix || null,
          homeowner.ga_proxy_birthdate || null,
          homeowner.ga_proxy_gender || null,
          homeowner.ga_proxy_mobile || null,
          homeowner.ga_proxy_email || null,
          gaProxyPath,
          homeowner.notes || null,
          actor.id
        ]
      );
    }

    for (const member of members) {
      const memberId = randomUUID();
      await dbExecute(
        "INSERT INTO household_members (id, homeowner_id, member_name, relationship) VALUES (?, ?, ?, ?)",
        [memberId, homeownerId, member.member_name, member.relationship]
      );
    }

    const address = homeowner.street_name || (homeowner.block_number ? `Block ${homeowner.block_number} Lot ${homeowner.lot_number}` : 'Phase 4');
    const activityId = randomUUID();
    await dbExecute(
      "INSERT INTO activity_logs (id, user_id, user_name, action, details) VALUES (?, ?, ?, ?, ?)",
      [activityId, actor.id, actor.full_name, "CREATED_HOMEOWNER", JSON.stringify({ homeowner_id: homeownerId, name: fullName, full_name: fullName, address })]
    );

    const newHomeowner = await dbQuery<any>(
      "SELECT h.* FROM homeowners h WHERE h.id = ?",
      [homeownerId]
    );

    if (!newHomeowner || newHomeowner.length === 0) {
      throw new Error("Failed to retrieve newly created homeowner");
    }

    const newHouseholdMembers = await dbQuery<any>(
      "SELECT * FROM household_members WHERE homeowner_id = ?",
      [homeownerId]
    );

    const homeownerWithMembers = {
      ...newHomeowner[0],
      household_members: newHouseholdMembers.map(member => ({
        id: member.id,
        homeowner_id: member.homeowner_id,
        member_name: member.member_name,
        relationship: member.relationship,
        created_at: member.created_at
      }))
    };

    const activity = await dbQuery<ActivityLog>("SELECT * FROM activity_logs WHERE id = ?", [activityId]);

    return NextResponse.json({
      success: true,
      homeowner: homeownerWithMembers,
      activity: activity[0] || null
    });
  } catch (error) {
    console.error("Create homeowner error:", error);
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: getErrorMessage(error) || "Failed to create homeowner" }, { status: 500 });
  }
}
