import { NextResponse } from "next/server";
import path from "node:path";
import { promises as fs } from "node:fs";

interface Week {
  name: string;
  start_date: string;
  end_date: string;
}

interface CalendarData {
  academic_year: string;
  weeks: Week[];
}

export async function GET() {
  try {
    const filePath = path.join(
      process.cwd(),
      "data",
      "year_calendar2025-2026.json"
    );
    const fileContents = await fs.readFile(filePath, "utf8");
    const data: CalendarData = JSON.parse(fileContents);

    const now = new Date();
    // Normalize to YYYY-MM-DD in local time for comparison
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const weeks = data.weeks;
    // Semester 1 weeks are the first 14, semester 2 the last 14
    const semester1Weeks = weeks.filter((w) => w.start_date < "2026-01-01");
    const semester2Weeks = weeks.filter((w) => w.start_date >= "2026-01-01");

    let currentWeek: (Week & { semester: number }) | null = null;

    for (const week of semester1Weeks) {
      if (todayStr >= week.start_date && todayStr <= week.end_date) {
        currentWeek = { ...week, semester: 1 };
        break;
      }
    }

    if (!currentWeek) {
      for (const week of semester2Weeks) {
        if (todayStr >= week.start_date && todayStr <= week.end_date) {
          currentWeek = { ...week, semester: 2 };
          break;
        }
      }
    }

    if (!currentWeek) {
      return NextResponse.json(
        {
          academic_year: data.academic_year,
          current_week: null,
          message:
            "No academic week matches today's date. You may be in a holiday or exam period.",
          date: todayStr,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      academic_year: data.academic_year,
      current_week: {
        name: currentWeek.name,
        semester: currentWeek.semester,
        start_date: currentWeek.start_date,
        end_date: currentWeek.end_date,
      },
      date: todayStr,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load calendar data" },
      { status: 500 }
    );
  }
}
