import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/app/api/v1/_lib/auth";
import { findFreeRooms } from "@/app/api/_lib/rooms";

export async function GET(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────
  const authError = validateApiKey(req);
  if (authError) return authError;

  // ── Query params ────────────────────────────────────────────────────────
  try {
    const url = new URL(req.url);
    const day = url.searchParams.get("day");
    const time = url.searchParams.get("time");
    const building = url.searchParams.get("building");

    // Basic validation
    if (time && !/^\d{1,2}:\d{2}$/.test(time)) {
      return NextResponse.json(
        { error: "Invalid time format. Expected HH:MM (24h), e.g. 09:00" },
        { status: 400 }
      );
    }

    const result = await findFreeRooms({ day, time, building });
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
