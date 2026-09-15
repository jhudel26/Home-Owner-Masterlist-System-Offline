"use client";

import { useEffect, useState, useRef } from "react";

export function ConsoleWarning() {
  const [showWarning, setShowWarning] = useState(false);
  const hasLogged = useRef(false);

  useEffect(() => {
    // Always log warning to console on mount (like Facebook)
    if (!hasLogged.current) {
      hasLogged.current = true;
    console.log(
      "%c⚠️ STOP! ⚠️",
      "color: red; font-size: 40px; font-weight: bold;"
    );
    console.log(
      "%cThis is a browser feature intended for developers.",
      "color: orange; font-size: 16px;"
    );
    console.log(
      "%cIf someone told you to copy-paste something here to enable a feature or &quot;hack&quot; an account, it&apos;s a scam and will give them access to your account.",
      "color: red; font-size: 14px;"
    );
    console.log(
      "%cPasting code here can give attackers access to your account and sensitive data.",
      "color: red; font-size: 14px;"
    );
    console.log(
      "%cFor more information, visit: https://developer.mozilla.org/en-US/docs/Tools/Console",
      "color: blue; font-size: 12px;"
    );
    }

    let devtools = { open: false };
    const threshold = 160;

    const detectDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        if (!devtools.open) {
          devtools.open = true;
          setShowWarning(true);
          console.log(
            "%c⚠️ STOP! ⚠️",
            "color: red; font-size: 40px; font-weight: bold;"
          );
          console.log(
            "%cThis is a browser feature intended for developers.",
            "color: orange; font-size: 16px;"
          );
          console.log(
            "%cIf someone told you to copy-paste something here to enable a feature or hack an account, its a scam.",
            "color: red; font-size: 14px;"
          );
          console.log(
            "%cPasting code here can give attackers access to your account and sensitive data.",
            "color: red; font-size: 14px;"
          );
          console.log(
            "%cFor more information, visit: https://developer.mozilla.org/en-US/docs/Tools/Console",
            "color: blue; font-size: 12px;"
          );
        }
      } else {
        devtools.open = false;
        setShowWarning(false);
      }
    };

    const checkInterval = setInterval(detectDevTools, 1000);

    return () => clearInterval(checkInterval);
  }, []);

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-2xl border-2 border-red-500 shadow-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">
            ⚠️ STOP!
          </h2>
        </div>

        <div className="space-y-3 text-slate-700 dark:text-slate-300">
          <p className="text-sm font-medium">
            This is a browser feature intended for developers.
          </p>
          <p className="text-sm">
            If someone told you to copy-paste something here to enable a feature or &quot;hack&quot; an account, it&apos;s a scam and will give them access to your account.
          </p>
          <p className="text-sm">
            Pasting code into the browser console can give attackers access to your account and sensitive data.
          </p>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setShowWarning(false)}
            className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
          >
            I Understand, Close This Warning
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          For more information, visit{" "}
          <a
            href="https://developer.mozilla.org/en-US/docs/Tools/Console"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            MDN Web Docs - Browser Console
          </a>
        </p>
      </div>
    </div>
  );
}
