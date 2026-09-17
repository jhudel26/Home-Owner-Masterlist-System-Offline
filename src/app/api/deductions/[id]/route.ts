import { NextRequest, NextResponse } from 'next/server';
import { dbQuery, dbExecute } from '@/lib/db/mysql';
import { getCurrentUser } from '@/lib/auth/local-auth';
import { hasPermission } from '@/lib/permissions';

export const dynamic = "force-dynamic";

// PATCH /api/deductions/[id] - Update an existing deduction
export async function PATCH(
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

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];

    if (deduction_type !== undefined) {
      updates.push('deduction_type = ?');
      values.push(deduction_type);
    }
    if (deduction_amount !== undefined) {
      const numAmount = parseFloat(deduction_amount);
      if (isNaN(numAmount) || numAmount < 0) {
        return NextResponse.json({ success: false, error: 'Invalid deduction amount' }, { status: 400 });
      }
      updates.push('deduction_amount = ?');
      values.push(numAmount);
    }
    if (reason !== undefined) {
      updates.push('reason = ?');
      values.push(reason);
    }
    if (effective_date !== undefined) {
      updates.push('effective_date = ?');
      values.push(effective_date);
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
    }

    values.push(id); // Add id for WHERE clause

    const query = `
      UPDATE homeowner_deductions
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await dbExecute(query, values);

    // Log activity
    const logQuery = `
      INSERT INTO activity_logs (id, user_id, user_name, action, details)
      VALUES (?, ?, ?, ?, ?)
    `;
    const { randomUUID } = await import('crypto');
    const logId = randomUUID();
    await dbExecute(logQuery, [logId, actor.id, actor.full_name, 'update_deduction', JSON.stringify({
      deduction_id: id,
      updates: body
    })]);

    return NextResponse.json({ 
      success: true, 
      message: 'Deduction updated successfully',
      activity: { id: logId, user_name: actor.full_name, action: 'update_deduction' }
    });
  } catch (error: any) {
    console.error('Error updating deduction:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update deduction' },
      { status: 500 }
    );
  }
}

// DELETE /api/deductions/[id] - Delete a deduction
export async function DELETE(
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

    // First get the deduction details for logging
    const deductionQuery = 'SELECT * FROM homeowner_deductions WHERE id = ?';
    const deductionResult = await dbQuery(deductionQuery, [id]);
    
    if (!deductionResult || deductionResult.length === 0) {
      return NextResponse.json({ success: false, error: 'Deduction not found' }, { status: 404 });
    }

    const deduction = deductionResult[0];

    // Delete the deduction
    const deleteQuery = 'DELETE FROM homeowner_deductions WHERE id = ?';
    await dbExecute(deleteQuery, [id]);

    // Log activity
    const logQuery = `
      INSERT INTO activity_logs (id, user_id, user_name, action, details)
      VALUES (?, ?, ?, ?, ?)
    `;
    const { randomUUID } = await import('crypto');
    const logId = randomUUID();
    await dbExecute(logQuery, [logId, actor.id, actor.full_name, 'delete_deduction', JSON.stringify({
      deduction_id: id,
      deleted_deduction: deduction
    })]);

    return NextResponse.json({ 
      success: true, 
      message: 'Deduction deleted successfully',
      activity: { id: logId, user_name: actor.full_name, action: 'delete_deduction' }
    });
  } catch (error: any) {
    console.error('Error deleting deduction:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete deduction' },
      { status: 500 }
    );
  }
}