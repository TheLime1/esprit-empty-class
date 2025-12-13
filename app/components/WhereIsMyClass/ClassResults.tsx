"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Calendar, List, CalendarDays } from "lucide-react";
import { motion } from "framer-motion";

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

function isLunchBreak(): boolean {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  // Lunch break is between 12:15 (735 minutes) and 13:30 (810 minutes)
  return currentMinutes >= 735 && currentMinutes < 810;
}

function getStatusBadgeText(): string {
  if (isLunchBreak()) {
    return "🍽️ Lunch Break";
  }
  // Check if it's weekend or late evening
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();

  if (day === 0 || day === 6) {
    return "📅 No Classes Today";
  }

  if (hour < 9 || hour >= 17) {
    return "⏰ Outside Class Hours";
  }

  return "📚 Free Period";
}

// Helper to check if a course is FREE or FREEWARNING (both count as "free")
function isFreeSlot(course: string): boolean {
  const upperCourse = course.toUpperCase();
  return upperCourse === "FREE" || upperCourse === "FREEWARNING";
}

// Helper to check if a course is a real class (not FREE, FREEWARNING, or NOT-FREE)
function isRealClass(course: string): boolean {
  const upperCourse = course.toUpperCase();
  return (
    upperCourse !== "FREE" &&
    upperCourse !== "FREEWARNING" &&
    upperCourse !== "NOT-FREE"
  );
}

// Helper to parse time string and get start time in minutes for sorting
function getStartTimeInMinutes(timeStr: string): number {
  // Extract first time from formats like "09H:00-12H:15" or "09:00-12:15" or "13H:45"
  const regex = /(\d{1,2})[H:](\d{2})/;
  const match = regex.exec(timeStr);
  if (match) {
    return Number.parseInt(match[1], 10) * 60 + Number.parseInt(match[2], 10);
  }
  // Return a large number for unparseable times so they sort to the end
  return 9999;
}

export function ClassResults({ result }: Readonly<ClassResultsProps>) {
  if (!result) return null;

  if (result.status === "no_schedule") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="p-8 md:p-12 text-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-2">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-slate-200 dark:bg-slate-700 rounded-full">
              <Calendar className="h-16 w-16 text-slate-600 dark:text-slate-300" />
            </div>
          </div>
          <h3 className="text-2xl font-bold mb-3">No Schedule Found</h3>
          <p className="text-lg text-muted-foreground">
            We couldn&apos;t find any schedule for class{" "}
            <span className="font-bold text-foreground">
              {result.classCode}
            </span>
            .
          </p>
        </Card>
      </motion.div>
    );
  }

  if (result.status === "not_in_session") {
    const badgeText = getStatusBadgeText();
    const badgeColor = isLunchBreak()
      ? "bg-amber-500 hover:bg-amber-600"
      : "bg-orange-500 hover:bg-orange-600";

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="p-6 md:p-8 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-2 border-orange-200 dark:border-orange-900">
          {/* Class name and status badges in one line */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
            <h3 className="text-3xl md:text-4xl font-bold">
              {result.classCode}
            </h3>
            <div className="flex items-center gap-3 flex-wrap">
              <Badge className={`text-sm px-4 py-1.5 ${badgeColor}`}>
                {badgeText}
              </Badge>
              {result.nextSession && (
                <>
                  <span className="text-2xl">→</span>
                  <Badge className="text-sm px-4 py-1.5 bg-blue-600 hover:bg-blue-700">
                    <Clock className="h-4 w-4 mr-1.5" />
                    {result.nextSession.start} @{" "}
                    {result.nextSession.room === "En Ligne"
                      ? "Home"
                      : result.nextSession.room}
                  </Badge>
                </>
              )}
            </div>
          </div>

          {/* Full Weekly Timetable as main feature */}
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

  // In session
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-6 md:p-8 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-300 dark:border-green-800">
        {/* Class name and status badges in one line */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <h3 className="text-3xl md:text-4xl font-bold">{result.classCode}</h3>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className="text-sm px-4 py-1.5 bg-green-600 hover:bg-green-700">
              <Clock className="h-4 w-4 mr-1.5" />
              {result.session?.course || "In Session"} @{" "}
              {result.room?.name === "En Ligne" ? "Home" : result.room?.name}
            </Badge>
            {result.session && (
              <Badge
                variant="outline"
                className="text-sm px-3 py-1 border-green-600"
              >
                {calculateTimeLeft(result.session.end)}
              </Badge>
            )}
          </div>
        </div>

        {/* Full Weekly Timetable as main feature */}
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
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  const dayOrder = [
    "Lundi",
    "Mardi",
    "Mercredi",
    "Jeudi",
    "Vendredi",
    "Samedi",
  ];
  const orderedDays = dayOrder.filter((day) => {
    const sessions = schedule[day] || [];
    // Include days with real classes OR days with exactly 2 FREE sessions (entire day free)
    const hasRealClasses = sessions.some((s) => isRealClass(s.course));
    const freeSessions = sessions.filter((s) => isFreeSlot(s.course));
    const hasFullDayFree = freeSessions.length === 2;
    return hasRealClasses || hasFullDayFree;
  });

  if (orderedDays.length === 0) return null;

  // Check if there are any online classes this week
  const hasOnlineClasses = orderedDays.some((day) =>
    schedule[day]?.some((s) => s.room === "En Ligne" && isRealClass(s.course))
  );

  return (
    <div className="border-t-2 pt-6">
      <div className="flex items-center justify-between mb-4">
        <span className="font-bold text-lg">
          📅 Weekly Schedule for {classCode}
        </span>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4 mr-2" />
            List
          </Button>
          <Button
            variant={viewMode === "calendar" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("calendar")}
          >
            <CalendarDays className="h-4 w-4 mr-2" />
            Calendar
          </Button>
        </div>
      </div>

      {!hasOnlineClasses && (
        <div className="mb-4 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
          <p className="text-sm text-purple-700 dark:text-purple-300 text-center font-medium">
            Aww no online this week 🤭
          </p>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="space-y-3"
      >
        {viewMode === "list" ? (
          <>
            {orderedDays.map((day) => {
              const allSessions = schedule[day] || [];

              // Already filtered in orderedDays, no need to check again

              // Map all sessions, marking FREE slots
              const mappedSessions = allSessions.map((session) => {
                if (isFreeSlot(session.course)) {
                  return { ...session, isFree: true };
                }
                return session;
              });

              // Filter to only real classes and free slots (exclude NOT-FREE)
              const validSessions = mappedSessions.filter(
                (s) => isRealClass(s.course) || ("isFree" in s && s.isFree)
              );

              // Sort by time
              validSessions.sort(
                (a, b) =>
                  getStartTimeInMinutes(a.time) - getStartTimeInMinutes(b.time)
              );

              // Take first 2 chronologically
              const displaySessions = validSessions.slice(0, 2);

              return (
                <Card
                  key={day}
                  className="p-5 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-2"
                >
                  <h4 className="font-bold text-lg mb-4 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Calendar className="h-5 w-5" />
                    {day}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {displaySessions.map((session, idx) => {
                      const isFreeBox = "isFree" in session && session.isFree;

                      return (
                        <motion.div
                          key={`${day}-${session.time}-${idx}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className={`flex flex-col gap-3 p-4 rounded-lg border-l-4 shadow-sm hover:shadow-md transition-shadow ${
                            isFreeBox
                              ? "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-500"
                              : "bg-white dark:bg-slate-950 border-blue-500"
                          }`}
                        >
                          {isFreeBox ? (
                            <>
                              <Badge
                                variant="outline"
                                className="text-sm font-semibold px-3 py-1 w-fit"
                              >
                                <Clock className="h-4 w-4 mr-1.5" />
                                {session.time}
                              </Badge>
                              <div className="flex-1 flex items-center justify-center">
                                <span className="text-4xl font-black text-green-600 dark:text-green-400">
                                  FREE
                                </span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex flex-wrap items-center gap-3">
                                <Badge
                                  variant="outline"
                                  className="text-sm font-semibold px-3 py-1"
                                >
                                  <Clock className="h-4 w-4 mr-1.5" />
                                  {session.time}
                                </Badge>
                                <Badge
                                  className={`text-sm font-semibold px-3 py-1 ${
                                    session.room === "En Ligne"
                                      ? "bg-purple-600 hover:bg-purple-700"
                                      : "bg-blue-600"
                                  }`}
                                >
                                  <MapPin className="h-4 w-4 mr-1.5" />
                                  {session.room === "En Ligne"
                                    ? "Home"
                                    : session.room}
                                </Badge>
                              </div>
                              <p className="text-base font-medium text-foreground leading-relaxed">
                                {session.course} @{" "}
                                {session.room === "En Ligne"
                                  ? "Home"
                                  : session.room}
                              </p>
                            </>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </>
        ) : (
          <CalendarView schedule={schedule} orderedDays={orderedDays} />
        )}
      </motion.div>
    </div>
  );
}

function CalendarView({
  schedule,
  orderedDays,
}: Readonly<{
  schedule: { [day: string]: ClassSession[] };
  orderedDays: string[];
}>) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {orderedDays.map((day) => {
        const allSessions = schedule[day] || [];

        // Check if there are any real classes or 2 FREE sessions
        const hasRealClasses = allSessions.some((session) =>
          isRealClass(session.course)
        );
        const freeSessions = allSessions.filter((s) => isFreeSlot(s.course));
        const hasFullDayFree = freeSessions.length === 2;

        if (!hasRealClasses && !hasFullDayFree) return null;

        // Map all sessions, marking FREE slots
        const mappedSessions = allSessions.map((session) => {
          if (isFreeSlot(session.course)) {
            return { ...session, isFree: true };
          }
          return session;
        });

        // Filter to only real classes and free slots (exclude NOT-FREE)
        const validSessions = mappedSessions.filter(
          (s) => isRealClass(s.course) || ("isFree" in s && s.isFree)
        );

        // Sort by time
        validSessions.sort(
          (a, b) =>
            getStartTimeInMinutes(a.time) - getStartTimeInMinutes(b.time)
        );

        // Take first 2 chronologically
        const displaySessions = validSessions.slice(0, 2);

        return (
          <Card
            key={day}
            className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-2"
          >
            <h4 className="font-bold text-base mb-3 flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Calendar className="h-4 w-4" />
              {day.split(" ")[0]}
            </h4>
            <div className="space-y-2">
              {displaySessions.map((session, idx) => {
                const isFreeBox = "isFree" in session && session.isFree;

                return (
                  <div
                    key={`${day}-${session.time}-${idx}`}
                    className={`p-3 rounded-lg border-l-4 text-sm flex flex-col ${
                      isFreeBox
                        ? "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-500"
                        : "bg-white dark:bg-slate-950 border-blue-500"
                    }`}
                  >
                    {isFreeBox ? (
                      <>
                        <div className="font-semibold text-green-600 dark:text-green-400 mb-2 text-xs">
                          {session.time}
                        </div>
                        <div className="flex-1 flex items-center justify-center">
                          <span className="text-2xl font-black text-green-600 dark:text-green-400">
                            FREE
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="font-semibold text-blue-600 dark:text-blue-400 mb-1">
                          {session.time}
                        </div>
                        <div className="text-xs text-muted-foreground mb-1">
                          {session.room === "En Ligne"
                            ? "🏠 Home"
                            : `📍 ${session.room}`}
                        </div>
                        <div className="text-xs font-medium">
                          {session.course}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
