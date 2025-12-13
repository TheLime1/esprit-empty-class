"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, AlertTriangle } from "lucide-react";

interface Room {
  roomId: string;
  buildingId: string;
  name: string;
  capacity: number;
  features: string[];
  freeFrom?: string;
  freeUntil?: string;
  isWarning?: boolean;
}

interface NearestRoomProps {
  classRoom: string;
  day: string;
  time: string;
}

export function NearestEmptyRoom({
  classRoom,
  day,
  time,
}: Readonly<NearestRoomProps>) {
  const [nearestRoom, setNearestRoom] = React.useState<Room | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!classRoom || !day || !time) return;

    setLoading(true);

    // Extract building from class room (e.g., "A17" -> "A")
    const buildingRegex = /^[A-Z]+/;
    let building = buildingRegex.exec(classRoom)?.[0] || classRoom.charAt(0);

    // Normalize I, J, K to IJK
    if (building === "I" || building === "J" || building === "K") {
      building = "IJK";
    }

    fetch(
      `/api/rooms/free?day=${encodeURIComponent(day)}&time=${encodeURIComponent(time)}&building=${building}`
    )
      .then((res) => res.json())
      .then((data) => {
        const allRooms: Room[] = [];

        // Transform empty rooms
        if (data.empty) {
          for (const roomName of data.empty as string[]) {
            const roomBuildingRegex = /^[A-Z]+/;
            const roomBuilding =
              roomBuildingRegex.exec(roomName)?.[0] || roomName.charAt(0);
            allRooms.push({
              roomId: roomName,
              buildingId: roomBuilding,
              name: roomName,
              capacity: 30,
              features: [],
              freeFrom: time,
              isWarning: false,
            });
          }
        }

        // Transform warning rooms
        if (data.warning) {
          for (const roomName of data.warning as string[]) {
            const roomBuildingRegex = /^[A-Z]+/;
            const roomBuilding =
              roomBuildingRegex.exec(roomName)?.[0] || roomName.charAt(0);
            allRooms.push({
              roomId: roomName,
              buildingId: roomBuilding,
              name: roomName,
              capacity: 30,
              features: [],
              freeFrom: time,
              isWarning: true,
            });
          }
        }

        // Find nearest room (same building, closest room number)
        const classRoomNum = Number.parseInt(
          classRoom.replaceAll(/[A-Z]/g, ""),
          10
        );
        // For IJK group, match any room from I, J, or K
        const sameBuilding =
          building === "IJK"
            ? allRooms.filter(
                (r) =>
                  r.buildingId === "I" ||
                  r.buildingId === "J" ||
                  r.buildingId === "K"
              )
            : allRooms.filter((r) => r.buildingId === building);

        if (sameBuilding.length > 0) {
          const sorted = [...sameBuilding].sort((a, b) => {
            const aNum = Number.parseInt(a.name.replaceAll(/[A-Z]/g, ""), 10);
            const bNum = Number.parseInt(b.name.replaceAll(/[A-Z]/g, ""), 10);
            return (
              Math.abs(aNum - classRoomNum) - Math.abs(bNum - classRoomNum)
            );
          });
          setNearestRoom(sorted[0]);
        } else {
          setNearestRoom(null);
        }

        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [classRoom, day, time]);

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

  if (!nearestRoom) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
    >
      <Card
        className={`p-6 md:p-8 border-2 ${
          nearestRoom.isWarning
            ? "bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-yellow-400 dark:border-yellow-600"
            : "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-400 dark:border-green-600"
        }`}
      >
        <div className="flex items-start gap-3">
          {nearestRoom.isWarning ? (
            <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-1" />
          ) : (
            <MapPin className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-sm font-semibold">Nearest Empty Room</h4>
              <Badge
                className={
                  nearestRoom.isWarning
                    ? "bg-yellow-600 text-white"
                    : "bg-green-600 text-white"
                }
              >
                {nearestRoom.name}
              </Badge>
            </div>
            {nearestRoom.isWarning ? (
              <p className="text-xs text-yellow-700 dark:text-yellow-300 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                FREEWARNING: May have soutenances (check before using)
              </p>
            ) : (
              <p className="text-xs text-green-700 dark:text-green-300 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Available now in the same building
              </p>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// Add React import at top
import * as React from "react";
