import { VillageSettings } from "./village-settings";

/**
 * Client-side version that fetches village settings from API.
 * This avoids importing mysql2 in client components.
 */
export async function getVillageSettingsClient(): Promise<VillageSettings> {
  try {
    const response = await fetch("/api/settings");
    const data = await response.json();
    if (data.success && data.settings) {
      return {
        hoa_name: data.settings.hoa_name || "Residential Masterlist",
        village_logo: data.settings.village_logo || "",
        hoa_currency: data.settings.hoa_currency || "₱",
        monthly_dues_amount: data.settings.monthly_dues_amount || "100.00",
      };
    }
  } catch (error) {
    console.error("Error fetching village settings from API:", error);
  }
  return {
    hoa_name: "Residential Masterlist",
    village_logo: "",
    hoa_currency: "₱",
    monthly_dues_amount: "100.00",
  };
}
