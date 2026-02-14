"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Modifier, DateAfter, DateBefore, Matcher } from "react-day-picker";

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

export function YearCalendar() {
  const [calendarData, setCalendarData] = useState<YearCalendarData | null>(
    null
  );
  const [selectedLevel, setSelectedLevel] = useState<"5A" | "1-4A">("1-4A");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/calendar")
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

  // Helper function to parse date strings in local time (avoid timezone issues)
  const parseLocalDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  // Helper function to get local date string in YYYY-MM-DD format
  const getLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Get date information
  const getDateInfo = (date: Date) => {
    const dateStr = getLocalDateString(date);
    
    const periods = currentLevelData.periods.filter((period) => {
      const start = parseLocalDate(period.start_date);
      const end = parseLocalDate(period.end_date);
      return date >= start && date <= end;
    });

    const events = currentLevelData.events.filter(
      (event) => event.date === dateStr
    );

    const week = calendarData.weeks.find((w) => {
      const start = parseLocalDate(w.start_date);
      const end = parseLocalDate(w.end_date);
      return date >= start && date <= end;
    });

    return { periods, events, week };
  };

  // Create date modifiers for styling
  const vacationDates: Date[] = [];
  const examDates: Date[] = [];
  const councilDates: Date[] = [];
  const projectDates: Date[] = [];
  const eventDates: Date[] = [];
  const ramadanDates: Date[] = [];

  // Map to track multiple events per date
  const dateEventMap = new Map<string, string[]>();

  currentLevelData.periods.forEach((period) => {
    const start = parseLocalDate(period.start_date);
    const end = parseLocalDate(period.end_date);
    const dates: Date[] = [];
    
    const current = new Date(start);
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    const lowerName = period.name.toLowerCase();
    let eventType = "";
    
    if (lowerName.includes("vacances") || lowerName.includes("vacation")) {
      vacationDates.push(...dates);
      eventType = "vacation";
    } else if (lowerName.includes("examen") || lowerName.includes("exam") || lowerName.includes("ds")) {
      examDates.push(...dates);
      eventType = "exam";
    } else if (lowerName.includes("conseil")) {
      councilDates.push(...dates);
      eventType = "council";
    } else if (lowerName.includes("app") || lowerName.includes("soutenance") || lowerName.includes("pratique")) {
      projectDates.push(...dates);
      eventType = "project";
    } else if (lowerName.includes("ramadan")) {
      ramadanDates.push(...dates);
      eventType = "ramadan";
    }

    // Track events per date
    if (eventType) {
      dates.forEach((date) => {
        const dateKey = getLocalDateString(date);
        if (!dateEventMap.has(dateKey)) {
          dateEventMap.set(dateKey, []);
        }
        const events = dateEventMap.get(dateKey)!;
        if (!events.includes(eventType)) {
          events.push(eventType);
        }
      });
    }
  });

  currentLevelData.events.forEach((event) => {
    const date = parseLocalDate(event.date);
    eventDates.push(date);
    const dateKey = getLocalDateString(date);
    if (!dateEventMap.has(dateKey)) {
      dateEventMap.set(dateKey, []);
    }
    const events = dateEventMap.get(dateKey)!;
    if (!events.includes("event")) {
      events.push("event");
    }
  });

  // Find multi-event dates
  const multiEventDates: Date[] = [];
  const multiEventMap = new Map<string, string[]>();
  
  dateEventMap.forEach((events, dateKey) => {
    if (events.length > 1) {
      const date = parseLocalDate(dateKey);
      multiEventDates.push(date);
      multiEventMap.set(dateKey, events);
    }
  });

  const modifiers: Record<string, Matcher | Matcher[] | undefined> = {
    vacation: vacationDates.filter(d => {
      const key = getLocalDateString(d);
      return !dateEventMap.get(key) || dateEventMap.get(key)!.length === 1;
    }),
    exam: examDates.filter(d => {
      const key = getLocalDateString(d);
      return !dateEventMap.get(key) || dateEventMap.get(key)!.length === 1;
    }),
    council: councilDates.filter(d => {
      const key = getLocalDateString(d);
      return !dateEventMap.get(key) || dateEventMap.get(key)!.length === 1;
    }),
    project: projectDates.filter(d => {
      const key = getLocalDateString(d);
      return !dateEventMap.get(key) || dateEventMap.get(key)!.length === 1;
    }),
    event: eventDates.filter(d => {
      const key = getLocalDateString(d);
      return !dateEventMap.get(key) || dateEventMap.get(key)!.length === 1;
    }),
    ramadan: ramadanDates.filter(d => {
      const key = getLocalDateString(d);
      return !dateEventMap.get(key) || dateEventMap.get(key)!.length === 1;
    }),
    multiEvent: multiEventDates,
  };

  const modifiersClassNames = {
    vacation: "!bg-green-500/50 !text-white hover:!bg-green-500 active:!bg-green-500 dark:!bg-green-600/50 dark:hover:!bg-green-600 dark:active:!bg-green-600 !rounded-full data-[selected-single=true]:!bg-green-500 dark:data-[selected-single=true]:!bg-green-600 [&_button]:!rounded-full [&_button]:hover:!bg-green-500 [&_button]:active:!bg-green-500 [&_button]:dark:hover:!bg-green-600",
    exam: "!bg-orange-500/50 !text-white hover:!bg-orange-500 active:!bg-orange-500 dark:!bg-orange-600/50 dark:hover:!bg-orange-600 dark:active:!bg-orange-600 !rounded-full data-[selected-single=true]:!bg-orange-500 dark:data-[selected-single=true]:!bg-orange-600 [&_button]:!rounded-full [&_button]:hover:!bg-orange-500 [&_button]:active:!bg-orange-500 [&_button]:dark:hover:!bg-orange-600",
    council: "!bg-purple-500/50 !text-white hover:!bg-purple-500 active:!bg-purple-500 dark:!bg-purple-600/50 dark:hover:!bg-purple-600 dark:active:!bg-purple-600 !rounded-full data-[selected-single=true]:!bg-purple-500 dark:data-[selected-single=true]:!bg-purple-600 [&_button]:!rounded-full [&_button]:hover:!bg-purple-500 [&_button]:active:!bg-purple-500 [&_button]:dark:hover:!bg-purple-600",
    project: "!bg-blue-500/50 !text-white hover:!bg-blue-500 active:!bg-blue-500 dark:!bg-blue-600/50 dark:hover:!bg-blue-600 dark:active:!bg-blue-600 !rounded-full data-[selected-single=true]:!bg-blue-500 dark:data-[selected-single=true]:!bg-blue-600 [&_button]:!rounded-full [&_button]:hover:!bg-blue-500 [&_button]:active:!bg-blue-500 [&_button]:dark:hover:!bg-blue-600",
    ramadan: "!bg-yellow-500/50 !text-white hover:!bg-yellow-500 active:!bg-yellow-500 dark:!bg-yellow-600/50 dark:hover:!bg-yellow-600 dark:active:!bg-yellow-600 !rounded-full data-[selected-single=true]:!bg-yellow-500 dark:data-[selected-single=true]:!bg-yellow-600 [&_button]:!rounded-full [&_button]:hover:!bg-yellow-500 [&_button]:active:!bg-yellow-500 [&_button]:dark:hover:!bg-yellow-600",
    event: "ring-2 ring-red-500 dark:ring-red-400 font-bold !rounded-full hover:!bg-red-500 hover:!text-white active:!bg-red-500 active:!text-white dark:hover:!bg-red-600 dark:active:!bg-red-600 data-[selected-single=true]:!bg-red-500 data-[selected-single=true]:!text-white dark:data-[selected-single=true]:!bg-red-600 [&_button]:!rounded-full [&_button]:hover:!bg-red-500 [&_button]:hover:!text-white [&_button]:active:!bg-red-500 [&_button]:dark:hover:!bg-red-600",
    multiEvent: "multi-event-date !rounded-full [&_button]:!rounded-full",
  };

  // Helper function to generate gradient for multi-event dates
  const getMultiEventGradient = (events: string[]) => {
    const colorMap: Record<string, string> = {
      vacation: "#22c55e",
      exam: "#f97316",
      council: "#a855f7",
      project: "#3b82f6",
      ramadan: "#eab308",
      event: "#ef4444",
    };
    
    const colors = events.map(e => colorMap[e] || "#888");
    const step = 100 / colors.length;
    
    if (colors.length === 2) {
      return `linear-gradient(135deg, ${colors[0]} 50%, ${colors[1]} 50%)`;
    } else if (colors.length === 3) {
      return `linear-gradient(135deg, ${colors[0]} 33.33%, ${colors[1]} 33.33%, ${colors[1]} 66.66%, ${colors[2]} 66.66%)`;
    } else {
      const stops = colors.map((color, i) => 
        `${color} ${i * step}%, ${color} ${(i + 1) * step}%`
      ).join(", ");
      return `linear-gradient(135deg, ${stops})`;
    }
  };

  // Info panel for selected date
  const selectedDateInfo = selectedDate ? getDateInfo(selectedDate) : null;

  const months = [
    new Date(2025, 8, 1), // September 2025
    new Date(2025, 9, 1), // October 2025
    new Date(2025, 10, 1), // November 2025
    new Date(2025, 11, 1), // December 2025
    new Date(2026, 0, 1), // January 2026
    new Date(2026, 1, 1), // February 2026
    new Date(2026, 2, 1), // March 2026
    new Date(2026, 3, 1), // April 2026
    new Date(2026, 4, 1), // May 2026
  ];

  return (
    <div className="space-y-6">
      {/* Custom styles for calendar day buttons */}
      <style jsx global>{`
        /* Multi-event dates - will be styled dynamically */
        .rdp-day.multi-event-date button {
          border-radius: 9999px !important;
          color: white !important;
          font-weight: 600 !important;
          position: relative !important;
        }
        
        /* Vacation dates */
        .rdp-day[data-vacation] button,
        .rdp-day.vacation button {
          border-radius: 9999px !important;
          background-color: rgba(34, 197, 94, 0.5) !important;
          color: white !important;
        }
        .rdp-day[data-vacation] button:hover,
        .rdp-day.vacation button:hover {
          background-color: rgb(34, 197, 94) !important;
        }
        .rdp-day[data-vacation] button:active,
        .rdp-day[data-vacation] button:focus,
        .rdp-day[data-vacation] button[aria-pressed="true"],
        .rdp-day.vacation button:active,
        .rdp-day.vacation button:focus,
        .rdp-day.vacation button[aria-pressed="true"],
        .rdp-day[data-vacation] button[data-selected-single="true"],
        .rdp-day.vacation button[data-selected-single="true"],
        .rdp-day[data-selected="true"][data-vacation] button,
        .rdp-day[data-selected="true"].vacation button {
          background-color: rgb(34, 197, 94) !important;
          color: white !important;
        }
        
        /* Exam dates */
        .rdp-day[data-exam] button,
        .rdp-day.exam button {
          border-radius: 9999px !important;
          background-color: rgba(249, 115, 22, 0.5) !important;
          color: white !important;
        }
        .rdp-day[data-exam] button:hover,
        .rdp-day.exam button:hover {
          background-color: rgb(249, 115, 22) !important;
        }
        .rdp-day[data-exam] button:active,
        .rdp-day[data-exam] button:focus,
        .rdp-day[data-exam] button[aria-pressed="true"],
        .rdp-day.exam button:active,
        .rdp-day.exam button:focus,
        .rdp-day.exam button[aria-pressed="true"],
        .rdp-day[data-exam] button[data-selected-single="true"],
        .rdp-day.exam button[data-selected-single="true"],
        .rdp-day[data-selected="true"][data-exam] button,
        .rdp-day[data-selected="true"].exam button {
          background-color: rgb(249, 115, 22) !important;
          color: white !important;
        }
        
        /* Council dates */
        .rdp-day[data-council] button,
        .rdp-day.council button {
          border-radius: 9999px !important;
          background-color: rgba(168, 85, 247, 0.5) !important;
          color: white !important;
        }
        .rdp-day[data-council] button:hover,
        .rdp-day.council button:hover {
          background-color: rgb(168, 85, 247) !important;
        }
        .rdp-day[data-council] button:active,
        .rdp-day[data-council] button:focus,
        .rdp-day[data-council] button[aria-pressed="true"],
        .rdp-day.council button:active,
        .rdp-day.council button:focus,
        .rdp-day.council button[aria-pressed="true"],
        .rdp-day[data-council] button[data-selected-single="true"],
        .rdp-day.council button[data-selected-single="true"],
        .rdp-day[data-selected="true"][data-council] button,
        .rdp-day[data-selected="true"].council button {
          background-color: rgb(168, 85, 247) !important;
          color: white !important;
        }
        
        /* Project dates */
        .rdp-day[data-project] button,
        .rdp-day.project button {
          border-radius: 9999px !important;
          background-color: rgba(59, 130, 246, 0.5) !important;
          color: white !important;
        }
        .rdp-day[data-project] button:hover,
        .rdp-day.project button:hover {
          background-color: rgb(59, 130, 246) !important;
        }
        .rdp-day[data-project] button:active,
        .rdp-day[data-project] button:focus,
        .rdp-day[data-project] button[aria-pressed="true"],
        .rdp-day.project button:active,
        .rdp-day.project button:focus,
        .rdp-day.project button[aria-pressed="true"],
        .rdp-day[data-project] button[data-selected-single="true"],
        .rdp-day.project button[data-selected-single="true"],
        .rdp-day[data-selected="true"][data-project] button,
        .rdp-day[data-selected="true"].project button {
          background-color: rgb(59, 130, 246) !important;
          color: white !important;
        }
        
        /* Ramadan dates */
        .rdp-day[data-ramadan] button,
        .rdp-day.ramadan button {
          border-radius: 9999px !important;
          background-color: rgba(234, 179, 8, 0.5) !important;
          color: white !important;
        }
        .rdp-day[data-ramadan] button:hover,
        .rdp-day.ramadan button:hover {
          background-color: rgb(234, 179, 8) !important;
        }
        .rdp-day[data-ramadan] button:active,
        .rdp-day[data-ramadan] button:focus,
        .rdp-day[data-ramadan] button[aria-pressed="true"],
        .rdp-day.ramadan button:active,
        .rdp-day.ramadan button:focus,
        .rdp-day.ramadan button[aria-pressed="true"],
        .rdp-day[data-ramadan] button[data-selected-single="true"],
        .rdp-day.ramadan button[data-selected-single="true"],
        .rdp-day[data-selected="true"][data-ramadan] button,
        .rdp-day[data-selected="true"].ramadan button {
          background-color: rgb(234, 179, 8) !important;
          color: white !important;
        }
        
        /* Event dates */
        .rdp-day[data-event] button,
        .rdp-day.event button {
          border-radius: 9999px !important;
          box-shadow: 0 0 0 2px rgb(239, 68, 68) !important;
          font-weight: bold !important;
        }
        .rdp-day[data-event] button:hover,
        .rdp-day.event button:hover {
          background-color: rgb(239, 68, 68) !important;
          color: white !important;
        }
        .rdp-day[data-event] button:active,
        .rdp-day[data-event] button:focus,
        .rdp-day[data-event] button[aria-pressed="true"],
        .rdp-day.event button:active,
        .rdp-day.event button:focus,
        .rdp-day.event button[aria-pressed="true"],
        .rdp-day[data-event] button[data-selected-single="true"],
        .rdp-day.event button[data-selected-single="true"],
        .rdp-day[data-selected="true"][data-event] button,
        .rdp-day[data-selected="true"].event button {
          background-color: rgb(239, 68, 68) !important;
          color: white !important;
        }
        
        /* Dark mode adjustments */
        .dark .rdp-day[data-vacation] button,
        .dark .rdp-day.vacation button {
          background-color: rgba(22, 163, 74, 0.5) !important;
        }
        .dark .rdp-day[data-vacation] button:hover,
        .dark .rdp-day.vacation button:hover,
        .dark .rdp-day[data-vacation] button:active,
        .dark .rdp-day[data-vacation] button:focus,
        .dark .rdp-day[data-vacation] button[aria-pressed="true"],
        .dark .rdp-day.vacation button:active,
        .dark .rdp-day.vacation button:focus,
        .dark .rdp-day.vacation button[aria-pressed="true"],
        .dark .rdp-day[data-vacation] button[data-selected-single="true"],
        .dark .rdp-day.vacation button[data-selected-single="true"],
        .dark .rdp-day[data-selected="true"][data-vacation] button,
        .dark .rdp-day[data-selected="true"].vacation button {
          background-color: rgb(22, 163, 74) !important;
          color: white !important;
        }
        
        .dark .rdp-day[data-exam] button,
        .dark .rdp-day.exam button {
          background-color: rgba(234, 88, 12, 0.5) !important;
        }
        .dark .rdp-day[data-exam] button:hover,
        .dark .rdp-day.exam button:hover,
        .dark .rdp-day[data-exam] button:active,
        .dark .rdp-day[data-exam] button:focus,
        .dark .rdp-day[data-exam] button[aria-pressed="true"],
        .dark .rdp-day.exam button:active,
        .dark .rdp-day.exam button:focus,
        .dark .rdp-day.exam button[aria-pressed="true"],
        .dark .rdp-day[data-exam] button[data-selected-single="true"],
        .dark .rdp-day.exam button[data-selected-single="true"],
        .dark .rdp-day[data-selected="true"][data-exam] button,
        .dark .rdp-day[data-selected="true"].exam button {
          background-color: rgb(234, 88, 12) !important;
          color: white !important;
        }
        
        .dark .rdp-day[data-council] button,
        .dark .rdp-day.council button {
          background-color: rgba(147, 51, 234, 0.5) !important;
        }
        .dark .rdp-day[data-council] button:hover,
        .dark .rdp-day.council button:hover,
        .dark .rdp-day[data-council] button:active,
        .dark .rdp-day[data-council] button:focus,
        .dark .rdp-day[data-council] button[aria-pressed="true"],
        .dark .rdp-day.council button:active,
        .dark .rdp-day.council button:focus,
        .dark .rdp-day.council button[aria-pressed="true"],
        .dark .rdp-day[data-council] button[data-selected-single="true"],
        .dark .rdp-day.council button[data-selected-single="true"],
        .dark .rdp-day[data-selected="true"][data-council] button,
        .dark .rdp-day[data-selected="true"].council button {
          background-color: rgb(147, 51, 234) !important;
          color: white !important;
        }
        
        .dark .rdp-day[data-project] button,
        .dark .rdp-day.project button {
          background-color: rgba(37, 99, 235, 0.5) !important;
        }
        .dark .rdp-day[data-project] button:hover,
        .dark .rdp-day.project button:hover,
        .dark .rdp-day[data-project] button:active,
        .dark .rdp-day[data-project] button:focus,
        .dark .rdp-day[data-project] button[aria-pressed="true"],
        .dark .rdp-day.project button:active,
        .dark .rdp-day.project button:focus,
        .dark .rdp-day.project button[aria-pressed="true"],
        .dark .rdp-day[data-project] button[data-selected-single="true"],
        .dark .rdp-day.project button[data-selected-single="true"],
        .dark .rdp-day[data-selected="true"][data-project] button,
        .dark .rdp-day[data-selected="true"].project button {
          background-color: rgb(37, 99, 235) !important;
          color: white !important;
        }
        
        .dark .rdp-day[data-ramadan] button,
        .dark .rdp-day.ramadan button {
          background-color: rgba(202, 138, 4, 0.5) !important;
        }
        .dark .rdp-day[data-ramadan] button:hover,
        .dark .rdp-day.ramadan button:hover,
        .dark .rdp-day[data-ramadan] button:active,
        .dark .rdp-day[data-ramadan] button:focus,
        .dark .rdp-day[data-ramadan] button[aria-pressed="true"],
        .dark .rdp-day.ramadan button:active,
        .dark .rdp-day.ramadan button:focus,
        .dark .rdp-day.ramadan button[aria-pressed="true"],
        .dark .rdp-day[data-ramadan] button[data-selected-single="true"],
        .dark .rdp-day.ramadan button[data-selected-single="true"],
        .dark .rdp-day[data-selected="true"][data-ramadan] button,
        .dark .rdp-day[data-selected="true"].ramadan button {
          background-color: rgb(202, 138, 4) !important;
          color: white !important;
        }
        
        .dark .rdp-day[data-event] button,
        .dark .rdp-day.event button {
          box-shadow: 0 0 0 2px rgb(220, 38, 38) !important;
        }
        .dark .rdp-day[data-event] button:hover,
        .dark .rdp-day.event button:hover,
        .dark .rdp-day[data-event] button:active,
        .dark .rdp-day[data-event] button:focus,
        .dark .rdp-day[data-event] button[aria-pressed="true"],
        .dark .rdp-day.event button:active,
        .dark .rdp-day.event button:focus,
        .dark .rdp-day.event button[aria-pressed="true"],
        .dark .rdp-day[data-event] button[data-selected-single="true"],
        .dark .rdp-day.event button[data-selected-single="true"],
        .dark .rdp-day[data-selected="true"][data-event] button,
        .dark .rdp-day[data-selected="true"].event button {
          background-color: rgb(220, 38, 38) !important;
          color: white !important;
        }
      `}</style>

      {/* Apply dynamic gradients to multi-event dates */}
      {multiEventDates.length > 0 && (
        <style dangerouslySetInnerHTML={{
          __html: multiEventDates.map((date) => {
            const dateKey = getLocalDateString(date);
            const events = multiEventMap.get(dateKey) || [];
            const gradient = getMultiEventGradient(events);
            const dateAttr = date.toLocaleDateString();
            
            return `
              .rdp-day.multi-event-date button[data-day="${dateAttr}"] {
                background: ${gradient} !important;
                opacity: 0.7;
              }
              .rdp-day.multi-event-date button[data-day="${dateAttr}"]:hover,
              .rdp-day.multi-event-date button[data-day="${dateAttr}"]:active,
              .rdp-day.multi-event-date button[data-day="${dateAttr}"]:focus,
              .rdp-day.multi-event-date button[data-day="${dateAttr}"][data-selected-single="true"],
              .rdp-day.multi-event-date button[data-day="${dateAttr}"][aria-pressed="true"] {
                background: ${gradient} !important;
                opacity: 1 !important;
              }
            `;
          }).join('\n')
        }} />
      )}
      
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-2 border-blue-200 dark:border-blue-800">
          <div className="mb-4">
            <h2 className="text-xl sm:text-2xl font-bold mb-1">
              Academic Calendar {calendarData.academic_year}
            </h2>
            <p className="text-sm text-muted-foreground">
              Click on any date to see details
            </p>
          </div>

          {/* Level Selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedLevel("1-4A")}
              className={`px-4 py-2 text-sm rounded-lg font-semibold transition-all ${
                selectedLevel === "1-4A"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-slate-700"
              }`}
            >
              1st - 4th Year
            </button>
            <button
              onClick={() => setSelectedLevel("5A")}
              className={`px-4 py-2 text-sm rounded-lg font-semibold transition-all ${
                selectedLevel === "5A"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-slate-700"
              }`}
            >
              5th Year
            </button>
          </div>
        </Card>
      </motion.div>

      {/* Floating Legend & Info Panel */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="fixed top-20 right-4 z-50 w-64 max-h-[calc(100vh-6rem)] overflow-y-auto hidden xl:block"
      >
        <Card className="p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm shadow-2xl border-2">
          {/* Legend Section */}
          <div className="mb-3">
            <p className="text-xs font-semibold mb-2">Color Legend:</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-green-500/50" />
                <span className="text-xs">Vacations</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-orange-500/50" />
                <span className="text-xs">Exams</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-purple-500/50" />
                <span className="text-xs">Councils</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-blue-500/50" />
                <span className="text-xs">Projects</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-yellow-500/50" />
                <span className="text-xs">Ramadan</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full ring-2 ring-red-500" />
                <span className="text-xs">Events</span>
              </div>
            </div>
          </div>

          {/* Selected Date Info Section */}
          {selectedDate && selectedDateInfo ? (
            <>
              <div className="border-t pt-3 mt-3">
                <h3 className="font-bold text-sm mb-2">
                  {selectedDate.toLocaleDateString("en-GB", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </h3>

                {selectedDateInfo.week && (
                  <div className="mb-2">
                    <Badge variant="outline" className="text-xs">
                      Week {selectedDateInfo.week.name}
                    </Badge>
                  </div>
                )}

                {selectedDateInfo.periods.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs font-semibold mb-1.5">Periods:</p>
                    <div className="space-y-1.5">
                      {selectedDateInfo.periods.map((period, idx) => (
                        <div
                          key={idx}
                          className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border"
                        >
                          <p className="font-medium text-xs">{period.name}</p>
                          {period.note && (
                            <p className="text-xs text-muted-foreground italic mt-1">
                              {period.note}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedDateInfo.events.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-1.5">Events:</p>
                    <div className="space-y-1">
                      {selectedDateInfo.events.map((event, idx) => (
                        <Badge key={idx} className="bg-red-500 text-white text-xs">
                          {event.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedDateInfo.periods.length === 0 &&
                  selectedDateInfo.events.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">
                      No special events or periods on this date
                    </p>
                  )}
              </div>
            </>
          ) : (
            <div className="border-t pt-3 mt-3">
              <p className="text-xs text-muted-foreground italic">
                Click on a date to see details
              </p>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Calendar Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {months.map((month, index) => (
            <motion.div
              key={month.toISOString()}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.05 * index }}
            >
              <Card className="p-3 flex items-center justify-center h-[340px]">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  month={month}
                  modifiers={modifiers}
                  modifiersClassNames={modifiersClassNames}
                  className="rounded-md mx-auto [&_.rdp-nav]:hidden"
                  disabled={false}
                />
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
