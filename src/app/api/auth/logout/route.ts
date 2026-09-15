import { NextRequest, NextResponse } from "next/server";
import { dbExecute } from "@/lib/db/mysql";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (sessionCookie) {
      // Delete session from database
      await dbExecute("DELETE FROM sessions WHERE id = ?", [sessionCookie.value]);
      // Delete session cookie
      cookieStore.delete("session");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ success: true }); // Always return success on logout
  }
}
