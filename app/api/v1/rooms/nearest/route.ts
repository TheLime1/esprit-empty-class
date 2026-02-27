import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/app/api/v1/_lib/auth";
import { findNearestEmptyRoomForClass } from "@/app/api/_lib/rooms";

export async function GET(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────
  const authError = validateApiKey(req);
  if (authError) return authError;

  // ── Params ──────────────────────────────────────────────────────────────
  try {
    const url = new URL(req.url);
    const classParam = url.searchParams.get("class");
    const day = url.searchParams.get("day");
    const time = url.searchParams.get("time");

    if (!classParam) {
      return NextResponse.json(
        { error: "Missing required parameter: class (e.g. class=4SAE11)" },
        { status: 400 },
      );
    }

    if (time && !/^\d{1,2}:\d{2}$/.test(time)) {
      return NextResponse.json(
        { error: "Invalid time format. Expected HH:MM (24h), e.g. 09:00" },
        { status: 400 },
      );
    }

    const result = await findNearestEmptyRoomForClass(classParam, day, time);

    if (!result.currentRoom) {
      return NextResponse.json(
        { error: `Class "${classParam}" not found or has no room assigned` },
        { status: 404 },
      );
    }

    return NextResponse.json({
      class: result.classCode,
      currentRoom: result.currentRoom,
      nearest: result.nearest,
      isWarning: result.isWarning,
      day: result.day,
      time: result.time,
      topCandidates: result.allCandidates,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
