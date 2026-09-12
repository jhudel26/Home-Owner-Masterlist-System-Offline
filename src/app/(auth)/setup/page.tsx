"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  Home,
  Shield,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  CheckCircle,
} from "lucide-react";

export default function SetupPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "success">("form");

  useEffect(() => {
    // Check if setup is still needed
    checkSetupNeeded();
  }, []);

  const checkSetupNeeded = async () => {
    try {
      const response = await fetch("/api/auth/setup-check");
      const data = await response.json();
      if (!data.needsSetup) {
        router.push("/login");
      }
    } catch (err) {
      console.error("Setup check failed:", err);
    }
  };

  const validateForm = () => {
    if (!fullName.trim()) {
      toastError("Required Field", "Please enter your full name.");
      return false;
    }
    if (!email.trim()) {
      toastError("Required Field", "Please enter your email address.");
      return false;
    }
    if (!email.includes("@") || !email.includes(".")) {
      toastError("Invalid Email", "Please enter a valid email address.");
      return false;
    }
    if (!password) {
      toastError("Required Field", "Please enter a password.");
      return false;
    }
    if (password.length < 8) {
      toastError("Weak Password", "Password must be at least 8 characters long.");
      return false;
    }
    if (password !== confirmPassword) {
      toastError("Password Mismatch", "Passwords do not match.");
      return false;
    }
    return true;
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          password,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        toastError("Setup Failed", result.error || "Could not create admin account.");
        setLoading(false);
        return;
      }
      setStep("success");
      success("Setup Complete", "Your admin account has been created successfully.");
    } catch (err: any) {
      toastError("Error", err.message || "An unexpected error occurred during setup.");
      setLoading(false);
    }
  };

  if (step === "success") {
    return (
      <div className="relative min-h-screen bg-[#1f3151] text-white flex flex-col justify-between overflow-x-hidden font-sans selection:bg-teal-500 selection:text-white">
        {/* Top Header */}
        <header className="relative w-full max-w-7xl mx-auto px-6 sm:px-12 pt-8 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shadow-md shadow-teal-900/30">
              <Home className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs font-bold tracking-wider uppercase text-teal-300 block">
                St. Joseph Village 6 Phase 4
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide">
                HOA Homeowners Registry System
              </span>
            </div>
          </div>
        </header>

        {/* Success Content */}
        <main className="relative w-full max-w-7xl mx-auto px-6 sm:px-12 py-10 my-auto z-10">
          <div className="max-w-md mx-auto text-center space-y-8">
            <div className="flex justify-center">
              <div className="h-24 w-24 rounded-full bg-teal-500/20 border-2 border-teal-400/30 flex items-center justify-center text-teal-300 shadow-lg shadow-teal-900/40">
                <CheckCircle className="h-12 w-12" />
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-serif tracking-tight text-white mb-4">
                Setup Complete!
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                Your admin account has been created successfully. You can now sign in to manage the homeowner masterlist.
              </p>
            </div>
            <Button
              onClick={() => router.push("/login")}
              className="w-full h-12 rounded-xl bg-[#0077d8] hover:bg-[#0088f5] text-white font-bold text-sm tracking-wide shadow-lg shadow-sky-950/60 flex items-center justify-center gap-2"
            >
              <span>Proceed to Login</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </main>

        {/* Footer */}
        <footer className="relative w-full max-w-7xl mx-auto px-6 sm:px-12 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 border-t border-slate-800/60 z-20">
          <p>
            &copy; {new Date().getFullYear()} St. Joseph Village 6 Phase 4 HOA Board. All rights reserved.
          </p>
          <p className="flex items-center gap-1.5 font-medium">
            <span>Developed by</span>
            <span className="text-teal-300 font-semibold">Jhudel</span>
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#1f3151] text-white flex flex-col justify-between overflow-x-hidden font-sans selection:bg-teal-500 selection:text-white">
      {/* Top Header */}
      <header className="relative w-full max-w-7xl mx-auto px-6 sm:px-12 pt-8 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shadow-md shadow-teal-900/30">
            <Home className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-bold tracking-wider uppercase text-teal-300 block">
              St. Joseph Village 6 Phase 4
            </span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide">
              HOA Homeowners Registry System
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0a1b38]/80 border border-slate-700/60 text-xs text-slate-300">
          <Sparkles className="h-3 w-3 text-teal-400" />
          <span>Initial Setup</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative w-full max-w-7xl mx-auto px-6 sm:px-12 py-10 my-auto z-10">
        <div className="max-w-md mx-auto space-y-8">
          {/* Icon */}
          <div className="flex items-center gap-4">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#3b7b84] border-2 border-[#5da3ad] shadow-xl shadow-teal-950/40">
              <Shield className="h-8 w-8 text-teal-200" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-wider uppercase text-teal-400 bg-teal-950/60 px-2.5 py-0.5 rounded-full border border-teal-800/50">
                <Sparkles className="h-3 w-3 text-teal-300" />
                First-Time Setup
              </span>
            </div>
          </div>

          {/* Heading */}
          <div>
            <h1 className="text-4xl font-serif tracking-tight text-white mb-2">
              Create Admin Account
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              Set up your administrator account to manage the St. Joseph Village 6 Phase 4 homeowner masterlist.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSetup} className="space-y-5 pt-2">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-white tracking-wide">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Juan Dela Cruz"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-slate-600 bg-[#0a1b38]/50 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-white tracking-wide">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="e.g. admin@sjv6phase4.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-slate-600 bg-[#0a1b38]/50 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-white tracking-wide">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-10 rounded-xl border border-slate-600 bg-[#0a1b38]/50 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400">Must be at least 8 characters long</p>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-white tracking-wide">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-10 rounded-xl border border-slate-600 bg-[#0a1b38]/50 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-[#0077d8] hover:bg-[#0088f5] active:scale-[0.99] text-white font-bold text-sm tracking-wide shadow-lg shadow-sky-950/60 flex items-center justify-center gap-2 transition-all disabled:opacity-60"
              >
                {loading ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Create Admin Account</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>

            {/* Note */}
            <p className="text-center text-[11px] text-slate-400 font-medium pt-2">
              This account will have full administrative access to the system
            </p>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative w-full max-w-7xl mx-auto px-6 sm:px-12 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 border-t border-slate-800/60 z-20">
        <p>
          &copy; {new Date().getFullYear()} St. Joseph Village 6 Phase 4 HOA Board. All rights reserved.
        </p>
        <p className="flex items-center gap-1.5 font-medium">
          <span>Developed by</span>
          <span className="text-teal-300 font-semibold">Jhudel</span>
        </p>
      </footer>
    </div>
  );
}
