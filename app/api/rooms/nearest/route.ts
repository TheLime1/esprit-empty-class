import { NextRequest, NextResponse } from "next/server";
import { findNearestEmptyRoomForClass } from "@/app/api/_lib/rooms";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const classParam = url.searchParams.get("class");
    const day = url.searchParams.get("day");
    const time = url.searchParams.get("time");

    if (!classParam) {
      return NextResponse.json(
        { error: "Missing required parameter: class" },
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
      topCandidates: result.allCandidates,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
