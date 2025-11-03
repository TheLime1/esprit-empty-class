import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

function parseTimeStr(s: string): number | null {
  if (!s) return null;
  const normalized = s.replaceAll("H", ":").trim();
  const regex = /(\d{1,2}):(\d{2})/;
  const m = regex.exec(normalized);
  if (!m) return null;
  return Number.parseInt(m[1], 10) * 60 + Number.parseInt(m[2], 10);
}

function eventRangeToMinutes(range: string) {
  if (!range) return { start: null, end: null };
  const parts = range.split("-").map((p) => p.trim());
  if (parts.length === 2) {
    return { start: parseTimeStr(parts[0]), end: parseTimeStr(parts[1]) };
  }
  const toks = range.split(/\s+/).filter((t) => /\dH|:\d{2}/.test(t));
  if (toks.length >= 2)
    return { start: parseTimeStr(toks[0]), end: parseTimeStr(toks[1]) };
  return { start: null, end: null };
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const dayParam = url.searchParams.get("day");
    const timeParam = url.searchParams.get("time");
    const buildingParam = url.searchParams.get("building");

    const dataPath = path.join(process.cwd(), "data", "schedules.json");
    const raw = await fs.promises.readFile(dataPath, "utf-8");
    const schedules = JSON.parse(raw);

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
    const rooms = Array.from(roomSet).sort((a, b) => a.localeCompare(b));

    const selectedDay = dayParam || days[0] || null;
    const qMinutes = timeParam ? parseTimeStr(timeParam) : null;

    const occupied = new Set<string>();
    
    if (selectedDay && qMinutes !== null) {
      for (const groupKey of Object.keys(schedules)) {
        const group = schedules[groupKey];
        const events = group?.days?.[selectedDay] || [];
        
        for (const ev of events) {
          const { start, end } = eventRangeToMinutes(ev.time || "");
          if (start === null || end === null) continue;
          if (qMinutes < start || qMinutes > end) continue;
          
          const course = (ev?.course || "").trim();
          const room = (ev?.room || "").trim();
          
          // Skip if course is FREE (room is empty)
          if (course.toUpperCase() === "FREE") {
            continue;
          }
          
          // If course is NOT-FREE, another class is using this room - mark as occupied
          if (course.toUpperCase() === "NOT-FREE" && room) {
            occupied.add(room);
            continue;
          }
          
          // If room is "En Ligne", the primary room is free, so don't mark it as occupied
          if (room.toLowerCase() === "en ligne") {
            continue;
          }
          
          // Normal class - room is occupied
          if (room) {
            occupied.add(room);
          }
        }
      }
    }

    const occupiedArr = Array.from(occupied).sort((a, b) => a.localeCompare(b));
    
    // All rooms that are NOT occupied are empty
    let empty = rooms.filter((r) => !occupied.has(r));
    
    // Apply building filter to empty rooms
    if (buildingParam && buildingParam !== "all") {
      empty = empty.filter((r) => r.startsWith(buildingParam));
    }

    return NextResponse.json({ days, rooms, occupied: occupiedArr, empty });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
