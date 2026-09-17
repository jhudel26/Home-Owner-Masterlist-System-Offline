import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { dbExecute, dbQuery } from "@/lib/db/mysql";
import { hasPermission } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/error-utils";
import { getCurrentUser } from "@/lib/auth/local-auth";
import { saveUploadedFile } from "@/lib/file-upload";
import type { ActivityLog } from "@/types/database";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getCurrentUser();
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(actor, "can_view_homeowner")) return NextResponse.json({ error: "Permission denied" }, { status: 403 });

    const { id } = await params;

    const homeowner = await dbQuery<any>(
      "SELECT h.* FROM homeowners h WHERE h.id = ?",
      [id]
    );

    if (!homeowner || homeowner.length === 0) {
      return NextResponse.json({ error: "Homeowner not found" }, { status: 404 });
    }

    const householdMembers = await dbQuery<any>(
      "SELECT * FROM household_members WHERE homeowner_id = ?",
      [id]
    );

    const homeownerWithMembers = {
      ...homeowner[0],
      household_members: householdMembers.map(member => ({
        id: member.id,
        homeowner_id: member.homeowner_id,
        member_name: member.member_name,
        relationship: member.relationship,
        created_at: member.created_at
      }))
    };

    return NextResponse.json({ success: true, data: homeownerWithMembers });
  } catch (error) {
    console.error("Get homeowner error:", error);
    return NextResponse.json({ error: "Failed to fetch homeowner" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getCurrentUser();
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(actor, "can_edit_homeowner")) return NextResponse.json({ error: "Permission denied" }, { status: 403 });

    const { id } = await params;
    const formData = await request.formData();

    const homeownerData = formData.get("homeowner") as string;
    const membersData = formData.get("members") as string;
    const photoFile = formData.get("photo") as File | null;
    const gaProxyPhotoFile = formData.get("ga_proxy_photo") as File | null;

    const updates = homeownerData ? JSON.parse(homeownerData) : {};
    const members = membersData ? JSON.parse(membersData) : undefined;

    let photoPath: string | null = null;
    let gaProxyPath: string | null = null;

    if (photoFile && photoFile.size > 0) {
      photoPath = await saveUploadedFile(photoFile);
    }
    if (gaProxyPhotoFile && gaProxyPhotoFile.size > 0) {
      gaProxyPath = await saveUploadedFile(gaProxyPhotoFile);
    }

    // Update homeowner
    const updateFields = [];
    const updateValues = [];

    if (updates.first_name !== undefined) {
      updateFields.push("first_name = ?");
      updateValues.push(updates.first_name);
    }
    if (updates.middle_name !== undefined) {
      updateFields.push("middle_name = ?");
      updateValues.push(updates.middle_name);
    }
    if (updates.last_name !== undefined) {
      updateFields.push("last_name = ?");
      updateValues.push(updates.last_name);
    }
    if (updates.suffix !== undefined) {
      updateFields.push("suffix = ?");
      updateValues.push(updates.suffix);
    }
    if (updates.full_name !== undefined) {
      updateFields.push("full_name = ?");
      updateValues.push(updates.full_name);
    }
    if (updates.ownership_type !== undefined) {
      updateFields.push("ownership_type = ?");
      updateValues.push(updates.ownership_type);
    }
    if (updates.tenure_date !== undefined) {
      updateFields.push("tenure_date = ?");
      updateValues.push(updates.tenure_date);
    }
    if (updates.owner_first_name !== undefined) {
      updateFields.push("owner_first_name = ?");
      updateValues.push(updates.owner_first_name);
    }
    if (updates.owner_middle_name !== undefined) {
      updateFields.push("owner_middle_name = ?");
      updateValues.push(updates.owner_middle_name);
    }
    if (updates.owner_last_name !== undefined) {
      updateFields.push("owner_last_name = ?");
      updateValues.push(updates.owner_last_name);
    }
    if (updates.owner_suffix !== undefined) {
      updateFields.push("owner_suffix = ?");
      updateValues.push(updates.owner_suffix);
    }
    if (updates.home_number !== undefined) {
      updateFields.push("home_number = ?");
      updateValues.push(updates.home_number);
    }
    if (updates.block_number !== undefined) {
      updateFields.push("block_number = ?");
      updateValues.push(updates.block_number);
    }
    if (updates.lot_number !== undefined) {
      updateFields.push("lot_number = ?");
      updateValues.push(updates.lot_number);
    }
    if (updates.street_name !== undefined) {
      updateFields.push("street_name = ?");
      updateValues.push(updates.street_name);
    }
    if (updates.barangay !== undefined) {
      updateFields.push("barangay = ?");
      updateValues.push(updates.barangay);
    }
    if (updates.gender !== undefined) {
      updateFields.push("gender = ?");
      updateValues.push(updates.gender);
    }
    if (updates.birthdate !== undefined) {
      updateFields.push("birthdate = ?");
      updateValues.push(updates.birthdate);
    }
    if (updates.age !== undefined) {
      updateFields.push("age = ?");
      updateValues.push(updates.age);
    }
    if (updates.contact_number !== undefined) {
      updateFields.push("contact_number = ?");
      updateValues.push(updates.contact_number);
    }
    if (updates.email !== undefined) {
      updateFields.push("email = ?");
      updateValues.push(updates.email);
    }
    if (updates.registered_pets !== undefined) {
      updateFields.push("registered_pets = ?");
      updateValues.push(updates.registered_pets);
    }
    if (photoPath !== null) {
      updateFields.push("photo_path = ?");
      updateValues.push(photoPath);
    }
    if (updates.ga_proxy_designated !== undefined) {
      updateFields.push("ga_proxy_designated = ?");
      updateValues.push(updates.ga_proxy_designated);
    }
    if (updates.ga_proxy_first_name !== undefined) {
      updateFields.push("ga_proxy_first_name = ?");
      updateValues.push(updates.ga_proxy_first_name);
    }
    if (updates.ga_proxy_middle_name !== undefined) {
      updateFields.push("ga_proxy_middle_name = ?");
      updateValues.push(updates.ga_proxy_middle_name);
    }
    if (updates.ga_proxy_last_name !== undefined) {
      updateFields.push("ga_proxy_last_name = ?");
      updateValues.push(updates.ga_proxy_last_name);
    }
    if (updates.ga_proxy_suffix !== undefined) {
      updateFields.push("ga_proxy_suffix = ?");
      updateValues.push(updates.ga_proxy_suffix);
    }
    if (updates.ga_proxy_birthdate !== undefined) {
      updateFields.push("ga_proxy_birthdate = ?");
      updateValues.push(updates.ga_proxy_birthdate);
    }
    if (updates.ga_proxy_gender !== undefined) {
      updateFields.push("ga_proxy_gender = ?");
      updateValues.push(updates.ga_proxy_gender);
    }
    if (updates.ga_proxy_mobile !== undefined) {
      updateFields.push("ga_proxy_mobile = ?");
      updateValues.push(updates.ga_proxy_mobile);
    }
    if (updates.ga_proxy_email !== undefined) {
      updateFields.push("ga_proxy_email = ?");
      updateValues.push(updates.ga_proxy_email);
    }
    if (gaProxyPath !== null) {
      updateFields.push("ga_proxy_photo_path = ?");
      updateValues.push(gaProxyPath);
    }
    if (updates.notes !== undefined) {
      updateFields.push("notes = ?");
      updateValues.push(updates.notes);
    }
    if (updates.is_active !== undefined) {
      try {
        updateFields.push("is_active = ?");
        updateValues.push(updates.is_active);
      } catch (error) {
        console.log("is_active column not found in UPDATE, skipping");
      }
    }

    if (updateFields.length > 0) {
      updateFields.push("updated_at = UTC_TIMESTAMP()");
      updateValues.push(id);
      await dbExecute(
        `UPDATE homeowners SET ${updateFields.join(", ")} WHERE id = ?`,
        updateValues
      );
    }

    // Update household members
    if (members !== undefined) {
      // Delete existing members
      await dbExecute("DELETE FROM household_members WHERE homeowner_id = ?", [id]);

      // Insert new members
      for (const member of members) {
        const memberId = randomUUID();
        await dbExecute(
          "INSERT INTO household_members (id, homeowner_id, member_name, relationship) VALUES (?, ?, ?, ?)",
          [memberId, id, member.member_name, member.relationship]
        );
      }
    }

    // Retrieve homeowner name for activity logging
    const currentHO = await dbQuery<any>("SELECT full_name FROM homeowners WHERE id = ?", [id]);
    const hoName = updates.full_name || (currentHO && currentHO[0]?.full_name) || "a homeowner";

    const activityId = randomUUID();
    await dbExecute(
      "INSERT INTO activity_logs (id, user_id, user_name, action, details) VALUES (?, ?, ?, ?, ?)",
      [activityId, actor.id, actor.full_name, "UPDATED_HOMEOWNER", JSON.stringify({ homeowner_id: id, name: hoName, full_name: hoName, updates })]
    );

    const updatedHomeowner = await dbQuery<any>(
      "SELECT h.* FROM homeowners h WHERE h.id = ?",
      [id]
    );

    const updatedHouseholdMembers = await dbQuery<any>(
      "SELECT * FROM household_members WHERE homeowner_id = ?",
      [id]
    );

    const homeownerWithMembers = {
      ...updatedHomeowner[0],
      household_members: updatedHouseholdMembers.map(member => ({
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
      photo_path: photoPath || homeownerWithMembers.photo_path || null,
      activity: activity[0] || null
    });
  } catch (error) {
    console.error("Update homeowner error:", error);
    return NextResponse.json({ error: getErrorMessage(error) || "Failed to update homeowner" }, { status: 500 });
  }
}

export const PATCH = PUT;

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getCurrentUser();
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(actor, "can_delete_homeowner")) return NextResponse.json({ error: "Permission denied" }, { status: 403 });

    const { id } = await params;

    // Retrieve name before deletion for activity logging
    const currentHO = await dbQuery<any>("SELECT full_name FROM homeowners WHERE id = ?", [id]);
    const hoName = (currentHO && currentHO[0]?.full_name) || "a homeowner";

    // Try soft delete with is_active, fallback to hard delete if column doesn't exist
    try {
      await dbExecute("UPDATE homeowners SET is_active = 0, updated_at = UTC_TIMESTAMP() WHERE id = ?", [id]);
    } catch (error) {
      console.log("is_active column not found in DELETE, using hard delete");
      await dbExecute("DELETE FROM homeowners WHERE id = ?", [id]);
    }

    const activityId = randomUUID();
    await dbExecute(
      "INSERT INTO activity_logs (id, user_id, user_name, action, details) VALUES (?, ?, ?, ?, ?)",
      [activityId, actor.id, actor.full_name, "DELETED_HOMEOWNER", JSON.stringify({ homeowner_id: id, name: hoName, full_name: hoName })]
    );

    const activity = await dbQuery<ActivityLog>("SELECT * FROM activity_logs WHERE id = ?", [activityId]);

    return NextResponse.json({ 
      success: true, 
      activity: activity[0] || null
    });
  } catch (error) {
    console.error("Delete homeowner error:", error);
    return NextResponse.json({ error: getErrorMessage(error) || "Failed to delete homeowner" }, { status: 500 });
  }
}
