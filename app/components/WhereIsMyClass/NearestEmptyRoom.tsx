"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, AlertTriangle } from "lucide-react";
import * as React from "react";

interface NearestRoomProps {
  classCode: string;
  day: string;
  time: string;
}

interface NearestResult {
  nearest: string | null;
  currentRoom: string | null;
  isWarning: boolean;
}

export function NearestEmptyRoom({
  classCode,
  day,
  time,
}: Readonly<NearestRoomProps>) {
  const [result, setResult] = React.useState<NearestResult | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!classCode || !day || !time) return;

    setLoading(true);

    const params = new URLSearchParams({
      class: classCode,
      day,
      time,
    });

    fetch("/api/rooms/nearest?" + params.toString())
      .then((res) => res.json())
      .then((data) => {
        setResult({
          nearest: data.nearest ?? null,
          currentRoom: data.currentRoom ?? null,
          isWarning: data.isWarning ?? false,
        });
        setLoading(false);
      })
      .catch(() => {
        setResult(null);
        setLoading(false);
      });
  }, [classCode, day, time]);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="p-6 md:p-8 bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800">
          <p className="text-sm text-center text-muted-foreground">
            Finding nearest empty room...
          </p>
        </Card>
      </motion.div>
    );
  }

  if (!result?.nearest) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
    >
      <Card
        className={`p-6 md:p-8 border-2 ${
          result.isWarning
            ? "bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-yellow-400 dark:border-yellow-600"
            : "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-400 dark:border-green-600"
        }`}
      >
        <div className="flex items-start gap-3">
          {result.isWarning ? (
            <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-1" />
          ) : (
            <MapPin className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-sm font-semibold">Nearest Empty Room</h4>
              <Badge
                className={
                  result.isWarning
                    ? "bg-yellow-600 text-white"
                    : "bg-green-600 text-white"
                }
              >
                {result.nearest}
              </Badge>
            </div>
            {result.isWarning ? (
              <p className="text-xs text-yellow-700 dark:text-yellow-300 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                FREEWARNING: May have soutenances (check before using)
              </p>
            ) : (
              <p className="text-xs text-green-700 dark:text-green-300 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Available now — closest to {result.currentRoom ?? classCode}
              </p>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
