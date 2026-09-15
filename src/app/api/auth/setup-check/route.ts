import { NextResponse } from "next/server";
import { dbQuery } from "@/lib/db/mysql";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Check if any users exist in the profiles table
    const result = await dbQuery<any>("SELECT COUNT(*) as count FROM profiles");
    const data = Array.isArray(result) ? result[0] : result;
    const count = data?.count || 0;
    
    return NextResponse.json({ needsSetup: count === 0 });
  } catch (error) {
    console.error("Setup check error:", error);
    return NextResponse.json({ error: "Failed to check setup status" }, { status: 500 });
  }
}
