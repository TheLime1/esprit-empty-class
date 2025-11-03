"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  roomId,
  name,
  building,
  capacity,
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
      whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
      transition={{ duration: 0.2 }}
    >
      <Card className="p-3 sm:p-4 h-full flex flex-col">
        <div className="flex items-start justify-between mb-2 sm:mb-3">
          <div>
            <h3 className="text-base sm:text-lg font-semibold">{name}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Bloc {building}
            </p>
          </div>
        </div>

        <div className="mb-2 sm:mb-3 p-2 bg-green-50 dark:bg-green-950/30 rounded-md border border-green-200 dark:border-green-900">
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="font-medium text-green-700 dark:text-green-300">
              Free {formatTime(freeFrom)} – {formatTime(freeUntil)}
            </span>
          </div>
        </div>

        {features.length > 0 && (
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
            {features.slice(0, 5).map((feature) => (
              <span
                key={feature}
                className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded-full bg-secondary"
              >
                <span>{featureIcons[feature] || "•"}</span>
                <span className="capitalize">{feature}</span>
              </span>
            ))}
            {features.length > 5 && (
              <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded-full bg-secondary">
                +{features.length - 5}
              </span>
            )}
          </div>
        )}

        {coords && onNavigate && (
          <div className="mt-auto pt-2 sm:pt-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs sm:text-sm"
              onClick={() => onNavigate(coords)}
            >
              <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Navigate
            </Button>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
