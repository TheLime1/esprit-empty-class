import fs from "node:fs";
import path from "node:path";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RoomQueryParams {
  day?: string | null;
  time?: string | null;
  building?: string | null;
}

export interface RoomResult {
  days: string[];
  rooms: string[];
  occupied: string[];
  empty: string[];
  warning: string[];
}

export interface ParsedRoom {
  raw: string;
  block: string;
  floor: number;
  roomNum: number;
}

export interface NearestRoomResult {
  nearest: string | null;
  isWarning: boolean;
  allCandidates: { room: string; isWarning: boolean; score: number }[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Normalize bloc names – treat I, J, K as one group */
export function normalizeBloc(bloc: string): string {
  const upper = bloc.toUpperCase();
  if (upper === "I" || upper === "J" || upper === "K") {
    return "IJK";
  }
  return upper;
}

/** Parse a time string like "09H:00" or "09:00" → minutes since midnight */
export function parseTimeStr(s: string): number | null {
  if (!s) return null;
  const normalized = s.replace(/(\d{1,2})H:?(\d{2})/i, "$1:$2").trim();
  const regex = /(\d{1,2}):(\d{2})/;
  const m = regex.exec(normalized);
  if (!m) return null;
  return Number.parseInt(m[1], 10) * 60 + Number.parseInt(m[2], 10);
}

/** Parse an event time range like "09H:00 - 12H:15" → { start, end } in minutes */
export function eventRangeToMinutes(range: string) {
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

// ─── Core logic ──────────────────────────────────────────────────────────────

interface ScheduleEvent {
  time?: string;
  course?: string;
  room?: string;
  [key: string]: unknown;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Schedules = Record<string, any>;

/** Load & parse the schedules JSON from disk */
export async function loadSchedules(): Promise<Schedules> {
  const dataPath = path.join(process.cwd(), "data", "schedules.json");
  const raw = await fs.promises.readFile(dataPath, "utf-8");
  return JSON.parse(raw);
}

// ─── Internal helpers (broken out to reduce cognitive complexity) ─────────

const WEEKDAY_ORDER = [
  "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche",
];

/** Collect every unique physical room and schedule day from all groups. */
function collectRoomsAndDays(schedules: Schedules) {
  const roomSet = new Set<string>();
  const daySet = new Set<string>();

  for (const groupKey of Object.keys(schedules)) {
    const group = schedules[groupKey];
    if (!group?.days) continue;
    for (const d of Object.keys(group.days)) {
      daySet.add(d);
      for (const ev of (group.days[d] || [])) {
        const r = (ev?.room || "").trim();
        if (r && r.toLowerCase() !== "en ligne") roomSet.add(r);
      }
    }
  }

  const days = Array.from(daySet).sort((a, b) => {
    const ia = WEEKDAY_ORDER.findIndex((w) => a.startsWith(w));
    const ib = WEEKDAY_ORDER.findIndex((w) => b.startsWith(w));
    return ia - ib;
  });
  const rooms = Array.from(roomSet).sort((a, b) => a.localeCompare(b));

  return { days, rooms };
}

/** Classify a single event — mutates `occupied` / `freeWarning` sets. */
function classifyEvent(
  ev: ScheduleEvent,
  qMinutes: number,
  occupied: Set<string>,
  freeWarning: Set<string>,
) {
  const { start, end } = eventRangeToMinutes(ev.time || "");
  if (start === null || end === null) return;
  if (qMinutes < start || qMinutes >= end) return;

  const course = (ev?.course || "").trim().toUpperCase();
  const room = (ev?.room || "").trim();

  if (course === "FREE") return;
  if (course === "FREEWARNING" && room) { freeWarning.add(room); return; }
  if (course === "NOT-FREE" && room) { occupied.add(room); return; }
  if (room.toLowerCase() === "en ligne") return;
  if (room) occupied.add(room);
}

/** Determine occupied / freeWarning sets for a given day+time. */
function computeOccupancy(
  schedules: Schedules,
  selectedDay: string,
  qMinutes: number,
) {
  const occupied = new Set<string>();
  const freeWarning = new Set<string>();

  for (const groupKey of Object.keys(schedules)) {
    const events = schedules[groupKey]?.days?.[selectedDay] || [];
    for (const ev of events) {
      classifyEvent(ev, qMinutes, occupied, freeWarning);
    }
  }

  return { occupied, freeWarning };
}

/** Filter room list by building prefix. */
function filterByBuilding(list: string[], building: string): string[] {
  const norm = normalizeBloc(building);
  if (norm === "IJK") {
    return list.filter((r) => r.startsWith("I") || r.startsWith("J") || r.startsWith("K"));
  }
  return list.filter((r) => r.startsWith(building));
}

// ─── Public API ──────────────────────────────────────────────────────────

/**
 * Compute the list of empty/occupied/warning rooms.
 *
 * This implements the full logic previously duplicated across
 * /api/empty and /api/rooms/free.
 */
export async function findFreeRooms(params: RoomQueryParams): Promise<RoomResult> {
  const schedules = await loadSchedules();
  const { days, rooms } = collectRoomsAndDays(schedules);

  const selectedDay = params.day || days[0] || null;
  const qMinutes = params.time ? parseTimeStr(params.time) : null;

  let occupied = new Set<string>();
  let freeWarning = new Set<string>();

  if (selectedDay && qMinutes !== null) {
    ({ occupied, freeWarning } = computeOccupancy(schedules, selectedDay, qMinutes));
  }

  const occupiedArr = Array.from(occupied).sort((a, b) => a.localeCompare(b));

  let empty = rooms.filter((r) => !occupied.has(r) && !freeWarning.has(r));
  let warning = rooms.filter((r) => freeWarning.has(r));

  // Apply building filter
  if (params.building && params.building !== "all") {
    empty = filterByBuilding(empty, params.building);
    warning = filterByBuilding(warning, params.building);
  }

  return { days, rooms, occupied: occupiedArr, empty, warning };
}

// ─── Room proximity logic ────────────────────────────────────────────────

/**
 * Parse a room name like "G308" → { block: "G", floor: 3, roomNum: 8 }
 * or "A12" → { block: "A", floor: 1, roomNum: 2 }
 * or "M205" → { block: "M", floor: 2, roomNum: 5 }
 *
 * Pattern: leading letters = block, remaining digits:
 *   first digit = floor, rest = room number.
 */
export function parseRoom(name: string): ParsedRoom | null {
  const m = /^([A-Za-z]+)(\d+)$/.exec(name.trim());
  if (!m) return null;

  const block = m[1].toUpperCase();
  const digits = m[2];

  if (digits.length === 0) return null;

  const floor = Number.parseInt(digits[0], 10);
  const roomNum = digits.length > 1
    ? Number.parseInt(digits.slice(1), 10)
    : 0;

  return { raw: name.trim(), block, floor, roomNum };
}

/**
 * Check if two blocks belong to the same physical group.
 * I, J, K are treated as the same group (adjacent buildings at ESPRIT).
 */
function isSameBlockGroup(a: string, b: string): boolean {
  if (a === b) return true;
  const ijkGroup = new Set(["I", "J", "K"]);
  return ijkGroup.has(a) && ijkGroup.has(b);
}

/**
 * Score a candidate room relative to the origin room.
 * **Lower score = better match.**
 *
 * Priority (encoded in score tiers):
 *  1. Same block, same floor                      → 0–999
 *  2. Same block, floor − 1 (below = easier)      → 1000–1999
 *  3. Same block, floor + 1 (above)               → 2000–2999
 *  4. Same block, other floors (closer is better)  → 3000–3999
 *  5. Different block (further away)               → 10000+
 *
 * Within each tier the room-number distance is the tie-breaker.
 */
function proximityScore(origin: ParsedRoom, candidate: ParsedRoom): number {
  const roomDist = Math.abs(origin.roomNum - candidate.roomNum);
  const sameBlock = isSameBlockGroup(origin.block, candidate.block);

  if (!sameBlock) {
    const floorDist = Math.abs(origin.floor - candidate.floor);
    return 10000 + floorDist * 100 + roomDist;
  }

  const floorDiff = candidate.floor - origin.floor;

  if (floorDiff === 0) return roomDist;                               // same floor
  if (floorDiff === -1) return 1000 + roomDist;                       // 1 floor below
  if (floorDiff === 1) return 2000 + roomDist;                        // 1 floor above
  return 3000 + Math.abs(floorDiff) * 100 + roomDist;                 // further floors
}

/**
 * Find the nearest empty room to `originRoom` given the current empty + warning lists.
 * Uses the proximity scoring system above.
 */
export function findNearestRoom(
  originRoom: string,
  emptyRooms: string[],
  warningRooms: string[],
): NearestRoomResult {
  const origin = parseRoom(originRoom);
  if (!origin) {
    return { nearest: null, isWarning: false, allCandidates: [] };
  }

  const candidates: { room: string; isWarning: boolean; score: number }[] = [];

  for (const r of emptyRooms) {
    const parsed = parseRoom(r);
    if (!parsed) continue;
    candidates.push({ room: r, isWarning: false, score: proximityScore(origin, parsed) });
  }
  for (const r of warningRooms) {
    const parsed = parseRoom(r);
    if (!parsed) continue;
    // Warning rooms get a small penalty so confirmed-empty rooms win at same distance
    candidates.push({ room: r, isWarning: true, score: proximityScore(origin, parsed) + 0.5 });
  }

  candidates.sort((a, b) => a.score - b.score);

  const best = candidates[0] ?? null;
  return {
    nearest: best?.room ?? null,
    isWarning: best?.isWarning ?? false,
    allCandidates: candidates.slice(0, 10),
  };
}

/**
 * High-level helper: given a room name, compute the nearest empty room
 * at the given day/time.
 */
export async function findNearestEmptyRoomNow(
  room: string,
  day?: string | null,
  time?: string | null,
): Promise<NearestRoomResult & { day: string | null; time: string | null }> {
  const result = await findFreeRooms({ day, time });
  const nearest = findNearestRoom(room, result.empty, result.warning);
  return { ...nearest, day: day ?? null, time: time ?? null };
}

// ─── Class → Room resolution ─────────────────────────────────────────────

/**
 * Look up a class code (e.g. "4SAE11") in the schedules and resolve it
 * to the room the class is in at the given day/time.
 *
 * Resolution order:
 *  1. If day+time provided, find the event at that slot → use its room.
 *  2. Otherwise fall back to `metadata.primary_room`.
 *  3. Returns `null` if the class is not found.
 */
export async function resolveClassToRoom(
  classCode: string,
  day?: string | null,
  time?: string | null,
): Promise<{ room: string | null; classCode: string; primaryRoom: string | null }> {
  const schedules = await loadSchedules();

  // Case-insensitive lookup
  const upperCode = classCode.toUpperCase();
  const matchedKey = Object.keys(schedules).find(
    (k) => k.toUpperCase() === upperCode,
  );

  if (!matchedKey) {
    return { room: null, classCode, primaryRoom: null };
  }

  const group = schedules[matchedKey];
  const primaryRoom: string | null = group?.metadata?.primary_room ?? null;

  // Try to find current room from the schedule at day+time
  if (day && time) {
    const qMinutes = parseTimeStr(time);
    const events = group?.days?.[day] || [];

    for (const ev of events) {
      const { start, end } = eventRangeToMinutes(ev.time || "");
      if (start === null || end === null || qMinutes === null) continue;
      if (qMinutes >= start && qMinutes < end) {
        const course = (ev?.course || "").trim().toUpperCase();
        // Skip synthetic entries
        if (course === "FREE" || course === "FREEWARNING" || course === "NOT-FREE") continue;
        const room = (ev?.room || "").trim();
        if (room && room.toLowerCase() !== "en ligne") {
          return { room, classCode: matchedKey, primaryRoom };
        }
      }
    }
  }

  // Fall back to primary room
  return { room: primaryRoom, classCode: matchedKey, primaryRoom };
}

/**
 * Given a class code, find the nearest empty room RIGHT NOW.
 * Resolves class → room, then uses proximity scoring.
 */
export async function findNearestEmptyRoomForClass(
  classCode: string,
  day?: string | null,
  time?: string | null,
): Promise<NearestRoomResult & {
  day: string | null;
  time: string | null;
  classCode: string;
  currentRoom: string | null;
}> {
  const resolved = await resolveClassToRoom(classCode, day, time);

  if (!resolved.room) {
    return {
      nearest: null,
      isWarning: false,
      allCandidates: [],
      day: day ?? null,
      time: time ?? null,
      classCode: resolved.classCode,
      currentRoom: null,
    };
  }

  const result = await findFreeRooms({ day, time });
  const nearest = findNearestRoom(resolved.room, result.empty, result.warning);

  return {
    ...nearest,
    day: day ?? null,
    time: time ?? null,
    classCode: resolved.classCode,
    currentRoom: resolved.room,
  };
}
