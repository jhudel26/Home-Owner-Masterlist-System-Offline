import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { dbQuery, dbExecute } from "@/lib/db/mysql";
import { hasPermission } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/auth/local-auth";

export const dynamic = "force-dynamic";

let settingsTableEnsured = false;

async function ensureSettingsTable(): Promise<void> {
  if (settingsTableEnsured) return;
  try {
    await dbExecute(`
      CREATE TABLE IF NOT EXISTS system_settings (
        setting_key   VARCHAR(100) PRIMARY KEY,
        setting_value TEXT NOT NULL,
        updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await dbExecute(`
      INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES 
        ('monthly_dues_amount', '100.00'),
        ('hoa_name', 'St. Joseph Village 6 Phase 4 HOA'),
        ('hoa_currency', '₱');
    `);
    settingsTableEnsured = true;
  } catch (error) {
    console.error("Failed to ensure system_settings table:", error);
  }
}

// GET /api/settings - Retrieve system settings
export async function GET() {
  try {
    await ensureSettingsTable();

    const rows = await dbQuery<{ setting_key: string; setting_value: string }>(
      "SELECT setting_key, setting_value FROM system_settings"
    );

    const settings: Record<string, string> = {
      monthly_dues_amount: "100.00",
      hoa_name: "St. Joseph Village 6 Phase 4 HOA",
      hoa_currency: "₱",
    };

    for (const r of rows) {
      settings[r.setting_key] = r.setting_value;
    }

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({
      success: true,
      settings: {
        monthly_dues_amount: "100.00",
        hoa_name: "St. Joseph Village 6 Phase 4 HOA",
        hoa_currency: "₱",
      },
    });
  }
}

// POST /api/settings - Update system settings
export async function POST(request: NextRequest) {
  try {
    const actor = await getCurrentUser();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canManage =
      actor.role === "super_admin" ||
      actor.role === "admin" ||
      hasPermission(actor, "can_manage_monthly_dues") ||
      hasPermission(actor, "can_backup_restore");

    if (!canManage) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    await ensureSettingsTable();
    const body = await request.json();
    const { monthly_dues_amount, hoa_name, hoa_currency, update_existing_unpaid } = body;

    if (monthly_dues_amount !== undefined) {
      const numAmount = parseFloat(monthly_dues_amount);
      if (isNaN(numAmount) || numAmount < 0) {
        return NextResponse.json(
          { error: "Invalid monthly dues amount. Must be a non-negative number." },
          { status: 400 }
        );
      }

      await dbExecute(
        "INSERT INTO system_settings (setting_key, setting_value) VALUES ('monthly_dues_amount', ?) ON DUPLICATE KEY UPDATE setting_value = ?",
        [numAmount.toFixed(2), numAmount.toFixed(2)]
      );

      // If requested, also update all existing UNPAID monthly dues records to the new amount
      if (update_existing_unpaid) {
        await dbExecute(
          "UPDATE monthly_dues SET amount = ? WHERE status = 'unpaid'",
          [numAmount.toFixed(2)]
        );
      }
    }

    if (hoa_name !== undefined && typeof hoa_name === "string" && hoa_name.trim()) {
      await dbExecute(
        "INSERT INTO system_settings (setting_key, setting_value) VALUES ('hoa_name', ?) ON DUPLICATE KEY UPDATE setting_value = ?",
        [hoa_name.trim(), hoa_name.trim()]
      );
    }

    if (hoa_currency !== undefined && typeof hoa_currency === "string") {
      await dbExecute(
        "INSERT INTO system_settings (setting_key, setting_value) VALUES ('hoa_currency', ?) ON DUPLICATE KEY UPDATE setting_value = ?",
        [hoa_currency.trim(), hoa_currency.trim()]
      );
    }

    // Log the change
    try {
      await dbExecute(
        "INSERT INTO activity_logs (id, user_id, user_name, action, details) VALUES (?, ?, ?, ?, ?)",
        [
          randomUUID(),
          actor.id,
          actor.full_name,
          "UPDATED_SETTINGS",
          JSON.stringify({
            monthly_dues_amount,
            hoa_name,
            update_existing_unpaid,
          }),
        ]
      );
    } catch (_) {}

    return NextResponse.json({ success: true, message: "Settings updated successfully" });
  } catch (error: any) {
    console.error("Error saving settings:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update settings" },
      { status: 500 }
    );
  }
}
