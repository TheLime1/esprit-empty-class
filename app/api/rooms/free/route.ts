import { NextRequest, NextResponse } from "next/server";
import { findFreeRooms } from "@/app/api/_lib/rooms";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
  "Access-Control-Allow-Origin": "*",
};

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const result = await findFreeRooms({
      day: url.searchParams.get("day"),
      time: url.searchParams.get("time"),
      building: url.searchParams.get("building"),
    });

    return NextResponse.json(result, { headers: CACHE_HEADERS });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
