"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/context/app-context";
import { Homeowner, HouseholdMember } from "@/types/database";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/layout/page-header";
import { HomeownerForm } from "@/components/homeowners/homeowner-form";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EditHomeownerPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser, homeowners, updateHomeowner } = useApp();

  const homeownerId = params?.id as string;
  const targetHomeowner = homeowners.find((h) => h.id === homeownerId);
  const canEdit = hasPermission(currentUser, "can_edit_homeowner");

  if (!canEdit) {
    return (
      <div className="p-12 text-center rounded-2xl border border-slate-200 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d]">
        <ShieldAlert className="h-12 w-12 text-red-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Permission Denied</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Your account does not have permission to edit homeowner records.
        </p>
      </div>
    );
  }

  if (!targetHomeowner) {
    return (
      <div className="p-12 text-center rounded-2xl border border-slate-200 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d] space-y-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Homeowner Record Not Found</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          The requested record ID does not exist or has been removed.
        </p>
        <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/homeowners")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Registry
        </Button>
      </div>
    );
  }

  const handleUpdate = async (
    data: Omit<Homeowner, "id" | "created_at" | "updated_at">,
    members: Omit<HouseholdMember, "id" | "homeowner_id">[],
    formData?: FormData
  ) => {
    return await updateHomeowner(homeownerId, data, members, formData);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit Homeowner: ${targetHomeowner.full_name}`}
        description={`Updating records for ${targetHomeowner.street_name || targetHomeowner.address}`}
      >
        <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/homeowners")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Registry
        </Button>
      </PageHeader>

      <HomeownerForm
        initialData={targetHomeowner}
        onSubmit={handleUpdate}
        isEditing={true}
      />
    </div>
  );
}
