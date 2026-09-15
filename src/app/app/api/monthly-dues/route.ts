import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { dbQuery, dbExecute } from '@/lib/db/mysql';
import { getCurrentUser } from '@/lib/auth/local-auth';
import { hasPermission } from '@/lib/permissions';
import type { ActivityLog } from '@/types/database';

export const dynamic = "force-dynamic";

// GET /api/monthly-dues - Get monthly dues with optional filtering
export async function GET(request: NextRequest) {
  try {
    const actor = await getCurrentUser();
    if (!actor) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(actor, "can_manage_monthly_dues") && !hasPermission(actor, "can_view_homeowner")) {
      return NextResponse.json({ success: false, error: "Permission denied" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const homeownerId = searchParams.get('homeowner_id');
    const year = searchParams.get('year');
    const startYear = searchParams.get('start_year');
    const endYear = searchParams.get('end_year');
    const years = searchParams.get('years');
    const month = searchParams.get('month');
    const status = searchParams.get('status');

    let query = `
      SELECT md.*, 
             h.id as homeowner_id,
             h.full_name as homeowner_name,
             h.street_name as homeowner_address,
             h.block_number,
             h.lot_number
      FROM monthly_dues md
      LEFT JOIN homeowners h ON md.homeowner_id = h.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (homeownerId) {
      query += ' AND md.homeowner_id = ?';
      params.push(homeownerId);
    }

    if (startYear && endYear) {
      query += ' AND md.year >= ? AND md.year <= ?';
      params.push(parseInt(startYear), parseInt(endYear));
    } else if (years) {
      const yearList = years.split(',').map(y => parseInt(y.trim())).filter(y => !isNaN(y));
      if (yearList.length > 0) {
        query += ` AND md.year IN (${yearList.map(() => '?').join(',')})`;
        params.push(...yearList);
      }
    } else if (year) {
      query += ' AND md.year = ?';
      params.push(parseInt(year));
    }

    if (month) {
      query += ' AND md.month = ?';
      params.push(parseInt(month));
    }

    if (status) {
      query += ' AND md.status = ?';
      params.push(status);
    }

    query += ' ORDER BY md.year DESC, md.month DESC, h.full_name ASC';

    const rows = await dbQuery(query, params);

    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    console.error('Error fetching monthly dues:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch monthly dues' },
      { status: 500 }
    );
  }
}

// POST /api/monthly-dues - Create new monthly due record
export async function POST(request: NextRequest) {
  try {
    const actor = await getCurrentUser();
    if (!actor) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(actor, "can_manage_monthly_dues")) {
      return NextResponse.json({ success: false, error: "Permission denied" }, { status: 403 });
    }

    const body = await request.json();
    let { homeowner_id, year, month, amount, status = 'unpaid', official_receipt_number, payment_date, created_by } = body;

    if (!homeowner_id || !year || !month) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: homeowner_id, year, month' },
        { status: 400 }
      );
    }

    if (amount === undefined || amount === null || isNaN(Number(amount))) {
      try {
        const settings = await dbQuery<{ setting_value: string }>(
          "SELECT setting_value FROM system_settings WHERE setting_key = 'monthly_dues_amount'"
        );
        amount = settings.length > 0 ? parseFloat(settings[0].setting_value) : 100.00;
      } catch {
        amount = 100.00;
      }
    }

    const id = randomUUID();
    const query = `
      INSERT INTO monthly_dues (id, homeowner_id, year, month, amount, status, official_receipt_number, payment_date, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await dbExecute(query, [id, homeowner_id, year, month, amount, status, official_receipt_number || null, payment_date || null, created_by || actor.id]);

    // Retrieve homeowner name for activity logging
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
        "UPDATED_MONTHLY_DUES",
        JSON.stringify({
          homeowner_id,
          name: hoName,
          full_name: hoName,
          year,
          month,
          amount,
          status,
          official_receipt_number: official_receipt_number || null,
        }),
      ]
    );

    const activity = await dbQuery<ActivityLog>("SELECT * FROM activity_logs WHERE id = ?", [activityId]);

    return NextResponse.json({ success: true, id, activity: activity[0] || null });
  } catch (error: any) {
    console.error('Error creating monthly due:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { success: false, error: 'Monthly due record already exists for this homeowner, year, and month' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to create monthly due' },
      { status: 500 }
    );
  }
}

// PATCH /api/monthly-dues - Update monthly due record
export async function PATCH(request: NextRequest) {
  try {
    const actor = await getCurrentUser();
    if (!actor) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(actor, "can_manage_monthly_dues")) {
      return NextResponse.json({ success: false, error: "Permission denied" }, { status: 403 });
    }

    const body = await request.json();
    const { id, status, amount, official_receipt_number, payment_date } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    // Retrieve existing due and homeowner name for activity logging
    const existingDueRows = await dbQuery<any>(
      `SELECT md.*, h.full_name 
       FROM monthly_dues md 
       LEFT JOIN homeowners h ON md.homeowner_id = h.id 
       WHERE md.id = ?`,
      [id]
    );
    const existingDue = existingDueRows[0];
    const hoName = existingDue?.full_name || "Homeowner";
    const hoId = existingDue?.homeowner_id;
    const dueYear = existingDue?.year;
    const dueMonth = existingDue?.month;

    const updates: string[] = ["updated_at = CURRENT_TIMESTAMP"];
    const params: any[] = [];

    if (status !== undefined) {
      updates.push("status = ?");
      params.push(status);
    }

    if (amount !== undefined && !isNaN(Number(amount))) {
      updates.push("amount = ?");
      params.push(Number(amount));
    }

    if (official_receipt_number !== undefined) {
      updates.push("official_receipt_number = ?");
      params.push(official_receipt_number || null);
    }

    if (payment_date !== undefined) {
      updates.push("payment_date = ?");
      params.push(payment_date || null);
    }

    params.push(id);

    const query = `
      UPDATE monthly_dues
      SET ${updates.join(", ")}
      WHERE id = ?
    `;

    await dbExecute(query, params);

    // Log the activity
    const activityId = randomUUID();
    const finalStatus = status !== undefined ? status : existingDue?.status;
    const finalAmount = amount !== undefined && !isNaN(Number(amount)) ? Number(amount) : existingDue?.amount;
    const finalOr = official_receipt_number !== undefined ? (official_receipt_number || null) : existingDue?.official_receipt_number;

    await dbExecute(
      "INSERT INTO activity_logs (id, user_id, user_name, action, details) VALUES (?, ?, ?, ?, ?)",
      [
        activityId,
        actor.id,
        actor.full_name,
        "UPDATED_MONTHLY_DUES",
        JSON.stringify({
          homeowner_id: hoId,
          name: hoName,
          full_name: hoName,
          year: dueYear,
          month: dueMonth,
          amount: finalAmount,
          status: finalStatus,
          official_receipt_number: finalOr,
        }),
      ]
    );

    const activity = await dbQuery<ActivityLog>("SELECT * FROM activity_logs WHERE id = ?", [activityId]);

    return NextResponse.json({ success: true, activity: activity[0] || null });
  } catch (error: any) {
    console.error('Error updating monthly due:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update monthly due' },
      { status: 500 }
    );
  }
}
