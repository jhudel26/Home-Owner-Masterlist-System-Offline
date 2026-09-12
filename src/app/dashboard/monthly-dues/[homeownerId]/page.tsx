"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useApp } from "@/context/app-context";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { Homeowner, MonthlyDue } from "@/types/database";
import {
  ShieldAlert,
  Home,
  CheckCircle,
  XCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Receipt,
  Edit2,
  DollarSign,
  Phone,
  Mail,
  User,
} from "lucide-react";
import { OwnershipBadge } from "@/components/ui/badge";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function HomeownerDuesDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser, homeowners } = useApp();
  const { success, error: toastError } = useToast();
  const canManageDues = hasPermission(currentUser, "can_manage_monthly_dues");
  const homeownerId = params?.homeownerId as string;

  const [homeowner, setHomeowner] = useState<Homeowner | null>(null);
  const [monthlyDues, setMonthlyDues] = useState<MonthlyDue[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [standardRate, setStandardRate] = useState<number>(100.00);
  const [isLoading, setIsLoading] = useState(true);

  // OR modal state
  const [isORModalOpen, setIsORModalOpen] = useState(false);
  const [orNumber, setOrNumber] = useState("");
  const [pendingMonth, setPendingMonth] = useState<number | null>(null);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  // Edit Amount modal state
  const [isAmountModalOpen, setIsAmountModalOpen] = useState(false);
  const [targetMonth, setTargetMonth] = useState<number | null>(null);
  const [customAmountInput, setCustomAmountInput] = useState<string>("100.00");
  const [isSavingAmount, setIsSavingAmount] = useState(false);

  // Helper to validate image URL
  const isValidImageUrl = (url: string | null | undefined): boolean => {
    if (!url || typeof url !== "string") return false;
    return url.startsWith("/uploads/") || url.startsWith("data:image/");
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.success && data.settings?.monthly_dues_amount) {
        setStandardRate(parseFloat(data.settings.monthly_dues_amount));
      }
    } catch (_) {}
  };

  const fetchHomeowner = async () => {
    try {
      const foundHomeowner = homeowners.find((h) => h.id === homeownerId);
      if (foundHomeowner) {
        setHomeowner(foundHomeowner);
      } else {
        const response = await fetch(`/api/homeowners/${homeownerId}`);
        const data = await response.json();
        if (data.success) {
          setHomeowner(data.data);
        }
      }
    } catch (error) {
      console.error("Error fetching homeowner:", error);
    }
  };

  const fetchMonthlyDues = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/monthly-dues/${homeownerId}?year=${selectedYear}`);
      const data = await response.json();
      if (data.success) {
        setMonthlyDues(data.data);
      }
    } catch (error) {
      console.error("Error fetching monthly dues:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    fetchHomeowner();
    fetchMonthlyDues();
  }, [homeownerId, selectedYear]);

  const getDueForMonth = (month: number): MonthlyDue | null => {
    return monthlyDues.find((due) => due.month === month) || null;
  };

  const getMonthAmount = (month: number): number => {
    const due = getDueForMonth(month);
    if (due && due.amount !== undefined && due.amount !== null) {
      return Number(due.amount);
    }
    return standardRate;
  };

  const handleStatusToggle = (month: number, currentStatus: string) => {
    if (!canManageDues) return;

    const newStatus = currentStatus === "paid" ? "unpaid" : "paid";

    if (newStatus === "paid") {
      setPendingMonth(month);
      setPendingStatus(currentStatus);
      setOrNumber("");
      setIsORModalOpen(true);
    } else {
      processPayment(month, currentStatus, newStatus, null);
    }
  };

  const processPayment = async (
    month: number,
    currentStatus: string,
    newStatus: string,
    orNum: string | null,
    amountOverride?: number
  ) => {
    const existingDue = getDueForMonth(month);
    const amount = amountOverride ?? getMonthAmount(month);

    try {
      if (existingDue) {
        const response = await fetch("/api/monthly-dues", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: existingDue.id,
            status: newStatus,
            amount: amount,
            official_receipt_number: newStatus === "paid" ? orNum : null,
            payment_date: newStatus === "paid" ? new Date().toISOString().split("T")[0] : null,
          }),
        });

        const data = await response.json();
        if (data.success) {
          success(
            newStatus === "paid" ? "Payment Recorded" : "Payment Unmarked",
            `Monthly dues for ${MONTHS[month - 1]} has been updated.`
          );
          fetchMonthlyDues();
        } else {
          toastError("Update Failed", data.error || "Failed to update payment status");
        }
      } else {
        const response = await fetch("/api/monthly-dues", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            homeowner_id: homeownerId,
            year: selectedYear,
            month: month,
            amount: amount,
            status: newStatus,
            official_receipt_number: newStatus === "paid" ? orNum : null,
            payment_date: newStatus === "paid" ? new Date().toISOString().split("T")[0] : null,
            created_by: currentUser?.id,
          }),
        });

        const data = await response.json();
        if (data.success) {
          success(
            newStatus === "paid" ? "Payment Recorded" : "Payment Unmarked",
            `Monthly dues for ${MONTHS[month - 1]} has been updated.`
          );
          fetchMonthlyDues();
        } else {
          toastError("Update Failed", data.error || "Failed to update payment status");
        }
      }
    } catch (error) {
      toastError("Update Failed", "An error occurred while updating payment status");
    }
  };

  const handleORSubmit = () => {
    if (pendingMonth === null || pendingStatus === null) return;

    if (!orNumber.trim()) {
      toastError("Validation Error", "Please enter an Official Receipt number");
      return;
    }

    const newStatus = "paid";
    processPayment(pendingMonth, pendingStatus, newStatus, orNumber.trim());

    setIsORModalOpen(false);
    setPendingMonth(null);
    setPendingStatus(null);
    setOrNumber("");
  };

  // Open Edit Amount Modal
  const openEditAmountModal = (month: number) => {
    const currentAmount = getMonthAmount(month);
    setTargetMonth(month);
    setCustomAmountInput(currentAmount.toFixed(2));
    setIsAmountModalOpen(true);
  };

  // Save Custom Amount for a specific month
  const handleSaveMonthAmount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (targetMonth === null) return;

    const numAmount = parseFloat(customAmountInput);
    if (isNaN(numAmount) || numAmount < 0) {
      toastError("Invalid Amount", "Please enter a valid amount.");
      return;
    }

    try {
      setIsSavingAmount(true);
      const existingDue = getDueForMonth(targetMonth);

      if (existingDue) {
        const res = await fetch("/api/monthly-dues", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: existingDue.id,
            amount: numAmount,
          }),
        });
        const data = await res.json();
        if (data.success) {
          success("Amount Updated", `${MONTHS[targetMonth - 1]} dues set to ₱${numAmount.toFixed(2)}.`);
          setIsAmountModalOpen(false);
          fetchMonthlyDues();
        } else {
          toastError("Update Failed", data.error || "Failed to update amount.");
        }
      } else {
        const res = await fetch("/api/monthly-dues", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            homeowner_id: homeownerId,
            year: selectedYear,
            month: targetMonth,
            amount: numAmount,
            status: "unpaid",
            created_by: currentUser?.id,
          }),
        });
        const data = await res.json();
        if (data.success) {
          success("Amount Set", `${MONTHS[targetMonth - 1]} dues set to ₱${numAmount.toFixed(2)}.`);
          setIsAmountModalOpen(false);
          fetchMonthlyDues();
        } else {
          toastError("Update Failed", data.error || "Failed to set amount.");
        }
      }
    } catch (err: any) {
      toastError("Update Failed", err.message || "An error occurred.");
    } finally {
      setIsSavingAmount(false);
    }
  };

  const calculateTotalDue = () => {
    let paidTotal = 0;
    let unpaidTotal = 0;

    for (let m = 1; m <= 12; m++) {
      const due = getDueForMonth(m);
      const amount = due ? Number(due.amount || standardRate) : standardRate;
      if (due && due.status === "paid") {
        paidTotal += amount;
      } else {
        unpaidTotal += amount;
      }
    }

    return {
      paid: paidTotal,
      unpaid: unpaidTotal,
      total: paidTotal + unpaidTotal,
    };
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

  if (isLoading || !homeowner) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const totals = calculateTotalDue();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2 rounded-xl"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dues List</span>
        </Button>
        <PageHeader
          title={`${homeowner.full_name} - Account Ledger`}
          description={`Track monthly dues payments and receipts for ${homeowner.full_name}`}
          icon={
            <span className="inline-flex items-center justify-center h-7 w-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-bold text-base border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
              ₱
            </span>
          }
        />
      </div>

      {/* Enhanced Homeowner Profile Card with Photo & HOA Emblem */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] p-6 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4 sm:gap-5">
          {/* Homeowner Profile Photo */}
          <div className="relative shrink-0">
            {homeowner.photo_path && isValidImageUrl(homeowner.photo_path) ? (
              <img
                src={homeowner.photo_path}
                alt={homeowner.full_name || "Homeowner"}
                className="h-20 w-20 rounded-2xl object-cover border-2 border-emerald-500/30 shadow-md"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const fb = e.currentTarget.parentElement?.querySelector(".fb-avatar") as HTMLElement;
                  if (fb) fb.style.display = "flex";
                }}
              />
            ) : null}
            <div
              className={`fb-avatar h-20 w-20 rounded-2xl bg-gradient-to-br from-[#07162c] to-[#0c2340] text-emerald-300 font-bold text-2xl items-center justify-center border border-emerald-500/30 shadow-md ${
                homeowner.photo_path && isValidImageUrl(homeowner.photo_path) ? "hidden" : "flex"
              }`}
            >
              {(homeowner.full_name || "?").charAt(0)}
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                {homeowner.full_name}
              </h3>
              {homeowner.hoa_number && (
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-emerald-300 border border-teal-200 dark:border-teal-800/60">
                  {homeowner.hoa_number}
                </span>
              )}
              <OwnershipBadge type={homeowner.ownership_type} />
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
              <Home className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{homeowner.street_name || homeowner.address}</span>
              <span className="text-slate-300 dark:text-slate-700">&bull;</span>
              <span>Block {homeowner.block_number}, Lot {homeowner.lot_number}</span>
            </p>

            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
              {homeowner.contact_number && (
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="h-3 w-3 text-emerald-600" />
                  {homeowner.contact_number}
                </span>
              )}
              {homeowner.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3 text-sky-600" />
                  {homeowner.email}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Association Badge with HOA Logo */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-[#0c182c] border border-slate-200/80 dark:border-[#1e2f4d] self-start md:self-auto">
          <img
            src="/icon.png"
            alt="HOA Logo"
            className="h-10 w-10 object-contain rounded-xl"
            onError={(e) => {
              e.currentTarget.src = "/ICON.png";
            }}
          />
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
              Association
            </span>
            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block">
              St. Joseph Village 6 Phase 4
            </span>
          </div>
        </div>
      </div>

      {/* Year Selector */}
      <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d]">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Billing Year:
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedYear(selectedYear - 1)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </button>
          <input
            type="number"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value) || selectedYear)}
            min="2020"
            max="2035"
            className="w-24 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100 text-center"
          />
          <button
            onClick={() => setSelectedYear(selectedYear + 1)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="Next year"
          >
            <ArrowRight className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </button>
        </div>
      </div>

      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-200">
              Total Paid
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
            ₱{totals.paid.toFixed(2)}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <XCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
              Total Unpaid
            </span>
          </div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-300 font-mono">
            ₱{totals.unpaid.toFixed(2)}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <DollarSign className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              Annual Assessment
            </span>
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-200 font-mono">
            ₱{totals.total.toFixed(2)}
          </div>
        </div>
      </div>

      {/* 12 Months Grid */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] p-6 shadow-subtle">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">
          12-Month Payment Schedule ({selectedYear})
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {MONTHS.map((month, index) => {
            const monthNum = index + 1;
            const due = getDueForMonth(monthNum);
            const isPaid = due?.status === "paid";
            const amount = getMonthAmount(monthNum);

            return (
              <div
                key={monthNum}
                className={`rounded-2xl border p-4 transition-all flex flex-col justify-between ${
                  isPaid
                    ? "border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/50 dark:bg-emerald-950/20"
                    : "border-slate-200 dark:border-[#1e2f4d] bg-slate-50/40 dark:bg-[#0c182c]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {isPaid ? (
                        <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-amber-500" />
                      )}
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {month}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                        ₱{amount.toFixed(2)}
                      </span>
                      {canManageDues && (
                        <button
                          onClick={() => openEditAmountModal(monthNum)}
                          title="Edit month amount"
                          className="p-1 rounded text-slate-400 hover:text-emerald-600"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {isPaid && due?.official_receipt_number && (
                    <div className="mb-3 p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-emerald-200 dark:border-emerald-800/50 text-xs">
                      <div className="flex items-center gap-1.5 font-mono font-bold text-emerald-700 dark:text-emerald-300">
                        <Receipt className="h-3 w-3 text-emerald-600" />
                        <span>OR: {due.official_receipt_number}</span>
                      </div>
                      {due.payment_date && (
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Paid: {new Date(due.payment_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {canManageDues && (
                  <button
                    onClick={() => handleStatusToggle(monthNum, due?.status || "unpaid")}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                      isPaid
                        ? "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-200"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white"
                    }`}
                  >
                    {isPaid ? "Mark Unpaid" : "Record Payment"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* OR Modal */}
      <Modal
        isOpen={isORModalOpen}
        onClose={() => {
          setIsORModalOpen(false);
          setPendingMonth(null);
          setPendingStatus(null);
          setOrNumber("");
        }}
        title="Record Monthly Payment"
        description={`Enter Official Receipt number for ${pendingMonth ? MONTHS[pendingMonth - 1] : ""} ${selectedYear}`}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
              Official Receipt (OR) Number
            </label>
            <Input
              type="text"
              placeholder="e.g. OR-10294"
              value={orNumber}
              onChange={(e) => setOrNumber(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleORSubmit();
                }
              }}
              className="w-full font-mono font-bold"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsORModalOpen(false);
                setPendingMonth(null);
                setPendingStatus(null);
                setOrNumber("");
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={handleORSubmit}
              disabled={!orNumber.trim()}
              className="font-bold"
            >
              Confirm Payment
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Month Amount Modal */}
      <Modal
        isOpen={isAmountModalOpen}
        onClose={() => {
          setIsAmountModalOpen(false);
          setTargetMonth(null);
        }}
        title="Edit Monthly Dues Amount"
        description={`Adjust dues amount for ${targetMonth ? MONTHS[targetMonth - 1] : ""} ${selectedYear}`}
        maxWidth="sm"
      >
        <form onSubmit={handleSaveMonthAmount} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
              Dues Amount (PHP ₱)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-emerald-600">₱</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={customAmountInput}
                onChange={(e) => setCustomAmountInput(e.target.value)}
                required
                autoFocus
                className="pl-8 font-mono font-bold text-base"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAmountModalOpen(false);
                setTargetMonth(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              variant="primary"
              isLoading={isSavingAmount}
              className="font-bold"
            >
              Save Amount
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

