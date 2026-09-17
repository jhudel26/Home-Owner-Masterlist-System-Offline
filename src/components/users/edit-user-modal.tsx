"use client";

import React, { useState, useEffect } from "react";
import { Profile } from "@/types/database";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/components/ui/badge";
import { Eye, EyeOff, Check, User, Mail, KeyRound } from "lucide-react";

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: Profile | null;
  onSave: (userId: string, data: { full_name?: string; email?: string; password?: string }) => Promise<{ success: boolean; error?: string }>;
}

export function EditUserModal({ isOpen, onClose, targetUser, onSave }: EditUserModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (targetUser) {
      setFullName(targetUser.full_name || "");
      setEmail(targetUser.email || "");
      setPassword("");
      setConfirmPassword("");
      setErrors({});
    }
  }, [targetUser]);

  if (!targetUser) return null;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.full_name = "Full name is required.";
    if (!email.trim()) errs.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = "Please enter a valid email address.";
    if (password) {
      if (password.length < 8) errs.password = "Password must be at least 8 characters.";
      if (password !== confirmPassword) errs.confirmPassword = "Passwords do not match.";
    }
    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSaving(true);
    try {
      const payload: { full_name?: string; email?: string; password?: string } = {
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
      };
      if (password.trim()) {
        payload.password = password;
      }

      const res = await onSave(targetUser.id, payload);
      if (res.success) {
        onClose();
      } else {
        setErrors({ general: res.error || "Failed to save changes." });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit User Account"
      description={`Update account details for ${targetUser.full_name}`}
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* User Info Bar */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-[#0a1526] border border-slate-200 dark:border-[#1e2f4d]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#07162c] text-emerald-300 border border-emerald-500/20 font-bold flex items-center justify-center text-sm shadow-xs">
              {targetUser.full_name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{targetUser.full_name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{targetUser.email || "No email"}</p>
            </div>
          </div>
          <RoleBadge role={targetUser.role} />
        </div>

        {/* General Error */}
        {errors.general && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 text-xs text-red-700 dark:text-red-300 font-semibold">
            {errors.general}
          </div>
        )}

        {/* Full Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-slate-500" />
            Full Name
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => { setFullName(e.target.value); setErrors((prev) => ({ ...prev, full_name: "" })); }}
            placeholder="Enter full name..."
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-[#1e2f4d] bg-slate-50/70 dark:bg-[#0c182c] focus:bg-white dark:focus:bg-[#0e192d] focus:border-emerald-500 dark:focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />
          {errors.full_name && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.full_name}</p>}
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-slate-500" />
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErrors((prev) => ({ ...prev, email: "" })); }}
            placeholder="Enter email address..."
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-[#1e2f4d] bg-slate-50/70 dark:bg-[#0c182c] focus:bg-white dark:focus:bg-[#0e192d] focus:border-emerald-500 dark:focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />
          {errors.email && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.email}</p>}
        </div>

        {/* Password Section */}
        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-[#1e2f4d]">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-slate-400" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Change Password</p>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">(leave blank to keep current password)</span>
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((prev) => ({ ...prev, password: "", confirmPassword: "" })); }}
                placeholder="Enter new password..."
                className="w-full pr-10 px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-[#1e2f4d] bg-slate-50/70 dark:bg-[#0c182c] focus:bg-white dark:focus:bg-[#0e192d] focus:border-emerald-500 dark:focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-600 dark:text-red-400">{errors.password}</p>}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setErrors((prev) => ({ ...prev, confirmPassword: "" })); }}
                placeholder="Confirm new password..."
                className="w-full pr-10 px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-[#1e2f4d] bg-slate-50/70 dark:bg-[#0c182c] focus:bg-white dark:focus:bg-[#0e192d] focus:border-emerald-500 dark:focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-xs text-red-600 dark:text-red-400">{errors.confirmPassword}</p>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-[#1e2f4d]">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            isLoading={saving}
            className="gap-1.5 font-bold shadow-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-600/30"
          >
            <Check className="h-4 w-4" />
            <span>Save Changes</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
