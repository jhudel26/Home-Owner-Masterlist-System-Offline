"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Command, Keyboard } from "lucide-react";

export function KeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "?" || (e.key === "/" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const shortcuts = [
    { key: "/", desc: "Focus search bar in masterlist" },
    { key: "?", desc: "Open this keyboard shortcuts cheatsheet" },
    { key: "Esc", desc: "Close any active modal or dropdown" },
    { key: "Alt + T", desc: "Toggle Dark / Light theme mode" },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title="Keyboard Shortcuts"
      description="Quick navigation shortcuts for HOA Board Officers and Staff"
      maxWidth="md"
    >
      <div className="space-y-3">
        <div className="rounded-2xl border border-slate-100 dark:border-[#1e2f4d] divide-y divide-slate-100 dark:divide-[#1e2f4d] overflow-hidden">
          {shortcuts.map((s, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 text-xs">
              <span className="text-slate-600 dark:text-slate-300">{s.desc}</span>
              <kbd className="px-2.5 py-1 text-[11px] font-mono font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center">
          Press <kbd className="px-1 bg-slate-100 dark:bg-slate-800 rounded font-mono">Esc</kbd> anytime to close this helper.
        </p>
      </div>
    </Modal>
  );
}