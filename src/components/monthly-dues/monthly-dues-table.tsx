"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Homeowner, MonthlyDue } from "@/types/database";
import { useApp } from "@/context/app-context";
import { hasPermission } from "@/lib/permissions";
import { OwnershipBadge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { ExportMonthlyDuesModal } from "./export-dues-modal";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Home,
  CheckCircle,
  XCircle,
  Eye,
  X,
  FileSpreadsheet,
  Receipt,
  Table as TableIcon,
  LayoutGrid,
  Edit2,
  DollarSign,
  Shield,
  Phone,
} from "lucide-react";

interface MonthlyDuesTableProps {
  homeowners: Homeowner[];
  monthlyDues: MonthlyDue[];
  selectedYear: number;
  selectedMonth: number;
  standardRate?: number;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  onDataChange: () => void;
}

export function MonthlyDuesTable({
  homeowners,
  monthlyDues,
  selectedYear,
  selectedMonth,
  standardRate = 100.00,
  onYearChange,
  onMonthChange,
  onDataChange,
}: MonthlyDuesTableProps) {
  const { currentUser } = useApp();
  const { success, error: toastError } = useToast();
  const canManageDues = hasPermission(currentUser, "can_manage_monthly_dues");
  const canExport = hasPermission(currentUser, "can_export_excel");

  // View Mode: table vs grid
  const [viewMode, setViewMode] = useState<string>("grid");

  const [searchTerm, setSearchTerm] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
  const [blockFilter, setBlockFilter] = useState<string>("all");
  const [lotFilter, setLotFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // OR Number Modal
  const [isORModalOpen, setIsORModalOpen] = useState(false);
  const [orNumber, setOrNumber] = useState("");
  const [pendingPayment, setPendingPayment] = useState<{
    homeownerId: string;
    currentStatus: string;
    amount?: number;
  } | null>(null);

  // Custom Amount Edit Modal
  const [isAmountModalOpen, setIsAmountModalOpen] = useState(false);
  const [targetHomeowner, setTargetHomeowner] = useState<Homeowner | null>(null);
  const [customAmountInput, setCustomAmountInput] = useState<string>("100.00");
  const [isSavingAmount, setIsSavingAmount] = useState(false);

  const pageSize = viewMode === "table" ? 10 : 9;

  // Create map of monthly dues for fast lookup
  const duesMap = useMemo(() => {
    const map = new Map<string, MonthlyDue>();
    monthlyDues.forEach((due) => {
      const key = `${due.homeowner_id}-${due.year}-${due.month}`;
      map.set(key, due);
    });
    return map;
  }, [monthlyDues]);

  // Unique blocks for filter
  const uniqueBlocks = useMemo(() => {
    const blocks = new Set<string>();
    homeowners.forEach((ho) => {
      if (ho.block_number) {
        blocks.add(ho.block_number);
      }
    });
    return Array.from(blocks).sort();
  }, [homeowners]);

  const getPaymentStatus = (homeownerId: string): MonthlyDue | null => {
    const key = `${homeownerId}-${selectedYear}-${selectedMonth}`;
    return duesMap.get(key) || null;
  };

  const getDueAmount = (homeownerId: string): number => {
    const due = getPaymentStatus(homeownerId);
    if (due && due.amount !== undefined && due.amount !== null) {
      return Number(due.amount);
    }
    return standardRate;
  };

  // Helper to validate image URL
  const isValidImageUrl = (url: string | null | undefined): boolean => {
    if (!url || typeof url !== "string") return false;
    return url.startsWith("/uploads/") || url.startsWith("data:image/");
  };

  // Filter homeowners
  const filteredHomeowners = useMemo(() => {
    return homeowners.filter((ho) => {
      const query = searchTerm.toLowerCase();
      const matchSearch =
        !query ||
        (ho.full_name && ho.full_name.toLowerCase().includes(query)) ||
        (ho.street_name && ho.street_name.toLowerCase().includes(query)) ||
        (ho.block_number && ho.block_number.toLowerCase().includes(query)) ||
        (ho.lot_number && ho.lot_number.toLowerCase().includes(query)) ||
        (ho.contact_number && ho.contact_number.toLowerCase().includes(query)) ||
        (ho.hoa_number && ho.hoa_number.toLowerCase().includes(query));

      const paymentStatus = getPaymentStatus(ho.id);
      const isPaid = paymentStatus?.status === "paid";

      const matchPaymentStatus =
        paymentStatusFilter === "all" ||
        (paymentStatusFilter === "paid" && isPaid) ||
        (paymentStatusFilter === "unpaid" && !isPaid);

      const matchBlock = blockFilter === "all" || ho.block_number === blockFilter;
      const matchLot =
        !lotFilter ||
        (ho.lot_number && ho.lot_number.toLowerCase().includes(lotFilter.toLowerCase()));

      return matchSearch && matchPaymentStatus && matchBlock && matchLot;
    });
  }, [homeowners, searchTerm, paymentStatusFilter, blockFilter, lotFilter, selectedYear, selectedMonth, duesMap]);

  // Unpaid count
  const unpaidCount = useMemo(() => {
    return homeowners.filter((ho) => {
      const paymentStatus = getPaymentStatus(ho.id);
      return !paymentStatus || paymentStatus.status !== "paid";
    }).length;
  }, [homeowners, selectedYear, selectedMonth, duesMap]);

  const isFiltered =
    searchTerm !== "" || paymentStatusFilter !== "all" || blockFilter !== "all" || lotFilter !== "";

  const clearFilters = () => {
    setSearchTerm("");
    setPaymentStatusFilter("all");
    setBlockFilter("all");
    setLotFilter("");
    setCurrentPage(1);
  };

  // Pagination
  const totalPages = Math.ceil(filteredHomeowners.length / pageSize) || 1;
  const paginatedHomeowners = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredHomeowners.slice(start, start + pageSize);
  }, [filteredHomeowners, currentPage, pageSize]);

  const handleStatusToggle = (homeownerId: string, currentStatus: string, amount?: number) => {
    if (!canManageDues) return;

    const newStatus = currentStatus === "paid" ? "unpaid" : "paid";

    if (newStatus === "paid") {
      setPendingPayment({ homeownerId, currentStatus, amount: amount ?? getDueAmount(homeownerId) });
      setOrNumber("");
      setIsORModalOpen(true);
    } else {
      processPayment(homeownerId, currentStatus, newStatus, null, amount);
    }
  };

  const processPayment = async (
    homeownerId: string,
    currentStatus: string,
    newStatus: string,
    orNum: string | null,
    amount?: number
  ) => {
    const key = `${homeownerId}-${selectedYear}-${selectedMonth}`;
    const existingDue = duesMap.get(key);
    const finalAmount = amount ?? getDueAmount(homeownerId);

    try {
      if (existingDue) {
        const response = await fetch("/api/monthly-dues", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: existingDue.id,
            status: newStatus,
            amount: finalAmount,
            official_receipt_number: newStatus === "paid" ? orNum : null,
            payment_date: newStatus === "paid" ? new Date().toISOString().split("T")[0] : null,
          }),
        });

        const data = await response.json();
        if (data.success) {
          success(
            newStatus === "paid" ? "Payment Recorded" : "Payment Marked Unpaid",
            `Monthly dues status has been updated.`
          );
          onDataChange();
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
            month: selectedMonth,
            amount: finalAmount,
            status: newStatus,
            official_receipt_number: newStatus === "paid" ? orNum : null,
            payment_date: newStatus === "paid" ? new Date().toISOString().split("T")[0] : null,
            created_by: currentUser?.id,
          }),
        });

        const data = await response.json();
        if (data.success) {
          success(
            newStatus === "paid" ? "Payment Recorded" : "Payment Marked Unpaid",
            `Monthly dues status has been updated.`
          );
          onDataChange();
        } else {
          toastError("Update Failed", data.error || "Failed to update payment status");
        }
      }
    } catch (error) {
      toastError("Update Failed", "An error occurred while updating payment status");
    }
  };

  const handleORSubmit = () => {
    if (!pendingPayment) return;

    if (!orNumber.trim()) {
      toastError("Validation Error", "Please enter an Official Receipt number");
      return;
    }

    const newStatus = "paid";
    processPayment(
      pendingPayment.homeownerId,
      pendingPayment.currentStatus,
      newStatus,
      orNumber.trim(),
      pendingPayment.amount
    );

    setIsORModalOpen(false);
    setPendingPayment(null);
    setOrNumber("");
  };

  // Open Edit Amount Modal
  const openEditAmountModal = (ho: Homeowner) => {
    const currentAmount = getDueAmount(ho.id);
    setTargetHomeowner(ho);
    setCustomAmountInput(currentAmount.toFixed(2));
    setIsAmountModalOpen(true);
  };

  // Save Custom Amount
  const handleSaveCustomAmount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetHomeowner) return;

    const numAmount = parseFloat(customAmountInput);
    if (isNaN(numAmount) || numAmount < 0) {
      toastError("Invalid Amount", "Please enter a valid amount.");
      return;
    }

    try {
      setIsSavingAmount(true);
      const key = `${targetHomeowner.id}-${selectedYear}-${selectedMonth}`;
      const existingDue = duesMap.get(key);

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
          success("Amount Updated", `Dues amount set to ₱${numAmount.toFixed(2)}.`);
          setIsAmountModalOpen(false);
          onDataChange();
        } else {
          toastError("Update Failed", data.error || "Failed to update amount.");
        }
      } else {
        const res = await fetch("/api/monthly-dues", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            homeowner_id: targetHomeowner.id,
            year: selectedYear,
            month: selectedMonth,
            amount: numAmount,
            status: "unpaid",
            created_by: currentUser?.id,
          }),
        });
        const data = await res.json();
        if (data.success) {
          success("Amount Set", `Dues amount set to ₱${numAmount.toFixed(2)}.`);
          setIsAmountModalOpen(false);
          onDataChange();
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

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Helper component to render homeowner avatar with fallback
  const renderAvatar = (ho: Homeowner, size: "sm" | "md" | "lg" = "md", ringColor?: string) => {
    const sizeClasses = {
      sm: "h-9 w-9 rounded-xl text-xs",
      md: "h-11 w-11 rounded-2xl text-sm",
      lg: "h-14 w-14 rounded-2xl text-base",
    };

    const initial = (ho.full_name || ho.first_name || "?").charAt(0).toUpperCase();

    return (
      <div className="relative shrink-0">
        {ho.photo_path && isValidImageUrl(ho.photo_path) ? (
          <img
            src={ho.photo_path}
            alt={ho.full_name || "Homeowner"}
            className={`${sizeClasses[size]} object-cover shadow-sm ${
              ringColor ? `ring-2 ${ringColor}` : "border border-slate-200 dark:border-slate-700"
            }`}
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const parent = e.currentTarget.parentElement;
              if (parent) {
                const fallback = parent.querySelector(".avatar-fallback") as HTMLElement;
                if (fallback) fallback.style.display = "flex";
              }
            }}
          />
        ) : null}
        <div
          className={`avatar-fallback ${sizeClasses[size]} bg-gradient-to-br from-[#07162c] to-[#0c2340] text-teal-300 font-bold flex items-center justify-center shadow-sm ${
            ho.photo_path && isValidImageUrl(ho.photo_path) ? "hidden" : "flex"
          } ${ringColor ? `ring-2 ${ringColor}` : "border border-teal-500/20"}`}
        >
          {initial}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Search and Filter Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-5 rounded-3xl border border-slate-200/80 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] shadow-subtle">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search homeowners by name, address, block & lot, HOA#..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-2xl border border-slate-200 dark:border-[#1e2f4d] bg-slate-50/70 dark:bg-[#0c182c] focus:bg-white dark:focus:bg-[#0e192d] focus:border-teal-600 dark:focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Filter Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setPaymentStatusFilter("all");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                paymentStatusFilter === "all"
                  ? "bg-teal-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              All
            </button>
            <button
              onClick={() => {
                setPaymentStatusFilter("paid");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                paymentStatusFilter === "paid"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Paid
            </button>
            <button
              onClick={() => {
                setPaymentStatusFilter("unpaid");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                paymentStatusFilter === "unpaid"
                  ? "bg-amber-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Unpaid
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">
                {unpaidCount}
              </span>
            </button>
          </div>

          {/* Payment Status Dropdown */}
          <select
            value={paymentStatusFilter}
            onChange={(e) => {
              setPaymentStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs rounded-xl border border-slate-200 dark:border-[#1e2f4d] bg-slate-50/50 dark:bg-[#0c182c] px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-teal-600 font-medium"
          >
            <option value="all" className="bg-white dark:bg-[#0c182c]">All Statuses</option>
            <option value="paid" className="bg-white dark:bg-[#0c182c]">Paid Only</option>
            <option value="unpaid" className="bg-white dark:bg-[#0c182c]">Unpaid Only</option>
          </select>

          {/* Block Filter */}
          <select
            value={blockFilter}
            onChange={(e) => {
              setBlockFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs rounded-xl border border-slate-200 dark:border-[#1e2f4d] bg-slate-50/50 dark:bg-[#0c182c] px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-teal-600 font-medium"
          >
            <option value="all" className="bg-white dark:bg-[#0c182c]">All Blocks</option>
            {uniqueBlocks.map((block) => (
              <option key={block} value={block} className="bg-white dark:bg-[#0c182c]">Block {block}</option>
            ))}
          </select>

          {/* Lot Filter */}
          <input
            type="text"
            placeholder="Lot #"
            value={lotFilter}
            onChange={(e) => {
              setLotFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-20 text-xs rounded-xl border border-slate-200 dark:border-[#1e2f4d] bg-slate-50/50 dark:bg-[#0c182c] px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-teal-600 font-medium placeholder:text-slate-400"
          />

          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-700 dark:hover:text-red-300 h-9 px-2.5 gap-1"
            >
              <X className="h-3.5 w-3.5" />
              <span>Reset</span>
            </Button>
          )}

          {/* Month/Year Navigation */}
          <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-700 pl-2.5">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 min-w-[90px]">
              {monthNames[selectedMonth - 1]} {selectedYear}
            </span>
            <button
              onClick={() => {
                if (selectedMonth === 1) {
                  onMonthChange(12);
                  onYearChange(selectedYear - 1);
                } else {
                  onMonthChange(selectedMonth - 1);
                }
              }}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </button>
            <button
              onClick={() => {
                if (selectedMonth === 12) {
                  onMonthChange(1);
                  onYearChange(selectedYear + 1);
                } else {
                  onMonthChange(selectedMonth + 1);
                }
              }}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </button>
          </div>

          {/* View Mode Switcher: Table vs Grid */}
          <Tabs
            tabs={[
              { id: "grid", label: "", icon: <LayoutGrid className="h-4 w-4" /> },
              { id: "table", label: "", icon: <TableIcon className="h-4 w-4" /> },
            ]}
            activeTab={viewMode}
            onChange={setViewMode}
            size="sm"
          />

          {/* Export Report Button */}
          {canExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExportModalOpen(true)}
              className="text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 h-9 font-medium"
            >
              <FileSpreadsheet className="h-4 w-4 mr-1.5 text-emerald-600 dark:text-emerald-400" />
              <span>Export</span>
            </Button>
          )}
        </div>
      </div>

      {/* VIEW MODE 1: Professional Card Grid View */}
      {viewMode === "grid" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {paginatedHomeowners.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-400 dark:text-slate-500 text-sm bg-white dark:bg-[#0e192d] rounded-3xl border border-slate-200 dark:border-[#1e2f4d] p-8">
                <Home className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="font-bold text-slate-700 dark:text-slate-200">No homeowners found</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Adjust search or filter settings above</p>
              </div>
            ) : (
              paginatedHomeowners.map((ho) => {
                const paymentStatus = getPaymentStatus(ho.id);
                const isPaid = paymentStatus?.status === "paid";
                const amount = getDueAmount(ho.id);

                return (
                  <div
                    key={ho.id}
                    className={`rounded-3xl border p-5 shadow-subtle hover:shadow-card hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group ${
                      isPaid
                        ? "bg-white dark:bg-[#0e192d] border-emerald-500/30 hover:border-emerald-500/50"
                        : "bg-white dark:bg-[#0e192d] border-slate-200/80 dark:border-[#1e2f4d] hover:border-amber-500/40"
                    }`}
                  >
                    <div>
                      {/* Top Row: Avatar with status ring, Name, HOA Number, and Ownership Badge */}
                      <div className="flex items-start justify-between gap-3 mb-3.5">
                        <div className="flex items-center gap-3">
                          {renderAvatar(
                            ho,
                            "md",
                            isPaid ? "ring-emerald-500 ring-offset-2 dark:ring-offset-[#0e192d]" : "ring-amber-500 ring-offset-2 dark:ring-offset-[#0e192d]"
                          )}
                          <div>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors leading-snug">
                              {ho.full_name || "Unnamed"}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              {ho.hoa_number && (
                                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60">
                                  {ho.hoa_number}
                                </span>
                              )}
                              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                Block {ho.block_number}, Lot {ho.lot_number}
                              </span>
                            </div>
                          </div>
                        </div>
                        <OwnershipBadge type={ho.ownership_type} />
                      </div>

                      {/* Address Line */}
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0a1526] border border-slate-100 dark:border-[#1e2f4d] flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-medium mb-3.5">
                        <Home className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                        <span className="truncate">{ho.street_name || ho.address}</span>
                      </div>

                      {/* Dues Status & Amount Banner */}
                      <div className="grid grid-cols-2 gap-2 mb-3.5">
                        {/* Amount */}
                        <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-[#0a1526] border border-slate-100 dark:border-[#1e2f4d] flex items-center justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Assessment</span>
                            <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                              ₱{amount.toFixed(2)}
                            </span>
                          </div>
                          {canManageDues && (
                            <button
                              onClick={() => openEditAmountModal(ho)}
                              title="Edit dues amount"
                              className="p-1 rounded-md text-slate-400 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>

                        {/* Status Pill */}
                        <div
                          className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                            isPaid
                              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60"
                              : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60"
                          }`}
                        >
                          {isPaid ? (
                            <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <span
                              className={`text-[10px] uppercase font-bold block ${
                                isPaid ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"
                              }`}
                            >
                              {isPaid ? "Paid" : "Unpaid"}
                            </span>
                            <span className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-300 truncate block">
                              {isPaid && paymentStatus?.official_receipt_number
                                ? `OR: ${paymentStatus.official_receipt_number}`
                                : isPaid
                                ? "Recorded"
                                : "Pending"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Payment Date (if paid) */}
                      {isPaid && paymentStatus?.payment_date && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-2 px-1">
                          <Receipt className="h-3 w-3 text-slate-400" />
                          <span>Paid on {new Date(paymentStatus.payment_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {/* Card Footer: Action Buttons */}
                    <div className="flex items-center justify-between gap-2 pt-3 mt-2 border-t border-slate-100 dark:border-[#1e2f4d]">
                      {canManageDues ? (
                        <button
                          onClick={() => handleStatusToggle(ho.id, paymentStatus?.status || "unpaid", amount)}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 ${
                            isPaid
                              ? "bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                          }`}
                        >
                          {isPaid ? (
                            <>
                              <XCircle className="h-3.5 w-3.5" />
                              <span>Mark Unpaid</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-3.5 w-3.5" />
                              <span>Mark as Paid</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <div />
                      )}

                      <Link href={`/dashboard/monthly-dues/${ho.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 px-3 rounded-xl text-xs font-semibold gap-1 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                        >
                          <Eye className="h-3.5 w-3.5 text-slate-400" />
                          <span>Ledger</span>
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Grid Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-3xl border border-slate-200/80 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] text-xs text-slate-600 dark:text-slate-400 shadow-subtle">
            <div>
              Showing <span className="font-bold text-slate-900 dark:text-slate-100">{filteredHomeowners.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> to{" "}
              <span className="font-bold text-slate-900 dark:text-slate-100">{Math.min(currentPage * pageSize, filteredHomeowners.length)}</span> of{" "}
              <span className="font-bold text-slate-900 dark:text-slate-100">{filteredHomeowners.length}</span> homeowners
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 px-3"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                <span>Prev</span>
              </Button>

              <span className="px-2 font-semibold text-slate-800 dark:text-slate-200">
                Page {currentPage} of {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="h-8 px-3"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* VIEW MODE 2: Dense Table View with Avatars */
        <div className="rounded-3xl border border-slate-200/80 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] shadow-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#1e2f4d] bg-slate-50/80 dark:bg-[#0a1526]/90 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  <th className="py-3.5 px-4">Homeowner</th>
                  <th className="py-3.5 px-4">Address</th>
                  <th className="py-3.5 px-4 text-center">Ownership</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Amount</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-[#1e2f4d] text-sm">
                {paginatedHomeowners.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400 dark:text-slate-500 text-sm">
                      <Home className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="font-semibold text-slate-600 dark:text-slate-300">No homeowners found</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try clearing your search or changing filters</p>
                    </td>
                  </tr>
                ) : (
                  paginatedHomeowners.map((ho) => {
                    const paymentStatus = getPaymentStatus(ho.id);
                    const isPaid = paymentStatus?.status === "paid";
                    const amount = getDueAmount(ho.id);

                    return (
                      <tr key={ho.id} className="hover:bg-slate-50/80 dark:hover:bg-[#13233d]/60 transition-colors">
                        {/* Homeowner with Profile Picture */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {renderAvatar(
                              ho,
                              "sm",
                              isPaid ? "ring-emerald-500" : "ring-amber-500"
                            )}
                            <div>
                              <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                <span>{ho.full_name}</span>
                                {ho.hoa_number && (
                                  <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    {ho.hoa_number}
                                  </span>
                                )}
                              </div>
                              {ho.contact_number && (
                                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                  {ho.contact_number}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-xs text-slate-700 dark:text-slate-300">
                          <div className="flex items-center gap-2">
                            <Home className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                            <span>{ho.street_name || ho.address}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <OwnershipBadge type={ho.ownership_type} />
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {isPaid ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Paid</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60">
                              <XCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                              <span className="text-xs font-bold text-amber-700 dark:text-amber-300">Unpaid</span>
                            </div>
                          )}
                          {isPaid && paymentStatus?.official_receipt_number && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                              OR: {paymentStatus.official_receipt_number}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className="font-bold text-xs text-slate-500 dark:text-slate-400">₱</span>
                            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                              {amount.toFixed(2)}
                            </span>
                            {canManageDues && (
                              <button
                                onClick={() => openEditAmountModal(ho)}
                                className="p-1 rounded text-slate-400 hover:text-teal-600"
                                title="Change Amount"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {canManageDues && (
                              <button
                                onClick={() => handleStatusToggle(ho.id, paymentStatus?.status || "unpaid", amount)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                  isPaid
                                    ? "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-950/50"
                                    : "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-950/50"
                                }`}
                              >
                                {isPaid ? "Mark Unpaid" : "Mark Paid"}
                              </button>
                            )}

                            <Link href={`/dashboard/monthly-dues/${ho.id}`}>
                              <button
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="View payment ledger"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 dark:border-[#1e2f4d] bg-slate-50/60 dark:bg-[#0a1526]/80 text-xs text-slate-600 dark:text-slate-400">
            <div>
              Showing <span className="font-bold text-slate-900 dark:text-slate-100">{filteredHomeowners.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> to{" "}
              <span className="font-bold text-slate-900 dark:text-slate-100">{Math.min(currentPage * pageSize, filteredHomeowners.length)}</span> of{" "}
              <span className="font-bold text-slate-900 dark:text-slate-100">{filteredHomeowners.length}</span> homeowners
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 px-3"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                <span>Prev</span>
              </Button>

              <span className="px-2 font-semibold text-slate-800 dark:text-slate-200">
                Page {currentPage} of {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="h-8 px-3"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* OR Number Modal */}
      <Modal
        isOpen={isORModalOpen}
        onClose={() => {
          setIsORModalOpen(false);
          setPendingPayment(null);
          setOrNumber("");
        }}
        title="Record Payment Receipt"
        description="Enter Official Receipt number for this monthly dues collection"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
              Official Receipt (OR) Number
            </label>
            <Input
              type="text"
              placeholder="e.g. OR-2026-00123"
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

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Receipt className="h-4 w-4 text-teal-600" />
            <span>
              Billing Period: <strong>{monthNames[selectedMonth - 1]} {selectedYear}</strong>
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsORModalOpen(false);
                setPendingPayment(null);
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
              Save Receipt & Mark Paid
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Dues Amount Modal */}
      <Modal
        isOpen={isAmountModalOpen}
        onClose={() => {
          setIsAmountModalOpen(false);
          setTargetHomeowner(null);
        }}
        title="Adjust Monthly Dues Amount"
        description={`Set custom dues amount for ${targetHomeowner?.full_name || "homeowner"} for ${monthNames[selectedMonth - 1]} ${selectedYear}`}
        maxWidth="sm"
      >
        <form onSubmit={handleSaveCustomAmount} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
              Dues Amount (PHP ₱)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-teal-600">₱</span>
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
            <p className="text-[11px] text-slate-500 mt-1">
              Standard rate is ₱{standardRate.toFixed(2)}. Adjust if special discount, penalty, or custom fee applies.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAmountModalOpen(false);
                setTargetHomeowner(null);
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

      {/* Export Report Modal */}
      <ExportMonthlyDuesModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        homeowners={homeowners}
        filteredHomeowners={filteredHomeowners}
      />
    </div>
  );
}
