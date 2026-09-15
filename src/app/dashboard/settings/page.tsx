"use client";

import React, { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useApp } from "@/context/app-context";
import { hasPermission } from "@/lib/permissions";
import {
  Database,
  Download,
  Upload,
  ShieldAlert,
  ShieldCheck,
  DollarSign,
  Info,
  Building,
  CheckCircle,
  AlertTriangle,
  FileCode,
  HardDrive,
  RefreshCw,
  Sliders,
} from "lucide-react";

export default function SettingsPage() {
  const { currentUser } = useApp();
  const { success, error: toastError } = useToast();

  const canManage =
    currentUser?.role === "super_admin" ||
    currentUser?.role === "admin" ||
    hasPermission(currentUser, "can_backup_restore") ||
    hasPermission(currentUser, "can_manage_monthly_dues");

  const [activeTab, setActiveTab] = useState<"database" | "dues" | "hoa">("database");

  // SQL Import/Export state
  const [isExportingSql, setIsExportingSql] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedSqlFile, setSelectedSqlFile] = useState<File | null>(null);
  const [sqlContent, setSqlContent] = useState<string>("");
  const [isRestoringSql, setIsRestoringSql] = useState(false);
  const sqlInputRef = useRef<HTMLInputElement>(null);

  // Dues configuration state
  const [duesAmount, setDuesAmount] = useState<string>("100.00");
  const [hoaName, setHoaName] = useState<string>("St. Joseph Village 6 Phase 4 HOA");
  const [updateUnpaid, setUpdateUnpaid] = useState<boolean>(false);
  const [isSavingDues, setIsSavingDues] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // Fetch current system settings
  const fetchSettings = async () => {
    try {
      setIsLoadingSettings(true);
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.success && data.settings) {
        if (data.settings.monthly_dues_amount) {
          setDuesAmount(data.settings.monthly_dues_amount);
        }
        if (data.settings.hoa_name) {
          setHoaName(data.settings.hoa_name);
        }
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Handle SQL Export
  const handleExportSql = async () => {
    try {
      setIsExportingSql(true);
      const res = await fetch("/api/settings/database/export");
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to export database");
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      let filename = `residential_masterlist_backup_${new Date().toISOString().split("T")[0]}.sql`;
      if (disposition && disposition.includes("filename=")) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      success("Database Export Complete", `Downloaded ${filename} successfully.`);
    } catch (err: any) {
      toastError("Export Failed", err.message || "Could not generate SQL export.");
    } finally {
      setIsExportingSql(false);
    }
  };

  // Handle SQL File Selection
  const handleSqlFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".sql")) {
      toastError("Invalid File", "Please select a valid .sql database dump file.");
      return;
    }

    setSelectedSqlFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setSqlContent((event.target?.result as string) || "");
      setIsImportModalOpen(true);
    };
    reader.readAsText(file);
  };

  // Handle Confirm SQL Restore
  const handleConfirmSqlImport = async () => {
    if (!sqlContent || !selectedSqlFile) {
      toastError("No File", "Please select a valid .sql backup file.");
      return;
    }

    try {
      setIsRestoringSql(true);
      const res = await fetch("/api/settings/database/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: sqlContent }),
      });

      const data = await res.json();
      if (data.success) {
        success(
          "Database Restored",
          data.message || `Successfully executed ${data.executedCount || 0} SQL statements.`
        );
        setIsImportModalOpen(false);
        setSelectedSqlFile(null);
        setSqlContent("");
        if (sqlInputRef.current) sqlInputRef.current.value = "";
        fetchSettings();
      } else {
        toastError("Restore Failed", data.error || "Failed to execute SQL backup.");
      }
    } catch (err: any) {
      toastError("Restore Failed", err.message || "An unexpected error occurred during SQL restore.");
    } finally {
      setIsRestoringSql(false);
    }
  };

  // Handle Save Dues Settings
  const handleSaveDuesSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(duesAmount);
    if (isNaN(num) || num < 0) {
      toastError("Validation Error", "Please enter a valid non-negative dues amount.");
      return;
    }

    try {
      setIsSavingDues(true);
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthly_dues_amount: num.toFixed(2),
          update_existing_unpaid: updateUnpaid,
        }),
      });

      const data = await res.json();
      if (data.success) {
        success(
          "Settings Saved",
          updateUnpaid
            ? `Standard dues set to ₱${num.toFixed(2)} and existing unpaid dues updated.`
            : `Standard monthly dues rate updated to ₱${num.toFixed(2)}.`
        );
      } else {
        toastError("Save Failed", data.error || "Could not update dues settings.");
      }
    } catch (err: any) {
      toastError("Save Failed", err.message || "An error occurred while saving settings.");
    } finally {
      setIsSavingDues(false);
    }
  };

  if (!canManage) {
    return (
      <div className="p-12 text-center rounded-2xl border border-slate-200 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d]">
        <ShieldAlert className="h-12 w-12 text-red-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Permission Denied</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Your account does not have permission to access system settings or database management.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Settings & Database"
        description="Export/Import SQL database backups, configure monthly dues rates, and view HOA details"
        icon={
          <span className="inline-flex items-center justify-center h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
            <Sliders className="h-4 w-4" />
          </span>
        }
      />

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-1">
        <button
          onClick={() => setActiveTab("database")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "database"
              ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Database className="h-4 w-4" />
          <span>SQL Database Management</span>
        </button>

        <button
          onClick={() => setActiveTab("dues")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "dues"
              ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <DollarSign className="h-4 w-4" />
          <span>Monthly Dues Configuration</span>
        </button>

        <button
          onClick={() => setActiveTab("hoa")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "hoa"
              ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Building className="h-4 w-4" />
          <span>HOA Identity & System</span>
        </button>
      </div>

      {/* TAB 1: SQL Database Management */}
      {activeTab === "database" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Export SQL Database */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] p-6 shadow-subtle flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
                  <Download className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Export SQL Database Dump
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Download full MariaDB/MySQL compatible `.sql` script
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0c182c] border border-slate-200/80 dark:border-[#1e2f4d] mb-6 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                  <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Includes all tables, schemas, and relational constraints</span>
                </div>
                <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                  <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Includes Homeowners, Monthly Dues, Profiles, and Audit Logs</span>
                </div>
                <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                  <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Ready for offline backup or migration to another MariaDB/MySQL instance</span>
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={handleExportSql}
              isLoading={isExportingSql}
              className="w-full gap-2 py-3 rounded-2xl text-sm font-bold shadow-md"
            >
              <Download className="h-4 w-4" />
              <span>Download Complete SQL Backup (.sql)</span>
            </Button>
          </div>

          {/* Import SQL Database */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] p-6 shadow-subtle flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800/60 shadow-xs">
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Import & Restore SQL Database
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Restore database state from a `.sql` backup file
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50 mb-6 space-y-2 text-xs text-amber-800 dark:text-amber-300">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Caution:</strong> Importing an SQL backup will execute the commands in the script. Please ensure the file was exported from this system or is a verified MariaDB dump.
                  </span>
                </div>
              </div>

              <input
                ref={sqlInputRef}
                type="file"
                accept=".sql"
                onChange={handleSqlFileSelect}
                className="hidden"
              />

              <div
                onClick={() => sqlInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-400 rounded-2xl p-6 text-center cursor-pointer bg-slate-50/60 dark:bg-[#0c182c] transition-all hover:bg-slate-100/60"
              >
                <FileCode className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Click to select .sql file to import
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Supports standard .sql database dumps</p>
              </div>
            </div>

            <div className="mt-4">
              <Button
                variant="outline"
                onClick={() => sqlInputRef.current?.click()}
                className="w-full gap-2 py-3 rounded-2xl border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold"
              >
                <Upload className="h-4 w-4" />
                <span>Browse .sql File</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Monthly Dues Configuration */}
      {activeTab === "dues" && (
        <div className="max-w-2xl">
          <div className="rounded-3xl border border-slate-200/80 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] p-6 shadow-subtle space-y-6">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Standard Monthly Dues Rate
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Configure the default monthly association dues assessment
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveDuesSettings} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                  Monthly Dues Amount (PHP ₱)
                </label>
                <div className="relative max-w-xs">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-emerald-600 dark:text-emerald-400">
                    ₱
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={duesAmount}
                    onChange={(e) => setDuesAmount(e.target.value)}
                    required
                    className="pl-8 text-base font-bold text-slate-900 dark:text-slate-100 rounded-xl"
                  />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  Default fee assessed per homeowner for each billing month.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 dark:border-[#1e2f4d] bg-slate-50/70 dark:bg-[#0a1526] flex items-start gap-3">
                <input
                  type="checkbox"
                  id="updateUnpaid"
                  checked={updateUnpaid}
                  onChange={(e) => setUpdateUnpaid(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="updateUnpaid" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <span className="font-bold text-slate-900 dark:text-slate-100 block">
                    Update all currently unpaid monthly dues records
                  </span>
                  Check this to also adjust unpaid dues in past or current months to ₱{parseFloat(duesAmount || "0").toFixed(2)}. Existing paid records will not be altered.
                </label>
              </div>

              <Button
                type="submit"
                variant="primary"
                isLoading={isSavingDues}
                className="gap-2 px-6 py-2.5 rounded-xl font-bold shadow-sm"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Save Dues Configuration</span>
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: HOA Identity & System */}
      {activeTab === "hoa" && (
        <div className="max-w-2xl space-y-6">
          <div className="rounded-3xl border border-slate-200/80 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] p-6 shadow-subtle space-y-6">
            <div className="flex items-center gap-5">
              <div className="relative h-20 w-20 rounded-2xl overflow-hidden border-2 border-emerald-500/30 shadow-md shrink-0 bg-[#07162c] flex items-center justify-center">
                <img
                  src="/icon.png"
                  alt="HOA Logo"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "/ICON.png";
                  }}
                />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                  Official Community Emblem
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                  {hoaName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Residential Masterlist & Portal Management System
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-[#1e2f4d] pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0c182c] border border-slate-200/70 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">System Version</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">v1.0.0 (Windows Native)</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0c182c] border border-slate-200/70 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Database Engine</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">MariaDB 10.11 Portable (33060)</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0c182c] border border-slate-200/70 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Active Database</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">residential_masterlist</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0c182c] border border-slate-200/70 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">App Port</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">3000 (localhost only)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SQL Import Confirmation Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          if (!isRestoringSql) {
            setIsImportModalOpen(false);
            setSelectedSqlFile(null);
            setSqlContent("");
          }
        }}
        title="Confirm SQL Database Restore"
        description="Verify and execute SQL database restore"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4" />
              <span>Warning: Irreversible Action</span>
            </div>
            <p>
              Restoring an SQL dump will execute all SQL statements in the file. Any tables or records modified by this script will be replaced.
            </p>
            {selectedSqlFile && (
              <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-900 text-xs font-mono">
                <div>File: <strong>{selectedSqlFile.name}</strong></div>
                <div>Size: {(selectedSqlFile.size / 1024).toFixed(1)} KB</div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isRestoringSql}
              onClick={() => {
                setIsImportModalOpen(false);
                setSelectedSqlFile(null);
                setSqlContent("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmSqlImport}
              isLoading={isRestoringSql}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1.5"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Confirm & Restore Database</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

