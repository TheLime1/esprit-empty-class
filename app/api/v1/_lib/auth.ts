import { NextRequest, NextResponse } from "next/server";

/**
 * Validate the X-API-Key header against the server-side API_KEY env var.
 *
 * Returns `null` if the key is valid.
 * Returns a 401 NextResponse if the key is missing or wrong — the caller
 * should return this response immediately.
 */
export function validateApiKey(req: NextRequest): NextResponse | null {
  const serverKey = process.env.API_KEY;

  if (!serverKey) {
    console.error("[auth] API_KEY environment variable is not set");
    return NextResponse.json(
      { error: "Server misconfiguration – API key not set" },
      { status: 500 }
    );
  }

  const clientKey = req.headers.get("x-api-key");

  if (!clientKey || clientKey !== serverKey) {
    return NextResponse.json(
      { error: "Missing or invalid API key" },
      { status: 401 }
    );
  }

  return null; // key is valid
}
