"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  RotateCcw,
} from "lucide-react";

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  title?: string;
  subtitle?: string;
}

export function ImageViewerModal({
  isOpen,
  onClose,
  imageUrl,
  title,
  subtitle,
}: ImageViewerModalProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Reset transforms when modal opens or image changes
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setRotation(0);
    }
  }, [isOpen, imageUrl]);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setScale(1);
    setRotation(0);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleDownload = async () => {
    if (!imageUrl) return;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const filename = title
        ? `${title.toLowerCase().replace(/[^a-z0-9]/gi, "_")}_photo.jpg`
        : "downloaded_image.jpg";
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      // Fallback: open in new tab
      window.open(imageUrl, "_blank");
    }
  };

  // Keyboard controls
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "+" || e.key === "=") {
        setScale((prev) => Math.min(prev + 0.25, 3));
      } else if (e.key === "-" || e.key === "_") {
        setScale((prev) => Math.max(prev - 0.25, 0.5));
      } else if (e.key === "0") {
        handleResetZoom();
      } else if (e.key.toLowerCase() === "r") {
        handleRotate();
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-black/90 backdrop-blur-md p-4 sm:p-6 transition-all animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top Bar: Title & Controls */}
      <div
        className="w-full max-w-5xl flex items-center justify-between z-10 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title / Subtitle Badge */}
        <div className="flex items-center gap-3">
          <div className="bg-white/10 dark:bg-slate-900/70 backdrop-blur-md border border-white/20 px-4 py-2 rounded-2xl shadow-lg">
            <h4 className="text-sm font-bold text-white leading-tight">
              {title || "Enlarged Image View"}
            </h4>
            {subtitle && (
              <p className="text-[11px] text-slate-300 mt-0.5">{subtitle}</p>
            )}
          </div>
          <span className="hidden sm:inline-flex text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-xl">
            {Math.round(scale * 100)}%
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 bg-white/10 dark:bg-slate-900/80 backdrop-blur-md border border-white/20 p-1.5 rounded-2xl shadow-xl">
          <button
            onClick={handleZoomIn}
            className="p-2 text-slate-200 hover:text-white hover:bg-white/15 rounded-xl transition-colors cursor-pointer"
            title="Zoom In (+)"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 text-slate-200 hover:text-white hover:bg-white/15 rounded-xl transition-colors cursor-pointer"
            title="Zoom Out (-)"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-2 text-slate-200 hover:text-white hover:bg-white/15 rounded-xl transition-colors text-xs font-semibold cursor-pointer"
            title="Reset Zoom (0)"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={handleRotate}
            className="p-2 text-slate-200 hover:text-white hover:bg-white/15 rounded-xl transition-colors cursor-pointer"
            title="Rotate 90° (R)"
          >
            <RotateCw className="h-4 w-4" />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 text-emerald-400 hover:text-emerald-300 hover:bg-white/15 rounded-xl transition-colors cursor-pointer"
            title="Download Image"
          >
            <Download className="h-4 w-4" />
          </button>
          <div className="w-[1px] h-5 bg-white/20 mx-1" />
          <button
            onClick={onClose}
            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-xl transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Image Container */}
      <div
        className="relative flex-1 w-full flex items-center justify-center overflow-hidden my-4 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="transition-transform duration-200 ease-out flex items-center justify-center select-none"
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
          }}
        >
          <img
            src={imageUrl}
            alt={title || "Enlarged preview"}
            className="max-w-[85vw] max-h-[75vh] object-contain rounded-2xl shadow-2xl border border-white/10 ring-1 ring-black/40"
            draggable={false}
          />
        </div>
      </div>

      {/* Bottom Hint */}
      <div
        className="w-full max-w-md text-center z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[11px] text-slate-400 bg-black/40 backdrop-blur-xs py-1.5 px-3 rounded-full inline-block border border-white/10">
          Tip: Press <kbd className="text-white font-mono font-bold">Esc</kbd> to close &bull; <kbd className="text-white font-mono font-bold">+</kbd>/<kbd className="text-white font-mono font-bold">-</kbd> to zoom &bull; <kbd className="text-white font-mono font-bold">R</kbd> to rotate
        </p>
      </div>
    </div>
  );
}
