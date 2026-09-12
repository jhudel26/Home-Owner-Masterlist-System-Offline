"use client";

import React, { useState, useEffect } from "react";
import { WifiOff, AlertCircle } from "lucide-react";

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Only register service worker in true production non-localhost environments
    if ("serviceWorker" in navigator) {
      const isLocalhost =
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1" ||
          window.location.hostname === "[::1]");

      if (process.env.NODE_ENV === "production" && !isLocalhost) {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      } else {
        // Automatically unregister any lingering service worker on localhost/dev
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
        }).catch(() => {});
      }
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="bg-amber-500 text-white px-4 py-2 text-xs font-medium flex items-center justify-center gap-2 shadow-md sticky top-0 z-50 animate-in slide-in-from-top duration-300">
      <WifiOff className="h-4 w-4" />
      <span>You are currently offline. Cached masterlist records remain viewable. Changes will sync once reconnected.</span>
    </div>
  );
}