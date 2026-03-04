import { NextResponse } from "next/server";
import path from "node:path";
import { promises as fs } from "node:fs";

export async function GET() {
  try {
    const filePath = path.join(
      process.cwd(),
      "data",
      "year_calendar2025-2026.json"
    );
    const fileContents = await fs.readFile(filePath, "utf8");
    const data = JSON.parse(fileContents);

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to load calendar data" },
      { status: 500 }
    );
  }
}
