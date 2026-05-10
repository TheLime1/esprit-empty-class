"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Calendar as CalendarIcon,
  CalendarDays,
  Clock,
  FileText,
  List,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { ClassSearchForm } from "../WhereIsMyClass/ClassSearchForm";
import { ErrorState } from "../Shared/ErrorState";
import { ClassResultSkeleton } from "../Shared/Skeletons";
import {
  getPersistedClassCode,
  usePersistentClassCode,
} from "../Shared/usePersistentClassCode";

interface ExamEvent {
  date: string;
  day: string;
  time: string;
  subject: string;
}

interface ExamApiResult {
  classCode: string;
  status: "found" | "no_exams";
  exams: ExamEvent[];
}

function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatExamDate(exam: ExamEvent): string {
  return `${exam.day} ${exam.date.split("-").reverse().join("/")}`;
}

function groupExamsByDate(exams: ExamEvent[]) {
  const grouped = new Map<string, ExamEvent[]>();
  for (const exam of exams) {
    if (!grouped.has(exam.date)) {
      grouped.set(exam.date, []);
    }
    grouped.get(exam.date)!.push(exam);
  }
  return grouped;
}

export function ExamCalendar() {
  const [classCode, setClassCode] = usePersistentClassCode();
  const [result, setResult] = useState<ExamApiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialSearchDone, setInitialSearchDone] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  const handleSearch = useCallback(async (classCode: string) => {
    const normalizedClassCode = classCode.trim().toUpperCase();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      setClassCode(normalizedClassCode);

      const url = `/api/exams/${encodeURIComponent(normalizedClassCode)}`;
      const res = await fetch(url);
      const data = await res.json();

      if ((data as { error?: string }).error) {
        throw new Error((data as { error: string }).error);
      }

      const nextResult = data as ExamApiResult;
      setResult(nextResult);
      setSelectedDate(
        nextResult.exams[0] ? parseLocalDate(nextResult.exams[0].date) : undefined,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [setClassCode]);

  useEffect(() => {
    if (initialSearchDone) {
      return;
    }

    setInitialSearchDone(true);
    const lastClass = getPersistedClassCode();
    if (lastClass) {
      void handleSearch(lastClass);
    }
  }, [handleSearch, initialSearchDone]);

  const examsByDate = useMemo(
    () => groupExamsByDate(result?.exams ?? []),
    [result?.exams],
  );
  const examDates = useMemo(
    () => Array.from(examsByDate.keys()).map(parseLocalDate),
    [examsByDate],
  );
  const selectedDateKey = selectedDate
    ? getLocalDateString(selectedDate)
    : "";
  const selectedDateExams = selectedDateKey
    ? examsByDate.get(selectedDateKey) ?? []
    : [];

  return (
    <div className="space-y-4">
      <ClassSearchForm
        onSearch={handleSearch}
        loading={loading}
        classCode={classCode}
        onClassCodeChange={setClassCode}
        buttonLabel="Find Exams"
        loadingLabel="Loading..."
      />

      {loading && <ClassResultSkeleton />}

      {error && <ErrorState message={error} onRetry={() => setError(null)} />}

      {!loading && !error && result?.status === "no_exams" && (
        <Card className="p-8 text-center border-2 border-slate-200 dark:border-slate-800">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-2xl font-bold mb-2">No Exams Found</h3>
          <p className="text-muted-foreground">
            No exam calendar was found for{" "}
            <span className="font-semibold text-foreground">
              {result.classCode}
            </span>
            .
          </p>
        </Card>
      )}

      {!loading && !error && result?.status === "found" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-4 sm:p-6 md:p-8 border-2 bg-gradient-to-br from-cyan-50 to-emerald-50 dark:from-cyan-950/20 dark:to-emerald-950/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h3 className="text-2xl sm:text-3xl font-bold">
                  Exams for {result.classCode}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {result.exams.length} scheduled exams
                </p>
              </div>
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

            {viewMode === "list" ? (
              <ExamList exams={result.exams} />
            ) : (
              <ExamCalendarView
                examDates={examDates}
                selectedDate={selectedDate}
                selectedDateExams={selectedDateExams}
                onSelectDate={setSelectedDate}
              />
            )}
          </Card>
        </motion.div>
      )}
    </div>
  );
}

function ExamList({ exams }: Readonly<{ exams: ExamEvent[] }>) {
  return (
    <div className="space-y-3">
      {exams.map((exam, index) => (
        <motion.div
          key={`${exam.date}-${exam.time}-${exam.subject}`}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.04 }}
        >
          <Card className="p-4 bg-white/80 dark:bg-slate-950/80 border-l-4 border-cyan-500">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="font-semibold">
                    <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                    {formatExamDate(exam)}
                  </Badge>
                  <Badge className="bg-cyan-600 hover:bg-cyan-700">
                    <Clock className="h-3.5 w-3.5 mr-1.5" />
                    {exam.time}
                  </Badge>
                </div>
                <p className="text-base font-semibold leading-relaxed">
                  {exam.subject}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

function ExamCalendarView({
  examDates,
  selectedDate,
  selectedDateExams,
  onSelectDate,
}: Readonly<{
  examDates: Date[];
  selectedDate: Date | undefined;
  selectedDateExams: ExamEvent[];
  onSelectDate: (date: Date | undefined) => void;
}>) {
  const modifiersClassNames = {
    exam: "!bg-cyan-600 !text-white hover:!bg-cyan-700 !rounded-full [&_button]:!rounded-full",
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[new Date(2026, 4, 1), new Date(2026, 5, 1)].map((month) => (
          <Card
            key={month.toISOString()}
            className="p-3 flex items-center justify-center bg-white/80 dark:bg-slate-950/80"
          >
            <Calendar
              mode="single"
              month={month}
              selected={selectedDate}
              onSelect={onSelectDate}
              modifiers={{ exam: examDates }}
              modifiersClassNames={modifiersClassNames}
              className="rounded-md mx-auto [&_.rdp-nav]:hidden"
            />
          </Card>
        ))}
      </div>

      <Card className="p-4 bg-white/80 dark:bg-slate-950/80">
        <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
          <FileText className="h-5 w-5 text-cyan-600" />
          Selected Date
        </h4>

        {selectedDateExams.length === 0 ? (
          <p className="text-sm text-muted-foreground">No exam on this date.</p>
        ) : (
          <div className="space-y-3">
            {selectedDateExams.map((exam) => (
              <div
                key={`${exam.date}-${exam.time}-${exam.subject}`}
                className="rounded-lg border p-3 bg-slate-50 dark:bg-slate-900"
              >
                <div className="flex flex-wrap gap-2 mb-2">
                  <Badge variant="outline">{formatExamDate(exam)}</Badge>
                  <Badge className="bg-cyan-600 hover:bg-cyan-700">
                    {exam.time}
                  </Badge>
                </div>
                <p className="text-sm font-medium leading-relaxed">
                  {exam.subject}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
