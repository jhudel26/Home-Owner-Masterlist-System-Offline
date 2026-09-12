"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Homeowner, MonthlyDue } from "@/types/database";
import { exportMonthlyDuesReportToExcel } from "@/lib/excel-export";
import { FileSpreadsheet, Calendar, Sparkles, Check, Loader2, ArrowRight } from "lucide-react";

interface ExportMonthlyDuesModalProps {
  isOpen: boolean;
  onClose: () => void;
  homeowners: Homeowner[];
  filteredHomeowners?: Homeowner[];
}

type DurationType = "current" | "previous" | "last3" | "custom";

export function ExportMonthlyDuesModal({
  isOpen,
  onClose,
  homeowners,
  filteredHomeowners,
}: ExportMonthlyDuesModalProps) {
  const { success, error: toastError } = useToast();
  const currentYear = new Date().getFullYear();

  const [durationType, setDurationType] = useState<DurationType>("current");
  const [customStartYear, setCustomStartYear] = useState(currentYear - 1);
  const [customEndYear, setCustomEndYear] = useState(currentYear);
  const [useFilteredList, setUseFilteredList] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Available year choices for dropdowns
  const availableYears = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  const getSelectedYears = (): number[] => {
    switch (durationType) {
      case "current":
        return [currentYear];
      case "previous":
        return [currentYear - 1];
      case "last3":
        return [currentYear - 2, currentYear - 1, currentYear];
      case "custom": {
        const start = Math.min(customStartYear, customEndYear);
        const end = Math.max(customStartYear, customEndYear);
        const years: number[] = [];
        for (let y = start; y <= end; y++) {
          years.push(y);
        }
        return years;
      }
      default:
        return [currentYear];
    }
  };

  const handleExport = async () => {
    const selectedYears = getSelectedYears();
    if (selectedYears.length === 0) {
      toastError("Export Error", "Please select at least one year.");
      return;
    }

    const minYear = Math.min(...selectedYears);
    const maxYear = Math.max(...selectedYears);

    setIsExporting(true);
    try {
      // Fetch dues data across the selected year span
      const res = await fetch(`/api/monthly-dues?start_year=${minYear}&end_year=${maxYear}`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch monthly dues for report");
      }

      const duesRecords: MonthlyDue[] = data.data || [];
      const listToExport = useFilteredList && filteredHomeowners && filteredHomeowners.length > 0
        ? filteredHomeowners
        : homeowners;

      if (listToExport.length === 0) {
        toastError("Export Error", "No homeowners available to export.");
        return;
      }

      await exportMonthlyDuesReportToExcel(listToExport, duesRecords, selectedYears);

      const yearsLabel = selectedYears.length === 1
        ? `${selectedYears[0]}`
        : `${minYear} - ${maxYear} (${selectedYears.length} years)`;

      success(
        "Excel Report Generated",
        `Monthly dues collection report for ${yearsLabel} downloaded with ${selectedYears.length} sheet${selectedYears.length > 1 ? "s" : ""}.`
      );
      onClose();
    } catch (err: any) {
      console.error("Export error:", err);
      toastError("Export Failed", err.message || "An error occurred while generating the Excel report.");
    } finally {
      setIsExporting(false);
    }
  };

  const selectedYears = getSelectedYears();
  const hasFilteredOption = Boolean(filteredHomeowners && filteredHomeowners.length > 0 && filteredHomeowners.length !== homeowners.length);

  return (
    <Modal
      isOpen={isOpen}
      onClose={isExporting ? () => {} : onClose}
      title="Generate Monthly Dues Collection Report"
      description="Export annual association dues records to an Excel workbook with dedicated sheets per fiscal year."
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Banner */}
        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-200 text-xs">
          <FileSpreadsheet className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Multi-Year Workbook Format</p>
            <p className="text-emerald-800 dark:text-emerald-300 leading-relaxed">
              Each selected year will be generated as its own individual worksheet in the workbook, containing all 12 monthly columns with Paid/Unpaid status indicators, totals, and collection rates.
            </p>
          </div>
        </div>

        {/* Year Duration Selection */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
            Select Report Duration
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Current Year */}
            <button
              type="button"
              onClick={() => setDurationType("current")}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-start justify-between ${
                durationType === "current"
                  ? "border-emerald-600 dark:border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-600/20"
                  : "border-slate-200 dark:border-[#1e2f4d] bg-white dark:bg-[#0c182c] hover:bg-slate-50 dark:hover:bg-[#101f38]"
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-slate-100">
                  <Calendar className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Current Year ({currentYear})</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Single sheet for active fiscal year
                </p>
              </div>
              {durationType === "current" && (
                <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              )}
            </button>

            {/* Previous Year */}
            <button
              type="button"
              onClick={() => setDurationType("previous")}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-start justify-between ${
                durationType === "previous"
                  ? "border-emerald-600 dark:border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-600/20"
                  : "border-slate-200 dark:border-[#1e2f4d] bg-white dark:bg-[#0c182c] hover:bg-slate-50 dark:hover:bg-[#101f38]"
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-slate-100">
                  <Calendar className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Previous Year ({currentYear - 1})</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Full 12-month historical audit
                </p>
              </div>
              {durationType === "previous" && (
                <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              )}
            </button>

            {/* Last 3 Years */}
            <button
              type="button"
              onClick={() => setDurationType("last3")}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-start justify-between ${
                durationType === "last3"
                  ? "border-emerald-600 dark:border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-600/20"
                  : "border-slate-200 dark:border-[#1e2f4d] bg-white dark:bg-[#0c182c] hover:bg-slate-50 dark:hover:bg-[#101f38]"
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-slate-100">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>Last 3 Years ({currentYear - 2} - {currentYear})</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  3 sheets for multi-year collection tracking
                </p>
              </div>
              {durationType === "last3" && (
                <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              )}
            </button>

            {/* Custom Range */}
            <button
              type="button"
              onClick={() => setDurationType("custom")}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-start justify-between ${
                durationType === "custom"
                  ? "border-emerald-600 dark:border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-600/20"
                  : "border-slate-200 dark:border-[#1e2f4d] bg-white dark:bg-[#0c182c] hover:bg-slate-50 dark:hover:bg-[#101f38]"
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-slate-100">
                  <Calendar className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Custom Year Range</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Pick specific start and end years
                </p>
              </div>
              {durationType === "custom" && (
                <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              )}
            </button>
          </div>

          {/* Custom Range Pickers */}
          {durationType === "custom" && (
            <div className="p-4 rounded-xl border border-slate-200 dark:border-[#1e2f4d] bg-slate-50 dark:bg-[#0a1526] space-y-3 animate-in fade-in duration-150">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Define Custom Range:
              </span>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    From Year
                  </label>
                  <select
                    value={customStartYear}
                    onChange={(e) => setCustomStartYear(parseInt(e.target.value))}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-[#1e2f4d] bg-white dark:bg-[#0c182c] px-3 py-2 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                  >
                    {availableYears.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>

                <ArrowRight className="h-4 w-4 text-slate-400 shrink-0 mt-4" />

                <div className="flex-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    To Year
                  </label>
                  <select
                    value={customEndYear}
                    onChange={(e) => setCustomEndYear(parseInt(e.target.value))}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-[#1e2f4d] bg-white dark:bg-[#0c182c] px-3 py-2 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                  >
                    {availableYears.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Homeowner Scope Selection (if filtered) */}
        {hasFilteredOption && (
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#1e2f4d] bg-white dark:bg-[#0c182c] space-y-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Records to Include:
            </span>
            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="radio"
                  name="scope"
                  checked={!useFilteredList}
                  onChange={() => setUseFilteredList(false)}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span>All Homeowners ({homeowners.length})</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="radio"
                  name="scope"
                  checked={useFilteredList}
                  onChange={() => setUseFilteredList(true)}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span>Current Filter Results ({filteredHomeowners?.length})</span>
              </label>
            </div>
          </div>
        )}

        {/* Selected Sheets Preview Summary */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#1e2f4d] bg-slate-50 dark:bg-[#0a1526] text-xs flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Sheets to be generated:</span>
          <div className="flex items-center gap-1.5 font-mono font-bold text-emerald-800 dark:text-emerald-300 flex-wrap justify-end">
            {selectedYears.map((yr) => (
              <span
                key={yr}
                className="px-2 py-0.5 rounded-md bg-white dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[11px]"
              >
                Dues {yr}
              </span>
            ))}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isExporting}
            className="text-xs text-slate-600 dark:text-slate-300"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleExport}
            disabled={isExporting || selectedYears.length === 0}
            className="gap-2 text-xs bg-emerald-700 hover:bg-emerald-800 shadow-sm shadow-emerald-700/30 text-white font-semibold"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Generating Report...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="h-4 w-4 text-emerald-200" />
                <span>Download Excel Report ({selectedYears.length} Sheet{selectedYears.length > 1 ? "s" : ""})</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

