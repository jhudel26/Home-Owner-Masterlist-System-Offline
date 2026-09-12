"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Homeowner, HouseholdMember, OwnershipType, GenderType } from "@/types/database";
import { calculateAge, isValidEmail, isValidPhilippineMobile, formatPhilippineMobile } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import {
  Plus,
  Trash2,
  User,
  Users,
  Shield,
  Phone,
  PawPrint,
  Calendar,
  MapPin,
  Upload,
  X,
  GripVertical,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

interface HomeownerFormProps {
  initialData?: Homeowner;
  onSubmit: (
    data: Omit<Homeowner, "id" | "created_at" | "updated_at" | "is_active"> & { is_active?: number },
    members: Omit<HouseholdMember, "id" | "homeowner_id">[],
    formData?: FormData
  ) => Promise<{ success: boolean; error?: string }>;
  isEditing?: boolean;
}

export function HomeownerForm({ initialData, onSubmit, isEditing = false }: HomeownerFormProps) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper function to convert ISO date to yyyy-MM-dd format for date input
  const formatDateForInput = (dateString: string | null | undefined): string => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      return date.toISOString().split('T')[0];
    } catch {
      return "";
    }
  };

  // Helper to check if a string is a valid image URL (starts with /uploads/, data URL, or blob URL for preview)
  const isValidImageUrl = (url: string | null | undefined): boolean => {
    if (!url) return false;
    if (typeof url !== 'string') return false;
    // Allow relative paths starting with /uploads/
    if (url.startsWith('/uploads/')) return true;
    // Also allow base64 for existing records (will be migrated later)
    if (url.startsWith('data:image/')) return true;
    // Allow blob URLs for image previews
    if (url.startsWith('blob:')) return true;
    return false;
  };

  // Name fields
  const [firstName, setFirstName] = useState(initialData?.first_name || "");
  const [middleName, setMiddleName] = useState(initialData?.middle_name || "");
  const [lastName, setLastName] = useState(initialData?.last_name || "");
  const [suffix, setSuffix] = useState(initialData?.suffix || "");

  // Ownership fields
  const [ownershipType, setOwnershipType] = useState<OwnershipType>(initialData?.ownership_type || "owner");
  const [tenureDate, setTenureDate] = useState(formatDateForInput(initialData?.tenure_date));
  const [yearsOfResidency, setYearsOfResidency] = useState<number>(0);

  // Property Owner Information (for renters)
  const [ownerFirstName, setOwnerFirstName] = useState(initialData?.owner_first_name || "");
  const [ownerMiddleName, setOwnerMiddleName] = useState(initialData?.owner_middle_name || "");
  const [ownerLastName, setOwnerLastName] = useState(initialData?.owner_last_name || "");
  const [ownerSuffix, setOwnerSuffix] = useState(initialData?.owner_suffix || "");

  // Address fields
  const [homeNumber, setHomeNumber] = useState(initialData?.home_number || "");
  const [blockNumber, setBlockNumber] = useState(initialData?.block_number || "");
  const [lotNumber, setLotNumber] = useState(initialData?.lot_number || "");
  const [barangay, setBarangay] = useState(initialData?.barangay || "");
  const [streetName, setStreetName] = useState(initialData?.street_name || "");

  // Other fields
  const [gender, setGender] = useState<GenderType>(initialData?.gender || "male");
  const [birthdate, setBirthdate] = useState(formatDateForInput(initialData?.birthdate));
  const [age, setAge] = useState<number>(initialData?.age ?? (initialData?.birthdate ? calculateAge(initialData.birthdate) : 0));
  const [contactNumber, setContactNumber] = useState(initialData?.contact_number || "");
  const [email, setEmail] = useState(initialData?.email || "");
  const [registeredPets, setRegisteredPets] = useState<number>(initialData?.registered_pets || 0);
  const [photoPath, setPhotoPath] = useState<string | null>(isValidImageUrl(initialData?.photo_path) ? initialData?.photo_path || null : null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [isActive, setIsActive] = useState<number>(initialData?.is_active ?? 1);
  const [householdCount, setHouseholdCount] = useState<number>(initialData?.household_members ? initialData.household_members.length + 1 : 1);

  // GA Proxy fields
  const [gaProxyFirstName, setGaProxyFirstName] = useState(initialData?.ga_proxy_first_name || "");
  const [gaProxyMiddleName, setGaProxyMiddleName] = useState(initialData?.ga_proxy_middle_name || "");
  const [gaProxyLastName, setGaProxyLastName] = useState(initialData?.ga_proxy_last_name || "");
  const [gaProxySuffix, setGaProxySuffix] = useState(initialData?.ga_proxy_suffix || "");
  const [gaProxyBirthdate, setGaProxyBirthdate] = useState(formatDateForInput(initialData?.ga_proxy_birthdate));
  const [gaProxyGender, setGaProxyGender] = useState<GenderType>(initialData?.ga_proxy_gender || "male");
  const [gaProxyMobile, setGaProxyMobile] = useState(initialData?.ga_proxy_mobile || "");
  const [gaProxyEmail, setGaProxyEmail] = useState(initialData?.ga_proxy_email || "");
  const [gaProxyPhotoPath, setGaProxyPhotoPath] = useState<string | null>(isValidImageUrl(initialData?.ga_proxy_photo_path) ? initialData?.ga_proxy_photo_path || null : null);
  const [gaProxyPhotoFile, setGaProxyPhotoFile] = useState<File | null>(null);

  // Household members
  const [members, setMembers] = useState<Omit<HouseholdMember, "id" | "homeowner_id">[]>(
    initialData?.household_members?.map((m) => ({
      member_name: m.member_name,
      relationship: m.relationship,
    })) || []
  );

  // Drag and drop for members
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Errors state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-calculate years of residency
  useEffect(() => {
    if (tenureDate) {
      const start = new Date(tenureDate);
      const now = new Date();
      const years = now.getFullYear() - start.getFullYear();
      setYearsOfResidency(years > 0 ? years : 0);
    }
  }, [tenureDate]);

  // Auto-calculate age from birthdate
  useEffect(() => {
    if (birthdate) {
      const calculatedAge = calculateAge(birthdate);
      setAge(calculatedAge >= 0 ? calculatedAge : 0);
    }
  }, [birthdate]);

  // Auto-calculate household count
  useEffect(() => {
    setHouseholdCount(Math.max(1, members.length + 1));
  }, [members]);

  // Clean up blob URLs on unmount
  useEffect(() => {
    return () => {
      if (photoPath && photoPath.startsWith('blob:')) {
        URL.revokeObjectURL(photoPath);
      }
      if (gaProxyPhotoPath && gaProxyPhotoPath.startsWith('blob:')) {
        URL.revokeObjectURL(gaProxyPhotoPath);
      }
    };
  }, [photoPath, gaProxyPhotoPath]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!firstName.trim()) newErrors.firstName = "First Name is required";
    if (!lastName.trim()) newErrors.lastName = "Last Name is required";
    if (!birthdate) newErrors.birthdate = "Birthdate is required";
    if (!blockNumber.trim()) newErrors.blockNumber = "Block Number is required";
    if (!lotNumber.trim()) newErrors.lotNumber = "Lot Number is required";
    if (!streetName.trim()) newErrors.streetName = "Official Subdivision Address is required";
    
    if (ownershipType === "renter") {
      if (!ownerFirstName.trim()) newErrors.ownerFirstName = "Property Owner First Name is required";
      if (!ownerLastName.trim()) newErrors.ownerLastName = "Property Owner Last Name is required";
    }
    
    if (email && !isValidEmail(email)) newErrors.email = "Please enter a valid email address";
    if (contactNumber && !isValidPhilippineMobile(contactNumber)) newErrors.contactNumber = "Please enter a valid 11-digit mobile (e.g. 0917-123-4567)";
    if (gaProxyMobile && !isValidPhilippineMobile(gaProxyMobile)) newErrors.gaProxyMobile = "Please enter a valid 11-digit mobile (e.g. 0917-123-4567)";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toastError("Validation", "Please correct the highlighted fields before proceeding.");
      return;
    }

    setIsSubmitting(true);
    try {
      const filteredMembers = members.filter((m) => m.member_name.trim().length > 0);

      // Combine name parts for full_name
      const fullName = [firstName, middleName, lastName, suffix].filter(Boolean).join(' ');

      const homeownerData = {
        first_name: firstName.trim(),
        middle_name: middleName.trim() || undefined,
        last_name: lastName.trim(),
        suffix: suffix.trim() || undefined,
        full_name: fullName,
        ownership_type: ownershipType,
        tenure_date: tenureDate || undefined,
        owner_first_name: ownershipType === "renter" ? ownerFirstName.trim() : undefined,
        owner_middle_name: ownershipType === "renter" ? ownerMiddleName.trim() : undefined,
        owner_last_name: ownershipType === "renter" ? ownerLastName.trim() : undefined,
        owner_suffix: ownershipType === "renter" ? ownerSuffix.trim() : undefined,
        home_number: homeNumber.trim() || undefined,
        block_number: blockNumber.trim(),
        lot_number: lotNumber.trim(),
        street_name: streetName.trim(),
        barangay: barangay.trim(),
        gender,
        birthdate,
        age,
        contact_number: contactNumber.trim() || undefined,
        email: email.trim() || undefined,
        registered_pets: registeredPets,
        photo_path: isEditing ? photoPath || undefined : undefined, // Only include path when editing, not creating
        ga_proxy_designated: [gaProxyFirstName, gaProxyMiddleName, gaProxyLastName, gaProxySuffix].filter(Boolean).join(' ') || undefined,
        ga_proxy_first_name: gaProxyFirstName.trim() || undefined,
        ga_proxy_middle_name: gaProxyMiddleName.trim() || undefined,
        ga_proxy_last_name: gaProxyLastName.trim() || undefined,
        ga_proxy_suffix: gaProxySuffix.trim() || undefined,
        ga_proxy_birthdate: gaProxyBirthdate || undefined,
        ga_proxy_gender: gaProxyGender,
        ga_proxy_mobile: gaProxyMobile.trim() || undefined,
        ga_proxy_email: gaProxyEmail.trim() || undefined,
        ga_proxy_photo_path: isEditing ? gaProxyPhotoPath || undefined : undefined, // Only include path when editing, not creating
        notes: notes.trim() || undefined,
      };

      // Only include is_active if editing (not needed for creation)
      if (isEditing) {
        (homeownerData as any).is_active = isActive;
      }

      // Create FormData for multipart file upload
      const formData = new FormData();
      formData.append("homeowner", JSON.stringify(homeownerData));
      formData.append("members", JSON.stringify(filteredMembers));
      
      if (photoFile) {
        formData.append("photo", photoFile);
      }
      if (gaProxyPhotoFile) {
        formData.append("ga_proxy_photo", gaProxyPhotoFile);
      }

      const res = await onSubmit(homeownerData, filteredMembers, formData);

      if (res.success) {
        success(
          isEditing ? "Homeowner Updated" : "Homeowner Registered",
          `${firstName} ${lastName} is successfully saved to the St. Joseph Village 6 Phase 4 records.`
        );
        router.push("/dashboard/homeowners");
      } else {
        toastError("Operation Failed", res.error || "Could not save homeowner data.");
      }
    } catch (err: any) {
      toastError("Unexpected Error", err.message || "An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toastError("File Too Large", "Profile photo must be less than 5MB. Please choose a smaller image or compress it.");
        return;
      }
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toastError("Invalid Image", "The file is not a valid image. Please try again.");
        return;
      }
      // Clean up old blob URL if exists
      if (photoPath && photoPath.startsWith('blob:')) {
        URL.revokeObjectURL(photoPath);
      }
      setPhotoFile(file);
      // Create a preview URL for display
      const previewUrl = URL.createObjectURL(file);
      setPhotoPath(previewUrl);
    }
  };

  const handleGaProxyPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toastError("File Too Large", "GA Proxy photo must be less than 5MB. Please choose a smaller image or compress it.");
        return;
      }
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toastError("Invalid Image", "The file is not a valid image. Please try again.");
        return;
      }
      // Clean up old blob URL if exists
      if (gaProxyPhotoPath && gaProxyPhotoPath.startsWith('blob:')) {
        URL.revokeObjectURL(gaProxyPhotoPath);
      }
      setGaProxyPhotoFile(file);
      // Create a preview URL for display
      const previewUrl = URL.createObjectURL(file);
      setGaProxyPhotoPath(previewUrl);
    }
  };

  const formatAddress = () => {
    let address = "";
    if (homeNumber) {
      address += homeNumber + ", ";
    }
    if (blockNumber && lotNumber) {
      address += "Blk " + blockNumber + " Lot " + lotNumber + ", ";
    }
    address += "Phase 4 Joseph Village 6";
    if (barangay) {
      address += ", " + barangay;
    }
    address += ", Cabuyao Laguna";
    setStreetName(address);
  };

  // Household member management
  const addMemberRow = () => {
    setMembers((prev) => [...prev, { member_name: "", relationship: "Spouse" }]);
  };

  const removeMemberRow = (index: number) => {
    setMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const updateMemberRow = (index: number, field: "member_name" | "relationship", value: string) => {
    setMembers((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
  };

  const moveMember = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= members.length) return;
    setMembers((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setMembers((prev) => {
      const copy = [...prev];
      const draggedItem = copy[draggedIndex];
      copy.splice(draggedIndex, 1);
      copy.splice(index, 0, draggedItem);
      return copy;
    });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto">
      {/* SECTION 1: Principal Homeowner Information */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] p-6 sm:p-8 shadow-subtle space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-[#1e2f4d]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60 shadow-xs">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-sans">
                1. Head of Household / Principal Registrant
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Primary titleholder or lessee details residing in Phase 4
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isEditing && initialData?.hoa_number && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">HOA#</span>
                <span className="text-xs font-mono font-bold text-emerald-900 dark:text-emerald-300">{initialData.hoa_number}</span>
              </div>
            )}
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-1 rounded-lg border border-teal-200 dark:border-teal-800/60">
              Step 1 of 4
            </span>
          </div>
        </div>

        {/* Profile Picture Upload */}
        <div className="flex items-center gap-6">
          <div className="relative">
            {photoPath && isValidImageUrl(photoPath) ? (
              <img 
                src={photoPath} 
                alt="Profile" 
                className="h-24 w-24 rounded-full object-cover border-4 border-slate-200 dark:border-slate-700" 
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-slate-100 dark:bg-slate-800 border-4 border-slate-200 dark:border-slate-700 flex items-center justify-center">
                <User className="h-10 w-10 text-slate-400" />
              </div>
            )}
            <label className="absolute bottom-0 right-0 bg-teal-600 hover:bg-teal-700 text-white p-2 rounded-full cursor-pointer">
              <Upload className="h-4 w-4" />
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>
            {photoPath && (
              <button
                type="button"
                onClick={() => {
                  // Clean up blob URL if exists
                  if (photoPath.startsWith('blob:')) {
                    URL.revokeObjectURL(photoPath);
                  }
                  setPhotoPath(null);
                  setPhotoFile(null);
                }}
                className="absolute top-0 right-0 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Principal Registrant Photo</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Upload a recent photo (JPG, PNG) - Max 5MB</p>
          </div>
        </div>

        {/* Name Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <Input
              label="First Name"
              required
              placeholder="e.g. Roberto"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              error={errors.firstName}
            />
          </div>
          <div>
            <Input
              label="Middle Name"
              placeholder="e.g. Mercado"
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
            />
          </div>
          <div>
            <Input
              label="Last Name"
              required
              placeholder="e.g. Dela Cruz"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              error={errors.lastName}
            />
          </div>
          <div>
            <Input
              label="Suffix"
              placeholder="e.g. Jr., III"
              value={suffix}
              onChange={(e) => setSuffix(e.target.value)}
            />
          </div>
          <div>
            <Select
              label="Ownership Type"
              required
              value={ownershipType}
              onChange={(e) => setOwnershipType(e.target.value as OwnershipType)}
            >
              <option value="owner">Owner</option>
              <option value="renter">Renter</option>
            </Select>
          </div>
        </div>

        {/* Property Owner Information (for renters) */}
        {ownershipType === "renter" && (
          <div className="md:col-span-2 p-4 rounded-2xl bg-amber-50/40 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/60 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
              <Shield className="h-4 w-4 text-amber-700 dark:text-amber-500" />
              <span>Property Owner Information</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <Input
                  label="Owner First Name"
                  required
                  value={ownerFirstName}
                  onChange={(e) => setOwnerFirstName(e.target.value)}
                  error={errors.ownerFirstName}
                />
              </div>
              <div>
                <Input
                  label="Owner Middle Name"
                  value={ownerMiddleName}
                  onChange={(e) => setOwnerMiddleName(e.target.value)}
                />
              </div>
              <div>
                <Input
                  label="Owner Last Name"
                  required
                  value={ownerLastName}
                  onChange={(e) => setOwnerLastName(e.target.value)}
                  error={errors.ownerLastName}
                />
              </div>
              <div>
                <Input
                  label="Owner Suffix"
                  value={ownerSuffix}
                  onChange={(e) => setOwnerSuffix(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Address and Personal Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <Input
              label="Date of Residency (Tenure Start)"
              type="date"
              value={tenureDate}
              onChange={(e) => setTenureDate(e.target.value)}
            />
          </div>
          <div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 px-4 py-2.5">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                {yearsOfResidency > 0 ? `${yearsOfResidency} years` : "Enter residency date"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Auto-calculated from residency date</p>
          </div>
          <div>
            <Select
              label="Gender"
              required
              value={gender}
              onChange={(e) => setGender(e.target.value as GenderType)}
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other / Prefer not to say</option>
            </Select>
          </div>
          <div>
            <Input
              label="Date of Birth"
              type="date"
              required
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
              error={errors.birthdate}
            />
          </div>
          <div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 px-4 py-2.5">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                {age > 0 ? `${age} years old` : "Enter birthdate"}
              </span>
              {age >= 60 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md border bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700">
                  Senior Citizen (60+)
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Calculated in real-time from birthdate</p>
          </div>
        </div>

        {/* Phase 4 Address Quick Builder */}
        <div className="md:col-span-2 p-4 rounded-2xl bg-teal-50/40 dark:bg-teal-950/30 border border-teal-200/70 dark:border-teal-800/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-teal-900 dark:text-teal-200 uppercase tracking-wider">
              <MapPin className="h-4 w-4 text-teal-700 dark:text-teal-500" />
              <span>Phase 4 Address Quick Builder</span>
            </div>
            <span className="text-[10px] text-teal-700 dark:text-teal-400 font-medium">Format: Home #, Blk, Lot, Brgy</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <Input
                label="Home Number"
                placeholder="e.g. 12A"
                value={homeNumber}
                onChange={(e) => setHomeNumber(e.target.value)}
              />
            </div>
            <div>
              <Input
                label="Block Number"
                required
                placeholder="e.g. 12"
                value={blockNumber}
                onChange={(e) => setBlockNumber(e.target.value)}
                error={errors.blockNumber}
              />
            </div>
            <div>
              <Input
                label="Lot Number"
                required
                placeholder="e.g. 8"
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                error={errors.lotNumber}
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={formatAddress}
                className="w-full text-xs"
              >
                <MapPin className="h-3.5 w-3.5 mr-1" />
                Format Address
              </Button>
            </div>
          </div>
          <div>
            <Input
              label="Barangay"
              placeholder="e.g. Brgy San Pablo"
              value={barangay}
              onChange={(e) => setBarangay(e.target.value)}
            />
          </div>
        </div>

        {/* Official Subdivision Address */}
        <div className="md:col-span-2">
          <Input
            label="Official Subdivision Address"
            required
            placeholder="e.g. St. Joseph Village 6 Phase 4"
            value={streetName}
            onChange={(e) => setStreetName(e.target.value)}
            error={errors.streetName}
            helperText="Format: Home # (if available), Blk Lot, Phase 4 Joseph Village 6 Brgy, Cabuyao, Laguna"
          />
        </div>

        {/* Contact Channels */}
        <div>
          <Input
            label="Philippine Mobile Number"
            placeholder="0917-123-4567"
            value={contactNumber}
            onChange={(e) => setContactNumber(formatPhilippineMobile(e.target.value))}
            error={errors.contactNumber}
            helperText="11-digit Philippine format (09XX-XXX-XXXX)"
          />
        </div>
        <div>
          <Input
            label="Official Email Address"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            helperText="For HOA circulars and meeting notices"
          />
        </div>

        {/* Active Status (only for edit) */}
        {isEditing && (
          <div className="md:col-span-2">
            <Switch
              label="Active Resident Status"
              description="Enable to mark this homeowner as an active resident. Disable to archive the record."
              checked={isActive === 1}
              onCheckedChange={(checked) => setIsActive(checked ? 1 : 0)}
            />
          </div>
        )}
      </div>

      {/* SECTION 2: Household Members Registry */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] p-6 sm:p-8 shadow-subtle space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-[#1e2f4d]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 shadow-xs">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-sans">
                2. Household Members & Family Census
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Spouse, children, in-laws, relatives, or domestic staff living at this property
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800/60">
            Step 2 of 4
          </span>
        </div>

        <div className="max-w-xs">
          <Input
            label="Total People Living in the House"
            type="number"
            min="1"
            max="35"
            value={householdCount}
            onChange={(e) => setHouseholdCount(parseInt(e.target.value) || 1)}
            helperText="Auto-counted: 1 principal owner + registered members"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addMemberRow}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Family Member
        </Button>

        <div className="space-y-3">
          {members.length === 0 ? (
            <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-[#1e2f4d] text-center text-xs text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-[#0a1526]">
              <Users className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-1" />
              <p className="font-semibold text-slate-600 dark:text-slate-300">No additional household members listed</p>
              <p className="mt-0.5">Click &quot;Add Family Member&quot; above to register family or occupants.</p>
            </div>
          ) : (
            members.map((member, index) => (
              <div
                key={index}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                  draggedIndex === index
                    ? "border-teal-500 bg-teal-50/40 dark:bg-teal-950/30 scale-[0.99] opacity-75"
                    : "border-slate-200 dark:border-[#1e2f4d] bg-slate-50/60 dark:bg-[#0a1526] hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                {/* Drag Handle & Order Controls */}
                <div className="flex items-center gap-1 shrink-0 text-slate-400 dark:text-slate-500">
                  <div className="cursor-grab active:cursor-grabbing p-1 rounded hover:text-slate-600 dark:hover:text-slate-300" title="Drag to reorder">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveMember(index, "up")}
                      aria-label={`Move ${member.member_name || "member"} up`}
                      className="p-0.5 text-slate-400 hover:text-teal-600 disabled:opacity-20 transition-colors"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      disabled={index === members.length - 1}
                      onClick={() => moveMember(index, "down")}
                      aria-label={`Move ${member.member_name || "member"} down`}
                      className="p-0.5 text-slate-400 hover:text-teal-600 disabled:opacity-20 transition-colors"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 w-full">
                  <Input
                    placeholder="Member Full Name"
                    value={member.member_name}
                    onChange={(e) => updateMemberRow(index, "member_name", e.target.value)}
                  />
                </div>
                <div className="w-full sm:w-52">
                  <Select
                    value={member.relationship}
                    onChange={(e) => updateMemberRow(index, "relationship", e.target.value)}
                  >
                    <option value="Spouse">Spouse</option>
                    <option value="Son">Son</option>
                    <option value="Daughter">Daughter</option>
                    <option value="Parent">Parent / In-law</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Partner">Partner</option>
                    <option value="Relative">Relative</option>
                    <option value="Household Helper">Household Helper</option>
                    <option value="Other">Other</option>
                  </Select>
                </div>
                <button
                  type="button"
                  onClick={() => removeMemberRow(index)}
                  className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors self-end sm:self-center"
                  title="Remove member"
                  aria-label={`Remove ${member.member_name || "member"}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SECTION 3: GA Proxy Information */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] p-6 sm:p-8 shadow-subtle space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-[#1e2f4d]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60 shadow-xs">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-sans">
                3. General Assembly (GA) Official Proxy
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Authorized representative to attend annual General Assembly meetings if owner is absent
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800/60">
            Step 3 of 4
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <Input
              label="First Name"
              placeholder="e.g. Maria Teresa"
              value={gaProxyFirstName}
              onChange={(e) => setGaProxyFirstName(e.target.value)}
            />
          </div>
          <div>
            <Input
              label="Middle Name"
              placeholder="e.g. Santos"
              value={gaProxyMiddleName}
              onChange={(e) => setGaProxyMiddleName(e.target.value)}
            />
          </div>
          <div>
            <Input
              label="Last Name"
              placeholder="e.g. Reyes"
              value={gaProxyLastName}
              onChange={(e) => setGaProxyLastName(e.target.value)}
            />
          </div>
          <div>
            <Input
              label="Suffix"
              placeholder="e.g. Jr., III"
              value={gaProxySuffix}
              onChange={(e) => setGaProxySuffix(e.target.value)}
            />
          </div>
          <div>
            <Input
              label="Birthdate"
              type="date"
              value={gaProxyBirthdate}
              onChange={(e) => setGaProxyBirthdate(e.target.value)}
            />
          </div>
          <div>
            <Select
              label="Gender"
              value={gaProxyGender}
              onChange={(e) => setGaProxyGender(e.target.value as GenderType)}
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <div>
            <Input
              label="Mobile Number"
              placeholder="0917-123-4567"
              value={gaProxyMobile}
              onChange={(e) => setGaProxyMobile(formatPhilippineMobile(e.target.value))}
              error={errors.gaProxyMobile}
              helperText="11-digit Philippine format (09XX-XXX-XXXX)"
            />
          </div>
          <div>
            <Input
              label="Email Address"
              type="email"
              placeholder="proxy@example.com"
              value={gaProxyEmail}
              onChange={(e) => setGaProxyEmail(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <div className="flex items-center gap-6">
              <div className="relative">
                {gaProxyPhotoPath && isValidImageUrl(gaProxyPhotoPath) ? (
                  <img 
                    src={gaProxyPhotoPath} 
                    alt="GA Proxy" 
                    className="h-24 w-24 rounded-full object-cover border-4 border-slate-200 dark:border-slate-700" 
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-slate-100 dark:bg-slate-800 border-4 border-slate-200 dark:border-slate-700 flex items-center justify-center">
                    <User className="h-10 w-10 text-slate-400" />
                  </div>
                )}
                <label className="absolute bottom-0 right-0 bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-full cursor-pointer">
                  <Upload className="h-4 w-4" />
                  <input type="file" accept="image/*" onChange={handleGaProxyPhotoUpload} className="hidden" />
                </label>
                {gaProxyPhotoPath && (
                  <button
                    type="button"
                    onClick={() => {
                      // Clean up blob URL if exists
                      if (gaProxyPhotoPath.startsWith('blob:')) {
                        URL.revokeObjectURL(gaProxyPhotoPath);
                      }
                      setGaProxyPhotoPath(null);
                      setGaProxyPhotoFile(null);
                    }}
                    className="absolute top-0 right-0 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">GA Proxy Photo</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Upload proxy&apos;s photo (JPG, PNG) - Max 5MB</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: Domestic Pets & Notes */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] p-6 sm:p-8 shadow-subtle space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-[#1e2f4d]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-50 dark:bg-green-950/60 text-green-800 dark:text-green-300 border border-green-200/60 dark:border-green-800/60 shadow-xs">
              <PawPrint className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-sans">
                4. Domestic Pets & Additional Notes
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Registered pets and any special considerations
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-green-800 dark:text-green-300 bg-green-50 dark:bg-green-950/60 px-2.5 py-1 rounded-lg border border-green-200 dark:border-green-800/60">
            Step 4 of 4
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <Input
              label="Pet Count"
              type="number"
              min="0"
              value={registeredPets}
              onChange={(e) => setRegisteredPets(parseInt(e.target.value) || 0)}
              helperText="Total number of dogs and/or cats"
            />
          </div>
          <div className="md:col-span-2">
            <Input
              label="Additional Notes"
              placeholder="Any additional information or special considerations"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              helperText="Any additional information or special considerations"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            className="flex-1"
          >
            {isEditing ? "Update Homeowner" : "Register Homeowner"}
          </Button>
        </div>
      </div>
    </form>
  );
}
