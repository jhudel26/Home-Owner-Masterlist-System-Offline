import { dbQuery } from "./db/mysql";

export interface VillageSettings {
  hoa_name: string;
  village_logo: string;
  hoa_currency: string;
  monthly_dues_amount: string;
}

let cachedSettings: VillageSettings | null = null;

export async function getVillageSettings(): Promise<VillageSettings> {
  if (cachedSettings) {
    return cachedSettings;
  }

  try {
    const rows = await dbQuery<{ setting_key: string; setting_value: string }>(
      "SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('hoa_name', 'village_logo', 'hoa_currency', 'monthly_dues_amount')"
    );

    const settings: VillageSettings = {
      hoa_name: "Residential Masterlist",
      village_logo: "",
      hoa_currency: "₱",
      monthly_dues_amount: "100.00",
    };

    for (const row of rows) {
      if (row.setting_key === "hoa_name") settings.hoa_name = row.setting_value;
      if (row.setting_key === "village_logo") settings.village_logo = row.setting_value;
      if (row.setting_key === "hoa_currency") settings.hoa_currency = row.setting_value;
      if (row.setting_key === "monthly_dues_amount") settings.monthly_dues_amount = row.setting_value;
    }

    cachedSettings = settings;
    return settings;
  } catch (error) {
    console.error("Error fetching village settings:", error);
    return {
      hoa_name: "Residential Masterlist",
      village_logo: "",
      hoa_currency: "₱",
      monthly_dues_amount: "100.00",
    };
  }
}

export function clearVillageSettingsCache() {
  cachedSettings = null;
}
