import { NextResponse } from "next/server";
import { findExamClass, loadExamCalendar } from "@/app/api/_lib/exams";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
  "Access-Control-Allow-Origin": "*",
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ classCode: string }> },
) {
  try {
    const { classCode } = await context.params;
    const examCalendar = await loadExamCalendar();
    const result = findExamClass(classCode, examCalendar);

    if (!result) {
      return NextResponse.json(
        {
          classCode,
          status: "no_exams",
          exams: [],
        },
        { headers: CACHE_HEADERS },
      );
    }

    return NextResponse.json(
      {
        classCode: result.classCode,
        status: "found",
        exams: result.exams,
      },
      { headers: CACHE_HEADERS },
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to load exam calendar data" },
      { status: 500 },
    );
  }
}
