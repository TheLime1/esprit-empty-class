"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Clock,
  Calendar,
  Users,
  Building2,
  Navigation,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ClassSession {
  time: string;
  course: string;
  room: string;
}

interface ClassLocation {
  classCode: string;
  status: "in_session" | "not_in_session" | "no_schedule";
  room?: {
    roomId: string;
    name: string;
    building: string;
    coords?: { lat: number; lng: number };
  };
  session?: {
    start: string;
    end: string;
    course?: string;
  };
  nextSession?: {
    day: string;
    start: string;
    end: string;
    room: string;
    course?: string;
  };
  fullSchedule?: {
    [day: string]: ClassSession[];
  };
}

interface ClassResultsProps {
  result: ClassLocation | null;
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

function calculateTimeLeft(endTime: string): string {
  try {
    const end = new Date(endTime);
    const now = new Date();
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return "Session ended";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  } catch {
    return "";
  }
}

export function ClassResults({ result }: Readonly<ClassResultsProps>) {
  if (!result) return null;

  if (result.status === "no_schedule") {
    return (
      <Card className="p-4 sm:p-6 md:p-8 text-center">
        <div className="flex justify-center mb-3 sm:mb-4">
          <Calendar className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground" />
        </div>
        <h3 className="text-base sm:text-lg font-semibold mb-2">
          No Schedule Found
        </h3>
        <p className="text-sm sm:text-base text-muted-foreground">
          We couldn&apos;t find any schedule for class{" "}
          <span className="font-semibold">{result.classCode}</span>.
        </p>
      </Card>
    );
  }

  if (result.status === "not_in_session") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="p-4 sm:p-5 md:p-6">
          <div className="flex items-start justify-between mb-3 sm:mb-4">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold">
                {result.classCode}
              </h3>
              <Badge variant="secondary" className="mt-2 text-xs sm:text-sm">
                Not in session
              </Badge>
            </div>
            <Users className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
          </div>

          {result.nextSession && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Next Session
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{result.nextSession.day}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {result.nextSession.start} – {result.nextSession.end}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">
                      {result.nextSession.room}
                    </span>
                  </div>
                  {result.nextSession.course && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-muted-foreground">
                        {result.nextSession.course}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>
      </motion.div>
    );
  }

  // In session
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-4 sm:p-5 md:p-6 border-green-200 dark:border-green-900">
        <div className="flex items-start justify-between mb-3 sm:mb-4">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold">
              {result.classCode}
            </h3>
            <Badge className="mt-2 text-xs sm:text-sm bg-green-600 hover:bg-green-700">
              In Session Now
            </Badge>
          </div>
          <Users className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
        </div>{" "}
        {result.room && (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-green-600" />
                Current Location
              </h4>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <span className="text-2xl font-bold">{result.room.name}</span>
                  <span className="text-sm text-muted-foreground">
                    Building {result.room.building}
                  </span>
                </div>
                {result.session && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {formatTime(result.session.start)} –{" "}
                      {formatTime(result.session.end)}
                    </span>
                    <Badge variant="outline" className="ml-2">
                      {calculateTimeLeft(result.session.end)}
                    </Badge>
                  </div>
                )}
                {result.session?.course && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {result.session.course}
                  </p>
                )}
              </div>
            </div>

            {result.room.coords && (
              <Button
                className="w-full"
                onClick={() => {
                  if (result.room?.coords) {
                    window.open(
                      `https://www.google.com/maps/search/?api=1&query=${result.room.coords.lat},${result.room.coords.lng}`,
                      "_blank"
                    );
                  }
                }}
              >
                <Navigation className="h-4 w-4 mr-2" />
                Navigate to Room
              </Button>
            )}
          </div>
        )}
        {/* Full Weekly Timetable */}
        {result.fullSchedule && (
          <FullTimetable
            schedule={result.fullSchedule}
            classCode={result.classCode}
          />
        )}
      </Card>
    </motion.div>
  );
}

function FullTimetable({
  schedule,
  classCode,
}: Readonly<{
  schedule: { [day: string]: ClassSession[] };
  classCode: string;
}>) {
  const [isExpanded, setIsExpanded] = useState(false);

  const dayOrder = [
    "Lundi",
    "Mardi",
    "Mercredi",
    "Jeudi",
    "Vendredi",
    "Samedi",
  ];
  const orderedDays = dayOrder.filter(
    (day) => schedule[day] && schedule[day].length > 0
  );

  if (orderedDays.length === 0) return null;

  return (
    <div className="mt-6 border-t pt-6">
      <Button
        variant="ghost"
        className="w-full flex items-center justify-between mb-4"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="font-semibold text-base">
          Full Weekly Timetable for {classCode}
        </span>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5" />
        ) : (
          <ChevronDown className="h-5 w-5" />
        )}
      </Button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {orderedDays.map((day) => (
              <Card key={day} className="p-4">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {day}
                </h4>
                <div className="space-y-2">
                  {schedule[day].map((session) => (
                    <div
                      key={`${day}-${session.time}-${session.room}`}
                      className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-2 text-sm font-medium min-w-[120px]">
                        <Clock className="h-4 w-4" />
                        {session.time}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{session.course}</p>
                      </div>
                      <Badge
                        variant={
                          session.course === "FREE" ? "secondary" : "default"
                        }
                        className="w-fit"
                      >
                        <MapPin className="h-3 w-3 mr-1" />
                        {session.room}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
