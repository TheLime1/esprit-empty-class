import { NextResponse } from "next/server";
import { findFreeRooms } from "@/app/api/_lib/rooms";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const result = await findFreeRooms({
      day: url.searchParams.get("day"),
      time: url.searchParams.get("time"),
    });

    // The original /api/empty endpoint does not return "warning"
    return NextResponse.json({
      days: result.days,
      rooms: result.rooms,
      occupied: result.occupied,
      empty: [...result.empty, ...result.warning], // merge warning into empty for backwards compat
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
