"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { Homeowner } from "@/types/database";
import { useApp } from "@/context/app-context";
import { hasPermission } from "@/lib/permissions";
import { OwnershipBadge, StatusBadge } from "@/components/ui/badge";
import { HomeownerDetailsModal } from "./homeowner-details-modal";
import { BulkImportModal } from "./bulk-import-modal";
import { ImageViewerModal } from "@/components/ui/image-viewer-modal";
import { exportHomeownersToExcel } from "@/lib/excel-export";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/error-utils";
import { Tabs } from "@/components/ui/tabs";
import {
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Plus,
  Upload,
  Table as TableIcon,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
  X,
  Phone,
  Mail,
  Home,
  Users,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface HomeownerTableProps {
  homeowners: Homeowner[];
}

export function HomeownerTable({ homeowners }: HomeownerTableProps) {
  const router = useRouter();
  const { currentUser, deleteHomeowner, setHomeowners } = useApp();
  const { success, error: toastError } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Permissions
  const canCreate = hasPermission(currentUser, "can_create_homeowner");
  const canEdit = hasPermission(currentUser, "can_edit_homeowner");
  const canDelete = hasPermission(currentUser, "can_delete_homeowner");
  const canExport = hasPermission(currentUser, "can_export_excel");

  // State: View Mode (Table vs Grid)
  const [viewMode, setViewMode] = useState<string>("table");

  // State: Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOwnership, setFilterOwnership] = useState<string>("All");
  const [filterGender, setFilterGender] = useState<string>("All");
  const [filterStatus, setFilterStatus] = useState<string>("All");

  // State: Sorting & Pagination
  const [sortBy, setSortBy] = useState<"name" | "address" | "age" | "created_at">("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = viewMode === "table" ? 8 : 9;

  // State: Inline Expanded Rows
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // Modals state
  const [selectedHomeowner, setSelectedHomeowner] = useState<Homeowner | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<string>("all");
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [enlargedImageTitle, setEnlargedImageTitle] = useState<string>("");
  const [enlargedImageSubtitle, setEnlargedImageSubtitle] = useState<string>("");

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const isValidImageUrl = (url: string | null | undefined): boolean => {
    if (!url || typeof url !== "string") return false;
    return url.startsWith("/uploads/") || url.startsWith("data:image/") || url.startsWith("http://") || url.startsWith("https://");
  };

  const toggleRowExpansion = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const isFiltered =
    searchTerm !== "" ||
    filterOwnership !== "All" ||
    filterGender !== "All" ||
    filterStatus !== "All" ||
    activePreset !== "all";

  const applyPreset = (presetId: string) => {
    setActivePreset(presetId);
    setCurrentPage(1);
    if (presetId === "all") {
      setFilterOwnership("All");
      setFilterStatus("All");
    } else if (presetId === "seniors") {
      setFilterOwnership("All");
      setFilterStatus("All");
    } else if (presetId === "renters") {
      setFilterOwnership("renter");
      setFilterStatus("All");
    } else if (presetId === "active-owners") {
      setFilterOwnership("owner");
      setFilterStatus("active");
    } else if (presetId === "inactive") {
      setFilterStatus("inactive");
      setFilterOwnership("All");
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterOwnership("All");
    setFilterGender("All");
    setFilterStatus("All");
    setActivePreset("all");
    setCurrentPage(1);
  };

  // Filter & Search Logic
  const filteredData = useMemo(() => {
    return homeowners.filter((ho) => {
      const query = searchTerm.toLowerCase();
      const matchSearch =
        !query ||
        (ho.full_name && ho.full_name.toLowerCase().includes(query)) ||
        (ho.street_name && ho.street_name.toLowerCase().includes(query)) ||
        (ho.contact_number && ho.contact_number.toLowerCase().includes(query)) ||
        (ho.email && ho.email.toLowerCase().includes(query)) ||
        (ho.ga_proxy_designated && ho.ga_proxy_designated.toLowerCase().includes(query)) ||
        (ho.hoa_number && ho.hoa_number.toLowerCase().includes(query));

      const matchOwnership = filterOwnership === "All" || ho.ownership_type === filterOwnership;
      const matchGender = filterGender === "All" || ho.gender === filterGender;
      const matchStatus = filterStatus === "All" || 
        (filterStatus === "active" && ho.is_active === 1) ||
        (filterStatus === "inactive" && ho.is_active === 0);

      const matchPreset = activePreset === "seniors" ? (ho.age ?? 0) >= 60 : true;

      return matchSearch && matchOwnership && matchGender && matchStatus && matchPreset;
    });
  }, [homeowners, searchTerm, filterOwnership, filterGender, filterStatus, activePreset]);

  // Sort Logic
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let valA: string | number = "";
      let valB: string | number = "";

      if (sortBy === "name") {
        valA = (a.full_name || `${a.first_name || ""} ${a.last_name || ""}`).trim().toLowerCase();
        valB = (b.full_name || `${b.first_name || ""} ${b.last_name || ""}`).trim().toLowerCase();
      } else if (sortBy === "address") {
        valA = (a.street_name || a.address || "").toLowerCase();
        valB = (b.street_name || b.address || "").toLowerCase();
      } else if (sortBy === "age") {
        valA = a.age ?? 0;
        valB = b.age ?? 0;
      } else if (sortBy === "created_at") {
        valA = new Date(a.created_at).getTime();
        valB = new Date(b.created_at).getTime();
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortBy, sortOrder]);

  // Pagination Logic
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (column: "name" | "address" | "age" | "created_at") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const handleExportFiltered = async () => {
    try {
      await exportHomeownersToExcel(filteredData, "St_Joseph_Village_6_Phase_4_Filtered");
      success("Export Complete", `Exported ${filteredData.length} records to Excel.`);
    } catch (err: unknown) {
      toastError("Export Failed", getErrorMessage(err));
    }
  };

  const handleDeleteHomeowner = async (homeowner: Homeowner) => {
    const result = await Swal.fire({
      title: "Archive Homeowner Record?",
      html: `Are you sure you want to archive <strong>"${homeowner.full_name}"</strong>?<br><br>This will mark the status as <strong>Inactive</strong>. The record and associated household members will be preserved in historical audit logs.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, archive record",
      cancelButtonText: "Cancel",
      customClass: {
        popup: "rounded-2xl",
        confirmButton: "rounded-xl px-6 py-2.5 font-bold",
        cancelButton: "rounded-xl px-6 py-2.5 font-bold",
      },
    });

    if (!result.isConfirmed) return;

    const res = await deleteHomeowner(homeowner.id);
    if (res.success) {
      success("Record Archived", `${homeowner.full_name} was archived.`);
    } else {
      toastError("Archive Failed", res.error);
    }
  };

  return (
    <div className="space-y-5">
      {/* Search & Control Command Toolbar */}
      <div className="flex flex-col gap-4 p-5 rounded-3xl border border-slate-200/80 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] shadow-subtle">
        {/* Search Input with Keyboard Shortcut Hint - Full width on mobile */}
        <div className="relative w-full xl:max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search homeowners, Block & Lot, contact mobile, GA proxy..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-20 py-2.5 text-sm rounded-2xl border border-slate-200 dark:border-[#1e2f4d] bg-slate-50/70 dark:bg-[#0c182c] focus:bg-white dark:focus:bg-[#0e192d] focus:border-emerald-500 dark:focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-slate-100"
          />
          {searchTerm ? (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 pointer-events-none">
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-xs">
                /
              </kbd>
            </div>
          )}
        </div>

        {/* Filters, View Switcher & Actions - Responsive grid layout */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Filter Dropdowns - Grid on mobile, flex on desktop */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
            <select
              value={filterOwnership}
              onChange={(e) => {
                setFilterOwnership(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs rounded-xl border border-slate-200 dark:border-[#1e2f4d] bg-slate-50/50 dark:bg-[#0c182c] px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 font-medium"
            >
              <option value="All" className="bg-white dark:bg-[#0c182c]">All Ownership Types</option>
              <option value="owner" className="bg-white dark:bg-[#0c182c]">Owners Only</option>
              <option value="renter" className="bg-white dark:bg-[#0c182c]">Renters Only</option>
            </select>

            <select
              value={filterGender}
              onChange={(e) => {
                setFilterGender(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs rounded-xl border border-slate-200 dark:border-[#1e2f4d] bg-slate-50/50 dark:bg-[#0c182c] px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 font-medium"
            >
              <option value="All" className="bg-white dark:bg-[#0c182c]">All Genders</option>
              <option value="male" className="bg-white dark:bg-[#0c182c]">Male</option>
              <option value="female" className="bg-white dark:bg-[#0c182c]">Female</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs rounded-xl border border-slate-200 dark:border-[#1e2f4d] bg-slate-50/50 dark:bg-[#0c182c] px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 font-medium"
            >
              <option value="All" className="bg-white dark:bg-[#0c182c]">All Statuses</option>
              <option value="active" className="bg-white dark:bg-[#0c182c]">Active Only</option>
              <option value="inactive" className="bg-white dark:bg-[#0c182c]">Inactive Only</option>
            </select>

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
          </div>

          {/* View Switcher & Actions - Stack on mobile, row on desktop */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* View Switcher Tabs (Table vs Grid) */}
            <Tabs
              tabs={[
                { id: "table", label: "", icon: <TableIcon className="h-4 w-4" /> },
                { id: "grid", label: "", icon: <LayoutGrid className="h-4 w-4" /> },
              ]}
              activeTab={viewMode}
              onChange={setViewMode}
              size="sm"
            />

            {/* Export Action */}
            {canExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportFiltered}
                className="text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 h-9 font-medium"
              >
                <FileSpreadsheet className="h-4 w-4 mr-1.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">Export ({filteredData.length})</span>
                <span className="sm:hidden">Export</span>
              </Button>
            )}

            {canCreate && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBulkImportOpen(true)}
                  className="border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 h-9 font-medium"
                >
                  <Upload className="h-4 w-4 mr-1.5" />
                  <span className="hidden sm:inline">Bulk Import</span>
                  <span className="sm:hidden">Import</span>
                </Button>

                <Link href="/dashboard/homeowners/new" className="w-full sm:w-auto">
                  <Button size="sm" variant="primary" className="font-semibold h-9 shadow-sm w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-1" />
                    <span>Register</span>
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Filter Presets Pill Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs px-1">
        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0">
          Saved Presets:
        </span>
        {[
          { id: "all", label: "All Residents" },
          { id: "seniors", label: "👴 Seniors (60+)" },
          { id: "renters", label: "🏠 Renters Only" },
          { id: "active-owners", label: "🔑 Active Owners" },
          { id: "inactive", label: "📁 Archived" },
        ].map((preset) => (
          <button
            key={preset.id}
            onClick={() => applyPreset(preset.id)}
            className={`px-3 py-1 rounded-full font-medium transition-all text-xs shrink-0 ${
              activePreset === preset.id
                ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 font-semibold"
                : "bg-white dark:bg-[#0e192d] text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-[#1e2f4d] hover:border-slate-300 dark:hover:border-slate-600"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* VIEW MODE 1: Dense Data Table */}
      {viewMode === "table" ? (
        <div className="rounded-3xl border border-slate-200/80 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] shadow-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#1e2f4d] bg-slate-50/80 dark:bg-[#0a1526]/90 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 sticky top-0 z-10 backdrop-blur-md">
                  <th className="py-3.5 px-3 w-10 text-center"></th>
                  <th
                    onClick={() => handleSort("name")}
                    className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-[#13233d] transition-colors select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Homeowner Name</span>
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("address")}
                    className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-[#13233d] transition-colors select-none hidden sm:table-cell"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Address</span>
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-center hidden md:table-cell">Ownership Type</th>
                  <th
                    onClick={() => handleSort("age")}
                    className="py-3.5 px-4 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-[#13233d] transition-colors select-none hidden lg:table-cell"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Age</span>
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 hidden md:table-cell">Contact Info</th>
                  <th className="py-3.5 px-4 text-center hidden lg:table-cell">Occupants</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-[#1e2f4d] text-sm">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-slate-400 dark:text-slate-500 text-sm">
                      <Users className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="font-semibold text-slate-600 dark:text-slate-300">No homeowners matched your filters</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try clearing filters or changing your search term</p>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((ho) => {
                    const isExpanded = Boolean(expandedRows[ho.id]);
                    const memberCount = ho.household_members?.length || 0;

                    return (
                      <React.Fragment key={ho.id}>
                        <tr
                          className="hover:bg-slate-50/80 dark:hover:bg-[#13233d]/60 transition-colors cursor-pointer group"
                          onClick={() => {
                            setSelectedHomeowner(ho);
                            setIsDetailsOpen(true);
                          }}
                        >
                          {/* Expansion Toggle */}
                          <td
                            className="py-3.5 px-3 text-center"
                            onClick={(e) => toggleRowExpansion(ho.id, e)}
                          >
                            <button
                              className="p-1 rounded-md text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title={isExpanded ? "Collapse members" : "Preview members"}
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          </td>

                          {/* Name, Photo & HOA# */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="relative shrink-0">
                                {ho.photo_path && isValidImageUrl(ho.photo_path) ? (
                                  <img
                                    src={ho.photo_path}
                                    alt={ho.full_name || "Homeowner"}
                                    className="h-10 w-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer hover:ring-2 hover:ring-emerald-500 transition-all"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEnlargedImage(ho.photo_path || null);
                                      setEnlargedImageTitle(ho.full_name || "Homeowner Photo");
                                      setEnlargedImageSubtitle(`${ho.hoa_number || "HOA Resident"} • Block ${ho.block_number || "-"}, Lot ${ho.lot_number || "-"}`);
                                    }}
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                      const parent = e.currentTarget.parentElement;
                                      if (parent) {
                                        const fb = parent.querySelector(".table-avatar-fallback") as HTMLElement;
                                        if (fb) fb.style.display = "flex";
                                      }
                                    }}
                                  />
                                ) : null}
                                <div
                                  className={`table-avatar-fallback h-10 w-10 rounded-xl bg-gradient-to-br from-[#07162c] to-[#0c2340] text-emerald-400 font-bold flex items-center justify-center text-xs shadow-xs border border-emerald-500/30 ${
                                    ho.photo_path && isValidImageUrl(ho.photo_path) ? "hidden" : "flex"
                                  }`}
                                >
                                  {(ho.full_name || ho.first_name || "?").charAt(0).toUpperCase()}
                                </div>
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                    {ho.full_name || `${ho.first_name || ""} ${ho.last_name || ""}`.trim() || "Unnamed"}
                                  </span>
                                  {ho.hoa_number && (
                                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shrink-0">
                                      {ho.hoa_number}
                                    </span>
                                  )}
                                </div>
                                {(ho.ga_proxy_name || ho.ga_proxy_designated) ? (
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                    <Shield className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                    <span>Proxy: {ho.ga_proxy_name || ho.ga_proxy_designated}</span>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </td>

                          {/* Address */}
                          <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 text-xs font-semibold hidden sm:table-cell">
                            {ho.street_name || ho.address}
                          </td>

                          {/* Tenure */}
                          <td className="py-3.5 px-4 text-center hidden md:table-cell">
                            <OwnershipBadge type={ho.ownership_type} />
                          </td>

                          {/* Age */}
                          <td className="py-3.5 px-4 text-center text-xs font-bold text-slate-800 dark:text-slate-200 font-mono hidden lg:table-cell">
                            {ho.age !== undefined && ho.age !== null ? `${ho.age} yrs` : "—"}
                          </td>

                          {/* Contact */}
                          <td className="py-3.5 px-4 text-xs hidden md:table-cell">
                            <div className="font-mono text-slate-800 dark:text-slate-200 font-semibold">{ho.contact_number || "—"}</div>
                            {ho.email && (
                              <div className="text-slate-400 dark:text-slate-500 truncate max-w-[160px] text-[11px]">
                                {ho.email}
                              </div>
                            )}
                          </td>

                          {/* Household count */}
                          <td className="py-3.5 px-4 text-center text-xs font-medium text-slate-700 dark:text-slate-300 hidden lg:table-cell">
                            <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                              {ho.household_count ?? (memberCount + 1)}
                            </span>
                            {memberCount > 0 && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">
                                +{memberCount} listed
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            {canEdit ? (
                              <Switch
                                checked={ho.is_active === 1}
                                onCheckedChange={async (checked) => {
                                  try {
                                    const res = await fetch(`/api/homeowners`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ id: ho.id, is_active: checked ? 1 : 0 })
                                    });
                                    const data = await res.json();
                                    if (data.success) {
                                      success(
                                        checked ? "Status Activated" : "Status Archived",
                                        `${ho.full_name} has been ${checked ? "activated" : "archived"}.`
                                      );
                                      // Update state immutably without mutating props
                                      setHomeowners((prev) =>
                                        prev.map((item) =>
                                          item.id === ho.id ? { ...item, is_active: checked ? 1 : 0 } : item
                                        )
                                      );
                                    } else {
                                      toastError("Update Failed", data.error || "Could not update status");
                                    }
                                  } catch (err) {
                                    toastError("Update Failed", "An error occurred while updating status");
                                  }
                                }}
                              />
                            ) : (
                              <StatusBadge status={ho.is_active ? "Active" : "Inactive"} />
                            )}
                          </td>

                          {/* Actions */}
                          <td
                            className="py-3.5 px-4 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setSelectedHomeowner(ho);
                                  setIsDetailsOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>

                              {canEdit && (
                                <button
                                  onClick={() => router.push(`/dashboard/homeowners/${ho.id}/edit`)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30 transition-colors"
                                  title="Edit Homeowner"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                              )}

                              {canDelete && (ho.is_active !== undefined ? ho.is_active === 1 : ho.status === "Active") && (
                                <button
                                  onClick={() => handleDeleteHomeowner(ho)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                  title="Archive Homeowner"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Inline Row Expansion: Household Members & Details Preview */}
                        {isExpanded && (
                          <tr className="bg-slate-50/70 dark:bg-[#0a1526]/80 border-b border-slate-200/80 dark:border-[#1e2f4d] animate-fade-in">
                            <td colSpan={9} className="px-8 py-3.5">
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                <div>
                                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                                    Household Members at {ho.street_name || ho.address}:
                                  </span>
                                  {!ho.household_members || ho.household_members.length === 0 ? (
                                    <p className="text-xs text-slate-400 dark:text-slate-500 italic">No additional family members recorded.</p>
                                  ) : (
                                    <div className="flex flex-wrap gap-2">
                                      {ho.household_members.map((m, idx) => (
                                        <span
                                          key={idx}
                                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-[#0e192d] border border-slate-200 dark:border-[#1e2f4d] text-xs font-medium text-slate-800 dark:text-slate-200 shadow-xs"
                                        >
                                          <Users className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                          <span className="font-bold">{m.member_name}</span>
                                          <span className="text-slate-400 dark:text-slate-500">({m.relationship})</span>
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-4 shrink-0 sm:border-l sm:border-slate-200 dark:sm:border-[#1e2f4d] sm:pl-4">
                                  <div>
                                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Registered Pets</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{ho.registered_pets ?? ho.pet_count ?? 0} Pets</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">GA Proxy</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{ho.ga_proxy_name || ho.ga_proxy_designated || "Self Attendance"}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 dark:border-[#1e2f4d] bg-slate-50/60 dark:bg-[#0a1526]/80 text-xs text-slate-600 dark:text-slate-400">
            <div>
              Showing <span className="font-bold text-slate-900 dark:text-slate-100">{sortedData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> to{" "}
              <span className="font-bold text-slate-900 dark:text-slate-100">{Math.min(currentPage * pageSize, sortedData.length)}</span> of{" "}
              <span className="font-bold text-slate-900 dark:text-slate-100">{sortedData.length}</span> records
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
        /* VIEW MODE 2: Visual Resident Card Grid */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {paginatedData.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-400 dark:text-slate-500 text-sm bg-white dark:bg-[#0e192d] rounded-3xl border border-slate-200 dark:border-[#1e2f4d] p-8">
                <Users className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="font-bold text-slate-700 dark:text-slate-200">No homeowners found</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Adjust your search terms or filters above</p>
              </div>
            ) : (
              paginatedData.map((ho) => (
                <div
                  key={ho.id}
                  className="rounded-3xl border border-slate-200/80 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] p-5 shadow-subtle hover:shadow-card hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer group"
                  onClick={() => {
                    setSelectedHomeowner(ho);
                    setIsDetailsOpen(true);
                  }}
                >
                  <div>
                    {/* Card Top Row */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          {ho.photo_path && isValidImageUrl(ho.photo_path) ? (
                            <img
                              src={ho.photo_path}
                              alt={ho.full_name || "Homeowner"}
                              className="h-11 w-11 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:ring-2 hover:ring-emerald-500 transition-all"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEnlargedImage(ho.photo_path || null);
                                setEnlargedImageTitle(ho.full_name || "Homeowner Photo");
                                setEnlargedImageSubtitle(`${ho.hoa_number || "HOA Resident"} • Block ${ho.block_number || "-"}, Lot ${ho.lot_number || "-"}`);
                              }}
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                const parent = e.currentTarget.parentElement;
                                if (parent) {
                                  const fb = parent.querySelector(".grid-avatar-fallback") as HTMLElement;
                                  if (fb) fb.style.display = "flex";
                                }
                              }}
                            />
                          ) : null}
                          <div
                            className={`grid-avatar-fallback h-11 w-11 rounded-2xl bg-gradient-to-br from-[#07162c] to-[#0c2340] text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-base shadow-sm shrink-0 ${
                              ho.photo_path && isValidImageUrl(ho.photo_path) ? "hidden" : "flex"
                            }`}
                          >
                            {(ho.full_name || ho.first_name || "?").charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-snug">
                              {ho.full_name || `${ho.first_name || ""} ${ho.last_name || ""}`.trim() || "Unnamed"}
                            </h4>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {ho.hoa_number && (
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shrink-0">
                                {ho.hoa_number}
                              </span>
                            )}
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono font-medium">
                              {ho.age ? `${ho.age} yrs` : "—"} &bull; {ho.gender || "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <OwnershipBadge type={ho.ownership_type} />
                    </div>

                    {/* Address Banner */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0a1526] border border-slate-100 dark:border-[#1e2f4d] flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-semibold mb-3">
                      <Home className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="truncate">{ho.street_name || ho.address}</span>
                    </div>

                    {/* Occupants & Pets */}
                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <div className="p-2 rounded-lg bg-slate-50/80 dark:bg-[#0a1526] border border-slate-100/80 dark:border-[#1e2f4d]">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-bold uppercase">Household</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{ho.household_count ?? ((ho.household_members?.length || 0) + 1)} Occupants</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50/80 dark:bg-[#0a1526] border border-slate-100/80 dark:border-[#1e2f4d]">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-bold uppercase">Pets</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{ho.registered_pets ?? ho.pet_count ?? 0} Registered</span>
                      </div>
                    </div>

                    {/* Contact quick links */}
                    <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                      {ho.contact_number && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="font-mono">{ho.contact_number}</span>
                        </div>
                      )}
                      {ho.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-sky-600 dark:text-sky-400 shrink-0" />
                          <span className="truncate max-w-[200px]">{ho.email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom Footer */}
                  <div className="flex items-center justify-between pt-3 mt-4 border-t border-slate-100 dark:border-[#1e2f4d]">
                    <StatusBadge status={ho.is_active ? "Active" : "Inactive"} />

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                        onClick={() => {
                          setSelectedHomeowner(ho);
                          setIsDetailsOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400"
                          onClick={() => router.push(`/dashboard/homeowners/${ho.id}/edit`)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (ho.is_active !== undefined ? ho.is_active === 1 : ho.status === "Active") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                          onClick={() => handleDeleteHomeowner(ho)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Grid Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-3xl border border-slate-200/80 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] text-xs text-slate-600 dark:text-slate-400">
            <div>
              Showing <span className="font-bold text-slate-900 dark:text-slate-100">{sortedData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> to{" "}
              <span className="font-bold text-slate-900 dark:text-slate-100">{Math.min(currentPage * pageSize, sortedData.length)}</span> of{" "}
              <span className="font-bold text-slate-900 dark:text-slate-100">{sortedData.length}</span> records
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

      {/* Details Modal */}
      <HomeownerDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        homeowner={selectedHomeowner}
        onEdit={
          canEdit && selectedHomeowner
            ? () => router.push(`/dashboard/homeowners/${selectedHomeowner.id}/edit`)
            : undefined
        }
      />

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
      />

      {/* Polished Image Viewer Modal */}
      <ImageViewerModal
        isOpen={Boolean(enlargedImage)}
        onClose={() => setEnlargedImage(null)}
        imageUrl={enlargedImage}
        title={enlargedImageTitle}
        subtitle={enlargedImageSubtitle}
      />
    </div>
  );
}


