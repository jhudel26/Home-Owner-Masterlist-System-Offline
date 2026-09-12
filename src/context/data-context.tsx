"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Homeowner, ActivityLog, HouseholdMember } from "@/types/database";
import { calculateAge } from "@/lib/utils";
import { getErrorMessage } from "@/lib/error-utils";
import { useAuth } from "./auth-context";

interface DataContextType {
  homeowners: Homeowner[];
  setHomeowners: React.Dispatch<React.SetStateAction<Homeowner[]>>;
  activityLogs: ActivityLog[];
  setActivityLogs: React.Dispatch<React.SetStateAction<ActivityLog[]>>;
  addHomeowner: (homeowner: Omit<Homeowner, "id" | "created_at" | "updated_at" | "is_active"> & { is_active?: number }, members?: Omit<HouseholdMember, "id" | "homeowner_id">[], formData?: FormData) => Promise<{ success: boolean; error?: string; data?: Homeowner }>;
  updateHomeowner: (id: string, updates: Partial<Homeowner>, members?: Omit<HouseholdMember, "id" | "homeowner_id">[], formData?: FormData) => Promise<{ success: boolean; error?: string }>;
  deleteHomeowner: (id: string) => Promise<{ success: boolean; error?: string }>;
  bulkImportHomeowners: (records: Array<{ homeowner: Omit<Homeowner, "id" | "created_at" | "updated_at" | "is_active"> & { is_active?: number }; members?: Omit<HouseholdMember, "id" | "homeowner_id">[] }>) => Promise<{ success: boolean; count: number; error?: string }>;
  exportBackupData: () => string;
  restoreBackupData: (jsonData: string) => Promise<{ success: boolean; error?: string; count?: number }>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

async function api(url: string, options?: RequestInit) {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(options?.headers || {}) }, cache: "no-store" });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status})`);
  return result;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, setIsLoading, setLoadingStage } = useAuth();
  const [homeowners, setHomeowners] = useState<Homeowner[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  const loadData = useCallback(async () => {
    setLoadingStage("Loading local masterlist records...");
    try {
      const result = await api("/api/homeowners");
      setHomeowners(Array.isArray(result.homeowners) ? result.homeowners : []);
      setActivityLogs(Array.isArray(result.activityLogs) ? result.activityLogs : []);
      setLoadingStage("Ready");
    } catch (error) {
      console.error("Failed to load local data:", error);
      setHomeowners([]);
      setActivityLogs([]);
      setLoadingStage("Start XAMPP MySQL and refresh the page.");
    } finally { setIsLoading(false); }
  }, [setIsLoading, setLoadingStage]);

  useEffect(() => {
    if (currentUser) {
      void loadData();
    } else {
      setIsLoading(false);
      setLoadingStage("Ready");
    }
  }, [currentUser, loadData]);

  const addHomeowner = useCallback(async (data: Omit<Homeowner, "id" | "created_at" | "updated_at" | "is_active"> & { is_active?: number }, members: Omit<HouseholdMember, "id" | "homeowner_id">[] = [], formData?: FormData) => {
    try {
      let result;
      if (formData) {
        // Use FormData for multipart file upload
        // Ensure age is calculated before sending
        const homeownerWithAge = { ...data, age: calculateAge(data.birthdate) };
        formData.set("homeowner", JSON.stringify(homeownerWithAge));
        
        const response = await fetch("/api/homeowners", {
          method: "POST",
          body: formData,
          cache: "no-store"
        });
        result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || `Request failed (${response.status})`);
      } else {
        // Fallback to JSON for compatibility
        result = await api("/api/homeowners", { method: "POST", body: JSON.stringify({ homeowner: { ...data, age: calculateAge(data.birthdate) }, members }) });
      }
      setHomeowners((prev) => [result.homeowner, ...prev]);
      if (result.activity) setActivityLogs((prev) => [result.activity, ...prev]);
      return { success: true, data: result.homeowner as Homeowner };
    } catch (error) { return { success: false, error: getErrorMessage(error) }; }
  }, [calculateAge]);

  const updateHomeowner = useCallback(async (id: string, updates: Partial<Homeowner>, members?: Omit<HouseholdMember, "id" | "homeowner_id">[], formData?: FormData) => {
    try {
      let result;
      if (formData) {
        // Use FormData for multipart file upload
        // Ensure age is calculated before sending
        const updatesWithAge = { ...updates, age: updates.birthdate ? calculateAge(updates.birthdate) : updates.age };
        formData.set("homeowner", JSON.stringify(updatesWithAge));
        
        const response = await fetch(`/api/homeowners/${id}`, {
          method: "PUT",
          body: formData,
          cache: "no-store"
        });
        result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || `Request failed (${response.status})`);
      } else {
        // Fallback to JSON for compatibility
        result = await api(`/api/homeowners/${id}`, { method: "PUT", body: JSON.stringify({ homeowner: { ...updates, age: updates.birthdate ? calculateAge(updates.birthdate) : updates.age }, members }) });
      }
      setHomeowners((prev) => prev.map((h) => h.id === id ? result.homeowner : h));
      if (result.activity) setActivityLogs((prev) => [result.activity, ...prev]);
      return { success: true };
    } catch (error) { return { success: false, error: getErrorMessage(error) }; }
  }, [calculateAge]);

  const deleteHomeowner = useCallback(async (id: string) => {
    try {
      const result = await api(`/api/homeowners/${id}`, { method: "DELETE" });
      setHomeowners((prev) => prev.map((h) => h.id === id ? { ...h, status: "Inactive" } : h));
      if (result.activity) setActivityLogs((prev) => [result.activity, ...prev]);
      return { success: true };
    } catch (error) { return { success: false, error: getErrorMessage(error) }; }
  }, []);

  const bulkImportHomeowners = useCallback(async (records: Array<{ homeowner: Omit<Homeowner, "id" | "created_at" | "updated_at" | "is_active"> & { is_active?: number }; members?: Omit<HouseholdMember, "id" | "homeowner_id">[] }>) => {
    let count = 0;
    for (const item of records) { const result = await addHomeowner(item.homeowner, item.members || []); if (result.success) count++; }
    return { success: count === records.length, count, error: count === records.length ? undefined : `Imported ${count} of ${records.length} records.` };
  }, [addHomeowner]);

  const exportBackupData = useCallback(() => JSON.stringify({ version: "2.0", database: "mysql", exported_at: new Date().toISOString(), homeowners, activityLogs }, null, 2), [homeowners, activityLogs]);

  const restoreBackupData = useCallback(async (jsonData: string) => {
    try {
      const parsed = JSON.parse(jsonData);
      if (!Array.isArray(parsed.homeowners)) return { success: false, error: "Invalid backup format. Expected homeowners list." };
      const result = await api("/api/homeowners/backup", { method: "POST", body: jsonData });
      setHomeowners(parsed.homeowners);
      if (Array.isArray(parsed.activityLogs)) setActivityLogs(parsed.activityLogs);
      return { success: true, count: result.count ?? parsed.homeowners.length };
    } catch (error) { return { success: false, error: getErrorMessage(error) }; }
  }, []);

  return <DataContext.Provider value={{ homeowners, setHomeowners, activityLogs, setActivityLogs, addHomeowner, updateHomeowner, deleteHomeowner, bulkImportHomeowners, exportBackupData, restoreBackupData }}>{children}</DataContext.Provider>;
}

export function useData() { const context = useContext(DataContext); if (!context) throw new Error("useData must be used within a DataProvider"); return context; }
