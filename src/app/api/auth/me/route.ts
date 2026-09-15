import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/local-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({
        authenticated: false,
        currentUser: null,
      });
    }

    return NextResponse.json({
      authenticated: true,
      currentUser: user,
    });
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json({
      authenticated: false,
      currentUser: null,
    });
  }
}

