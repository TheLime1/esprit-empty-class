"use client";

import { useState } from "react";
import { X } from "lucide-react";

export function DashboardBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="hidden md:block fixed bottom-4 right-4 z-50">
      <div className="relative bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg shadow-2xl border border-red-500/50 p-4 pr-10 max-w-xs">
        {/* Close button */}
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 text-white/70 hover:text-white transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="flex items-start gap-3">
          <span className="text-2xl mt-0.5">🎓</span>
          <div>
            <p className="font-bold text-sm text-white">
              ESPRIT Student Dashboard
            </p>
            <p className="text-xs text-red-100 mt-1">
              Check your grades, absences & more in one place.
            </p>
            <a
              href="https://portal.espritads.site/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 px-3 py-1 bg-black hover:bg-gray-900 text-white text-xs font-semibold rounded transition-colors"
            >
              Visit Dashboard →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
