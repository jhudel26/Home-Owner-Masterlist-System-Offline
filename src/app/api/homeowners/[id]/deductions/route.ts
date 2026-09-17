import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { dbQuery, dbExecute } from '@/lib/db/mysql';
import { getCurrentUser } from '@/lib/auth/local-auth';
import { hasPermission } from '@/lib/permissions';

export const dynamic = "force-dynamic";

// GET /api/homeowners/[id]/deductions - Get all deductions for a specific homeowner
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getCurrentUser();
    if (!actor) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(actor, "can_manage_deductions") && !hasPermission(actor, "can_view_homeowner")) {
      return NextResponse.json({ success: false, error: "Permission denied" }, { status: 403 });
    }

    const { id } = await params;

    const query = `
      SELECT hd.*, h.full_name as homeowner_name, h.hoa_number
      FROM homeowner_deductions hd
      LEFT JOIN homeowners h ON hd.homeowner_id = h.id
      WHERE hd.homeowner_id = ?
      ORDER BY hd.effective_date DESC, hd.created_at DESC
    `;

    const rows = await dbQuery(query, [id]);

    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    console.error('Error fetching homeowner deductions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch homeowner deductions' },
      { status: 500 }
    );
  }
}

// POST /api/homeowners/[id]/deductions - Create a new deduction for a homeowner
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getCurrentUser();
    if (!actor) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(actor, "can_manage_deductions")) {
      return NextResponse.json({ success: false, error: "Permission denied" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { deduction_type, deduction_amount, reason, effective_date } = body;

    if (!deduction_type || !deduction_amount || !effective_date) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: deduction_type, deduction_amount, effective_date' },
        { status: 400 }
      );
    }

    const numAmount = parseFloat(deduction_amount);
    if (isNaN(numAmount) || numAmount < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid deduction amount' },
        { status: 400 }
      );
    }

    const deductionId = randomUUID();
    const query = `
      INSERT INTO homeowner_deductions (id, homeowner_id, deduction_type, deduction_amount, reason, effective_date, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await dbExecute(query, [deductionId, id, deduction_type, numAmount, reason || null, effective_date, actor.id]);

    // Log activity
    const logQuery = `
      INSERT INTO activity_logs (id, user_id, user_name, action, details)
      VALUES (?, ?, ?, ?, ?)
    `;
    const logId = randomUUID();
    await dbExecute(logQuery, [logId, actor.id, actor.full_name, 'create_deduction', JSON.stringify({
      homeowner_id: id,
      deduction_type,
      deduction_amount: numAmount,
      reason,
      effective_date
    })]);

    return NextResponse.json({ 
      success: true, 
      data: { id: deductionId, homeowner_id: id, deduction_type, deduction_amount: numAmount, reason, effective_date },
      activity: { id: logId, user_name: actor.full_name, action: 'create_deduction' }
    });
  } catch (error: any) {
    console.error('Error creating homeowner deduction:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create homeowner deduction' },
      { status: 500 }
    );
  }
}