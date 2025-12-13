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

/**
 * Remove accents from a string (e.g., "Méca" → "MECA")
 */
function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Normalize class code for flexible searching.
 * Handles aliases like "4erp1" or "4bi1" matching "4ERP-BI1"
 * Also handles accented characters like "4meca" matching "4MécaT1"
 */
function findMatchingClassName(searchCode: string, schedules: ScheduleData): string | null {
  const upperSearch = removeAccents(searchCode.toUpperCase());
  
  console.log(`\n[SEARCH DEBUG] Searching for: "${searchCode}" (uppercase: "${upperSearch}")`);
  
  // Direct match first (with accent removal)
  const directMatch = Object.keys(schedules).find(key => removeAccents(key.toUpperCase()) === upperSearch);
  if (directMatch) {
    console.log(`[SEARCH DEBUG] ✓ Direct match found: ${directMatch}`);
    return directMatch;
  }
  
  // Normalize search (remove special chars and accents)
  const normalizedSearch = upperSearch.replaceAll(/[^A-Z0-9]/g, '');
  
  // Validate: search must contain at least one digit
  if (!/\d/.test(normalizedSearch)) {
    console.log(`[SEARCH DEBUG] ✗ Search contains no numbers, rejecting`);
    return null;
  }
  
  console.log(`[SEARCH DEBUG] Normalized search: "${normalizedSearch}"`);
  
  // Try flexible matching for complex class names
  // Priority order:
  // 1. Exact normalized match (e.g., "4ERPBI3" → "4ERP-BI3", "4MECAT1" → "4MécaT1")
  // 2. Flexible match for ERP-BI style (e.g., "4bi3" → "4ERP-BI3", "4erp3" → "4ERP-BI3")
  
  for (const className of Object.keys(schedules)) {
    const normalizedClass = removeAccents(className.toUpperCase()).replaceAll(/[^A-Z0-9]/g, '');
    
    console.log(`[SEARCH DEBUG] Checking class: "${className}" (normalized: "${normalizedClass}")`);
    
    // 1. EXACT normalized match (highest priority)
    if (normalizedClass === normalizedSearch) {
      console.log(`[SEARCH DEBUG]   ✓ EXACT normalized match!`);
      return className;
    }
  }
  
  // 2. Flexible matching for classes with dashes/complex names
  // Example: "4bi3" should match "4ERP-BI3", "4erp3" should match "4ERP-BI3"
  // Strategy: Match if search contains a substring of letters that appears in class
  // AND the final numbers match exactly
  
  console.log(`[SEARCH DEBUG] No exact match, trying flexible matching for complex names...`);
  
  // Extract the trailing number from search (e.g., "4BI3" → "3", "4ERP1" → "1")
  const searchTrailingNum = normalizedSearch.match(/\d+$/)?.[0];
  
  if (!searchTrailingNum) {
    console.log(`[SEARCH DEBUG] ✗ No trailing number in search`);
    return null;
  }
  
  console.log(`[SEARCH DEBUG] Search trailing number: "${searchTrailingNum}"`);
  
  for (const className of Object.keys(schedules)) {
    const normalizedClass = removeAccents(className.toUpperCase()).replaceAll(/[^A-Z0-9]/g, '');
    
    // Extract trailing number from class name
    const classTrailingNum = normalizedClass.match(/\d+$/)?.[0];
    
    if (!classTrailingNum) {
      continue;
    }
    
    // Numbers must match EXACTLY (no substring matching)
    if (classTrailingNum !== searchTrailingNum) {
      continue;
    }
    
    console.log(`[SEARCH DEBUG] Class "${className}" has matching trailing number "${classTrailingNum}"`);
    
    // Extract the leading digit(s) and middle letters
    // e.g., "4ERPBI3" → leading: "4", letters: "ERPBI"
    const searchLeading = normalizedSearch.match(/^(\d+)/)?.[0];
    const classLeading = normalizedClass.match(/^(\d+)/)?.[0];
    
    // Leading numbers must match
    if (searchLeading !== classLeading) {
      console.log(`[SEARCH DEBUG]   Leading numbers don't match: "${searchLeading}" vs "${classLeading}"`);
      continue;
    }
    
    // Get the middle letters (between leading and trailing numbers)
    const searchMiddle = normalizedSearch.slice(searchLeading?.length || 0, -(searchTrailingNum.length));
    const classMiddle = normalizedClass.slice(classLeading?.length || 0, -(classTrailingNum.length));
    
    console.log(`[SEARCH DEBUG]   Comparing middle letters: search="${searchMiddle}" vs class="${classMiddle}"`);
    
    // For flexible matching: search letters should be a substring of class letters
    // OR class letters should contain all search letters (for "4BI3" → "4ERP-BI3")
    if (classMiddle.includes(searchMiddle)) {
      console.log(`[SEARCH DEBUG]   ✓ FLEXIBLE MATCH: "${searchMiddle}" found in "${classMiddle}"`);
      return className;
    }
  }
  
  console.log(`[SEARCH DEBUG] ✗ No match found`);
  return null;
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

    // Find the class in the schedules using flexible matching
    const matchedClassName = findMatchingClassName(classCode, schedules);
    const classSchedule = matchedClassName ? schedules[matchedClassName] : null;

    if (!classSchedule || !matchedClassName) {
      return NextResponse.json({
        classCode,
        status: "no_schedule",
      });
    }
    
    // Use the matched class name for the response
    const resolvedClassCode = matchedClassName;

    // Build full schedule for the response (organized by day)
    const fullSchedule: { [day: string]: TimeSlot[] } = {};
    for (const [dayKey, sessions] of Object.entries(classSchedule.days)) {
      const dayName = dayKey.split(" ")[0]; // Extract day name (e.g., "Lundi" from "Lundi 03/11/2025")
      if (!fullSchedule[dayName]) {
        fullSchedule[dayName] = [];
      }
      fullSchedule[dayName].push(...sessions);
    }

    // Get current time in Tunisia timezone (Africa/Tunis = UTC+1)
    const now = new Date();
    const tunisiaTime = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Tunis" }));
    let currentMinutes = tunisiaTime.getHours() * 60 + tunisiaTime.getMinutes();
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
      // Use current day in Tunisia timezone
      const daysOfWeek = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
      targetDayName = daysOfWeek[tunisiaTime.getDay()];
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
        classCode: resolvedClassCode,
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
    
    // Detect if we're in a lunch break by checking if there's a FREE period around current time
    let isLunchBreak = false;
    let lunchBreakEnd = 810; // Default 13:30
    
    for (const [dayKey, sessions] of Object.entries(classSchedule.days)) {
      const dayMatches = targetDayName ? dayKey.startsWith(targetDayName) : false;
      if (dayMatches) {
        for (const session of sessions) {
          if (session.course.toUpperCase() === "FREE") {
            const { start, end } = eventRangeToMinutes(session.time);
            if (start !== null && end !== null && currentMinutes >= start && currentMinutes < end) {
              // We're in a FREE period (likely lunch break)
              isLunchBreak = true;
              lunchBreakEnd = end;
              break;
            }
          }
        }
        if (isLunchBreak) break;
      }
    }
    
    const searchFromMinutes = isLunchBreak ? lunchBreakEnd : currentMinutes; // Start search from end of lunch break
    
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
      classCode: resolvedClassCode,
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
