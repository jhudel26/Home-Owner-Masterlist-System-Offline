import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { dbQuery, dbExecute } from '@/lib/db/mysql';

// GET /api/monthly-dues/[homeownerId] - Get all monthly dues for a specific homeowner
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ homeownerId: string }> }
) {
  try {
    const { homeownerId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year');

    let query = `
      SELECT md.*, h.full_name as homeowner_name, h.street_name as homeowner_address
      FROM monthly_dues md
      LEFT JOIN homeowners h ON md.homeowner_id = h.id
      WHERE md.homeowner_id = ?
    `;
    const queryParams: any[] = [homeownerId];

    if (year) {
      query += ' AND md.year = ?';
      queryParams.push(parseInt(year));
    }

    query += ' ORDER BY md.year DESC, md.month DESC';

    const rows = await dbQuery(query, queryParams);

    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    console.error('Error fetching homeowner monthly dues:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch homeowner monthly dues' },
      { status: 500 }
    );
  }
}

// POST /api/monthly-dues/[homeownerId] - Bulk create monthly dues for a homeowner
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ homeownerId: string }> }
) {
  try {
    const { homeownerId } = await params;
    const body = await request.json();
    const { year, months, amount = 100.00, created_by } = body;

    if (!year || !months || !Array.isArray(months)) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: year, months (array)' },
        { status: 400 }
      );
    }

    const createdRecords = [];
    const errors = [];

    for (const month of months) {
      try {
        const id = randomUUID();
        const query = `
          INSERT INTO monthly_dues (id, homeowner_id, year, month, amount, status, created_by)
          VALUES (?, ?, ?, ?, ?, 'unpaid', ?)
        `;
        await dbExecute(query, [id, homeownerId, year, month, amount, created_by || null]);
        createdRecords.push({ id, year, month });
      } catch (error: any) {
        if (error.code === 'ER_DUP_ENTRY') {
          errors.push({ month, error: 'Record already exists' });
        } else {
          errors.push({ month, error: error.message });
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      created: createdRecords,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    console.error('Error bulk creating monthly dues:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to bulk create monthly dues' },
      { status: 500 }
    );
  }
}
