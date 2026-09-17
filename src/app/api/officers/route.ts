import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { dbQuery, dbExecute } from '@/lib/db/mysql';
import { getCurrentUser } from '@/lib/auth/local-auth';
import { hasPermission } from '@/lib/permissions';

export const dynamic = "force-dynamic";

// Position priority for display ordering
const POSITION_PRIORITY: Record<string, number> = {
  'President': 1,
  'Vice President': 2,
  'Secretary': 3,
  'Treasurer': 4,
  'Auditor': 5,
  'Chairman of Board Officer': 6,
  'Board Officer': 7,
  'Environment, Sanitation, Beautification & DRRM': 8,
  'Peace & Order': 8,
  'Sports & Youth': 8,
  'Grievance & Adjudication': 8,
  'Audit & Inventory': 8,
  'Delinquency Hearing & Compliance': 8,
};

// Ensure hoa_officers table exists
async function ensureTableExists() {
  try {
    await dbExecute(`
      CREATE TABLE IF NOT EXISTS hoa_officers (
        id VARCHAR(36) PRIMARY KEY,
        homeowner_id VARCHAR(36) NOT NULL,
        position VARCHAR(100) NOT NULL,
        committees JSON COMMENT 'Array of committee assignments',
        term_start_date DATE NOT NULL,
        term_end_date DATE,
        exempt_from_dues TINYINT(1) NOT NULL DEFAULT 0,
        exempt_start_date DATE,
        exempt_end_date DATE,
        priority INT NOT NULL DEFAULT 0,
        notes TEXT,
        created_by VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_homeowner_id (homeowner_id),
        INDEX idx_position (position),
        INDEX idx_priority (priority),
        INDEX idx_term_dates (term_start_date, term_end_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (error) {
    console.error('Error creating hoa_officers table:', error);
  }
}

// GET /api/officers - Get all officers
export async function GET(request: NextRequest) {
  try {
    await ensureTableExists();
    
    const actor = await getCurrentUser();
    if (!actor) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(actor, "can_view_homeowner") && !hasPermission(actor, "can_manage_officers")) {
      return NextResponse.json({ success: false, error: "Permission denied" }, { status: 403 });
    }

    const query = `
      SELECT o.*, 
             h.id as homeowner_id,
             h.full_name as homeowner_name,
             h.hoa_number,
             h.block_number,
             h.lot_number,
             h.photo_path
      FROM hoa_officers o
      LEFT JOIN homeowners h ON o.homeowner_id = h.id
      ORDER BY o.priority ASC, o.created_at ASC
    `;

    const rows = await dbQuery<any>(query);
    const mapped = rows.map((r: any) => ({
      ...r,
      homeowner: {
        id: r.homeowner_id,
        full_name: r.homeowner_name,
        hoa_number: r.hoa_number,
        block_number: r.block_number,
        lot_number: r.lot_number,
        photo_path: r.photo_path,
      },
    }));
    return NextResponse.json({ success: true, data: mapped });
  } catch (error: any) {
    console.error('Error fetching officers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch officers' },
      { status: 500 }
    );
  }
}

// POST /api/officers - Create new officer
export async function POST(request: NextRequest) {
  try {
    await ensureTableExists();
    
    const actor = await getCurrentUser();
    if (!actor) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(actor, "can_manage_officers")) {
      return NextResponse.json({ success: false, error: "Permission denied" }, { status: 403 });
    }

    const body = await request.json();
    const { 
      homeowner_id, 
      position, 
      committees = [], 
      term_start_date, 
      term_end_date,
      exempt_from_dues = false,
      exempt_start_date,
      exempt_end_date,
      notes,
      photo_path,
    } = body;

    if (!homeowner_id || !position || !term_start_date) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: homeowner_id, position, term_start_date' },
        { status: 400 }
      );
    }

    // Check if homeowner exists
    const homeownerCheck = await dbQuery("SELECT id FROM homeowners WHERE id = ?", [homeowner_id]);
    if (homeownerCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Homeowner not found' },
        { status: 404 }
      );
    }

    if (photo_path && typeof photo_path === 'string') {
      await dbExecute("UPDATE homeowners SET photo_path = ? WHERE id = ?", [photo_path, homeowner_id]);
    }

    // Check for duplicate positions (except Board Officer which can have multiple)
    if (position !== 'Board Officer') {
      const existingOfficer = await dbQuery(
        "SELECT id FROM hoa_officers WHERE position = ? AND term_end_date IS NULL OR term_end_date > CURDATE()",
        [position]
      );
      if (existingOfficer.length > 0) {
        return NextResponse.json(
          { success: false, error: `Position ${position} is already held by another officer` },
          { status: 409 }
        );
      }
    }

    const id = randomUUID();
    const priority = POSITION_PRIORITY[position] || 10;

    const query = `
      INSERT INTO hoa_officers (id, homeowner_id, position, committees, term_start_date, term_end_date, exempt_from_dues, exempt_start_date, exempt_end_date, priority, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await dbExecute(query, [
      id,
      homeowner_id,
      position,
      JSON.stringify(committees),
      term_start_date,
      term_end_date || null,
      exempt_from_dues ? 1 : 0,
      exempt_start_date || null,
      exempt_end_date || null,
      priority,
      notes || null,
      actor.id
    ]);

    // Get homeowner name for activity logging
    const homeownerRows = await dbQuery<{ full_name: string }>(
      "SELECT full_name FROM homeowners WHERE id = ?",
      [homeowner_id]
    );
    const hoName = homeownerRows[0]?.full_name || "Homeowner";

    // Log the activity
    const activityId = randomUUID();
    await dbExecute(
      "INSERT INTO activity_logs (id, user_id, user_name, action, details) VALUES (?, ?, ?, ?, ?)",
      [
        activityId,
        actor.id,
        actor.full_name,
        "ADDED_OFFICER",
        JSON.stringify({
          homeowner_id,
          name: hoName,
          position,
          committees,
          term_start_date,
          term_end_date,
          exempt_from_dues,
        }),
      ]
    );

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error('Error creating officer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create officer' },
      { status: 500 }
    );
  }
}

// PATCH /api/officers - Update officer
export async function PATCH(request: NextRequest) {
  try {
    await ensureTableExists();
    
    const actor = await getCurrentUser();
    if (!actor) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(actor, "can_manage_officers")) {
      return NextResponse.json({ success: false, error: "Permission denied" }, { status: 403 });
    }

    const body = await request.json();
    const { 
      id, 
      position, 
      committees, 
      term_start_date, 
      term_end_date,
      exempt_from_dues,
      exempt_start_date,
      exempt_end_date,
      notes,
      photo_path,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    // Get existing officer for activity logging
    const existingOfficerRows = await dbQuery<any>(
      `SELECT o.*, h.full_name 
       FROM hoa_officers o 
       LEFT JOIN homeowners h ON o.homeowner_id = h.id 
       WHERE o.id = ?`,
      [id]
    );
    const existingOfficer = existingOfficerRows[0];

    if (photo_path && typeof photo_path === 'string' && existingOfficer?.homeowner_id) {
      await dbExecute("UPDATE homeowners SET photo_path = ? WHERE id = ?", [photo_path, existingOfficer.homeowner_id]);
    }

    const updates: string[] = ["updated_at = CURRENT_TIMESTAMP"];
    const params: any[] = [];

    if (position !== undefined) {
      updates.push("position = ?");
      params.push(position);
      // Update priority if position changes
      updates.push("priority = ?");
      params.push(POSITION_PRIORITY[position] || 10);
    }

    if (committees !== undefined) {
      updates.push("committees = ?");
      params.push(JSON.stringify(committees));
    }

    if (term_start_date !== undefined) {
      updates.push("term_start_date = ?");
      params.push(term_start_date);
    }

    if (term_end_date !== undefined) {
      updates.push("term_end_date = ?");
      params.push(term_end_date || null);
    }

    if (exempt_from_dues !== undefined) {
      updates.push("exempt_from_dues = ?");
      params.push(exempt_from_dues ? 1 : 0);
    }

    if (exempt_start_date !== undefined) {
      updates.push("exempt_start_date = ?");
      params.push(exempt_start_date || null);
    }

    if (exempt_end_date !== undefined) {
      updates.push("exempt_end_date = ?");
      params.push(exempt_end_date || null);
    }

    if (notes !== undefined) {
      updates.push("notes = ?");
      params.push(notes || null);
    }

    params.push(id);

    const query = `
      UPDATE hoa_officers
      SET ${updates.join(", ")}
      WHERE id = ?
    `;

    await dbExecute(query, params);

    // Log the activity
    const activityId = randomUUID();
    await dbExecute(
      "INSERT INTO activity_logs (id, user_id, user_name, action, details) VALUES (?, ?, ?, ?, ?)",
      [
        activityId,
        actor.id,
        actor.full_name,
        "UPDATED_OFFICER",
        JSON.stringify({
          homeowner_id: existingOfficer?.homeowner_id,
          name: existingOfficer?.full_name,
          position: position !== undefined ? position : existingOfficer?.position,
          previous_position: existingOfficer?.position,
          committees,
          term_start_date,
          term_end_date,
          exempt_from_dues,
        }),
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating officer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update officer' },
      { status: 500 }
    );
  }
}

// DELETE /api/officers - Delete officer
export async function DELETE(request: NextRequest) {
  try {
    await ensureTableExists();
    
    const actor = await getCurrentUser();
    if (!actor) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(actor, "can_manage_officers")) {
      return NextResponse.json({ success: false, error: "Permission denied" }, { status: 403 });
    }

    const { searchParams } = request.nextUrl;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }

    // Get existing officer for activity logging
    const existingOfficerRows = await dbQuery<any>(
      `SELECT o.*, h.full_name 
       FROM hoa_officers o 
       LEFT JOIN homeowners h ON o.homeowner_id = h.id 
       WHERE o.id = ?`,
      [id]
    );
    const existingOfficer = existingOfficerRows[0];

    await dbExecute("DELETE FROM hoa_officers WHERE id = ?", [id]);

    // Log the activity
    const activityId = randomUUID();
    await dbExecute(
      "INSERT INTO activity_logs (id, user_id, user_name, action, details) VALUES (?, ?, ?, ?, ?)",
      [
        activityId,
        actor.id,
        actor.full_name,
        "REMOVED_OFFICER",
        JSON.stringify({
          homeowner_id: existingOfficer?.homeowner_id,
          name: existingOfficer?.full_name,
          position: existingOfficer?.position,
        }),
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting officer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete officer' },
      { status: 500 }
    );
  }
}