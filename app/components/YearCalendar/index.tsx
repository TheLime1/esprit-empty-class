"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

interface Week {
  name: string;
  start_date: string;
  end_date: string;
}

interface Period {
  name: string;
  start_date: string;
  end_date: string;
  note?: string;
}

interface Event {
  name: string;
  date: string;
}

interface LevelData {
  periods: Period[];
  events: Event[];
}

interface YearCalendarData {
  academic_year: string;
  weeks: Week[];
  "5A": LevelData;
  "1-4A": LevelData;
}

interface MonthData {
  name: string;
  periods: Period[];
  events: Event[];
}

export function YearCalendar() {
  const [calendarData, setCalendarData] = useState<YearCalendarData | null>(
    null
  );
  const [selectedLevel, setSelectedLevel] = useState<"5A" | "1-4A">("1-4A");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/year_calendar2025-2026.json")
      .then((res) => res.json())
      .then((data) => {
        setCalendarData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(String(err));
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Loading calendar...</p>
      </Card>
    );
  }

  if (error || !calendarData) {
    return (
      <Card className="p-8 text-center border-red-200 dark:border-red-800">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
        <p className="text-red-600 dark:text-red-400">
          Failed to load calendar data
        </p>
      </Card>
    );
  }

  const currentLevelData = calendarData[selectedLevel];

  // Group events and periods by month
  const monthNames = [
    "September",
    "October",
    "November",
    "December",
    "January",
  ];

  const monthsData: MonthData[] = monthNames.map((monthName, index) => {
    const monthIndex = index < 4 ? index + 9 : 1; // Sept=9, Oct=10, Nov=11, Dec=12, Jan=1
    const year = index < 4 ? 2025 : 2026;

    // Filter events for this month
    const monthEvents = currentLevelData.events.filter((event) => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getMonth() + 1 === monthIndex &&
        eventDate.getFullYear() === year
      );
    });

    // Filter periods that start or occur in this month
    const monthPeriods = currentLevelData.periods.filter((period) => {
      const startDate = new Date(period.start_date);
      const endDate = new Date(period.end_date);
      const monthStart = new Date(year, monthIndex - 1, 1);
      const monthEnd = new Date(year, monthIndex, 0);

      // Period overlaps with this month
      return startDate <= monthEnd && endDate >= monthStart;
    });

    return {
      name: monthName,
      periods: monthPeriods,
      events: monthEvents,
    };
  });

  const getPeriodColor = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("vacances") || lowerName.includes("vacation")) {
      return "bg-green-500 text-white";
    }
    if (lowerName.includes("examen") || lowerName.includes("exam")) {
      return "bg-orange-500 text-white";
    }
    if (lowerName.includes("conseil") || lowerName.includes("council")) {
      return "bg-purple-500 text-white";
    }
    if (lowerName.includes("app") || lowerName.includes("soutenance")) {
      return "bg-blue-500 text-white";
    }
    return "bg-slate-500 text-white";
  };

  const getEventColor = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("fête") || lowerName.includes("jour")) {
      return "bg-red-500 text-white";
    }
    if (lowerName.includes("début") || lowerName.includes("reprise")) {
      return "bg-blue-500 text-white";
    }
    if (lowerName.includes("fin")) {
      return "bg-orange-500 text-white";
    }
    if (lowerName.includes("proclamation")) {
      return "bg-purple-500 text-white";
    }
    return "bg-slate-500 text-white";
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-2 border-blue-200 dark:border-blue-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
            <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">
                Academic Calendar {calendarData.academic_year}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                {calendarData.weeks.length} weeks planned
              </p>
            </div>
          </div>

          {/* Level Selector */}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setSelectedLevel("1-4A")}
              className={`px-3 py-2 sm:px-4 text-sm sm:text-base rounded-lg font-semibold transition-all ${
                selectedLevel === "1-4A"
                  ? "bg-blue-600 text-white shadow-lg scale-105"
                  : "bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-slate-700"
              }`}
            >
              1st - 4th Year
            </button>
            <button
              onClick={() => setSelectedLevel("5A")}
              className={`px-3 py-2 sm:px-4 text-sm sm:text-base rounded-lg font-semibold transition-all ${
                selectedLevel === "5A"
                  ? "bg-blue-600 text-white shadow-lg scale-105"
                  : "bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-slate-700"
              }`}
            >
              5th Year
            </button>
          </div>
        </Card>
      </motion.div>

      {/* Monthly Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {monthsData.map((month, index) => (
          <motion.div
            key={month.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="p-4 sm:p-5 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-2 h-full">
              <h3 className="text-lg sm:text-xl font-bold mb-4 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <Calendar className="h-5 w-5" />
                {month.name}
              </h3>

              {/* Periods */}
              {month.periods.length > 0 && (
                <div className="mb-4 space-y-2">
                  <p className="text-xs sm:text-sm font-semibold text-muted-foreground mb-2">
                    Periods:
                  </p>
                  {month.periods.map((period) => (
                    <motion.div
                      key={`${period.name}-${period.start_date}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-2 sm:p-3 bg-white dark:bg-slate-950 rounded-lg border-l-4 border-blue-500"
                    >
                      <Badge
                        className={`${getPeriodColor(period.name)} text-xs mb-1`}
                      >
                        {period.name}
                      </Badge>
                      <p className="text-xs text-muted-foreground font-mono">
                        {new Date(period.start_date).toLocaleDateString(
                          "en-GB",
                          {
                            day: "2-digit",
                            month: "short",
                          }
                        )}{" "}
                        →{" "}
                        {new Date(period.end_date).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Events */}
              {month.events.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs sm:text-sm font-semibold text-muted-foreground mb-2">
                    Events:
                  </p>
                  {month.events.map((event) => (
                    <motion.div
                      key={`${event.name}-${event.date}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-2 bg-white dark:bg-slate-950 rounded-lg border-2 border-slate-200 dark:border-slate-700"
                    >
                      <Badge
                        className={`${getEventColor(event.name)} text-xs mb-1`}
                      >
                        {new Date(event.date).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </Badge>
                      <p className="text-xs font-medium break-words">
                        {event.name}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {month.periods.length === 0 && month.events.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No events this month
                </p>
              )}
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Legend */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-900">
          <p className="text-xs sm:text-sm font-semibold mb-2 sm:mb-3">
            Legend:
          </p>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Badge className="bg-green-500 text-xs">Vacations</Badge>
            <Badge className="bg-orange-500 text-xs">Exams</Badge>
            <Badge className="bg-purple-500 text-xs">Councils</Badge>
            <Badge className="bg-blue-500 text-xs">Projects</Badge>
            <Badge className="bg-red-500 text-xs">Holidays</Badge>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
