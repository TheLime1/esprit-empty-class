import fs from "node:fs";
import path from "node:path";
import { findMatchingClassKey } from "./class-codes";

export interface ExamEvent {
  date: string;
  day: string;
  time: string;
  subject: string;
}

export interface ExamCalendarData {
  metadata: {
    academicYear: string;
    sourcePdf: string;
    pagesParsed: number;
    classCount: number;
    eventCount: number;
  };
  classes: Record<string, ExamEvent[]>;
}

export interface ExamClassResult {
  classCode: string;
  exams: ExamEvent[];
}

let examCalendarCache:
  | { data: ExamCalendarData; loadedAt: number }
  | null = null;
const EXAM_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export async function loadExamCalendar(): Promise<ExamCalendarData> {
  const now = Date.now();
  if (
    examCalendarCache &&
    now - examCalendarCache.loadedAt < EXAM_CACHE_TTL_MS
  ) {
    return examCalendarCache.data;
  }

  const dataPath = path.join(
    process.cwd(),
    "data",
    "exam_calendar2025-2026.json",
  );
  const raw = await fs.promises.readFile(dataPath, "utf-8");
  const data = JSON.parse(raw) as ExamCalendarData;
  examCalendarCache = { data, loadedAt: now };
  return data;
}

export function findExamClass(
  classCode: string,
  data: ExamCalendarData,
): ExamClassResult | null {
  const matchedClassKey = findMatchingClassKey(
    classCode,
    Object.keys(data.classes),
  );

  if (!matchedClassKey) {
    return null;
  }

  return {
    classCode: matchedClassKey,
    exams: data.classes[matchedClassKey] ?? [],
  };
}
