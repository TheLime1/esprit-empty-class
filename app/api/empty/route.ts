import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

function parseTimeStr(s: string): number | null {
  if (!s) return null;
  // Handle formats like "09H:00" or "09:00"
  const normalized = s.replace(/(\d{1,2})H:?(\d{2})/i, "$1:$2").trim();
  const m = normalized.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function eventRangeToMinutes(range: string) {
  if (!range) return { start: null, end: null };
  const parts = range.split("-").map((p) => p.trim());
  if (parts.length === 2) {
    return { start: parseTimeStr(parts[0]), end: parseTimeStr(parts[1]) };
  }
  // fallback: try to pick first two time-like tokens
  const toks = range.split(/\s+/).filter((t) => /\dH|:\d{2}/.test(t));
  if (toks.length >= 2) return { start: parseTimeStr(toks[0]), end: parseTimeStr(toks[1]) };
  return { start: null, end: null };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const dayParam = url.searchParams.get("day");
    const timeParam = url.searchParams.get("time"); // expected HH:MM (24h)

    const dataPath = path.join(process.cwd(), "data", "schedules.json");
    const raw = await fs.promises.readFile(dataPath, "utf-8");
    const schedules = JSON.parse(raw);

    // collect all unique physical rooms
    const roomSet = new Set<string>();
    const daySet = new Set<string>();

    for (const groupKey of Object.keys(schedules)) {
      const group = schedules[groupKey];
      if (!group?.days) continue;
      for (const d of Object.keys(group.days)) {
        daySet.add(d);
        const events = group.days[d] || [];
        for (const ev of events) {
          if (!ev?.room) continue;
          const r = (ev.room || "").trim();
          if (!r) continue;
          if (r.toLowerCase() === "en ligne") continue;
          roomSet.add(r);
        }
      }
    }

    // Sort days by French weekday order
    const weekdayOrder = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
    const days = Array.from(daySet).sort((a, b) => {
      const dayA = weekdayOrder.findIndex(day => a.startsWith(day));
      const dayB = weekdayOrder.findIndex(day => b.startsWith(day));
      return dayA - dayB;
    });
    const rooms = Array.from(roomSet).sort();

    const selectedDay = dayParam || days[0] || null;
    const qMinutes = timeParam ? parseTimeStr(timeParam) : null;

    const occupied = new Set<string>();
    if (selectedDay && qMinutes !== null) {
      for (const groupKey of Object.keys(schedules)) {
        const group = schedules[groupKey];
        const events = group?.days?.[selectedDay] || [];
        for (const ev of events) {
          const course = (ev?.course || "").trim();
          const room = (ev?.room || "").trim();
          
          // Skip FREE courses (room is available)
          if (course.toUpperCase() === "FREE") continue;
          
          // Skip online courses
          if (!room || room.toLowerCase() === "en ligne") continue;
          
          const { start, end } = eventRangeToMinutes(ev.time || "");
          if (start === null || end === null) continue;
          // Check if query time falls within this time slot
          // Use < end instead of <= end to avoid counting room as occupied at exact end time
          if (qMinutes >= start && qMinutes < end) {
            occupied.add(room);
          }
        }
      }
    }

    const occupiedArr = Array.from(occupied).sort();
    const empty = rooms.filter((r) => !occupied.has(r));

    return NextResponse.json({ days, rooms, occupied: occupiedArr, empty });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
