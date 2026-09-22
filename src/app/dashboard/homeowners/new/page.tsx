"use client";

import React from "react";
import { useApp } from "@/context/app-context";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/layout/page-header";
import { HomeownerForm } from "@/components/homeowners/homeowner-form";
import { ShieldAlert } from "lucide-react";

export default function NewHomeownerPage() {
  const { currentUser, addHomeowner } = useApp();
  const canCreate = hasPermission(currentUser, "can_create_homeowner");

  if (!canCreate) {
    return (
      <div className="p-12 text-center rounded-2xl border border-slate-200 dark:border-[#1e2f4d] bg-white dark:bg-[#0e192d]">
        <ShieldAlert className="h-12 w-12 text-red-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Permission Denied</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Your account does not have permission to register new homeowners.
        </p>
      </div>
    );
  }

  const handleSubmit = async (
    data: any,
    members: any[],
    formData?: FormData
  ) => {
    return await addHomeowner(data, members, formData);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Register New Homeowner"
        description="Add a new resident or property owner to the records"
      />

      <HomeownerForm onSubmit={handleSubmit} />
    </div>
  );
}
