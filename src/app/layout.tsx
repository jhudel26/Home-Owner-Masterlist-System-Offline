import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/context/app-context";
import { ToastProvider } from "@/components/ui/toast";
import { LocalAnalytics } from "@/components/analytics/local-analytics";



export const metadata: Metadata = {
  title: "St. Joseph Village 6 Phase 4 — Homeowners Masterlist",
  description: "Official Homeowners Association Registry and Resident Information System",
  icons: {
    icon: [
      { url: "/icon.png" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 dark:bg-[#060c18] font-sans transition-colors duration-200">
        <AppProvider>
          <ToastProvider>{children}</ToastProvider>
          <LocalAnalytics />
        </AppProvider>
      </body>
    </html>
  );
}
