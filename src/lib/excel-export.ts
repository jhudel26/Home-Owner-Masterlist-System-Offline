import ExcelJS from "exceljs";
import { Homeowner, MonthlyDue } from "@/types/database";
import { formatDate } from "./utils";

export async function exportHomeownersToExcel(
  homeowners: Homeowner[],
  filenamePrefix = "St_Joseph_Village_6_Phase_4_Homeowners"
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "St. Joseph Village 6 Phase 4 HOA";
  workbook.lastModifiedBy = "HOA Masterlist System";
  workbook.created = new Date();
  workbook.modified = new Date();

  // --- SHEET 1: Homeowners Masterlist ---
  const sheet1 = workbook.addWorksheet("Homeowners Masterlist", {
    views: [{ showGridLines: true }],
  });

  // Title Row
  sheet1.mergeCells("A1:N1");
  const titleCell = sheet1.getCell("A1");
  titleCell.value = "ST. JOSEPH VILLAGE 6 PHASE 4 — HOMEOWNERS ASSOCIATION";
  titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F382A" }, // HOA Emerald Green
  };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet1.getRow(1).height = 32;

  // Subtitle Row
  sheet1.mergeCells("A2:N2");
  const subCell = sheet1.getCell("A2");
  subCell.value = `Official Homeowners Masterlist Registry (Exported: ${new Date().toLocaleDateString(
    "en-US",
    { dateStyle: "long" }
  )})`;
  subCell.font = { name: "Arial", size: 10, italic: true, color: { argb: "FF2D705D" } };
  subCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet1.getRow(2).height = 20;

  // Empty spacer row
  sheet1.getRow(3).height = 10;

  // Header Row
  const headers = [
    "HOA#",
    "Representation",
    "First Name",
    "Middle Name",
    "Last Name",
    "Suffix",
    "Full Name",
    "Date of Residency",
    "Blk",
    "Lot",
    "Barangay",
    "Full Address",
    "Contact Number",
    "Email",
  ];

  const headerRow = sheet1.getRow(4);
  headerRow.values = headers;
  headerRow.height = 26;

  headerRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF07162C" }, // Deep Navy
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "medium", color: { argb: "FF0D9488" } }, // Teal Accent
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  });

  // Data Rows
  let rowIndex = 5;
  homeowners.forEach((ho, hoIndex) => {
    // Construct full address from database fields
    const addressParts = [];
    if (ho.home_number) addressParts.push(ho.home_number);
    if (ho.block_number) addressParts.push(`Block ${ho.block_number}`);
    if (ho.lot_number) addressParts.push(`Lot ${ho.lot_number}`);
    if (ho.street_name) addressParts.push(ho.street_name);
    if (ho.barangay) addressParts.push(ho.barangay);
    const fullAddress = addressParts.join(", ") || ho.address || "—";

    // Determine Representation for primary owner
    let representation = "PM"; // Default for owners
    if (ho.ownership_type === "renter") {
      representation = "RT";
    }

    // Add primary owner row
    const primaryRow = sheet1.getRow(rowIndex);
    primaryRow.values = [
      ho.hoa_number || "",
      representation,
      ho.first_name || "",
      ho.middle_name || "",
      ho.last_name || "",
      ho.suffix || "",
      ho.full_name || "",
      ho.tenure_date ? formatDate(ho.tenure_date) : "",
      ho.block_number || "",
      ho.lot_number || "",
      ho.barangay || "",
      fullAddress,
      ho.contact_number || "",
      ho.email || "",
    ];
    primaryRow.height = 22;
    const isEvenPrimary = rowIndex % 2 === 0;
    primaryRow.eachCell((cell: any, colNumber: number) => {
      cell.font = { name: "Arial", size: 9.5 };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
      if (!isEvenPrimary) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" },
        };
      }
      if ([1, 2, 9, 10, 8].includes(colNumber)) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else {
        cell.alignment = { horizontal: "left", vertical: "middle" };
      }
    });
    rowIndex++;

    // Add proxy row if proxy is designated (for owners only)
    if (ho.ownership_type === "owner" && ho.ga_proxy_designated && ho.ga_proxy_designated.trim() !== "") {
      const proxyRow = sheet1.getRow(rowIndex);
      const proxyFullName = [ho.ga_proxy_first_name, ho.ga_proxy_middle_name, ho.ga_proxy_last_name, ho.ga_proxy_suffix].filter(Boolean).join(" ") || ho.ga_proxy_designated;
      
      proxyRow.values = [
        ho.hoa_number || "", // Same HOA#
        "PR", // Proxy Representative
        ho.ga_proxy_first_name || "",
        ho.ga_proxy_middle_name || "",
        ho.ga_proxy_last_name || "",
        ho.ga_proxy_suffix || "",
        proxyFullName,
        ho.tenure_date ? formatDate(ho.tenure_date) : "",
        ho.block_number || "",
        ho.lot_number || "",
        ho.barangay || "",
        fullAddress, // Same address
        ho.ga_proxy_mobile || "", // Proxy's own contact
        ho.ga_proxy_email || "", // Proxy's own email
      ];
      proxyRow.height = 22;
      const isEvenProxy = rowIndex % 2 === 0;
      proxyRow.eachCell((cell: any, colNumber: number) => {
        cell.font = { name: "Arial", size: 9.5 };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
        if (!isEvenProxy) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF8FAFC" },
          };
        }
        if ([1, 2, 9, 10, 8].includes(colNumber)) {
          cell.alignment = { horizontal: "center", vertical: "middle" };
        } else {
          cell.alignment = { horizontal: "left", vertical: "middle" };
        }
      });
      rowIndex++;
    }
  });

  // Set column widths
  sheet1.columns = [
    { width: 16 }, // HOA#
    { width: 12 }, // Representation
    { width: 20 }, // First Name
    { width: 20 }, // Middle Name
    { width: 20 }, // Last Name
    { width: 10 }, // Suffix
    { width: 30 }, // Full Name
    { width: 15 }, // Date of Residency
    { width: 10 }, // Blk
    { width: 10 }, // Lot
    { width: 18 }, // Barangay
    { width: 40 }, // Full Address
    { width: 18 }, // Contact Number
    { width: 28 }, // Email
  ];

  // --- SHEET 2: Household Members Registry ---
  const sheet2 = workbook.addWorksheet("Household Members", {
    views: [{ showGridLines: true }],
  });

  sheet2.mergeCells("A1:E1");
  const hmTitleCell = sheet2.getCell("A1");
  hmTitleCell.value = "HOUSEHOLD MEMBERS REGISTRY — ST. JOSEPH VILLAGE 6 PHASE 4";
  hmTitleCell.font = { name: "Arial", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
  hmTitleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F382A" },
  };
  hmTitleCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet2.getRow(1).height = 28;

  const hmHeaders = [
    "HOA#",
    "Head of Household (Homeowner)",
    "Address",
    "Member Name",
    "Relationship to Head",
    "Homeowner Status",
  ];

  const hmHeaderRow = sheet2.getRow(3);
  hmHeaderRow.values = hmHeaders;
  hmHeaderRow.height = 24;

  hmHeaderRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F1E36" },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  let hmRowIndex = 4;
  homeowners.forEach((ho) => {
    if (ho.household_members && ho.household_members.length > 0) {
      ho.household_members.forEach((member) => {
        const row = sheet2.getRow(hmRowIndex);
        // Construct full address from database fields
        const addressParts = [];
        if (ho.home_number) addressParts.push(ho.home_number);
        if (ho.block_number) addressParts.push(`Block ${ho.block_number}`);
        if (ho.lot_number) addressParts.push(`Lot ${ho.lot_number}`);
        if (ho.street_name) addressParts.push(ho.street_name);
        if (ho.barangay) addressParts.push(ho.barangay);
        const fullAddress = addressParts.join(", ") || ho.address || "—";

        // Determine status from is_active field
        const status = ho.is_active ? "Active" : "Inactive";

        row.values = [
          ho.hoa_number || "",
          ho.full_name || "",
          fullAddress,
          member.member_name,
          member.relationship,
          status,
        ];
        row.height = 20;
        row.eachCell((cell, colIndex) => {
          cell.font = { name: "Arial", size: 9.5 };
          cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } },
          };
          if (colIndex === 1 || colIndex === 5 || colIndex === 6) {
            cell.alignment = { horizontal: "center", vertical: "middle" };
          }
        });
        hmRowIndex++;
      });
    }
  });

  sheet2.columns = [
    { width: 16 }, // HOA#
    { width: 28 },
    { width: 38 },
    { width: 26 },
    { width: 20 },
    { width: 16 },
  ];

  // Generate buffer and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const timestamp = new Date().toISOString().slice(0, 10);
  const fullFilename = `${filenamePrefix}_${timestamp}.xlsx`;

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fullFilename;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

/**
 * Export Monthly Dues Report with one worksheet per year.
 * Each sheet shows all homeowners and 12 monthly columns with Paid / Unpaid status and totals.
 */
export async function exportMonthlyDuesReportToExcel(
  homeowners: Homeowner[],
  dues: MonthlyDue[],
  years: number[],
  filenamePrefix = "SJV6PH4_Monthly_Dues_Report"
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "St. Joseph Village 6 Phase 4 HOA";
  workbook.lastModifiedBy = "HOA Masterlist System";
  workbook.created = new Date();
  workbook.modified = new Date();

  // Create lookup map for quick access: `${homeownerId}-${year}-${month}`
  const duesMap = new Map<string, MonthlyDue>();
  dues.forEach((due) => {
    const key = `${due.homeowner_id}-${due.year}-${due.month}`;
    duesMap.set(key, due);
  });

  const MONTH_NAMES = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  // Sort years chronologically ascending (or as passed)
  const sortedYears = [...years].sort((a, b) => b - a);

  sortedYears.forEach((year) => {
    const sheet = workbook.addWorksheet(`Dues ${year}`, {
      views: [{ showGridLines: true }],
    });

    // 1. Title Banner
    sheet.mergeCells("A1:U1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = "ST. JOSEPH VILLAGE 6 PHASE 4 — HOMEOWNERS ASSOCIATION";
    titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F382A" }, // Emerald HOA Header
    };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(1).height = 32;

    // 2. Subtitle Banner
    sheet.mergeCells("A2:U2");
    const subCell = sheet.getCell("A2");
    subCell.value = `Annual Dues Collection Master Report — Fiscal Year ${year} (Exported: ${new Date().toLocaleDateString(
      "en-US",
      { dateStyle: "long" }
    )})`;
    subCell.font = { name: "Arial", size: 10, italic: true, color: { argb: "FF2D705D" } };
    subCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(2).height = 20;

    // Empty spacer row
    sheet.getRow(3).height = 8;

    // 3. Header Row
    const headers = [
      "HOA#",
      "Homeowner Name",
      "Blk",
      "Lot",
      "Street Address",
      "Ownership",
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
      "Paid Months",
      "Total Paid (₱)",
      "Total Unpaid (₱)",
    ];

    const headerRow = sheet.getRow(4);
    headerRow.height = 26;
    headers.forEach((h, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = h;
      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF134E3E" },
      };
      cell.alignment = {
        horizontal: idx >= 2 && idx <= 3 ? "center" : idx >= 5 ? "center" : "left",
        vertical: "middle",
        wrapText: true,
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FF0A261C" } },
        bottom: { style: "medium", color: { argb: "FF0A261C" } },
        left: { style: "thin", color: { argb: "FF0A261C" } },
        right: { style: "thin", color: { argb: "FF0A261C" } },
      };
    });

    // 4. Data Rows
    let currentRowIdx = 5;
    const monthlyPaidCounts = new Array(12).fill(0);
    let totalPaidAll = 0;
    let totalUnpaidAll = 0;

    homeowners.forEach((ho, hoIndex) => {
      const row = sheet.getRow(currentRowIdx);
      row.height = 20;
      const isEven = hoIndex % 2 === 0;
      const baseRowBg = isEven ? "FFFFFFFF" : "FFF8FAF9";

      const fullName = ho.full_name || `${ho.first_name || ""} ${ho.last_name || ""}`.trim() || "Unnamed";
      const hoaNumber = ho.hoa_number || `SJV6PH4-${String(hoIndex + 1).padStart(5, "0")}`;
      const blk = ho.block_number || "";
      const lot = ho.lot_number || "";
      const address = ho.street_name || ho.address || "";
      const ownership = ho.ownership_type ? ho.ownership_type.toUpperCase() : "OWNER";

      let hoPaidMonths = 0;
      let hoTotalPaid = 0;
      let hoTotalUnpaid = 0;
      const sampleDue = dues.find((d) => d.year === year && Number(d.amount) > 0) || dues.find((d) => Number(d.amount) > 0);
      const standardMonthlyAmount = sampleDue ? Number(sampleDue.amount) : 100;

      // Base Info Cells
      const infoCells = [
        hoaNumber,
        fullName,
        blk,
        lot,
        address,
        ownership,
      ];

      infoCells.forEach((val, i) => {
        const cell = row.getCell(i + 1);
        cell.value = val;
        cell.font = { name: "Arial", size: 9, bold: i === 1 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: baseRowBg } };
        cell.alignment = {
          horizontal: i === 2 || i === 3 || i === 5 ? "center" : "left",
          vertical: "middle",
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
      });

      // 12 Months
      for (let m = 1; m <= 12; m++) {
        const key = `${ho.id}-${year}-${m}`;
        const due = duesMap.get(key);
        const isPaid = due?.status === "paid";
        const colIdx = 6 + m; // column 7 is Jan
        const monthCell = row.getCell(colIdx);

        const dueAmount = due && due.amount !== undefined && !isNaN(Number(due.amount)) ? Number(due.amount) : standardMonthlyAmount;

        if (isPaid) {
          hoPaidMonths++;
          hoTotalPaid += dueAmount;
          monthlyPaidCounts[m - 1]++;
          monthCell.value = "PAID";
          monthCell.font = { name: "Arial", size: 8.5, bold: true, color: { argb: "FF166534" } }; // Dark Green
          monthCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } }; // Mint Light Green
        } else {
          hoTotalUnpaid += dueAmount;
          monthCell.value = "UNPAID";
          monthCell.font = { name: "Arial", size: 8.5, bold: true, color: { argb: "FF991B1B" } }; // Dark Red
          monthCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } }; // Soft Red
        }

        monthCell.alignment = { horizontal: "center", vertical: "middle" };
        monthCell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
      }

      // Summary Columns for this Homeowner
      totalPaidAll += hoTotalPaid;
      totalUnpaidAll += hoTotalUnpaid;

      // Paid Months Count
      const paidMonthsCell = row.getCell(19);
      paidMonthsCell.value = `${hoPaidMonths} / 12`;
      paidMonthsCell.font = { name: "Arial", size: 9, bold: true };
      paidMonthsCell.alignment = { horizontal: "center", vertical: "middle" };
      paidMonthsCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: baseRowBg } };
      paidMonthsCell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };

      // Total Paid (₱)
      const totalPaidCell = row.getCell(20);
      totalPaidCell.value = hoTotalPaid;
      totalPaidCell.numFmt = '"₱"#,##0.00';
      totalPaidCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF166534" } };
      totalPaidCell.alignment = { horizontal: "right", vertical: "middle" };
      totalPaidCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: baseRowBg } };
      totalPaidCell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };

      // Total Unpaid (₱)
      const totalUnpaidCell = row.getCell(21);
      totalUnpaidCell.value = hoTotalUnpaid;
      totalUnpaidCell.numFmt = '"₱"#,##0.00';
      totalUnpaidCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF991B1B" } };
      totalUnpaidCell.alignment = { horizontal: "right", vertical: "middle" };
      totalUnpaidCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: baseRowBg } };
      totalUnpaidCell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };

      currentRowIdx++;
    });

    // 5. Grand Summary Row
    const summaryRow = sheet.getRow(currentRowIdx);
    summaryRow.height = 24;

    sheet.mergeCells(`A${currentRowIdx}:F${currentRowIdx}`);
    const summaryLabelCell = sheet.getCell(`A${currentRowIdx}`);
    summaryLabelCell.value = "TOTAL PAID HOMEOWNERS (PER MONTH)";
    summaryLabelCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
    summaryLabelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F382A" } };
    summaryLabelCell.alignment = { horizontal: "center", vertical: "middle" };

    for (let m = 1; m <= 12; m++) {
      const colIdx = 6 + m;
      const mSummaryCell = summaryRow.getCell(colIdx);
      mSummaryCell.value = monthlyPaidCounts[m - 1];
      mSummaryCell.font = { name: "Arial", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
      mSummaryCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B4D3E" } };
      mSummaryCell.alignment = { horizontal: "center", vertical: "middle" };
      mSummaryCell.border = {
        top: { style: "medium", color: { argb: "FF0A261C" } },
        bottom: { style: "medium", color: { argb: "FF0A261C" } },
        left: { style: "thin", color: { argb: "FF0A261C" } },
        right: { style: "thin", color: { argb: "FF0A261C" } },
      };
    }

    const totalMonthsPaidCell = summaryRow.getCell(19);
    totalMonthsPaidCell.value = monthlyPaidCounts.reduce((a, b) => a + b, 0);
    totalMonthsPaidCell.font = { name: "Arial", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
    totalMonthsPaidCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F382A" } };
    totalMonthsPaidCell.alignment = { horizontal: "center", vertical: "middle" };

    const grandPaidCell = summaryRow.getCell(20);
    grandPaidCell.value = totalPaidAll;
    grandPaidCell.numFmt = '"₱"#,##0.00';
    grandPaidCell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    grandPaidCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF166534" } };
    grandPaidCell.alignment = { horizontal: "right", vertical: "middle" };

    const grandUnpaidCell = summaryRow.getCell(21);
    grandUnpaidCell.value = totalUnpaidAll;
    grandUnpaidCell.numFmt = '"₱"#,##0.00';
    grandUnpaidCell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    grandUnpaidCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF991B1B" } };
    grandUnpaidCell.alignment = { horizontal: "right", vertical: "middle" };

    // Column Widths
    sheet.columns = [
      { width: 16 }, // HOA#
      { width: 28 }, // Homeowner Name
      { width: 8 },  // Blk
      { width: 8 },  // Lot
      { width: 30 }, // Street Address
      { width: 14 }, // Ownership Type
      { width: 11 }, // Jan
      { width: 11 }, // Feb
      { width: 11 }, // Mar
      { width: 11 }, // Apr
      { width: 11 }, // May
      { width: 11 }, // Jun
      { width: 11 }, // Jul
      { width: 11 }, // Aug
      { width: 11 }, // Sep
      { width: 11 }, // Oct
      { width: 11 }, // Nov
      { width: 11 }, // Dec
      { width: 14 }, // Paid Months
      { width: 18 }, // Total Paid (₱)
      { width: 18 }, // Total Unpaid (₱)
    ];
  });

  // Write and trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const timestamp = new Date().toISOString().slice(0, 10);
  const yearsLabel = sortedYears.length === 1 ? `${sortedYears[0]}` : `${sortedYears[sortedYears.length - 1]}-${sortedYears[0]}`;
  const fullFilename = `${filenamePrefix}_${yearsLabel}_${timestamp}.xlsx`;

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fullFilename;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

