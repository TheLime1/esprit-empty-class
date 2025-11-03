"use client";

import { MapPin, CheckCircle2 } from "lucide-react";
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
}: Readonly<RoomCardProps>) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950/40 dark:via-teal-950/40 dark:to-cyan-950/40 border-2 border-emerald-200/50 dark:border-emerald-800/50 hover:border-emerald-400 dark:hover:border-emerald-600 transition-all shadow-sm hover:shadow-md"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 dark:from-emerald-600/20 dark:to-cyan-600/20 rounded-full blur-3xl -mr-16 -mt-16" />

      <div className="relative p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-100 truncate">
              {name}
            </h3>
            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
              Bloc {building}
            </p>
          </div>
          {coords && onNavigate && (
            <button
              onClick={() => onNavigate(coords)}
              className="flex-shrink-0 p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-colors"
              aria-label="Navigate"
            >
              <MapPin className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 mb-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            {formatTime(freeFrom)} – {formatTime(freeUntil)}
          </span>
        </div>

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
