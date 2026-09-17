import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db/mysql';
import { getCurrentUser } from '@/lib/auth/local-auth';
import { hasPermission } from '@/lib/permissions';

export const dynamic = "force-dynamic";

// GET /api/homeowners/[id]/deductions/calculate?year=2024&month=6 - Calculate total deductions for a specific month
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
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    if (!year || !month) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: year, month' },
        { status: 400 }
      );
    }

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return NextResponse.json(
        { success: false, error: 'Invalid year or month parameters' },
        { status: 400 }
      );
    }

    // Calculate the first and last day of the month
    const firstDay = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
    const lastDay = `${yearNum}-${String(monthNum).padStart(2, '0')}-31`;

    // Get all deductions that are effective during this month
    const query = `
      SELECT deduction_type, deduction_amount, reason, effective_date
      FROM homeowner_deductions
      WHERE homeowner_id = ?
      AND effective_date <= ?
      ORDER BY effective_date DESC
    `;

    const deductions = await dbQuery(query, [id, lastDay]);

    // Calculate total deductions
    let totalDeductions = 0;
    const deductionDetails = [];

    for (const deduction of deductions) {
      totalDeductions += Number(deduction.deduction_amount);
      deductionDetails.push({
        type: deduction.deduction_type,
        amount: Number(deduction.deduction_amount),
        reason: deduction.reason,
        effective_date: deduction.effective_date
      });
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        homeowner_id: id,
        year: yearNum,
        month: monthNum,
        total_deductions: totalDeductions,
        deduction_count: deductions.length,
        deductions: deductionDetails
      }
    });
  } catch (error: any) {
    console.error('Error calculating deductions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate deductions' },
      { status: 500 }
    );
  }
}