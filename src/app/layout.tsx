import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/context/app-context";
import { ToastProvider } from "@/components/ui/toast";
import { LocalAnalytics } from "@/components/analytics/local-analytics";
import { Montserrat } from "next/font/google";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-montserrat",
});



export const metadata: Metadata = {
  title: "Residential Masterlist — Homeowners Masterlist",
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
      <body className={`${montserrat.variable} min-h-screen bg-slate-50 dark:bg-[#060c18] transition-colors duration-200 font-sans`}>
        <AppProvider>
          <ToastProvider>{children}</ToastProvider>
          <LocalAnalytics />
        </AppProvider>
      </body>
    </html>
  );
}
