import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Accurately calculate age from birthdate string (YYYY-MM-DD) or Date
 */
export function calculateAge(birthdate: string | Date | null | undefined): number {
  if (!birthdate) return 0;
  const birth = new Date(birthdate);
  if (isNaN(birth.getTime())) return 0;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return Math.max(0, age);
}

/**
 * Format date string into human readable 'MMM D, YYYY'
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Format timestamp into 'MMM D, YYYY h:mm A'
 */
export function formatDateTime(dateTimeString: string | null | undefined): string {
  if (!dateTimeString) return "—";
  try {
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) return dateTimeString;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return dateTimeString;
  }
}

/**
 * Format mobile phone number into standard Philippine format (09XX-XXX-XXXX)
 */
export function formatPhilippineMobile(val: string): string {
  const digits = val.replace(/\D/g, "");
  if (!digits) return "";
  
  // Format as 09XX-XXX-XXXX
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7, 11)}`;
}

export function isValidEmail(email: string): boolean {
  if (!email) return true; // optional field
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhilippineMobile(mobile: string): boolean {
  if (!mobile) return true; // optional field
  const cleaned = mobile.replace(/\D/g, "");
  return /^09\d{9}$/.test(cleaned) || /^639\d{9}$/.test(cleaned);
}
