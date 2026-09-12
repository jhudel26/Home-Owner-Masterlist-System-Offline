"use client";

import React, { useState, useRef } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useData } from "@/context/data-context";
import { Database, Download, Upload, ShieldCheck, AlertTriangle } from "lucide-react";

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BackupRestoreModal({ isOpen, onClose }: BackupRestoreModalProps) {
  const { exportBackupData, restoreBackupData } = useData();
  const { success, error: toastError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoreJson, setRestoreJson] = useState("");
  const [restoreFileName, setRestoreFileName] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);

  const handleExportBackup = () => {
    try {
      const dataStr = exportBackupData();
      const dateStr = new Date().toISOString().split("T")[0];
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `alpalist_hoa_backup_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      success("Backup Generated", "Full database backup downloaded successfully.");
    } catch {
      toastError("Export Failed", "Could not generate database backup.");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRestoreJson(content);
    };
    reader.readAsText(file);
  };

  const handleApplyRestore = async () => {
    if (!restoreJson) {
      toastError("No File", "Please select a valid JSON backup file.");
      return;
    }

    setIsRestoring(true);
    try {
      const res = await restoreBackupData(restoreJson);
      if (res.success) {
        success("Restore Complete", `Restored ${res.count} homeowner records from backup.`);
        setRestoreJson("");
        setRestoreFileName("");
        onClose();
      } else {
        toastError("Restore Failed", res.error || "Failed to parse and restore backup file.");
      }
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Data Backup & Disaster Recovery"
      description="Safely export masterlist snapshots or restore from an existing JSON backup"
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Section 1: Export Backup */}
        <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-[#1e2f4d] bg-white dark:bg-[#0c182c] space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Export Full Database Backup</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Downloads complete records, family members, and audit logs into a portable JSON snapshot.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportBackup}
            className="w-full gap-2 border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-200"
          >
            <Download className="h-4 w-4" />
            <span>Download Database Snapshot</span>
          </Button>
        </div>

        {/* Section 2: Restore from Backup */}
        <div className="p-5 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/20 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-950 dark:text-amber-200">Restore from Backup Snapshot</h4>
              <p className="text-xs text-amber-800 dark:text-amber-400">
                Upload a verified .json backup file to overwrite/restore registry state.
              </p>
            </div>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border border-dashed border-amber-300 dark:border-amber-800 rounded-xl p-4 text-center cursor-pointer hover:bg-amber-100/40 dark:hover:bg-amber-950/40 transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
              {restoreFileName ? restoreFileName : "Select .json backup file"}
            </p>
          </div>

          {restoreJson && (
            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleApplyRestore}
                isLoading={isRestoring}
                className="w-full gap-2 bg-amber-600 hover:bg-amber-700 text-white"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Confirm & Apply Restore</span>
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end border-t border-slate-100 dark:border-[#1e2f4d] pt-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}