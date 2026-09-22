"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
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
  Upload,
  Building2,
  X,
} from "lucide-react";

export default function SetupPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [villageName, setVillageName] = useState("");
  const [villageLogo, setVillageLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "success">("form");
  const [displayVillageName, setDisplayVillageName] = useState("Residential Masterlist");

  // Update display name as user types
  useEffect(() => {
    if (villageName.trim()) {
      setDisplayVillageName(villageName.trim());
    }
  }, [villageName]);

  useEffect(() => {
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

    checkSetupNeeded();
  }, [router]);

  const validateForm = () => {
    if (!villageName.trim()) {
      toastError("Required Field", "Please enter the village name.");
      return false;
    }
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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toastError("Invalid File", "Please upload an image file (PNG, JPG, etc.).");
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toastError("File Too Large", "Please upload an image smaller than 5MB.");
        return;
      }
      setVillageLogo(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setVillageLogo(null);
    setLogoPreview(null);
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("village_name", villageName.trim());
      formData.append("full_name", fullName.trim());
      formData.append("email", email.trim());
      formData.append("password", password);
      if (villageLogo) {
        formData.append("village_logo", villageLogo);
      }

      const response = await fetch("/api/auth/setup", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) {
        toastError("Setup Failed", result.error || "Could not create admin account.");
        setLoading(false);
        return;
      }
      setStep("success");
      success("Setup Complete", "Your admin account and village settings have been created successfully.");
    } catch (err: any) {
      toastError("Error", err.message || "An unexpected error occurred during setup.");
      setLoading(false);
    }
  };

  if (step === "success") {
    return (
      <div className="relative min-h-screen bg-[#1f3151] text-white flex flex-col justify-between overflow-x-hidden font-sans selection:bg-emerald-500 selection:text-white">
        {/* Top Header */}
        <header className="relative w-full max-w-7xl mx-auto px-6 sm:px-12 pt-8 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 rounded-xl bg-white/10 border border-white/20 p-1 flex items-center justify-center shadow-md overflow-hidden shrink-0">
              <Image
                src={logoPreview || "/icon.png"}
                alt="Logo"
                width={40}
                height={40}
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <div>
              <span className="text-xs font-bold tracking-wider uppercase text-emerald-400 block">
                {displayVillageName}
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
              <div className="h-24 w-24 rounded-full bg-emerald-500/20 border-2 border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950/50">
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
            &copy; {new Date().getFullYear()} {displayVillageName}. All rights reserved.
          </p>
          <p className="flex items-center gap-1.5 font-medium">
            <span>Developed by</span>
            <span className="text-emerald-400 font-semibold">Jhudel</span>
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#1f3151] text-white flex flex-col justify-between overflow-x-hidden font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <header className="relative w-full max-w-7xl mx-auto px-6 sm:px-12 pt-8 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 rounded-xl bg-white/10 border border-white/20 p-1 flex items-center justify-center shadow-md overflow-hidden shrink-0">
            <Image
              src={logoPreview || "/icon.png"}
              alt="Logo"
              width={40}
              height={40}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <div>
            <span className="text-xs font-bold tracking-wider uppercase text-emerald-400 block">
              {displayVillageName}
            </span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide">
              HOA Homeowners Registry System
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0a1b38]/80 border border-slate-700/60 text-xs text-slate-300">
          <Sparkles className="h-3 w-3 text-emerald-400" />
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
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-wider uppercase text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800/50">
                <Sparkles className="h-3 w-3 text-emerald-400" />
                First-Time Setup
              </span>
            </div>
          </div>

          {/* Heading */}
          <div>
            <h1 className="text-4xl font-serif tracking-tight text-white mb-2">
              Village Setup
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              Configure your village name and logo, then create your administrator account.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSetup} className="space-y-5 pt-2">
            {/* Village Name */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-white tracking-wide">
                Village Name
              </label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Residential Masterlist"
                  value={villageName}
                  onChange={(e) => setVillageName(e.target.value)}
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-slate-600 bg-[#0a1b38]/50 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* Village Logo Upload */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-white tracking-wide">
                Village Logo (Optional)
              </label>
              <div className="relative">
                {logoPreview ? (
                  <div className="relative h-32 rounded-xl border-2 border-emerald-500/30 bg-[#0a1b38]/50 overflow-hidden">
                    <Image
                      src={logoPreview}
                      alt="Logo preview"
                      fill
                      className="object-contain"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute top-2 right-2 h-8 w-8 rounded-full bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative h-32 rounded-xl border-2 border-dashed border-slate-600 bg-[#0a1b38]/30 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500/50 hover:bg-[#0a1b38]/50 transition-all">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Upload className="h-8 w-8 text-slate-400 mb-2" />
                    <p className="text-xs text-slate-400 text-center px-4">
                      Click to upload village logo<br />
                      <span className="text-[10px] text-slate-500">PNG, JPG (max 5MB)</span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#1f3151] px-3 text-xs text-slate-400 font-medium">Admin Account</span>
              </div>
            </div>

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
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-slate-600 bg-[#0a1b38]/50 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
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
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-slate-600 bg-[#0a1b38]/50 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
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
                  className="w-full h-11 pl-10 pr-10 rounded-xl border border-slate-600 bg-[#0a1b38]/50 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
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
                  className="w-full h-11 pl-10 pr-10 rounded-xl border border-slate-600 bg-[#0a1b38]/50 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
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
                    <span>Complete Setup</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>

            {/* Note */}
            <p className="text-center text-[11px] text-slate-400 font-medium pt-2">
              This will configure your village settings and create the admin account
            </p>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative w-full max-w-7xl mx-auto px-6 sm:px-12 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 border-t border-slate-800/60 z-20">
        <p>
          &copy; {new Date().getFullYear()} {displayVillageName}. All rights reserved.
        </p>
        <p className="flex items-center gap-1.5 font-medium">
          <span>Developed by</span>
          <span className="text-emerald-400 font-semibold">Jhudel</span>
        </p>
      </footer>
    </div>
  );
}

