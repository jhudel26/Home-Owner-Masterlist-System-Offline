"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Profile, UserRole, UserPermissions } from "@/types/database";
import { DEFAULT_PERMISSIONS_BY_ROLE } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/error-utils";
import { analytics } from "@/lib/monitoring/analytics";

interface AuthContextType {
  currentUser: Profile | null;
  setCurrentUser: (user: Profile | null) => void;
  allProfiles: Profile[];
  setAllProfiles: React.Dispatch<React.SetStateAction<Profile[]>>;
  fetchProfiles: () => Promise<void>;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  loadingStage: string;
  setLoadingStage: (stage: string) => void;
  isLocalDatabaseActive: boolean;
  setIsLocalDatabaseActive: (active: boolean) => void;
  logout: () => Promise<void>;
  updateUserPermissions: (userId: string, permissions: UserPermissions) => Promise<{ success: boolean; error?: string }>;
  updateUserStatus: (userId: string, status: "Active" | "Inactive") => Promise<{ success: boolean; error?: string }>;
  createUser: (userData: { full_name: string; email: string; password?: string; role: UserRole; permissions?: UserPermissions }) => Promise<{ success: boolean; error?: string; user?: Profile }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState("Connecting to local database...");
  const [isLocalDatabaseActive, setIsLocalDatabaseActive] = useState(true);

  const loadAuth = useCallback(async () => {
    setLoadingStage("Verifying session...");
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Database unavailable");
      setCurrentUser(result.authenticated ? result.currentUser : null);
      setLoadingStage("Ready");
    } catch (error) {
      console.error("Authentication initialization failed:", error);
      setCurrentUser(null);
      setLoadingStage("Database unavailable. Please check your MySQL service.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchProfiles = useCallback(async () => {
    try {
      const response = await fetch("/api/users", { cache: "no-store" });
      if (!response.ok) return;
      const result = await response.json();
      if (Array.isArray(result.profiles)) {
        setAllProfiles(result.profiles);
      }
    } catch (error) {
      console.error("Failed to load user accounts:", error);
    }
  }, []);

  useEffect(() => {
    void loadAuth();
  }, [loadAuth]);

  const logout = useCallback(async () => {
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch (error) { console.error(error); }
    setCurrentUser(null);
    window.location.href = "/login";
  }, []);

  useEffect(() => {
    analytics.setPermission(Boolean(currentUser?.permissions?.can_view_analytics));
  }, [currentUser]);

  const updateUserPermissions = useCallback(async (userId: string, permissions: UserPermissions) => {
    try {
      const response = await fetch("/api/users", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: userId, permissions }) });
      const result = await response.json();
      if (!response.ok) return { success: false, error: result.error || "Failed to update permissions." };
      setAllProfiles((prev) => prev.map((p) => p.id === userId ? result.profile : p));
      if (currentUser?.id === userId) setCurrentUser(result.profile);
      return { success: true };
    } catch (error) { return { success: false, error: getErrorMessage(error) }; }
  }, [currentUser]);

  const updateUserStatus = useCallback(async (userId: string, status: "Active" | "Inactive") => {
    try {
      const response = await fetch("/api/users", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: userId, status }) });
      const result = await response.json();
      if (!response.ok) return { success: false, error: result.error || "Failed to update status." };
      setAllProfiles((prev) => prev.map((p) => p.id === userId ? result.profile : p));
      if (currentUser?.id === userId) setCurrentUser(result.profile);
      return { success: true };
    } catch (error) { return { success: false, error: getErrorMessage(error) }; }
  }, [currentUser]);

  const createUser = useCallback(async (userData: { full_name: string; email: string; password?: string; role: UserRole; permissions?: UserPermissions }) => {
    try {
      const response = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...userData, password: userData.password || "ChangeMe123!" }) });
      const result = await response.json();
      if (!response.ok) return { success: false, error: result.error || "Failed to create user." };
      setAllProfiles((prev) => [result.profile, ...prev.filter((p) => p.id !== result.profile.id)]);
      return { success: true, user: result.profile as Profile };
    } catch (error) { return { success: false, error: getErrorMessage(error) }; }
  }, []);

  return <AuthContext.Provider value={{ currentUser, setCurrentUser, allProfiles, setAllProfiles, fetchProfiles, isLoading, setIsLoading, loadingStage, setLoadingStage, isLocalDatabaseActive, setIsLocalDatabaseActive, logout, updateUserPermissions, updateUserStatus, createUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
