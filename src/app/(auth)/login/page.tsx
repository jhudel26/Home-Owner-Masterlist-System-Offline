"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/app-context";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import {
  Home,
  Lock,
  Mail,
  Shield,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { setCurrentUser } = useApp();
  const { success, error: toastError, info } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  // Forgot password modal
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // Check if setup is needed on mount
  useEffect(() => {
    const checkSetup = async () => {
      try {
        const response = await fetch("/api/auth/setup-check");
        const data = await response.json();
        if (data.needsSetup) {
          router.push("/setup");
          return;
        }
      } catch (err) {
        console.error("Setup check failed:", err);
      } finally {
        setCheckingSetup(false);
      }
    };
    checkSetup();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toastError("Required Fields", "Please enter both your email address and password.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const result = await response.json();
      if (!response.ok) {
        toastError("Authentication Failed", result.error || "Invalid email or password.");
        setLoading(false);
        return;
      }
      // Set user immediately to prevent race condition with dashboard redirect
      setCurrentUser(result.profile);
      success("Authenticated", "Welcome to the HOA Board Masterlist.");
      // Use client-side navigation to preserve AuthContext state
      router.push("/dashboard");
      return;
    } catch (err: any) {
      toastError("Error", err.message || "An unexpected error occurred during login.");
      setLoading(false);
    }
  };

  const handlePasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    info(
      "Password Reset Notice",
      "For security in this HOA Board portal, passwords can be reset by the Super Admin (President) under Settings > Account Management."
    );
    setIsResetOpen(false);
    setResetEmail("");
  };

  return (
    <div className="relative min-h-screen bg-[#1f3151] text-white flex flex-col justify-between overflow-x-hidden font-[family-name:var(--font-montserrat)] selection:bg-emerald-500 selection:text-white">
      {/* Loading state while checking setup */}
      {checkingSetup && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#1f3151]">
          <div className="h-8 w-8 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
        </div>
      )}

      {/* Top Header / Brand Identity */}
      <header className="relative w-full max-w-7xl mx-auto px-6 sm:px-12 pt-8 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 rounded-xl bg-white/10 border border-white/20 p-1 flex items-center justify-center shadow-md overflow-hidden shrink-0">
            <Image
              src="/icon.png"
              alt="Logo"
              width={40}
              height={40}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <div>
            <span className="text-xs font-bold tracking-wider uppercase text-emerald-400 block font-semibold">
              St. Joseph Village 6 Phase 4
            </span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide">
              HOA Homeowners Registry System
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0a1b38]/80 border border-slate-700/60 text-xs text-slate-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Official Board Portal</span>
        </div>
      </header>

      {/* Center Layout: Left Form + Right Illustrated 3D Scene */}
      <main className="relative w-full max-w-7xl mx-auto px-6 sm:px-12 py-10 my-auto grid grid-cols-1 lg:grid-cols-12 items-center gap-6 lg:gap-12 z-10">

        {/* LEFT COLUMN: Login Form styled exactly like reference image */}
        <div className="col-span-12 lg:col-span-5 max-w-md w-full mx-auto lg:mx-0 space-y-7 animate-slide-up">
          {/* Avatar Icon (Exact 3D circle style with cap/officer avatar) */}
          <div className="flex items-center gap-4">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#3b7b84] border-2 border-[#5da3ad] shadow-xl shadow-teal-950/40">
              {/* 3D avatar cap and face */}
              <div className="relative flex flex-col items-center">
                <div className="w-8 h-3.5 bg-[#d4975e] rounded-t-full border border-amber-800/30 shadow-xs" />
                <div className="w-9 h-1 bg-[#b57a44] rounded-full -mt-0.5" />
                <div className="w-7 h-4 bg-white rounded-b-md shadow-xs flex items-center justify-center">
                  <div className="w-4 h-1 bg-slate-300 rounded-full" />
                </div>
                <div className="w-9 h-4 bg-[#2c5f66] rounded-t-lg mt-0.5" />
              </div>
            </div>
            <div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-wider uppercase text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800/50">
                <Shield className="h-3 w-3 text-emerald-400" />
                Authorized Only
              </span>
            </div>
          </div>

          {/* Heading with classic serif/editorial display style */}
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
              Sign in
            </h1>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Enter your official administrative credentials to manage homeowner masterlist records.
            </p>
          </div>

          {/* Minimalist Underline Input Form matching reference design */}
          <form onSubmit={handleLogin} className="space-y-6 pt-2">
            {/* Email Field with clean underline */}
            <div className="space-y-1.5 group">
              <label className="block text-sm font-semibold text-white tracking-wide">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="e.g. president@sjv6phase4.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent border-0 border-b-2 border-slate-600 focus:border-sky-400 pb-2.5 pt-1 text-sm text-white placeholder:text-slate-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Password Field with clean underline & toggle */}
            <div className="space-y-1.5 group">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-white tracking-wide">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setIsResetOpen(true)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent border-0 border-b-2 border-slate-600 focus:border-sky-400 pb-2.5 pt-1 pr-10 text-sm text-white placeholder:text-slate-500 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Solid Pill/Rounded Button matching reference image */}
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
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>

            {/* Micro security note */}
            <p className="text-center text-[11px] text-slate-400 font-medium pt-2">
              Protected by 256-Bit SSL Encryption &bull; Board Portal v1.0
            </p>
          </form>
        </div>

        {/* RIGHT COLUMN: HOA Logo Display */}
        <div className="hidden lg:flex lg:col-span-7 relative items-center justify-center min-h-[460px] lg:min-h-[560px] select-none">
          {/* Background decorative element */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-[#0070d6] to-[#0052a3] rounded-3xl lg:rounded-[48px] overflow-hidden shadow-2xl"
          >
            {/* Animated gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-teal-400/20 pointer-events-none animate-pulse" />
            {/* Decorative circles */}
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl animate-blob" />
            <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-teal-400/10 rounded-full blur-3xl animate-blob delay-1000" />
          </div>

          {/* HOA Logo with enhanced effects */}
          <div className="relative z-20 flex flex-col items-center justify-center">
            <div className="relative animate-float">
              {/* Glow effect behind logo */}
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/30 to-teal-400/30 rounded-full blur-2xl animate-pulse" />
              
              {/* Logo container with shadow and highlights */}
              <div className="relative w-80 h-80 sm:w-96 sm:h-96 flex items-center justify-center">
                {/* Drop shadow */}
                <div className="absolute inset-0 bg-black/20 rounded-full blur-xl transform translate-y-4" />
                
                {/* Main logo */}
                <Image
                  src="/icon.png"
                  alt="HOA Logo"
                  width={350}
                  height={350}
                  className="relative z-10 w-full h-full object-contain drop-shadow-2xl animate-scale"
                  priority
                />
                
                {/* Highlight shine effect */}
                <div className="absolute top-4 left-4 w-20 h-20 bg-white/20 rounded-full blur-md animate-shine" />
              </div>
            </div>
            
            {/* Text with Montserrat font */}
            <div className="mt-12 text-center animate-fade-in">
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                St. Joseph Village 6
              </h2>
              <p className="text-emerald-300 font-medium mt-2 text-lg">
                Phase 4 Homeowners Association
              </p>
            </div>
          </div>
        </div>

      </main>

      {/* Footer with Developer Attribution */}
      <footer className="relative w-full max-w-7xl mx-auto px-6 sm:px-12 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 border-t border-slate-800/60 z-20">
        <p>
          &copy; {new Date().getFullYear()} St. Joseph Village 6 Phase 4 HOA Board. All rights reserved.
        </p>
        <p className="flex items-center gap-1.5 font-medium">
          <span>Developed by</span>
          <span className="text-emerald-400 font-semibold">Jhudel</span>
        </p>
      </footer>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        title="Reset Account Password"
        description="Enter your registered email address to receive password reset instructions"
        maxWidth="md"
      >
        <form onSubmit={handlePasswordReset} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                placeholder="president@sjv6phase4.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsResetOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={resetLoading} className="gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/30">
              <KeyRound className="h-4 w-4" />
              <span>Send Reset Link</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}




