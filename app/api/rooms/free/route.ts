import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

// Normalize bloc names - treat I, J, K as one group
function normalizeBloc(bloc: string): string {
  const upper = bloc.toUpperCase();
  if (upper === 'I' || upper === 'J' || upper === 'K') {
    return 'IJK';
  }
  return upper;
}

function parseTimeStr(s: string): number | null {
  if (!s) return null;
  // Handle formats like "09H:00" or "09:00"
  const normalized = s.replace(/(\d{1,2})H:?(\d{2})/i, "$1:$2").trim();
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
    const freeWarning = new Set<string>();
    
    if (selectedDay && qMinutes !== null) {
      for (const groupKey of Object.keys(schedules)) {
        const group = schedules[groupKey];
        const events = group?.days?.[selectedDay] || [];
        
        for (const ev of events) {
          const { start, end } = eventRangeToMinutes(ev.time || "");
          if (start === null || end === null) continue;
          // Check if query time falls within this time slot
          // Use < end instead of <= end to avoid counting room as occupied at exact end time
          if (qMinutes < start || qMinutes >= end) continue;
          
          const course = (ev?.course || "").trim();
          const room = (ev?.room || "").trim();
          
          // Skip if course is FREE (room is empty)
          if (course.toUpperCase() === "FREE") {
            continue;
          }
          
          // If course is FREEWARNING, room is technically free but has soutenance risk
          if (course.toUpperCase() === "FREEWARNING" && room) {
            freeWarning.add(room);
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
    
    // All rooms that are NOT occupied and NOT in freeWarning are empty
    let empty = rooms.filter((r) => !occupied.has(r) && !freeWarning.has(r));
    let warning = rooms.filter((r) => freeWarning.has(r));
    
    // Apply building filter to empty and warning rooms
    if (buildingParam && buildingParam !== "all") {
      const normalizedParam = normalizeBloc(buildingParam);
      
      if (normalizedParam === 'IJK') {
        // Filter for rooms starting with I, J, or K
        empty = empty.filter((r) => r.startsWith('I') || r.startsWith('J') || r.startsWith('K'));
        warning = warning.filter((r) => r.startsWith('I') || r.startsWith('J') || r.startsWith('K'));
      } else {
        empty = empty.filter((r) => r.startsWith(buildingParam));
        warning = warning.filter((r) => r.startsWith(buildingParam));
      }
    }

    return NextResponse.json({ days, rooms, occupied: occupiedArr, empty, warning });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
