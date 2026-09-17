"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  homeownerName: string;
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  homeownerName,
}: DeleteConfirmModalProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Archive Homeowner Record"
      maxWidth="md"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold">Are you sure you want to archive this record?</p>
            <p className="text-amber-800 dark:text-amber-300">
              Archiving <span className="font-semibold">&quot;{homeownerName}&quot;</span> will mark the status as <span className="font-semibold">Inactive</span>. The record and associated household members will be preserved in historical audit logs.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleConfirm}
            isLoading={loading}
          >
            Confirm & Archive
          </Button>
        </div>
      </div>
    </Modal>
  );
}
