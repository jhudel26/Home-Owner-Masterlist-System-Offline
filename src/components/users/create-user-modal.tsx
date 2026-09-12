"use client";

import React, { useState } from "react";
import { UserRole } from "@/types/database";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { UserPlus, Lock, ShieldCheck } from "lucide-react";
import { CreateUserSchema } from "@/lib/validations/schemas";
import { formatZodFieldErrors } from "@/lib/error-utils";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    full_name: string;
    email: string;
    password?: string;
    role: UserRole;
  }) => Promise<{ success: boolean; error?: string }>;
}

export function CreateUserModal({ isOpen, onClose, onCreate }: CreateUserModalProps) {
  const { success, error: toastError } = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const result = CreateUserSchema.safeParse({
      full_name: fullName.trim(),
      email: email.trim(),
      password,
      role,
    });

    if (!result.success) {
      setErrors(formatZodFieldErrors(result.error));
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await onCreate({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        role,
      });

      if (res.success) {
        success("Account Created", `Account for ${fullName} has been successfully created.`);
        setFullName("");
        setEmail("");
        setPassword("");
        setRole("user");
        onClose();
      } else {
        toastError("Creation Failed", res.error || "Could not create user account.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create HOA Staff / Officer Account"
      description="Register an authorized board member, officer, or staff account"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Name"
          required
          placeholder="e.g. Atty. Roberto Tan"
          value={fullName}
          onChange={(e) => {
            setFullName(e.target.value);
            if (errors.full_name) setErrors((prev) => ({ ...prev, full_name: "" }));
          }}
          error={errors.full_name}
        />

        <Input
          label="Email Address"
          type="email"
          required
          placeholder="e.g. roberto.tan@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
          }}
          error={errors.email}
          helperText="Used for system authentication and board correspondence"
        />

        <Input
          label="Account Password"
          type="password"
          required
          placeholder="••••••••"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
          }}
          error={errors.password}
          icon={<Lock className="h-4 w-4" />}
          helperText="Minimum 8 characters with at least one uppercase letter and number"
        />

        <Select
          label="Assigned Role"
          required
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          helperText="Role permissions can be fine-tuned anytime after creation"
        >
          <option value="admin">Admin (Board Member / Officer)</option>
          <option value="user">User (Staff / Volunteer / View-only)</option>
        </Select>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-[#1e2f4d]">
          <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={loading} className="gap-1.5">
            <UserPlus className="h-4 w-4" />
            <span>Create Account</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
