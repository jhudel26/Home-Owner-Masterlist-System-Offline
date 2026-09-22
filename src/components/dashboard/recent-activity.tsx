"use client";

import React, { useState, useMemo } from "react";
import { ActivityLog } from "@/types/database";
import { formatDateTime } from "@/lib/utils";
import { useApp } from "@/context/app-context";
import { hasPermission } from "@/lib/permissions";
import { exportAuditTrailToExcel } from "@/lib/excel-export";
import { Clock, UserPlus, Edit3, Trash2, FileSpreadsheet, ShieldAlert, Sparkles, Settings, RefreshCw, Search, X, ChevronLeft, ChevronRight, Filter, Receipt } from "lucide-react";

interface RecentActivityProps {
  logs: ActivityLog[];
  /** When true, renders the full audit-trail page view with search, filters, date range, and pagination */
  fullPage?: boolean;
}

const ACTION_TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "CREATED_HOMEOWNER", label: "Added" },
  { value: "UPDATED_HOMEOWNER", label: "Updated" },
  { value: "DELETED_HOMEOWNER", label: "Archived" },
  { value: "UPDATED_STATUS", label: "Status Change" },
  { value: "UPDATED_MONTHLY_DUES", label: "Dues" },
  { value: "EXPORTED_EXCEL", label: "Export" },
  { value: "RESTORED_BACKUP", label: "Restore" },
  { value: "UPDATED_SETTINGS", label: "Settings" },
  { value: "UPDATED_USER_PERMISSIONS", label: "Permissions" },
  { value: "SYSTEM_INITIALIZED", label: "System" },
  { value: "CREATED_USER", label: "User Created" },
  { value: "EDITED_USER", label: "User Edited" },
];

export function RecentActivity({ logs, fullPage = false }: RecentActivityProps) {
  const { currentUser } = useApp();
  const canView = hasPermission(currentUser, "can_view_audit_trail");

  // Full-page filter state
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const pageSize = 20;

  const getActionDetails = (action: string) => {
    switch (action) {
      case "CREATED_HOMEOWNER":
        return {
          icon: <UserPlus className="h-4 w-4 text-emerald-600" />,
          bgColor: "bg-emerald-50 border-emerald-200",
          tag: "Added",
          tagColor: "bg-emerald-100/80 text-emerald-800",
        };
      case "UPDATED_HOMEOWNER":
      case "UPDATED_STATUS":
        return {
          icon: <Edit3 className="h-4 w-4 text-sky-600" />,
          bgColor: "bg-sky-50 border-sky-200",
          tag: action === "UPDATED_STATUS" ? "Status" : "Updated",
          tagColor: "bg-sky-100/80 text-sky-800",
        };
      case "DELETED_HOMEOWNER":
        return {
          icon: <Trash2 className="h-4 w-4 text-red-600" />,
          bgColor: "bg-red-50 border-red-200",
          tag: "Archived",
          tagColor: "bg-red-100/80 text-red-800",
        };
      case "EXPORTED_EXCEL":
        return {
          icon: <FileSpreadsheet className="h-4 w-4 text-emerald-600" />,
          bgColor: "bg-emerald-50 border-emerald-200",
          tag: "Export",
          tagColor: "bg-emerald-100/80 text-emerald-800",
        };
      case "UPDATED_MONTHLY_DUES":
        return {
          icon: <Receipt className="h-4 w-4 text-emerald-600" />,
          bgColor: "bg-emerald-50 border-emerald-200",
          tag: "Dues",
          tagColor: "bg-emerald-100/80 text-emerald-800",
        };
      case "RESTORED_BACKUP":
        return {
          icon: <RefreshCw className="h-4 w-4 text-indigo-600" />,
          bgColor: "bg-indigo-50 border-indigo-200",
          tag: "Restore",
          tagColor: "bg-indigo-100/80 text-indigo-800",
        };
      case "UPDATED_SETTINGS":
        return {
          icon: <Settings className="h-4 w-4 text-violet-600" />,
          bgColor: "bg-violet-50 border-violet-200",
          tag: "Settings",
          tagColor: "bg-violet-100/80 text-violet-800",
        };
      case "SYSTEM_INITIALIZED":
        return {
          icon: <Sparkles className="h-4 w-4 text-emerald-600" />,
          bgColor: "bg-emerald-50 border-emerald-200",
          tag: "System",
          tagColor: "bg-emerald-100 text-emerald-800",
        };
      case "CREATED_USER":
      case "EDITED_USER":
        return {
          icon: <ShieldAlert className="h-4 w-4 text-violet-600" />,
          bgColor: "bg-violet-50 border-violet-200",
          tag: action === "CREATED_USER" ? "User Created" : "User Edited",
          tagColor: "bg-violet-100/80 text-violet-800",
        };
      case "UPDATED_USER_PERMISSIONS":
        return {
          icon: <ShieldAlert className="h-4 w-4 text-amber-600" />,
          bgColor: "bg-amber-50 border-amber-200",
          tag: "Permissions",
          tagColor: "bg-amber-100/80 text-amber-800",
        };
      default:
        return {
          icon: <ShieldAlert className="h-4 w-4 text-slate-500" />,
          bgColor: "bg-slate-50 border-slate-200",
          tag: "Audit",
          tagColor: "bg-slate-100 text-slate-700",
        };
    }
  };

  const formatActionText = (log: ActivityLog) => {
    let details = log.details as any;
    if (typeof details === "string") {
      try {
        details = JSON.parse(details);
      } catch {}
    }

    const hoName = details?.name || details?.full_name || "a homeowner";
    const hoAddress = details?.address || details?.street_name || "Residential Masterlist";

    switch (log.action) {
      case "CREATED_HOMEOWNER":
        return `registered new homeowner "${hoName !== "a homeowner" ? hoName : "Unknown"}" at ${hoAddress}`;
      case "UPDATED_HOMEOWNER":
        return `updated records for "${hoName}"`;
      case "DELETED_HOMEOWNER":
        return `archived homeowner "${hoName}"`;
      case "UPDATED_STATUS":
        return `${details?.is_active ? "activated" : "archived"} status for "${hoName}"`;
      case "UPDATED_MONTHLY_DUES": {
        const monthNames = [
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"
        ];
        const monthStr = details?.month && monthNames[details.month - 1] ? monthNames[details.month - 1] : "";
        const periodStr = monthStr ? `${monthStr} ${details?.year || ""}`.trim() : (details?.year ? `${details.year}` : "");
        const statusStr = (details?.status || "").toString().toLowerCase();
        const amountStr = details?.amount !== undefined && details?.amount !== null ? ` (₱${Number(details.amount).toFixed(2)})` : "";
        const orStr = details?.official_receipt_number ? ` [OR# ${details.official_receipt_number}]` : "";

        if (statusStr === "paid") {
          return `recorded payment${amountStr} for "${hoName}"${periodStr ? ` for ${periodStr}` : ""}${orStr}`;
        } else if (statusStr === "unpaid") {
          return `marked dues as unpaid for "${hoName}"${periodStr ? ` for ${periodStr}` : ""}`;
        }
        return `updated monthly dues records for "${hoName}"${periodStr ? ` (${periodStr})` : ""}`;
      }
      case "EXPORTED_EXCEL":
        return "exported the official homeowner masterlist (.xlsx)";
      case "RESTORED_BACKUP":
        return `restored database backup (${details?.count ?? 0} homeowners)`;
      case "UPDATED_SETTINGS":
        return "updated system configuration and dues settings";
      case "UPDATED_USER_PERMISSIONS":
        return `modified access privileges for ${details?.target_user || "user"}`;
      case "SYSTEM_INITIALIZED":
        return "initialized system registry and baseline records";
      case "CREATED_USER":
        return `created new user account for ${details?.email || "unknown"} (${details?.role || "user"})`;
      case "EDITED_USER":
        return `edited account details for ${details?.target_user || details?.email || "user"}`;
      default:
        return log.action.replace(/_/g, " ").toLowerCase();
    }
  };

  // Full-page filtered + paginated logs
  const filteredLogs = useMemo(() => {
    if (!fullPage) return logs.slice(0, 15);

    return logs.filter((log) => {
      // Search: user_name or action text
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        log.user_name.toLowerCase().includes(q) ||
        formatActionText(log).toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q);

      // Type filter
      const matchType = typeFilter === "all" || log.action === typeFilter;

      // Date range
      const logDate = new Date(log.created_at);
      const matchFrom = !dateFrom || logDate >= new Date(dateFrom);
      const matchTo = !dateTo || logDate <= new Date(dateTo + "T23:59:59");

      return matchSearch && matchType && matchFrom && matchTo;
    });
  }, [logs, fullPage, search, typeFilter, dateFrom, dateTo]);

  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    if (!fullPage) return filteredLogs;
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, fullPage, currentPage, pageSize]);

  const isFiltered = search !== "" || typeFilter !== "all" || dateFrom !== "" || dateTo !== "";

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportAuditTrailToExcel(filteredLogs, {
        search,
        type: typeFilter,
        dateFrom,
        dateTo,
      });
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  // If user does not have permission to view audit trail, render nothing
  if (!canView) return null;

  const renderLogItem = (log: ActivityLog) => {
    const meta = getActionDetails(log.action);
    return (
      <div key={log.id} className="relative flex items-start gap-3.5 group">
        {/* Timeline Dot */}
        <div className="absolute -left-6 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white dark:bg-[#0e192d] border-2 border-slate-300 dark:border-slate-700 group-hover:border-emerald-600 transition-colors">
          <div className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500 group-hover:bg-emerald-600 transition-colors" />
        </div>

        {/* Content Card */}
        <div className="flex-1 min-w-0 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#091424]/70 hover:bg-white dark:hover:bg-[#13233f] hover:border-slate-200 dark:hover:border-emerald-500/30 hover:shadow-subtle transition-all duration-200 flex flex-col gap-1.5">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className={`p-1.5 rounded-lg border shrink-0 mt-0.5 ${meta.bgColor}`}>
              {meta.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">{log.user_name}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${meta.tagColor}`}>
                  {meta.tag}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed break-words">
                {formatActionText(log)}
              </p>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 font-mono pl-9">
            {formatDateTime(log.created_at)}
          </span>
        </div>
      </div>
    );
  };

  // ─── COMPACT SIDEBAR WIDGET ───────────────────────────────────────────────
  if (!fullPage) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-sans">Recent Activity</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Official audit log trail</p>
            </div>
          </div>
          <span className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
            Live
          </span>
        </div>

        {logs.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No recent actions recorded</p>
        ) : (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {paginatedLogs.map((log) => renderLogItem(log))}
          </div>
        )}
      </div>
    );
  }

  // ─── FULL-PAGE AUDIT TRAIL ────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col gap-4 p-5 rounded-3xl border border-slate-200/80 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] shadow-subtle">
        {/* Row 1: Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by staff name or action description..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-2xl border border-slate-200 dark:border-[#1e2f4d] bg-slate-50/70 dark:bg-[#0c182c] focus:bg-white dark:focus:bg-[#0e192d] focus:border-emerald-500 dark:focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
            className="text-xs rounded-xl border border-slate-200 dark:border-[#1e2f4d] bg-slate-50/50 dark:bg-[#0c182c] px-3 py-2.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 font-medium"
          >
            {ACTION_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-white dark:bg-[#0c182c]">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Row 2: Date Range */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 shrink-0">Date Range:</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 dark:text-slate-400 shrink-0">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                className="text-xs rounded-xl border border-slate-200 dark:border-[#1e2f4d] bg-slate-50/50 dark:bg-[#0c182c] px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 font-medium"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 dark:text-slate-400 shrink-0">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                className="text-xs rounded-xl border border-slate-200 dark:border-[#1e2f4d] bg-slate-50/50 dark:bg-[#0c182c] px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 font-medium"
              />
            </div>
            {isFiltered && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 px-2.5 py-1.5 rounded-lg transition-colors font-semibold"
              >
                <X className="h-3.5 w-3.5" />
                <span>Clear Filters</span>
              </button>
            )}

            {/* Export Audit Trail Button */}
            <button
              onClick={handleExport}
              disabled={isExporting || filteredLogs.length === 0}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-emerald-300 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
              title="Export current filtered audit logs to Excel (.xlsx)"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{isExporting ? "Exporting..." : "Export Excel"}</span>
            </button>
          </div>

          {/* Results summary */}
          <div className="ml-auto text-xs text-slate-500 dark:text-slate-400 font-medium shrink-0">
            <span className="font-bold text-slate-800 dark:text-slate-200">{filteredLogs.length}</span> entries
            {isFiltered && <span className="text-emerald-600 dark:text-emerald-400"> (filtered)</span>}
          </div>
        </div>
      </div>

      {/* Log Timeline */}
      <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] shadow-subtle">
        {filteredLogs.length === 0 ? (
          <div className="py-16 text-center">
            <Clock className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="font-semibold text-slate-600 dark:text-slate-300">No audit entries found</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try adjusting your search or date range</p>
          </div>
        ) : (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {paginatedLogs.map((log) => renderLogItem(log))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {filteredLogs.length > pageSize && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-3xl border border-slate-200/80 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] text-xs text-slate-600 dark:text-slate-400">
          <div>
            Showing{" "}
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {filteredLogs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {Math.min(currentPage * pageSize, filteredLogs.length)}
            </span>{" "}
            of{" "}
            <span className="font-bold text-slate-900 dark:text-slate-100">{filteredLogs.length}</span> entries
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-slate-200 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#13233d] disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Prev</span>
            </button>
            <span className="px-2 font-semibold text-slate-800 dark:text-slate-200">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-slate-200 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#13233d] disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
