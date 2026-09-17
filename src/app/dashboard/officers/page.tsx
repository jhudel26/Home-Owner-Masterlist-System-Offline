"use client";

import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useApp } from "@/context/app-context";
import { hasPermission } from "@/lib/permissions";
import { HoaOfficer, OfficerPosition } from "@/types/database";
import { ImageViewerModal } from "@/components/ui/image-viewer-modal";
import {
  Shield,
  UserPlus,
  Edit2,
  Trash2,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Award,
  Building2,
  Camera,
  ZoomIn,
  Sparkles,
} from "lucide-react";

const POSITIONS: OfficerPosition[] = [
  'President',
  'Vice President',
  'Secretary',
  'Treasurer',
  'Auditor',
  'Chairman of Board Officer',
  'Board Officer',
  'Environment, Sanitation, Beautification & DRRM',
  'Peace & Order',
  'Sports & Youth',
  'Grievance & Adjudication',
  'Audit & Inventory',
  'Delinquency Hearing & Compliance',
];

const COMMITTEES = [
  'Environment, Sanitation, Beautification & DRRM',
  'Peace & Order',
  'Sports & Youth',
  'Grievance & Adjudication',
  'Audit & Inventory',
  'Delinquency Hearing & Compliance',
];

const formatDateForInput = (dateValue: string | Date | null | undefined): string => {
  if (!dateValue) return "";
  try {
    const date = new Date(dateValue as string);
    if (isNaN(date.getTime())) return "";
    return date.toISOString().split("T")[0];
  } catch {
    return "";
  }
};

export default function OfficersPage() {
  const { currentUser, homeowners } = useApp();
  const { success, error: toastError } = useToast();
  const canManage = hasPermission(currentUser, "can_manage_officers");
  const canView = hasPermission(currentUser, "can_view_homeowner");

  const [officers, setOfficers] = useState<HoaOfficer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<HoaOfficer | null>(null);

  // Form state
  const [selectedHomeownerId, setSelectedHomeownerId] = useState("");
  const [selectedPosition, setSelectedPosition] = useState<OfficerPosition>("Board Officer");
  const [selectedCommittees, setSelectedCommittees] = useState<string[]>([]);
  const [termStartDate, setTermStartDate] = useState("");
  const [termEndDate, setTermEndDate] = useState("");
  const [exemptFromDues, setExemptFromDues] = useState(false);
  const [exemptStartMonth, setExemptStartMonth] = useState("");
  const [exemptStartYear, setExemptStartYear] = useState("");
  const [exemptEndMonth, setExemptEndMonth] = useState("");
  const [exemptEndYear, setExemptEndYear] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Image enlargement and profile picture states
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [enlargedImageTitle, setEnlargedImageTitle] = useState<string>("");
  const [enlargedImageSubtitle, setEnlargedImageSubtitle] = useState<string>("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const fetchOfficers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/officers");
      const data = await res.json();
      if (data.success) {
        setOfficers(data.data);
      }
    } catch (error) {
      console.error("Error fetching officers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOfficers();
  }, []);

  const handleAddOfficer = () => {
    setIsEditMode(false);
    setEditingOfficer(null);
    setSelectedHomeownerId("");
    setSelectedPosition("Board Officer");
    setSelectedCommittees([]);
    setTermStartDate("");
    setTermEndDate("");
    setExemptFromDues(false);
    setExemptStartMonth("");
    setExemptStartYear("");
    setExemptEndMonth("");
    setExemptEndYear("");
    setNotes("");
    setPhotoFile(null);
    setPhotoPreview(null);
    setIsModalOpen(true);
  };

  const handleEditOfficer = (officer: HoaOfficer) => {
    setIsEditMode(true);
    setEditingOfficer(officer);
    setSelectedHomeownerId(officer.homeowner_id);
    setSelectedPosition(officer.position);
    setSelectedCommittees(officer.committees || []);
    setTermStartDate(formatDateForInput(officer.term_start_date));
    setTermEndDate(formatDateForInput(officer.term_end_date));
    setExemptFromDues(officer.exempt_from_dues === 1);
    setPhotoFile(null);
    const photo = (officer as any).photo_path || officer.homeowner?.photo_path || null;
    setPhotoPreview(photo);
    
    // Parse exemption dates to month/year
    if (officer.exempt_start_date) {
      const startDate = new Date(officer.exempt_start_date);
      setExemptStartMonth(String(startDate.getMonth() + 1));
      setExemptStartYear(String(startDate.getFullYear()));
    } else {
      setExemptStartMonth("");
      setExemptStartYear("");
    }
    
    if (officer.exempt_end_date) {
      const endDate = new Date(officer.exempt_end_date);
      setExemptEndMonth(String(endDate.getMonth() + 1));
      setExemptEndYear(String(endDate.getFullYear()));
    } else {
      setExemptEndMonth("");
      setExemptEndYear("");
    }
    
    setNotes(officer.notes || "");
    setIsModalOpen(true);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toastError("File Too Large", "Profile photo must be less than 5MB. Please choose a smaller image.");
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setPhotoPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleHomeownerChange = (homeownerId: string) => {
    setSelectedHomeownerId(homeownerId);
    setPhotoFile(null);
    const matched = homeowners.find(h => h.id === homeownerId);
    setPhotoPreview(matched?.photo_path || null);
  };

  const handleDeleteOfficer = async (id: string) => {
    const result = await Swal.fire({
      title: "Remove Officer?",
      text: "Are you sure you want to remove this officer from the registry?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, remove officer",
      cancelButtonText: "Cancel",
      customClass: {
        popup: "rounded-2xl",
        confirmButton: "rounded-xl px-6 py-2.5 font-bold",
        cancelButton: "rounded-xl px-6 py-2.5 font-bold",
      },
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/officers?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        success("Officer Removed", "The officer has been successfully removed.");
        fetchOfficers();
      } else {
        toastError("Delete Failed", data.error || "Failed to remove officer.");
      }
    } catch (error) {
      toastError("Delete Failed", "An error occurred while removing the officer.");
    }
  };

  const handleSaveOfficer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedHomeownerId || !selectedPosition || !termStartDate) {
      toastError("Validation Error", "Please fill in all required fields.");
      return;
    }

    try {
      setIsSaving(true);

      // If a photo was selected, upload it for the homeowner
      let uploadedPhotoPath: string | null = null;
      if (photoFile && selectedHomeownerId) {
        const formData = new FormData();
        formData.append("photo", photoFile);
        formData.append("homeowner", JSON.stringify({}));
        const photoRes = await fetch(`/api/homeowners/${selectedHomeownerId}`, {
          method: "PATCH",
          body: formData,
        });
        const photoData = await photoRes.json();
        if (photoData.success && photoData.photo_path) {
          uploadedPhotoPath = photoData.photo_path;
        }
      }

      const method = isEditMode ? "PATCH" : "POST";
      const url = "/api/officers";

      const body: any = {
        homeowner_id: selectedHomeownerId,
        position: selectedPosition,
        committees: selectedCommittees,
        term_start_date: termStartDate,
        term_end_date: termEndDate || null,
        exempt_from_dues: exemptFromDues,
        exempt_start_date: (exemptFromDues && exemptStartMonth && exemptStartYear) 
          ? `${exemptStartYear}-${String(exemptStartMonth).padStart(2, '0')}-01` 
          : null,
        exempt_end_date: (exemptFromDues && exemptEndMonth && exemptEndYear) 
          ? `${exemptEndYear}-${String(exemptEndMonth).padStart(2, '0')}-${getLastDayOfMonth(parseInt(exemptEndYear), parseInt(exemptEndMonth))}` 
          : null,
        notes: notes || null,
        photo_path: uploadedPhotoPath || undefined,
      };

      if (isEditMode && editingOfficer) {
        body.id = editingOfficer.id;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        success(
          isEditMode ? "Officer Updated" : "Officer Added",
          isEditMode ? "Officer information has been updated." : "New officer has been added to the registry."
        );
        setIsModalOpen(false);
        fetchOfficers();
      } else {
        toastError("Save Failed", data.error || "Failed to save officer information.");
      }
    } catch (error) {
      toastError("Save Failed", "An error occurred while saving officer information.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCommittee = (committee: string) => {
    setSelectedCommittees(prev =>
      prev.includes(committee)
        ? prev.filter(c => c !== committee)
        : [...prev, committee]
    );
  };

  const getCurrentDate = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  };

  const isValidImageUrl = (url: string | null | undefined): boolean => {
    if (!url || typeof url !== "string") return false;
    return url.startsWith("/uploads/") || url.startsWith("data:image/") || url.startsWith("http://") || url.startsWith("https://");
  };

  const getLastDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getBoardOfficerCount = () => {
    return officers.filter(o => o.position === 'Board Officer').length;
  };

  const groupOfficersByPosition = () => {
    const grouped: Record<string, HoaOfficer[]> = {};
    officers.forEach(officer => {
      if (!grouped[officer.position]) {
        grouped[officer.position] = [];
      }
      grouped[officer.position].push(officer);
    });
    return grouped;
  };

  const getPositionPriority = (position: string) => {
    const priorities: Record<string, number> = {
      'President': 1,
      'Vice President': 2,
      'Secretary': 3,
      'Treasurer': 4,
      'Auditor': 5,
      'Chairman of Board Officer': 6,
      'Board Officer': 7,
      'Environment, Sanitation, Beautification & DRRM': 8,
      'Peace & Order': 8,
      'Sports & Youth': 8,
      'Grievance & Adjudication': 8,
      'Audit & Inventory': 8,
      'Delinquency Hearing & Compliance': 8,
    };
    return priorities[position] || 99;
  };

  const sortedPositions = Object.keys(groupOfficersByPosition()).sort((a, b) => 
    getPositionPriority(a) - getPositionPriority(b)
  );

  if (!canView) {
    return (
      <div className="p-12 text-center rounded-2xl border border-slate-200 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d]">
        <Shield className="h-12 w-12 text-red-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Permission Denied</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Your account does not have permission to view HOA officers.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="HOA Officers Management"
        description="Manage HOA officers, their positions, committees, and dues exemptions"
        icon={
          <span className="inline-flex items-center justify-center h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
            <Shield className="h-4 w-4" />
          </span>
        }
      />

      {/* Add Officer Button */}
      {canManage && (
        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={handleAddOfficer}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Officer</span>
          </Button>
        </div>
      )}

      {/* Officers List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-emerald-600"></div>
        </div>
      ) : officers.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0e192d]">
          <Users className="h-12 w-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Officers Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Start by adding your first HOA officer to the registry.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedPositions.map(position => {
            const positionOfficers = groupOfficersByPosition()[position];
            return (
              <div key={position} className="rounded-3xl border border-slate-200/80 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] p-6 shadow-subtle">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800/60">
                      <Award className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{position}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {positionOfficers.length} {positionOfficers.length === 1 ? 'officer' : 'officers'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {positionOfficers.map(officer => (
                    <div
                      key={officer.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-[#0c182c] border border-slate-200/70 dark:border-slate-800"
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative shrink-0">
                          {officer.homeowner?.photo_path && isValidImageUrl(officer.homeowner.photo_path) ? (
                            <button
                              type="button"
                              onClick={() => {
                                setEnlargedImage(officer.homeowner?.photo_path || null);
                                setEnlargedImageTitle(officer.homeowner?.full_name || officer.homeowner_name || "Officer");
                                setEnlargedImageSubtitle(`${officer.position} • ${officer.homeowner?.hoa_number || "No HOA#"}`);
                              }}
                              className="group relative block rounded-full focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                              title="Click to view full image"
                            >
                              <img
                                src={officer.homeowner.photo_path}
                                alt={officer.homeowner?.full_name || officer.homeowner_name || "Officer"}
                                className="h-10 w-10 rounded-full object-cover border-2 border-emerald-500/30 shadow-md group-hover:ring-2 group-hover:ring-emerald-400 transition-all cursor-pointer"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                  const parent = e.currentTarget.parentElement?.parentElement;
                                  if (parent) {
                                    const fb = parent.querySelector(".officer-avatar-fallback") as HTMLElement;
                                    if (fb) fb.style.display = "flex";
                                  }
                                }}
                              />
                              <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <ZoomIn className="h-4 w-4 text-white" />
                              </div>
                            </button>
                          ) : null}
                          <div
                            className={`officer-avatar-fallback h-10 w-10 rounded-full bg-gradient-to-br from-[#07162c] to-[#0c2340] text-emerald-400 font-bold flex items-center justify-center text-sm border border-emerald-500/30 ${
                              officer.homeowner?.photo_path && isValidImageUrl(officer.homeowner.photo_path) ? "hidden" : "flex"
                            }`}
                          >
                            {(officer.homeowner?.full_name || officer.homeowner_name || "?").charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {officer.homeowner?.full_name || officer.homeowner_name || "Unknown"}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {officer.homeowner?.hoa_number || "No HOA#"}
                            </span>
                            {officer.homeowner?.block_number && officer.homeowner?.lot_number && (
                              <span className="text-xs text-slate-400 dark:text-slate-500">
                                • Block {officer.homeowner.block_number}, Lot {officer.homeowner.lot_number}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {officer.exempt_from_dues === 1 && (
                          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                            <CheckCircle className="h-3 w-3" />
                            <span>Dues Exempt</span>
                          </div>
                        )}
                        {canManage && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditOfficer(officer)}
                              className="h-8 px-3"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteOfficer(officer.id)}
                              className="h-8 px-3 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/60 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Officer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditMode ? "Edit Officer" : "Add New Officer"}
        description={isEditMode ? "Update officer information and settings" : "Add a new HOA officer to the registry"}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveOfficer} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
              Homeowner *
            </label>
            <select
              value={selectedHomeownerId}
              onChange={(e) => handleHomeownerChange(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">Select a homeowner...</option>
              {homeowners.map((ho) => (
                <option key={ho.id} value={ho.id}>
                  {ho.hoa_number} - {ho.full_name} (Block {ho.block_number}, Lot {ho.lot_number})
                </option>
              ))}
            </select>
          </div>

          {/* Profile Picture Upload Section */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-[#1e2f4d] bg-slate-50/70 dark:bg-[#0a1526]">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
              Profile Picture
            </label>
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                {photoPreview && isValidImageUrl(photoPreview) ? (
                  <div className="relative group">
                    <img
                      src={photoPreview}
                      alt="Officer Preview"
                      className="h-16 w-16 rounded-full object-cover border-2 border-emerald-500/40 shadow-md cursor-pointer group-hover:ring-2 group-hover:ring-emerald-400 transition-all"
                      onClick={() => {
                        setEnlargedImage(photoPreview);
                        setEnlargedImageTitle("Officer Photo Preview");
                        setEnlargedImageSubtitle(selectedPosition);
                      }}
                    />
                    <div
                      className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                      onClick={() => {
                        setEnlargedImage(photoPreview);
                        setEnlargedImageTitle("Officer Photo Preview");
                        setEnlargedImageSubtitle(selectedPosition);
                      }}
                    >
                      <ZoomIn className="h-5 w-5 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#07162c] to-[#0c2340] text-emerald-400 font-bold flex items-center justify-center text-xl border border-emerald-500/30">
                    <Camera className="h-6 w-6 text-slate-400" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors">
                  <Camera className="h-3.5 w-3.5" />
                  <span>{photoPreview ? "Change Photo" : "Upload Photo"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                  PNG, JPG or WebP up to 5MB. Photo will update the homeowner profile.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
              Position *
            </label>
            <select
              value={selectedPosition}
              onChange={(e) => setSelectedPosition(e.target.value as OfficerPosition)}
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              {POSITIONS.map((position) => (
                <option key={position} value={position}>
                  {position}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                Term Start Date *
              </label>
              <Input
                type="date"
                value={termStartDate}
                onChange={(e) => setTermStartDate(e.target.value)}
                required
                className="text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                Term End Date
              </label>
              <Input
                type="date"
                value={termEndDate}
                onChange={(e) => setTermEndDate(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
              Committee Assignments
            </label>
            <div className="grid grid-cols-2 gap-2">
              {COMMITTEES.map((committee) => (
                <label key={committee} className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCommittees.includes(committee)}
                    onChange={() => toggleCommittee(committee)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300">{committee}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-[#1e2f4d] bg-slate-50/70 dark:bg-[#0a1526]">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={exemptFromDues}
                onChange={(e) => setExemptFromDues(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <div className="text-xs text-slate-700 dark:text-slate-300">
                <span className="font-bold text-slate-900 dark:text-slate-100 block">
                  Exempt from Monthly Dues
                </span>
                <span className="block mt-1">
                  This officer will not be required to pay monthly association dues during the exemption period.
                </span>
              </div>
            </label>
          </div>

          {exemptFromDues && (
            <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-emerald-500/30">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                  Exemption Start
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={exemptStartMonth}
                    onChange={(e) => setExemptStartMonth(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="">Month</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(0, i).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                  <select
                    value={exemptStartYear}
                    onChange={(e) => setExemptStartYear(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="">Year</option>
                    {Array.from({ length: 10 }, (_, i) => (
                      <option key={2024 + i} value={2024 + i}>
                        {2024 + i}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                  Exemption End
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={exemptEndMonth}
                    onChange={(e) => setExemptEndMonth(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="">Month</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(0, i).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                  <select
                    value={exemptEndYear}
                    onChange={(e) => setExemptEndYear(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="">Year</option>
                    {Array.from({ length: 10 }, (_, i) => (
                      <option key={2024 + i} value={2024 + i}>
                        {2024 + i}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Additional notes about this officer..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSaving}
              className="font-bold"
            >
              {isEditMode ? "Update Officer" : "Add Officer"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Enlarged Image Viewer Modal */}
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