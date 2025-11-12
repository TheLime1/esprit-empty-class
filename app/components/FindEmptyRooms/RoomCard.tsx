"use client";

import { MapPin, CheckCircle2, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

interface RoomCardProps {
  roomId: string;
  name: string;
  building: string;
  capacity: number;
  features: string[];
  freeFrom: string;
  freeUntil: string;
  coords?: { lat: number; lng: number };
  onNavigate?: (coords: { lat: number; lng: number }) => void;
  isWarning?: boolean; // For FREEWARNING rooms (soutenance risk)
}

function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return isoString;
  }
}

const featureIcons: Record<string, string> = {
  projector: "🎥",
  whiteboard: "📋",
  ac: "❄️",
  computers: "💻",
  accessibility: "♿",
};

export function RoomCard({
  name,
  building,
  features,
  freeFrom,
  freeUntil,
  coords,
  onNavigate,
  isWarning = false,
}: Readonly<RoomCardProps>) {
  // Different colors for warning vs normal free rooms
  const bgClass = isWarning
    ? "from-yellow-50 via-amber-50 to-orange-50 dark:from-yellow-950/40 dark:via-amber-950/40 dark:to-orange-950/40"
    : "from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950/40 dark:via-teal-950/40 dark:to-cyan-950/40";

  const borderClass = isWarning
    ? "border-yellow-200/50 dark:border-yellow-800/50 hover:border-yellow-400 dark:hover:border-yellow-600"
    : "border-emerald-200/50 dark:border-emerald-800/50 hover:border-emerald-400 dark:hover:border-emerald-600";

  const glowClass = isWarning
    ? "from-yellow-400/20 to-orange-400/20 dark:from-yellow-600/20 dark:to-orange-600/20"
    : "from-emerald-400/20 to-cyan-400/20 dark:from-emerald-600/20 dark:to-cyan-600/20";

  const textClass = isWarning
    ? "text-yellow-900 dark:text-yellow-100"
    : "text-emerald-900 dark:text-emerald-100";

  const subtextClass = isWarning
    ? "text-yellow-600 dark:text-yellow-400"
    : "text-emerald-600 dark:text-emerald-400";

  const badgeBgClass = isWarning
    ? "bg-yellow-100 dark:bg-yellow-900/50"
    : "bg-emerald-100 dark:bg-emerald-900/50";

  const badgeTextClass = isWarning
    ? "text-yellow-700 dark:text-yellow-300"
    : "text-emerald-700 dark:text-emerald-300";

  const iconClass = isWarning
    ? "text-yellow-600 dark:text-yellow-400"
    : "text-emerald-600 dark:text-emerald-400";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className={`relative overflow-hidden rounded-xl bg-gradient-to-br border-2 ${bgClass} ${borderClass} transition-all shadow-sm hover:shadow-md`}
    >
      <div
        className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${glowClass} rounded-full blur-3xl -mr-16 -mt-16`}
      />

      <div className="relative p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className={`text-base font-bold truncate ${textClass}`}>
              {name}
            </h3>
            <p className={`text-sm font-medium ${subtextClass}`}>
              Bloc {building}
            </p>
          </div>
          {coords && onNavigate && (
            <button
              onClick={() => onNavigate(coords)}
              className={`flex-shrink-0 p-2 rounded-lg ${badgeBgClass} ${badgeTextClass} hover:opacity-80 transition-colors`}
              aria-label="Navigate"
            >
              <MapPin className="h-4 w-4" />
            </button>
          )}
        </div>

        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md ${badgeBgClass} mb-2`}
        >
          {isWarning ? (
            <AlertTriangle className={`h-3.5 w-3.5 ${iconClass}`} />
          ) : (
            <CheckCircle2 className={`h-3.5 w-3.5 ${iconClass}`} />
          )}
          <span className={`text-sm font-semibold ${badgeTextClass}`}>
            {formatTime(freeFrom)} – {formatTime(freeUntil)}
          </span>
        </div>

        {isWarning && (
          <div className="mb-2 px-2 py-1 rounded-md bg-yellow-100/80 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700">
            <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
              ⚠️ Soutenance possible
            </p>
          </div>
        )}

        {features.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {features.slice(0, 4).map((feature) => (
              <span
                key={feature}
                className="inline-flex items-center gap-0.5 px-2 py-1 text-xs font-medium rounded-md bg-white/60 dark:bg-slate-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50"
              >
                <span>{featureIcons[feature] || "•"}</span>
                <span className="capitalize">{feature}</span>
              </span>
            ))}
            {features.length > 4 && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-white/60 dark:bg-slate-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50">
                +{features.length - 4}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
