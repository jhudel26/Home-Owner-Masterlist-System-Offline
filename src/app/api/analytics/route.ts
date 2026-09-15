import { NextRequest, NextResponse } from "next/server";
import { dbExecute, dbQuery } from "@/lib/db/mysql";
import { hasPermission } from "@/lib/permissions";
import { publicProfile } from "@/lib/auth/local-auth";
import { createHash } from "crypto";
import { cookies } from "next/headers";
import type { Profile } from "@/types/database";

export const dynamic = "force-dynamic";

async function getCurrentUser(): Promise<Profile | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie) return null;

    const session = await dbQuery<any>(
      "SELECT s.*, p.id, p.full_name, p.email, p.role, p.permissions, p.status, p.created_at, p.updated_at FROM sessions s JOIN profiles p ON s.user_id = p.id WHERE s.id = ? AND s.expires_at > NOW()",
      [sessionCookie.value]
    );

    if (!session || session.length === 0) return null;

    const sessionData = session[0];

    // Parse permissions if they're stored as JSON string
    let permissions = sessionData.permissions;
    if (typeof permissions === 'string') {
      try {
        permissions = JSON.parse(permissions);
      } catch {
        permissions = {};
      }
    }

    return {
      id: sessionData.id,
      full_name: sessionData.full_name,
      email: sessionData.email,
      role: sessionData.role,
      permissions: permissions,
      status: sessionData.status,
      created_at: sessionData.created_at,
      updated_at: sessionData.updated_at
    };
  } catch {
    return null;
  }
}

function period(days: number) {
  const safe = Math.min(Math.max(days || 7, 1), 365);
  const until = new Date();
  const since = new Date(until.getTime() - (safe - 1) * 86400000);
  return { days: safe, since, until };
}

export async function POST(request: NextRequest) {
  try {
    const actor = await getCurrentUser();
    const body = await request.json();
    const eventName = String(body.event || "page_view").slice(0, 100);
    const path = body.path ? String(body.path).slice(0, 500) : null;
    const visitorId = body.visitorId ? String(body.visitorId).slice(0, 64) : null;
    const ua = request.headers.get("user-agent") || "";
    const device = /mobile|android|iphone|ipad/i.test(ua) ? "Mobile" : /tablet/i.test(ua) ? "Tablet" : "Desktop";
    const browser = /edg/i.test(ua) ? "Edge" : /chrome/i.test(ua) ? "Chrome" : /firefox/i.test(ua) ? "Firefox" : /safari/i.test(ua) ? "Safari" : "Other";
    const os = /windows/i.test(ua) ? "Windows" : /android/i.test(ua) ? "Android" : /iphone|ipad|ios/i.test(ua) ? "iOS" : /mac os/i.test(ua) ? "macOS" : /linux/i.test(ua) ? "Linux" : "Other";
    const referrer = request.headers.get("referer");
    await dbExecute("INSERT INTO analytics_events (event_name,path,visitor_id,user_id,device,browser,operating_system,referrer) VALUES (?,?,?,?,?,?,?,?)", [eventName, path, visitorId, actor?.id || null, device, browser, os, referrer]);
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ success: false }, { status: 503 }); }
}

export async function GET(request: NextRequest) {
  try {
    const actor = await getCurrentUser();
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(actor, "can_view_analytics")) return NextResponse.json({ error: "Permission denied" }, { status: 403 });

    const { days, since, until } = period(Number(request.nextUrl.searchParams.get("days") || 7));
    const sinceSql = since.toISOString().slice(0, 19).replace("T", " ");
    const untilSql = until.toISOString().slice(0, 19).replace("T", " ");

    const [totals, daily, routes, devices, browsers, systems, referrers] = await Promise.all([
      dbQuery<any[]>("SELECT COUNT(*) pageViews, COUNT(DISTINCT NULLIF(visitor_id,'')) visitors FROM analytics_events WHERE event_name='page_view' AND created_at BETWEEN ? AND ?", [sinceSql, untilSql]),
      dbQuery<any[]>("SELECT DATE(created_at) date, SUM(event_name='page_view') pageViews, COUNT(DISTINCT CASE WHEN event_name='page_view' THEN visitor_id END) visitors FROM analytics_events WHERE created_at BETWEEN ? AND ? GROUP BY DATE(created_at) ORDER BY date ASC", [sinceSql, untilSql]),
      dbQuery<any[]>("SELECT path route, COUNT(*) pageViews FROM analytics_events WHERE event_name='page_view' AND created_at BETWEEN ? AND ? GROUP BY path ORDER BY pageViews DESC LIMIT 10", [sinceSql, untilSql]),
      dbQuery<any[]>("SELECT device name, COUNT(*) value FROM analytics_events WHERE event_name='page_view' AND created_at BETWEEN ? AND ? GROUP BY device ORDER BY value DESC", [sinceSql, untilSql]),
      dbQuery<any[]>("SELECT browser name, COUNT(*) value FROM analytics_events WHERE event_name='page_view' AND created_at BETWEEN ? AND ? GROUP BY browser ORDER BY value DESC", [sinceSql, untilSql]),
      dbQuery<any[]>("SELECT operating_system name, COUNT(*) value FROM analytics_events WHERE event_name='page_view' AND created_at BETWEEN ? AND ? GROUP BY operating_system ORDER BY value DESC", [sinceSql, untilSql]),
      dbQuery<any[]>("SELECT COALESCE(NULLIF(referrer,''),'Direct') name, COUNT(*) value FROM analytics_events WHERE event_name='page_view' AND created_at BETWEEN ? AND ? GROUP BY COALESCE(NULLIF(referrer,''),'Direct') ORDER BY value DESC LIMIT 10", [sinceSql, untilSql]),
    ]);

    const topRoutes = routes.map((r: any) => ({ path: r.route || "/", pageViews: Number(r.pageViews) }));
    const totalRow = totals[0] as any;
    return NextResponse.json({
      success: true,
      pageViews: Number(totalRow?.pageViews || 0),
      visitors: Number(totalRow?.visitors || 0),
      daily: daily.map((r: any) => ({ date: String(r.date).slice(0,10), pageViews: Number(r.pageViews || 0), visitors: Number(r.visitors || 0) })),
      topRoutes,
      topCountries: [],
      topDevices: devices.map((r: any) => ({ name: r.name || "Unknown", value: Number(r.value) })),
      topBrowsers: browsers.map((r: any) => ({ name: r.name || "Unknown", value: Number(r.value) })),
      topOperatingSystems: systems.map((r: any) => ({ name: r.name || "Unknown", value: Number(r.value) })),
      topReferrers: referrers.map((r: any) => ({ name: r.name || "Direct", value: Number(r.value) })),
      environments: [{ name: "Local / XAMPP", value: Number(totalRow?.pageViews || 0) }],
      period: { since: since.toISOString(), until: until.toISOString(), days },
    });
  } catch (error) { console.error("Local analytics error:", error); return NextResponse.json({ error: "Local analytics database is unavailable." }, { status: 503 }); }
}
