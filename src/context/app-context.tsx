"use client";

import React from "react";
import { ThemeProvider, useTheme } from "./theme-context";
import { AuthProvider, useAuth } from "./auth-context";
import { DataProvider, useData } from "./data-context";

export { useTheme } from "./theme-context";
export { useAuth } from "./auth-context";
export { useData } from "./data-context";

/**
 * Composite AppProvider that mounts all isolated domain contexts:
 * Theme -> Auth -> Data
 */
export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>{children}</DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

/**
 * Unified legacy composite hook.
 * Preserves 100% backward compatibility for all existing components calling `useApp()`,
 * while allowing new or optimized components to use `useAuth()`, `useTheme()`, or `useData()`
 * to avoid unnecessary re-renders.
 */
export function useApp() {
  const theme = useTheme();
  const auth = useAuth();
  const data = useData();

  return {
    ...theme,
    ...auth,
    ...data,
  };
}
