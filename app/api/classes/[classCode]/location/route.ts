import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

interface TimeSlot {
  time: string;
  course: string;
  room: string;
}

interface ClassSchedule {
  days: {
    [day: string]: TimeSlot[];
  };
  metadata: {
    year: string;
    semester: string;
    period: string;
  };
}

interface ScheduleData {
  [className: string]: ClassSchedule;
}

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
  // fallback: try to pick first two time-like tokens
  const toks = range.split(/\s+/).filter((t) => /\dH|:\d{2}/.test(t));
  if (toks.length >= 2)
    return { start: parseTimeStr(toks[0]), end: parseTimeStr(toks[1]) };
  return { start: null, end: null };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ classCode: string }> }
) {
  try {
    const { classCode } = await context.params;

    // Get query parameters for time and day
    const { searchParams } = new URL(request.url);
    const queryTime = searchParams.get("time") || "";
    const queryDay = searchParams.get("day") || "";

    const dataPath = path.join(process.cwd(), "data", "schedules.json");
    const raw = await fs.promises.readFile(dataPath, "utf-8");
    const schedules: ScheduleData = JSON.parse(raw);

    // Find the class in the schedules
    const classSchedule = schedules[classCode.toUpperCase()];

    if (!classSchedule) {
      return NextResponse.json({
        classCode,
        status: "no_schedule",
      });
    }

    // Build full schedule for the response (organized by day)
    const fullSchedule: { [day: string]: TimeSlot[] } = {};
    for (const [dayKey, sessions] of Object.entries(classSchedule.days)) {
      const dayName = dayKey.split(" ")[0]; // Extract day name (e.g., "Lundi" from "Lundi 03/11/2025")
      if (!fullSchedule[dayName]) {
        fullSchedule[dayName] = [];
      }
      fullSchedule[dayName].push(...sessions);
    }

    // Get current time or use query parameters
    const now = new Date();
    let currentMinutes = now.getHours() * 60 + now.getMinutes();
    let targetDayName = "";
    
    // If query parameters are provided, use them
    if (queryTime && queryDay) {
      // Parse query time (format: "09:00-10:30" or "09:00")
      const timeStr = queryTime.includes("-") ? queryTime.split("-")[0] : queryTime;
      const parsedMinutes = parseTimeStr(timeStr?.replaceAll(":", "H") || "");
      if (parsedMinutes !== null) {
        currentMinutes = parsedMinutes;
      }
      targetDayName = queryDay;
    } else if (queryDay) {
      targetDayName = queryDay;
    } else {
      // Use current day
      const daysOfWeek = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
      targetDayName = daysOfWeek[now.getDay()];
    }
    
    // Find session for the target day and time
    let currentSession: TimeSlot | null = null;
    
    for (const [dayKey, sessions] of Object.entries(classSchedule.days)) {
      const dayMatches = targetDayName ? dayKey.startsWith(targetDayName) : dayKey.startsWith(["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"][now.getDay()]);
      
      if (dayMatches) {
        for (const session of sessions) {
          // Skip FREE courses (no class at this time)
          if (session.course.toUpperCase() === "FREE") {
            continue;
          }
          
          const { start, end } = eventRangeToMinutes(session.time);
          // Check if current time falls within this session
          // Use < end instead of <= end to avoid overlapping time slots
          if (start !== null && end !== null && currentMinutes >= start && currentMinutes < end) {
            currentSession = session;
            break;
          }
        }
        if (currentSession) break;
      }
    }

    // If in session (or querying a time when there's a class)
    if (currentSession) {
      const { start, end } = eventRangeToMinutes(currentSession.time);
      return NextResponse.json({
        classCode,
        status: "in_session",
        room: {
          roomId: currentSession.room,
          name: currentSession.room,
          building: currentSession.room.charAt(0),
          coords: undefined, // Could be enhanced with actual coordinates
        },
        session: {
          start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), Math.floor((start || 0) / 60), (start || 0) % 60).toISOString(),
          end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), Math.floor((end || 0) / 60), (end || 0) % 60).toISOString(),
          course: currentSession.course,
        },
        fullSchedule,
        nextSession: undefined, // Clear next session when in session
      });
    }

    // Find next session (skip FREE, NOT-FREE, and En Ligne courses)
    // Look for the next session starting from the current time/day
    let nextSession: { day: string; start: string; end: string; room: string; course: string } | null = null;
    
    // If we're in lunch break (12:15-13:30 = 735-810 minutes), skip to after lunch
    const isLunchBreak = currentMinutes >= 735 && currentMinutes < 810;
    const searchFromMinutes = isLunchBreak ? 810 : currentMinutes; // Start search from 13:30 if in lunch break
    
    // First, try to find next session on the same day
    for (const [dayKey, sessions] of Object.entries(classSchedule.days)) {
      const dayMatches = targetDayName ? dayKey.startsWith(targetDayName) : false;
      
      if (dayMatches) {
        for (const session of sessions) {
          const courseUpper = session.course.toUpperCase();
          
          // Skip FREE, NOT-FREE courses
          if (courseUpper === "FREE" || courseUpper === "NOT-FREE") {
            continue;
          }
          
          const { start } = eventRangeToMinutes(session.time);
          
          // Only consider sessions that start after current time (or after lunch if in lunch break)
          if (start !== null && start >= searchFromMinutes) {
            nextSession = {
              day: dayKey,
              start: session.time.split("-")[0]?.trim() || session.time,
              end: session.time.split("-")[1]?.trim() || "",
              room: session.room,
              course: session.course,
            };
            break;
          }
        }
        if (nextSession) break;
      }
    }
    
    // If no next session found today, find the first session on any upcoming day
    if (!nextSession) {
      for (const [dayKey, sessions] of Object.entries(classSchedule.days)) {
        for (const session of sessions) {
          const courseUpper = session.course.toUpperCase();
          
          // Skip FREE, NOT-FREE courses
          if (courseUpper === "FREE" || courseUpper === "NOT-FREE") {
            continue;
          }
          
          nextSession = {
            day: dayKey,
            start: session.time.split("-")[0]?.trim() || session.time,
            end: session.time.split("-")[1]?.trim() || "",
            room: session.room,
            course: session.course,
          };
          break;
        }
        if (nextSession) break;
      }
    }

    return NextResponse.json({
      classCode,
      status: "not_in_session",
      nextSession,
      fullSchedule,
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
