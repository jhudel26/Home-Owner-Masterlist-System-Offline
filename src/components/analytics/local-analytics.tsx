"use client";

import { useEffect } from "react";

// Simple UUID v4 generator
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function LocalAnalytics() {
  useEffect(() => {
    // Generate or retrieve visitor ID
    let visitorId = localStorage.getItem("visitor_id");
    if (!visitorId) {
      visitorId = generateUUID();
      localStorage.setItem("visitor_id", visitorId);
    }

    // Track page view
    const trackPageView = () => {
      fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "page_view",
          path: window.location.pathname,
          visitorId,
        }),
      }).catch(() => {
        // Silently fail - analytics shouldn't break the app
      });
    };

    // Track initial page view
    trackPageView();

    // Track route changes for SPA navigation
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      originalPushState.apply(history, args);
      setTimeout(trackPageView, 0);
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(history, args);
      setTimeout(trackPageView, 0);
    };

    // Listen to popstate (back/forward buttons)
    window.addEventListener("popstate", trackPageView);

    return () => {
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      window.removeEventListener("popstate", trackPageView);
    };
  }, []);

  return null; // This component doesn't render anything
}
