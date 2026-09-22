"use client";

import React, { useState, useRef } from "react";
import ExcelJS from "exceljs";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useData } from "@/context/data-context";
import { Upload, FileSpreadsheet, Download, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { BulkImportRowSchema, BulkImportRowInput } from "@/lib/validations/schemas";
import { Homeowner, OwnershipType, GenderType, RecordStatus, HouseholdMember } from "@/types/database";
import { calculateAge } from "@/lib/utils";

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BulkImportModal({ isOpen, onClose }: BulkImportModalProps) {
  const { bulkImportHomeowners } = useData();
  const { success, error: toastError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parsedRows, setParsedRows] = useState<
    Array<{ data: BulkImportRowInput; valid: boolean; errors: string[] }>
  >([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState("");

  // Generate and download a formatted official .xlsx template
  const handleDownloadTemplate = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Residential Masterlist";
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet("Homeowners Import Template", {
        views: [{ showGridLines: true }],
      });

      // Title Banner
      worksheet.mergeCells("A1:W1");
      const titleCell = worksheet.getCell("A1");
      titleCell.value = "RESIDENTIAL MASTERLIST — HOMEOWNERS IMPORT TEMPLATE";
      titleCell.font = { name: "Arial", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
      titleCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF059669" }, // HOA Emerald
      };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.getRow(1).height = 30;

      // Header Row
      const headers = [
        "First Name",
        "Middle Name",
        "Last Name",
        "Suffix",
        "Ownership Type",
        "Gender",
        "Birthdate (YYYY-MM-DD)",
        "Date of Residency (YYYY-MM-DD)",
        "Home Number",
        "Block Number",
        "Lot Number",
        "Street Name",
        "Barangay",
        "Contact Number",
        "Email",
        "Registered Pets",
        "GA Proxy First Name",
        "GA Proxy Middle Name",
        "GA Proxy Last Name",
        "GA Proxy Suffix",
        "GA Proxy Mobile",
        "GA Proxy Email",
        "Household Members (Format: Name (Relationship), Name (Relationship))",
      ];

      const headerRow = worksheet.getRow(2);
      headerRow.values = headers;
      headerRow.height = 24;
      headerRow.eachCell((cell) => {
        cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF07162C" }, // Deep Navy
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });

      // Sample Data Rows for user guidance
      const sampleRows = [
        [
          "Juan",
          "",
          "Dela Cruz",
          "",
          "Owner",
          "Male",
          "1985-04-12",
          "2024-05-01",
          "12A",
          "12",
          "5",
          "Joseph Village 6",
          "Timalan",
          "0917-123-4567",
          "juan@example.com",
          1,
          "Maria",
          "",
          "Dela Cruz",
          "",
          "0918-234-5678",
          "maria@example.com",
          "Carlo Dela Cruz (Son), Sofia Dela Cruz (Daughter)",
        ],
        [
          "Elena",
          "Santos",
          "Reyes",
          "",
          "Renter",
          "Female",
          "1990-09-23",
          "2024-06-15",
          "8B",
          "8",
          "14",
          "Joseph Village 6",
          "Timalan",
          "0918-987-6543",
          "elena.reyes@example.com",
          0,
          "",
          "",
          "",
          "",
          "",
          "",
          "Marco Reyes (Husband)",
        ],
      ];

      sampleRows.forEach((rowValues) => {
        const row = worksheet.addRow(rowValues);
        row.height = 20;
        row.eachCell((cell) => {
          cell.font = { name: "Arial", size: 9 };
          cell.alignment = { vertical: "middle" };
        });
      });

      // Auto-fit column widths
      worksheet.columns = [
        { width: 18 }, // First Name
        { width: 18 }, // Middle Name
        { width: 18 }, // Last Name
        { width: 10 }, // Suffix
        { width: 14 }, // Ownership Type
        { width: 12 }, // Gender
        { width: 18 }, // Birthdate
        { width: 18 }, // Date of Residency
        { width: 12 }, // Home Number
        { width: 12 }, // Block Number
        { width: 10 }, // Lot Number
        { width: 30 }, // Street Name
        { width: 16 }, // Barangay
        { width: 18 }, // Contact Number
        { width: 25 }, // Email
        { width: 14 }, // Registered Pets
        { width: 18 }, // GA Proxy First Name
        { width: 18 }, // GA Proxy Middle Name
        { width: 18 }, // GA Proxy Last Name
        { width: 10 }, // GA Proxy Suffix
        { width: 18 }, // GA Proxy Mobile
        { width: 25 }, // GA Proxy Email
        { width: 50 }, // Household Members
      ];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "hoa_homeowners_template.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      success("Template Downloaded", "Official Excel (.xlsx) template saved to your downloads.");
    } catch {
      toastError("Download Failed", "Could not generate Excel template.");
    }
  };

  const parseExcelFile = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      toastError("Invalid File", "The Excel file does not contain any worksheets.");
      return;
    }

    // Find the header row (look for "Full Name" or "Name")
    let headerRowIndex = -1;
    const headerMap: Record<string, number> = {};

    worksheet.eachRow((row, rowNumber) => {
      if (headerRowIndex !== -1) return;
      row.eachCell((cell, colNumber) => {
        const val = String(cell.value || "").trim().toLowerCase();
        if (val.includes("full name") || val === "name") {
          headerRowIndex = rowNumber;
        }
      });
    });

    // Default to row 2 or row 1 if not detected
    if (headerRowIndex === -1) {
      headerRowIndex = worksheet.rowCount > 1 && worksheet.getRow(1).getCell(1).value ? 1 : 2;
    }

    // Map column headers
    const headerRow = worksheet.getRow(headerRowIndex);
    headerRow.eachCell((cell, colNumber) => {
      const val = String(cell.value || "").trim().toLowerCase();
      if (val.includes("first") && val.includes("name")) headerMap["first_name"] = colNumber;
      else if (val.includes("middle") && val.includes("name")) headerMap["middle_name"] = colNumber;
      else if (val.includes("last") && val.includes("name")) headerMap["last_name"] = colNumber;
      else if (val.includes("suffix")) headerMap["suffix"] = colNumber;
      else if (val.includes("ownership") || val.includes("tenure")) headerMap["ownership_type"] = colNumber;
      else if (val.includes("gender") || val.includes("sex")) headerMap["gender"] = colNumber;
      else if (val.includes("birth")) headerMap["birthdate"] = colNumber;
      else if (val.includes("residency") || val.includes("tenure")) headerMap["tenure_date"] = colNumber;
      else if (val.includes("home") && val.includes("number")) headerMap["home_number"] = colNumber;
      else if (val.includes("block")) headerMap["block_number"] = colNumber;
      else if (val.includes("lot")) headerMap["lot_number"] = colNumber;
      else if (val.includes("street")) headerMap["street_name"] = colNumber;
      else if (val.includes("barangay")) headerMap["barangay"] = colNumber;
      else if (val.includes("contact") || val.includes("mobile") || val.includes("phone")) headerMap["contact_number"] = colNumber;
      else if (val.includes("email")) headerMap["email"] = colNumber;
      else if (val.includes("pet")) headerMap["registered_pets"] = colNumber;
      else if (val.includes("proxy") && val.includes("first")) headerMap["ga_proxy_first_name"] = colNumber;
      else if (val.includes("proxy") && val.includes("middle")) headerMap["ga_proxy_middle_name"] = colNumber;
      else if (val.includes("proxy") && val.includes("last")) headerMap["ga_proxy_last_name"] = colNumber;
      else if (val.includes("proxy") && val.includes("suffix")) headerMap["ga_proxy_suffix"] = colNumber;
      else if (val.includes("proxy") && (val.includes("mobile") || val.includes("phone"))) headerMap["ga_proxy_mobile"] = colNumber;
      else if (val.includes("proxy") && val.includes("email")) headerMap["ga_proxy_email"] = colNumber;
      else if (val.includes("household") && val.includes("member")) headerMap["household_members"] = colNumber;
    });

    const parsedData: Array<{ data: BulkImportRowInput; valid: boolean; errors: string[] }> = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= headerRowIndex) return;

      const getVal = (field: string) => {
        const col = headerMap[field];
        if (!col) return "";
        const cell = row.getCell(col);
        if (cell.value === null || cell.value === undefined) return "";
        if (typeof cell.value === "object" && "text" in cell.value) return String(cell.value.text);
        if (cell.value instanceof Date) return cell.value.toISOString().split("T")[0];
        return String(cell.value).trim();
      };

      const firstName = getVal("first_name");
      const lastName = getVal("last_name");
      if (!firstName && !lastName) return; // Skip empty rows

      const rowObj: Record<string, any> = {
        first_name: firstName,
        middle_name: getVal("middle_name"),
        last_name: lastName,
        suffix: getVal("suffix"),
        ownership_type: getVal("ownership_type") || "owner",
        gender: getVal("gender") || "Male",
        birthdate: getVal("birthdate"),
        tenure_date: getVal("tenure_date"),
        home_number: getVal("home_number"),
        block_number: getVal("block_number"),
        lot_number: getVal("lot_number"),
        street_name: getVal("street_name"),
        barangay: getVal("barangay"),
        contact_number: getVal("contact_number"),
        email: getVal("email"),
        registered_pets: parseInt(getVal("registered_pets")) || 0,
        ga_proxy_first_name: getVal("ga_proxy_first_name"),
        ga_proxy_middle_name: getVal("ga_proxy_middle_name"),
        ga_proxy_last_name: getVal("ga_proxy_last_name"),
        ga_proxy_suffix: getVal("ga_proxy_suffix"),
        ga_proxy_mobile: getVal("ga_proxy_mobile"),
        ga_proxy_email: getVal("ga_proxy_email"),
        household_members: getVal("household_members"),
      };

      const validation = BulkImportRowSchema.safeParse(rowObj);
      parsedData.push({
        data: (validation.success ? validation.data : rowObj) as BulkImportRowInput,
        valid: validation.success,
        errors: validation.success ? [] : validation.error.issues.map((i) => i.message),
      });
    });

    if (parsedData.length === 0) {
      toastError("No Data Found", "No homeowner rows could be read from the Excel sheet.");
      return;
    }

    setParsedRows(parsedData);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    try {
      await parseExcelFile(file);
    } catch {
      toastError("Parse Error", "Failed to parse the Excel file. Please ensure it is a valid .xlsx file.");
    }
  };

  const handleImport = async () => {
    const validRows = parsedRows.filter((r) => r.valid);
    if (validRows.length === 0) {
      toastError("No Valid Rows", "None of the rows passed validation. Please resolve issues first.");
      return;
    }

    setIsProcessing(true);
    try {
      const formatted = validRows.map((r) => {
        const d = r.data;
        const members: Omit<HouseholdMember, "id" | "homeowner_id">[] = [];

        if (d.household_members) {
          const rawMembers = d.household_members.split(",");
          rawMembers.forEach((mStr) => {
            const trimmed = mStr.trim();
            if (trimmed) {
              const match = trimmed.match(/^(.*?)\s*\((.*?)\)$/);
              if (match) {
                members.push({ member_name: match[1].trim(), relationship: match[2].trim() });
              } else {
                members.push({ member_name: trimmed, relationship: "Family Member" });
              }
            }
          });
        }

        const rawOwnership = (d.ownership_type || "").toString().toLowerCase().trim();
        const normOwnership: OwnershipType = rawOwnership === "renter" ? "renter" : "owner";

        const rawGender = (d.gender || "").toString().toLowerCase().trim();
        const normGender: GenderType = rawGender === "female" ? "female" : rawGender === "other" ? "other" : "male";

        const hoRecord: Omit<Homeowner, "id" | "created_at" | "updated_at"> = {
          first_name: d.first_name || "",
          middle_name: d.middle_name,
          last_name: d.last_name || "",
          suffix: d.suffix,
          full_name: [d.first_name, d.middle_name, d.last_name, d.suffix].filter(Boolean).join(" "),
          ownership_type: normOwnership,
          gender: normGender,
          birthdate: d.birthdate || "",
          age: d.birthdate ? calculateAge(d.birthdate) : undefined,
          tenure_date: d.tenure_date,
          home_number: d.home_number,
          block_number: d.block_number || "",
          lot_number: d.lot_number || "",
          street_name: d.street_name,
          barangay: d.barangay,
          contact_number: d.contact_number,
          email: d.email,
          registered_pets: d.registered_pets || 0,
          ga_proxy_first_name: d.ga_proxy_first_name,
          ga_proxy_middle_name: d.ga_proxy_middle_name,
          ga_proxy_last_name: d.ga_proxy_last_name,
          ga_proxy_suffix: d.ga_proxy_suffix,
          ga_proxy_mobile: d.ga_proxy_mobile,
          ga_proxy_email: d.ga_proxy_email,
          ga_proxy_designated: [d.ga_proxy_first_name, d.ga_proxy_middle_name, d.ga_proxy_last_name, d.ga_proxy_suffix].filter(Boolean).join(" ") || undefined,
        };

        return { homeowner: hoRecord, members };
      });

      const res = await bulkImportHomeowners(formatted);
      if (res.success) {
        success("Import Successful", `Successfully imported ${res.count} homeowner records from Excel.`);
        setParsedRows([]);
        setFileName("");
        onClose();
      } else {
        toastError("Import Failed", res.error || "An error occurred while importing records.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.valid).length;
  const errorCount = parsedRows.length - validCount;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Import Homeowners (Excel)"
      description="Upload an official Excel spreadsheet (.xlsx) to import multiple resident records at once"
      maxWidth="3xl"
    >
      <div className="space-y-6">
        {/* Step 1: Download Template */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/50 text-xs">
          <div className="space-y-1">
            <h4 className="font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>Download Official Excel Template (.xlsx)</span>
            </h4>
            <p className="text-emerald-700 dark:text-emerald-400">
              Download the official template with pre-formatted column headers and sample rows.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            className="shrink-0 gap-1.5 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 bg-white dark:bg-[#0c182c]"
          >
            <Download className="h-4 w-4" />
            <span>Download Excel Template</span>
          </Button>
        </div>

        {/* Step 2: Upload Area */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-3xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-[#091424]/40"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
            className="hidden"
          />
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-teal-400 flex items-center justify-center mx-auto mb-3">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {fileName ? fileName : "Click to select an Excel spreadsheet (.xlsx)"}
          </h4>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Compatible with Microsoft Excel (.xlsx, .xls) and Google Sheets exports
          </p>
        </div>

        {/* Step 3: Preview & Validation Table */}
        {parsedRows.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Data Validation Preview ({parsedRows.length} total rows)
              </span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {validCount} Ready
                </span>
                {errorCount > 0 && (
                  <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {errorCount} Invalid
                  </span>
                )}
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto rounded-2xl border border-slate-200 dark:border-[#1e2f4d] divide-y divide-slate-100 dark:divide-[#1e2f4d] text-xs">
              {parsedRows.map((r, idx) => (
                <div
                  key={idx}
                  className={`p-3 flex items-center justify-between gap-4 ${
                    r.valid ? "bg-white dark:bg-[#0c182c]" : "bg-red-50/50 dark:bg-red-950/20"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {[r.data.first_name, r.data.middle_name, r.data.last_name, r.data.suffix].filter(Boolean).join(" ") || "Unnamed"} &bull; {r.data.street_name || "No address"}
                    </p>
                    {r.errors.length > 0 && (
                      <p className="text-[11px] text-red-500 truncate">{r.errors.join(", ")}</p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      r.valid
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                    }`}
                  >
                    {r.valid ? "Valid" : "Needs Fix"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-[#1e2f4d]">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleImport}
            disabled={parsedRows.length === 0 || validCount === 0 || isProcessing}
            isLoading={isProcessing}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/30"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Import {validCount > 0 ? `${validCount} Records` : ""}</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}


