"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, TrendingUp } from "lucide-react";

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

interface LevelData {
  periods: Period[];
  events: Array<{ name: string; date: string }>;
}

interface CalendarData {
  academic_year: string;
  weeks: Week[];
  "5A": LevelData;
  "1-4A": LevelData;
}

export function AcademicTicker() {
  const [data, setData] = useState<CalendarData | null>(null);
  const [currentWeek, setCurrentWeek] = useState<string>("--");
  const [nextExam5A, setNextExam5A] = useState<{
    name: string;
    days: number;
  } | null>(null);
  const [nextExam14A, setNextExam14A] = useState<{
    name: string;
    days: number;
  } | null>(null);
  const [winterVacation5A, setWinterVacation5A] = useState<number | null>(null);
  const [winterVacation14A, setWinterVacation14A] = useState<number | null>(
    null
  );

  useEffect(() => {
    fetch("/api/calendar")
      .then((res) => res.json())
      .then((calData: CalendarData) => {
        setData(calData);

        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset to start of day for accurate comparison

        // Find current week
        const week = calData.weeks.find((w) => {
          const start = new Date(w.start_date);
          const end = new Date(w.end_date);
          return today >= start && today <= end;
        });
        if (week) setCurrentWeek(week.name);

        // Find next exam for 5A - get all future exams and sort by start date
        const futureExams5A = calData["5A"].periods
          .filter((p) => {
            const lowerName = p.name.toLowerCase();
            const startDate = new Date(p.start_date);
            startDate.setHours(0, 0, 0, 0);
            return (
              (lowerName.includes("examen") || lowerName.includes("exam")) &&
              startDate >= today
            );
          })
          .sort(
            (a, b) =>
              new Date(a.start_date).getTime() -
              new Date(b.start_date).getTime()
          );

        if (futureExams5A.length > 0) {
          const exam = futureExams5A[0];
          const examDate = new Date(exam.start_date);
          examDate.setHours(0, 0, 0, 0);
          const days = Math.ceil(
            (examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );
          setNextExam5A({ name: exam.name, days });
        }

        // Find next exam for 1-4A - get all future exams and sort by start date
        const futureExams14A = calData["1-4A"].periods
          .filter((p) => {
            const lowerName = p.name.toLowerCase();
            const startDate = new Date(p.start_date);
            startDate.setHours(0, 0, 0, 0);
            return (
              (lowerName.includes("examen") || lowerName.includes("exam")) &&
              startDate >= today
            );
          })
          .sort(
            (a, b) =>
              new Date(a.start_date).getTime() -
              new Date(b.start_date).getTime()
          );

        if (futureExams14A.length > 0) {
          const exam = futureExams14A[0];
          const examDate = new Date(exam.start_date);
          examDate.setHours(0, 0, 0, 0);
          const days = Math.ceil(
            (examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );
          setNextExam14A({ name: exam.name, days });
        }

        // Find winter vacation for 5A
        const vacation5A = calData["5A"].periods.find((p) => {
          const lowerName = p.name.toLowerCase();
          return lowerName.includes("vacances") && lowerName.includes("hiver");
        });
        if (vacation5A) {
          const vacationDate = new Date(vacation5A.start_date);
          vacationDate.setHours(0, 0, 0, 0);
          const days = Math.ceil(
            (vacationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (days >= 0) setWinterVacation5A(days);
        }

        // Find winter vacation for 1-4A
        const vacation14A = calData["1-4A"].periods.find((p) => {
          const lowerName = p.name.toLowerCase();
          return lowerName.includes("vacances") && lowerName.includes("hiver");
        });
        if (vacation14A) {
          const vacationDate = new Date(vacation14A.start_date);
          vacationDate.setHours(0, 0, 0, 0);
          const days = Math.ceil(
            (vacationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (days >= 0) setWinterVacation14A(days);
        }
      })
      .catch(() => {});
  }, []);

  if (!data) return null;

  const items = [
    {
      icon: Calendar,
      text: `Current Week: ${currentWeek}`,
      color: "text-blue-500",
    },
    nextExam5A && {
      icon: TrendingUp,
      text: `5A Next Exam: ${nextExam5A.name} in ${nextExam5A.days}d`,
      color: "text-orange-500",
    },
    nextExam14A && {
      icon: TrendingUp,
      text: `1-4A Next Exam: ${nextExam14A.name} in ${nextExam14A.days}d`,
      color: "text-orange-500",
    },
    winterVacation5A !== null && {
      icon: Clock,
      text: `5A Winter Vacation: ${winterVacation5A}d`,
      color: "text-green-500",
    },
    winterVacation14A !== null && {
      icon: Clock,
      text: `1-4A Winter Vacation: ${winterVacation14A}d`,
      color: "text-green-500",
    },
  ].filter(Boolean);

  return (
    <div className="w-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 border-y border-slate-700 dark:border-slate-800 overflow-hidden py-2">
      <motion.div
        className="flex gap-8 whitespace-nowrap"
        animate={{
          x: [0, -2000],
        }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: 40,
            ease: "linear",
          },
        }}
      >
        {/* Duplicate items for seamless loop */}
        {[...items, ...items, ...items].map((item, index) => {
          if (!item) return null;
          const Icon = item.icon;
          return (
            <div
              key={`${item.text}-${index}`}
              className="flex items-center gap-2 text-white font-mono text-sm"
            >
              <Icon className={`h-4 w-4 ${item.color}`} />
              <span>{item.text}</span>
              <span className="text-slate-600">|</span>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
