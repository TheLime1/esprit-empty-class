"use client";

import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";

interface Week {
  name: string;
  start_date: string;
  end_date: string;
}

interface CalendarData {
  academic_year: string;
  weeks: Week[];
}

export function AcademicTicker() {
  const [currentWeek, setCurrentWeek] = useState<string>("--");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/calendar")
      .then((res) => res.json())
      .then((calData: CalendarData) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const week = calData.weeks.find((w) => {
          const start = new Date(w.start_date);
          const end = new Date(w.end_date);
          return today >= start && today <= end;
        });
        if (week) setCurrentWeek(week.name);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded) return null;

  return (
    <div className="w-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 border-y border-slate-700 dark:border-slate-800 py-2">
      <div className="flex items-center justify-center gap-2 text-white font-mono text-sm">
        <Calendar className="h-4 w-4 text-blue-500" />
        <span>Current Week: {currentWeek}</span>
      </div>
    </div>
  );
}
