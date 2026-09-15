"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/app-context";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/layout/page-header";
import { MonthlyDuesTable } from "@/components/monthly-dues/monthly-dues-table";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ShieldAlert, DollarSign, Edit3, CheckCircle2, TrendingUp, Users } from "lucide-react";
import { MonthlyDue } from "@/types/database";

export default function MonthlyDuesPage() {
  const { currentUser, homeowners } = useApp();
  const { success, error: toastError } = useToast();
  const canManageDues = hasPermission(currentUser, "can_manage_monthly_dues");

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [monthlyDues, setMonthlyDues] = useState<MonthlyDue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dues rate configuration
  const [standardDuesRate, setStandardDuesRate] = useState<number>(100.00);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [newRateInput, setNewRateInput] = useState<string>("100.00");
  const [updateUnpaidCheck, setUpdateUnpaidCheck] = useState<boolean>(true);
  const [isUpdatingRate, setIsUpdatingRate] = useState(false);

  // Fetch standard dues rate from settings
  const fetchDuesRate = async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.success && data.settings?.monthly_dues_amount) {
        const rate = parseFloat(data.settings.monthly_dues_amount);
        setStandardDuesRate(rate);
        setNewRateInput(rate.toFixed(2));
      }
    } catch (_) {}
  };

  const fetchMonthlyDues = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/monthly-dues`);
      const data = await response.json();
      if (data.success) {
        setMonthlyDues(data.data);
      }
    } catch (error) {
      console.error('Error fetching monthly dues:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDuesRate();
  }, []);

  useEffect(() => {
    fetchMonthlyDues();
  }, [selectedYear, selectedMonth]);

  // Handle Rate Update
  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(newRateInput);
    if (isNaN(num) || num < 0) {
      toastError("Invalid Amount", "Please enter a valid non-negative dues amount.");
      return;
    }

    try {
      setIsUpdatingRate(true);
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthly_dues_amount: num.toFixed(2),
          update_existing_unpaid: updateUnpaidCheck,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStandardDuesRate(num);
        success(
          "Dues Rate Updated",
          updateUnpaidCheck
            ? `Monthly dues rate updated to ₱${num.toFixed(2)} and existing unpaid dues updated.`
            : `Monthly dues rate updated to ₱${num.toFixed(2)}.`
        );
        setIsRateModalOpen(false);
        fetchMonthlyDues();
      } else {
        toastError("Update Failed", data.error || "Failed to update dues rate.");
      }
    } catch (err: any) {
      toastError("Update Failed", err.message || "An error occurred.");
    } finally {
      setIsUpdatingRate(false);
    }
  };

  if (!canManageDues) {
    return (
      <div className="p-12 text-center rounded-2xl border border-slate-200 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d]">
        <ShieldAlert className="h-12 w-12 text-red-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Permission Denied</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Your account does not have permission to manage monthly dues.
        </p>
      </div>
    );
  }

  // Calculate quick metrics for the month
  const totalHomeowners = homeowners.length;
  const currentMonthDues = monthlyDues.filter(
    (d) => Number(d.year) === Number(selectedYear) && Number(d.month) === Number(selectedMonth)
  );
  const paidDues = currentMonthDues.filter((d) => d.status === "paid");
  const paidCount = paidDues.length;
  const unpaidCount = Math.max(0, totalHomeowners - paidCount);
  const totalCollected = paidDues.reduce((sum, d) => sum + Number(d.amount || standardDuesRate), 0);
  const collectionRate = totalHomeowners > 0 ? Math.round((paidCount / totalHomeowners) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Enhanced HOA Profile & Monthly Dues Banner Card */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-[#06182a] via-[#092238] to-[#0d2e4c] text-white p-6 md:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: HOA Profile Picture & Info */}
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-2xl overflow-hidden border-2 border-emerald-400/40 shadow-lg bg-[#04101d] shrink-0 flex items-center justify-center p-1 group">
              <img
                src="/icon.png"
                alt="HOA Logo"
                className="h-full w-full object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  e.currentTarget.src = "/ICON.png";
                }}
              />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-emerald-300 bg-emerald-950/70 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                  Phase 4 HOA Portal
                </span>
                <span className="text-xs text-emerald-200/80 font-medium">
                  Official Dues Registry
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white leading-tight">
                St. Joseph Village 6 Phase 4
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
                Monthly association dues collection, payment receipts, and resident accounts
              </p>
            </div>
          </div>

          {/* Right: Quick Stat Badges & Rate Control */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center min-w-[100px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 block">
                Standard Rate
              </span>
              <div className="flex items-center justify-center gap-1.5 mt-0.5">
                <span className="text-base sm:text-lg font-extrabold text-white font-mono">
                  ₱{standardDuesRate.toFixed(2)}
                </span>
                {canManageDues && (
                  <button
                    onClick={() => {
                      setNewRateInput(standardDuesRate.toFixed(2));
                      setIsRateModalOpen(true);
                    }}
                    title="Change Monthly Dues Rate"
                    className="p-1 rounded-md text-emerald-300 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="px-4 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center min-w-[100px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 block">
                Collected
              </span>
              <span className="text-base sm:text-lg font-extrabold text-emerald-300 font-mono block mt-0.5">
                ₱{totalCollected.toFixed(2)}
              </span>
            </div>

            <div className="px-4 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center min-w-[100px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 block">
                Collection Rate
              </span>
              <span className="text-base sm:text-lg font-extrabold text-emerald-300 font-mono block mt-0.5">
                {collectionRate}%
              </span>
            </div>

            {canManageDues && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNewRateInput(standardDuesRate.toFixed(2));
                  setIsRateModalOpen(true);
                }}
                className="rounded-2xl border-emerald-400/40 bg-teal-500/20 hover:bg-teal-500/30 text-teal-100 hover:text-white text-xs font-bold gap-1.5 h-10 px-4"
              >
                <DollarSign className="h-4 w-4" />
                <span>Change Dues Rate</span>
              </Button>
            )}
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Main Table / Grid View */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-emerald-600"></div>
        </div>
      ) : (
        <MonthlyDuesTable
          homeowners={homeowners}
          monthlyDues={monthlyDues}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          standardRate={standardDuesRate}
          onYearChange={setSelectedYear}
          onMonthChange={setSelectedMonth}
          onDataChange={fetchMonthlyDues}
        />
      )}

      {/* Change Dues Rate Modal */}
      <Modal
        isOpen={isRateModalOpen}
        onClose={() => setIsRateModalOpen(false)}
        title="Change Monthly Dues Rate"
        description="Update the standard monthly association fee assessed to homeowners"
        maxWidth="md"
      >
        <form onSubmit={handleSaveRate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
              New Dues Amount (PHP ₱)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-emerald-600">
                ₱
              </span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={newRateInput}
                onChange={(e) => setNewRateInput(e.target.value)}
                required
                autoFocus
                className="pl-8 text-base font-bold"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={updateUnpaidCheck}
                onChange={(e) => setUpdateUnpaidCheck(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-slate-700 dark:text-slate-300">
                <strong>Update all unpaid dues</strong> for homeowners to ₱{parseFloat(newRateInput || "0").toFixed(2)}. Existing paid receipts will not be altered.
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              variant="primary"
              isLoading={isUpdatingRate}
              className="font-bold"
            >
              Update Dues Rate
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

