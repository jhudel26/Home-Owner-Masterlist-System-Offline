"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Swal from "sweetalert2";
import { Homeowner, HomeownerDeduction } from "@/types/database";
import { Modal } from "@/components/ui/modal";
import { ImageViewerModal } from "@/components/ui/image-viewer-modal";
import { OwnershipBadge, StatusBadge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Tabs } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useApp } from "@/context/app-context";
import { hasPermission } from "@/lib/permissions";
import {
  User,
  Home,
  Users,
  Calendar,
  Phone,
  Mail,
  PawPrint,
  Shield,
  HeartHandshake,
  Printer,
  Edit2,
  Plus,
  Trash2,
  DollarSign,
  MinusCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface HomeownerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  homeowner: Homeowner | null;
  onEdit?: () => void;
}

export function HomeownerDetailsModal({
  isOpen,
  onClose,
  homeowner,
  onEdit,
}: HomeownerDetailsModalProps) {
  const { currentUser } = useApp();
  const { success, error: toastError } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Deductions state
  const [deductions, setDeductions] = useState<HomeownerDeduction[]>([]);
  const [isLoadingDeductions, setIsLoadingDeductions] = useState(false);
  const [isDeductionModalOpen, setIsDeductionModalOpen] = useState(false);
  const [editingDeduction, setEditingDeduction] = useState<HomeownerDeduction | null>(null);
  
  // Form state
  const [deductionType, setDeductionType] = useState("");
  const [deductionAmount, setDeductionAmount] = useState("");
  const [deductionReason, setDeductionReason] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [isSavingDeduction, setIsSavingDeduction] = useState(false);

  const canManageDeductions = hasPermission(currentUser, "can_manage_deductions");
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [enlargedImageTitle, setEnlargedImageTitle] = useState<string>("");
  const [enlargedImageSubtitle, setEnlargedImageSubtitle] = useState<string>("");

  const fetchDeductions = useCallback(async () => {
    if (!homeowner) return;
    
    try {
      setIsLoadingDeductions(true);
      const res = await fetch(`/api/homeowners/${homeowner.id}/deductions`);
      const data = await res.json();
      if (data.success) {
        setDeductions(data.data);
      }
    } catch (error) {
      console.error("Error fetching deductions:", error);
    } finally {
      setIsLoadingDeductions(false);
    }
  }, [homeowner]);

  // Fetch deductions when homeowner changes or modal opens
  useEffect(() => {
    if (homeowner && isOpen && activeTab === "deductions") {
      fetchDeductions();
    }
  }, [homeowner, isOpen, activeTab, fetchDeductions]);

  const handleAddDeduction = () => {
    setEditingDeduction(null);
    setDeductionType("");
    setDeductionAmount("");
    setDeductionReason("");
    setEffectiveDate(new Date().toISOString().split("T")[0]);
    setIsDeductionModalOpen(true);
  };

  const handleEditDeduction = (deduction: HomeownerDeduction) => {
    setEditingDeduction(deduction);
    setDeductionType(deduction.deduction_type);
    setDeductionAmount(deduction.deduction_amount.toString());
    setDeductionReason(deduction.reason || "");
    setEffectiveDate(deduction.effective_date);
    setIsDeductionModalOpen(true);
  };

  const handleDeleteDeduction = async (deductionId: string) => {
    const result = await Swal.fire({
      title: "Delete Deduction?",
      text: "Are you sure you want to delete this deduction?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, delete deduction",
      cancelButtonText: "Cancel",
      customClass: {
        popup: "rounded-2xl",
        confirmButton: "rounded-xl px-6 py-2.5 font-bold",
        cancelButton: "rounded-xl px-6 py-2.5 font-bold",
      },
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/deductions/${deductionId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        success("Deduction Deleted", "The deduction has been removed successfully.");
        fetchDeductions();
      } else {
        toastError("Delete Failed", data.error || "Failed to delete deduction.");
      }
    } catch (error) {
      toastError("Delete Failed", "An error occurred while deleting the deduction.");
    }
  };

  const handleSaveDeduction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const numAmount = parseFloat(deductionAmount);
    if (isNaN(numAmount) || numAmount < 0) {
      toastError("Invalid Amount", "Please enter a valid deduction amount.");
      return;
    }

    if (!deductionType || !effectiveDate) {
      toastError("Missing Fields", "Please fill in all required fields.");
      return;
    }

    try {
      setIsSavingDeduction(true);
      
      if (editingDeduction) {
        // Update existing deduction
        const res = await fetch(`/api/deductions/${editingDeduction.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deduction_type: deductionType,
            deduction_amount: numAmount,
            reason: deductionReason,
            effective_date: effectiveDate,
          }),
        });
        const data = await res.json();
        if (data.success) {
          success("Deduction Updated", "The deduction has been updated successfully.");
          setIsDeductionModalOpen(false);
          fetchDeductions();
        } else {
          toastError("Update Failed", data.error || "Failed to update deduction.");
        }
      } else {
        // Create new deduction
        const res = await fetch(`/api/homeowners/${homeowner?.id}/deductions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deduction_type: deductionType,
            deduction_amount: numAmount,
            reason: deductionReason,
            effective_date: effectiveDate,
          }),
        });
        const data = await res.json();
        if (data.success) {
          success("Deduction Added", "The deduction has been added successfully.");
          setIsDeductionModalOpen(false);
          fetchDeductions();
        } else {
          toastError("Add Failed", data.error || "Failed to add deduction.");
        }
      }
    } catch (error) {
      toastError("Save Failed", "An error occurred while saving the deduction.");
    } finally {
      setIsSavingDeduction(false);
    }
  };

  const calculateTotalDeductions = () => {
    return deductions.reduce((total, deduction) => total + Number(deduction.deduction_amount), 0);
  };

  if (!homeowner) return null;

  // Helper to check if a string is a valid image URL (starts with /uploads/ or is a valid data URL)
  const isValidImageUrl = (url: string | null | undefined): boolean => {
    if (!url) return false;
    if (typeof url !== 'string') return false;
    // Allow relative paths starting with /uploads/
    if (url.startsWith('/uploads/')) return true;
    // Also allow base64 for existing records (will be migrated later)
    if (url.startsWith('data:image/')) return true;
    return false;
  };

  const handlePrint = () => {
    window.print();
  };

  const modalTabs = [
    { id: "overview", label: "Overview & Property", icon: <Home className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> },
    {
      id: "household",
      label: "Household Members",
      icon: <Users className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />,
      badge: homeowner.household_members?.length || 0,
    },
    { id: "proxy", label: "GA Proxy & Contact", icon: <Shield className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> },
    ...(canManageDeductions ? [{
      id: "deductions",
      label: "Deductions & Adjustments",
      icon: <MinusCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />,
      badge: deductions.length,
    }] : []),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Homeowner Resident Record"
      description="Official St. Joseph Village 6 Phase 4 residential record"
      icon={
        <div className="h-11 w-11 rounded-xl bg-white dark:bg-[#0e192d] p-1 border border-slate-200/80 dark:border-white/10 shadow-xs flex items-center justify-center shrink-0">
          <Image
            src="/icon.png"
            alt="HOA Logo"
            width={40}
            height={40}
            className="h-full w-full object-contain"
          />
        </div>
      }
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-[#040d1c] to-[#07162c] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md border border-white/10">
          <div className="flex items-center gap-4">
            {homeowner.photo_path && isValidImageUrl(homeowner.photo_path) ? (
              <img
                src={homeowner.photo_path}
                alt={homeowner.full_name}
                className="h-20 w-20 rounded-2xl object-cover border-2 border-emerald-500/30 shadow-md shrink-0 cursor-pointer hover:ring-2 hover:ring-emerald-400 transition-all"
                onClick={() => {
                  setEnlargedImage(homeowner.photo_path || null);
                  setEnlargedImageTitle(homeowner.full_name || "Homeowner Photo");
                  setEnlargedImageSubtitle(`${homeowner.hoa_number || "HOA Resident"} • Block ${homeowner.block_number || "-"}, Lot ${homeowner.lot_number || "-"}`);
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  // Fallback to initial when image fails to load
                }}
              />
            ) : (
              <div className="h-20 w-20 rounded-2xl bg-[#0c2340] border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-2xl shadow-md shrink-0">
                {homeowner.full_name?.charAt(0) || "?"}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-lg font-bold text-white tracking-tight">{homeowner.full_name || "Unknown"}</h4>
                {homeowner.hoa_number && (
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                    HOA# {homeowner.hoa_number}
                  </span>
                )}
                {homeowner.age && homeowner.age >= 60 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/40">
                    Senior (60+)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">{homeowner.street_name || "No address on file"}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <OwnershipBadge type={homeowner.ownership_type} />
            <StatusBadge status={homeowner.is_active ? "Active" : "Inactive"} />
          </div>
        </div>

        {/* Navigation Tabs */}
        <Tabs
          tabs={modalTabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          size="sm"
          className="w-full justify-start"
        />

        {/* Tab 1: Overview & Property */}
        {activeTab === "overview" && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-[#1e2f4d] bg-slate-50/50 dark:bg-[#0a1526]">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <Shield className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>HOA Number</span>
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                  {homeowner.hoa_number || "Pending Assignment"}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Phase 4 Official ID</p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-[#1e2f4d] bg-slate-50/50 dark:bg-[#0a1526]">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <Calendar className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Date of Birth</span>
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatDate(homeowner.birthdate)}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                  {homeowner.age ? `${homeowner.age} years old` : "—"}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-[#1e2f4d] bg-slate-50/50 dark:bg-[#0a1526]">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <User className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" />
                  <span>Gender</span>
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{homeowner.gender || "—"}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Registered Identity</p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-[#1e2f4d] bg-slate-50/50 dark:bg-[#0a1526]">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <Users className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Total Occupants</span>
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                  {(homeowner.household_members?.length || 0) + 1} {(homeowner.household_members?.length || 0) + 1 === 1 ? "Person" : "Persons"}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Living on property</p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-[#1e2f4d] bg-slate-50/50 dark:bg-[#0a1526]">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <PawPrint className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Domestic Pets</span>
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                  {homeowner.registered_pets || 0} {(homeowner.registered_pets || 0) === 1 ? "Pet" : "Pets"}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Census recorded</p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-[#1e2f4d] bg-slate-50/50 dark:bg-[#0a1526] col-span-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <Home className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Subdivision Lot</span>
                </div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">{homeowner.street_name || "No address on file"}</p>
              </div>

              {/* Homeowner Contact Information */}
              <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-[#1e2f4d] bg-slate-50/50 dark:bg-[#0a1526] col-span-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <Phone className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Homeowner Contact Information</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Mobile</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">{homeowner.contact_number || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Email</p>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{homeowner.email || "Not provided"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Household Members */}
        {activeTab === "household" && (
          <div className="space-y-4 animate-fade-in">
            {!homeowner.household_members || homeowner.household_members.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-[#0a1526] rounded-2xl border border-dashed border-slate-200 dark:border-[#1e2f4d]">
                <Users className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-1" />
                <p className="font-semibold text-slate-600 dark:text-slate-300">No additional household members recorded</p>
                <p className="mt-0.5">The homeowner is the sole registered occupant of this house.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {homeowner.household_members.map((member, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] shadow-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">
                        {member.member_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{member.member_name}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{member.relationship}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      Family
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Proxy & Contact */}
        {activeTab === "proxy" && (
          <div className="space-y-4 animate-fade-in">
            {/* General Assembly Proxy Card */}
            <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/30">
              <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider mb-3">
                <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>General Assembly (GA) Designated Proxy</span>
              </div>
              
              {homeowner.ga_proxy_designated ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    {homeowner.ga_proxy_photo_path && isValidImageUrl(homeowner.ga_proxy_photo_path) ? (
                      <img
                        src={homeowner.ga_proxy_photo_path}
                        alt={homeowner.ga_proxy_designated}
                        className="h-20 w-20 rounded-2xl object-cover border-2 border-emerald-500/30 shadow-md shrink-0 cursor-pointer hover:ring-2 hover:ring-emerald-400 transition-all"
                        onClick={() => {
                          setEnlargedImage(homeowner.ga_proxy_photo_path || null);
                          setEnlargedImageTitle(`${homeowner.ga_proxy_designated || "Proxy"} (GA Proxy)`);
                          setEnlargedImageSubtitle(`Proxy for ${homeowner.full_name || "Homeowner"}`);
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-2xl bg-[#0c2340] border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-2xl shadow-md shrink-0">
                        {homeowner.ga_proxy_designated?.charAt(0) || "?"}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{homeowner.ga_proxy_designated}</p>
                      <span className="text-xs text-emerald-800 dark:text-emerald-400 font-medium px-2.5 py-0.5 rounded-lg bg-white dark:bg-[#0e192d] border border-emerald-200 dark:border-emerald-800/60 inline-block mt-1">
                        Designated Proxy
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                  No designated proxy assigned. The homeowner attends General Assembly meetings in person.
                </p>
              )}
            </div>

            {/* Contact Coordinates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-[#1e2f4d] bg-slate-50/50 dark:bg-[#0a1526]">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <Phone className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Proxy Mobile Phone</span>
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                  {homeowner.ga_proxy_mobile || "Not provided"}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-[#1e2f4d] bg-slate-50/50 dark:bg-[#0a1526]">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <Mail className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                  <span>Proxy Email Address</span>
                </div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {homeowner.ga_proxy_email || "Not provided"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Deductions & Adjustments */}
        {activeTab === "deductions" && (
          <div className="space-y-4 animate-fade-in">
            {/* Summary Card */}
            <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
                  <MinusCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span>Total Monthly Deductions</span>
                </div>
                <div className="text-2xl font-black text-amber-700 dark:text-amber-300 font-mono">
                  ₱{calculateTotalDeductions().toFixed(2)}
                </div>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-400 mt-2">
                This amount will be deducted from the standard monthly dues of ₱100.00
              </p>
            </div>

            {/* Deductions List */}
            {isLoadingDeductions ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
              </div>
            ) : deductions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-[#0a1526] rounded-2xl border border-dashed border-slate-200 dark:border-[#1e2f4d]">
                <MinusCircle className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-1" />
                <p className="font-semibold text-slate-600 dark:text-slate-300">No deductions configured</p>
                <p className="mt-0.5">This homeowner pays the standard monthly dues rate.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {deductions.map((deduction) => (
                  <div
                    key={deduction.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] shadow-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 flex items-center justify-center text-lg font-bold shrink-0">
                        <DollarSign className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{deduction.deduction_type}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {deduction.reason || "No reason provided"} • Effective: {formatDate(deduction.effective_date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-amber-700 dark:text-amber-300 font-mono">
                        ₱{Number(deduction.deduction_amount).toFixed(2)}
                      </span>
                      {canManageDeductions && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditDeduction(deduction)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                            title="Edit deduction"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDeduction(deduction.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 dark:text-red-400 transition-colors"
                            title="Delete deduction"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Deduction Button */}
            {canManageDeductions && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddDeduction}
                className="w-full gap-2 py-3 rounded-xl border-dashed border-2 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-emerald-500 dark:hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400"
              >
                <Plus className="h-4 w-4" />
                <span>Add New Deduction</span>
              </Button>
            )}
          </div>
        )}

        {/* Modal Bottom Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-[#1e2f4d]">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="text-slate-600 dark:text-slate-300 gap-1.5 text-xs"
          >
            <Printer className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <span>Print Record</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
              Close
            </Button>
            {onEdit && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  onEdit();
                }}
                className="text-xs gap-1.5 shadow-sm"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>Edit Record</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Deduction Modal */}
      <Modal
        isOpen={isDeductionModalOpen}
        onClose={() => setIsDeductionModalOpen(false)}
        title={editingDeduction ? "Edit Deduction" : "Add New Deduction"}
        description={editingDeduction ? "Update the deduction details" : "Add a new deduction privilege for this homeowner"}
        maxWidth="md"
      >
        <form onSubmit={handleSaveDeduction} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
              Deduction Type *
            </label>
            <Input
              type="text"
              value={deductionType}
              onChange={(e) => setDeductionType(e.target.value)}
              placeholder="e.g., Electricity, Services, Maintenance"
              required
              className="text-sm font-semibold text-slate-900 dark:text-slate-100 rounded-xl"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              The category or reason for the deduction (e.g., &quot;Electricity&quot; for homeowners providing power)
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
              Deduction Amount (₱) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-emerald-600 dark:text-emerald-400">
                ₱
              </span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={deductionAmount}
                onChange={(e) => setDeductionAmount(e.target.value)}
                placeholder="0.00"
                required
                className="pl-8 text-sm font-bold text-slate-900 dark:text-slate-100 rounded-xl"
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Amount to deduct from the standard monthly dues (e.g., 50.00 for ₱50 deduction)
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
              Reason (Optional)
            </label>
            <Input
              type="text"
              value={deductionReason}
              onChange={(e) => setDeductionReason(e.target.value)}
              placeholder="Additional details about this deduction"
              className="text-sm font-semibold text-slate-900 dark:text-slate-100 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
              Effective Date *
            </label>
            <Input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              required
              className="text-sm font-semibold text-slate-900 dark:text-slate-100 rounded-xl"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              The date when this deduction becomes effective
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setIsDeductionModalOpen(false)}
              disabled={isSavingDeduction}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={isSavingDeduction}
              className="gap-1.5"
            >
              {editingDeduction ? "Update Deduction" : "Add Deduction"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Polished Image Viewer Modal */}
      <ImageViewerModal
        isOpen={Boolean(enlargedImage)}
        onClose={() => setEnlargedImage(null)}
        imageUrl={enlargedImage}
        title={enlargedImageTitle}
        subtitle={enlargedImageSubtitle}
      />
    </Modal>
  );
}


