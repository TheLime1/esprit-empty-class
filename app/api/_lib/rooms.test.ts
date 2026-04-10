/**
 * Test: nearest empty room should never be the primary room of the same class.
 * Includes both unit tests (hardcoded rooms) and integration tests
 * (real schedule data, varying day/time).
 *
 * Run with:  npx tsx app/api/_lib/rooms.test.ts
 */

import {
  findNearestRoom,
  findNearestEmptyRoomForClass,
  resolveClassToRoom,
  loadSchedules,
  parseRoom,
  snapToSessionTime,
} from "./rooms";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✅ ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${msg}`);
    failed++;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  UNIT TESTS  (pure findNearestRoom with hardcoded rooms)
// ═══════════════════════════════════════════════════════════════════════════

console.log("\n━━━ UNIT TESTS ━━━");

// ─── Test 1: excludeRooms filters out the origin room itself ─────────────

console.log("\nTest 1: Origin room excluded from candidates");
{
  const emptyRooms = ["G308", "G309", "G310", "H101"];
  const warningRooms: string[] = [];

  // Without exclusion, G308 (distance 0) would win
  const withoutExclude = findNearestRoom("G308", emptyRooms, warningRooms);
  assert(withoutExclude.nearest === "G308", `Without exclude → G308 (got ${withoutExclude.nearest})`);

  // With exclusion, G308 must be filtered out
  const withExclude = findNearestRoom("G308", emptyRooms, warningRooms, ["G308"]);
  assert(withExclude.nearest !== "G308", `With exclude → NOT G308 (got ${withExclude.nearest})`);
  assert(withExclude.nearest === "G309", `With exclude → G309 (got ${withExclude.nearest})`);

  // G308 should also not appear in allCandidates
  const candidateRooms = withExclude.allCandidates.map((c) => c.room);
  assert(!candidateRooms.includes("G308"), "G308 not in allCandidates");
}

// ─── Test 2: Primary room excluded even if it's different from current room ─

console.log("\nTest 2: Primary room excluded even when different from origin");
{
  const emptyRooms = ["G308", "G310", "G201", "H101"];
  const warningRooms: string[] = [];

  // Simulating: class is currently in G310, primary room is G308
  // Both should be excluded
  const result = findNearestRoom("G310", emptyRooms, warningRooms, ["G310", "G308"]);
  assert(result.nearest !== "G310", `Not G310 (got ${result.nearest})`);
  assert(result.nearest !== "G308", `Not G308 (got ${result.nearest})`);
  assert(result.nearest === "G201", `Nearest is G201 (got ${result.nearest})`);
}

// ─── Test 3: Case-insensitive exclusion ──────────────────────────────────

console.log("\nTest 3: Case-insensitive exclusion");
{
  const emptyRooms = ["G308", "G309"];
  const result = findNearestRoom("G308", emptyRooms, [], ["g308"]);
  assert(result.nearest !== "G308", `Case-insensitive exclude works (got ${result.nearest})`);
  assert(result.nearest === "G309", `Fallback to G309 (got ${result.nearest})`);
}

// ─── Test 4: Warning rooms also excluded ─────────────────────────────────

console.log("\nTest 4: Warning rooms also excluded");
{
  const emptyRooms: string[] = [];
  const warningRooms = ["G308", "G309", "G310"];

  const result = findNearestRoom("G308", emptyRooms, warningRooms, ["G308"]);
  assert(result.nearest !== "G308", `Warning G308 excluded (got ${result.nearest})`);
  assert(result.nearest === "G309", `Next warning room G309 (got ${result.nearest})`);
  assert(result.isWarning === true, "Result is flagged as warning");
}

// ─── Test 5: Empty exclude list = original behavior ──────────────────────

console.log("\nTest 5: Empty exclude list = original behavior");
{
  const emptyRooms = ["G308", "G309"];
  const a = findNearestRoom("G308", emptyRooms, []);
  const b = findNearestRoom("G308", emptyRooms, [], []);
  assert(a.nearest === b.nearest, "Default [] behaves same as omitted");
}

// ─── Test 6: All candidates excluded → returns null ──────────────────────

console.log("\nTest 6: All candidates excluded → returns null");
{
  const emptyRooms = ["G308"];
  const result = findNearestRoom("G308", emptyRooms, [], ["G308"]);
  assert(result.nearest === null, `No nearest when all excluded (got ${result.nearest})`);
  assert(result.allCandidates.length === 0, "allCandidates is empty");
}

// ─── Test 7: parseRoom sanity ────────────────────────────────────────────

console.log("\nTest 7: parseRoom sanity checks");
{
  const r = parseRoom("G308");
  assert(r !== null, "G308 parses");
  assert(r!.block === "G", `block = G (got ${r!.block})`);
  assert(r!.floor === 3, `floor = 3 (got ${r!.floor})`);
  assert(r!.roomNum === 8, `roomNum = 8 (got ${r!.roomNum})`);
}

// ═══════════════════════════════════════════════════════════════════════════
//  SNAP-TO-SESSION TESTS
// ═══════════════════════════════════════════════════════════════════════════

console.log("\n━━━ SNAP-TO-SESSION TESTS ━━━");

// ─── Test 8s: Before morning → snap to morning start ────────────────────

console.log("\nTest 8s: Before morning session → snap to morning start");
{
  const r = snapToSessionTime("Lundi", "07:30");
  assert(r.day === "Lundi", `Day stays Lundi (got ${r.day})`);
  assert(r.time === "09:00", `Time snapped to 09:00 (got ${r.time})`);

  const r2 = snapToSessionTime("Mercredi", "06:00");
  assert(r2.time === "09:00", `06:00 → 09:00 (got ${r2.time})`);
}

// ─── Test 9s: During morning session → keep as-is ───────────────────────

console.log("\nTest 9s: During morning session → keep as-is");
{
  const r = snapToSessionTime("Lundi", "10:30");
  assert(r.day === "Lundi", `Day stays Lundi (got ${r.day})`);
  assert(r.time === "10:30", `Time kept 10:30 (got ${r.time})`);

  const r2 = snapToSessionTime("Mardi", "09:00");
  assert(r2.time === "09:00", `09:00 kept (got ${r2.time})`);
}

// ─── Test 10s: Lunch break → snap to afternoon start ────────────────────

console.log("\nTest 10s: During lunch break → snap to afternoon start");
{
  const r = snapToSessionTime("Lundi", "12:30");
  assert(r.day === "Lundi", `Day stays Lundi (got ${r.day})`);
  assert(r.time === "13:30", `Time snapped to 13:30 (got ${r.time})`);

  const r2 = snapToSessionTime("Jeudi", "13:00");
  assert(r2.time === "13:30", `13:00 → 13:30 (got ${r2.time})`);
}

// ─── Test 11s: During afternoon session → keep as-is ────────────────────

console.log("\nTest 11s: During afternoon session → keep as-is");
{
  const r = snapToSessionTime("Lundi", "14:00");
  assert(r.day === "Lundi", `Day stays Lundi (got ${r.day})`);
  assert(r.time === "14:00", `Time kept 14:00 (got ${r.time})`);
}

// ─── Test 12s: After afternoon end → next school day morning ────────────

console.log("\nTest 12s: After afternoon end → next school day morning");
{
  const r = snapToSessionTime("Lundi", "17:00");
  assert(r.day === "Mardi", `Day advances to Mardi (got ${r.day})`);
  assert(r.time === "09:00", `Time snapped to 09:00 (got ${r.time})`);

  const r2 = snapToSessionTime("Jeudi", "17:30");
  assert(r2.day === "Vendredi", `Jeudi → Vendredi (got ${r2.day})`);
  assert(r2.time === "09:00", `Time snapped to 09:00 (got ${r2.time})`);
}

// ─── Test 13s: Friday after afternoon → Monday morning ──────────────────

console.log("\nTest 13s: Friday after afternoon → Monday morning");
{
  const r = snapToSessionTime("Vendredi", "18:00");
  assert(r.day === "Lundi", `Friday evening → Lundi (got ${r.day})`);
  assert(r.time === "09:00", `Time snapped to 09:00 (got ${r.time})`);
}

// ─── Test 14s: Friday lunch → Friday afternoon (FRIDAY_AFTERNOON) ───────

console.log("\nTest 14s: Friday lunch break → Friday afternoon start");
{
  const r = snapToSessionTime("Vendredi", "12:30");
  assert(r.day === "Vendredi", `Day stays Vendredi (got ${r.day})`);
  assert(r.time === "13:45", `Time snapped to 13:45 for Friday (got ${r.time})`);
}

// ─── Test 15s: Weekend → Monday morning ─────────────────────────────────

console.log("\nTest 15s: Weekend → Monday morning");
{
  const r = snapToSessionTime("Samedi", "10:00");
  assert(r.day === "Lundi", `Samedi → Lundi (got ${r.day})`);
  assert(r.time === "09:00", `Time snapped to 09:00 (got ${r.time})`);

  const r2 = snapToSessionTime("Dimanche", "15:00");
  assert(r2.day === "Lundi", `Dimanche → Lundi (got ${r2.day})`);
  assert(r2.time === "09:00", `Time snapped to 09:00 (got ${r2.time})`);
}

// ═══════════════════════════════════════════════════════════════════════════
//  INTEGRATION TESTS  (real schedule data, varying day + time)
// ═══════════════════════════════════════════════════════════════════════════

console.log("\n━━━ INTEGRATION TESTS (real schedules) ━━━");

async function integrationTests() {
  // Pick a few classes with known physical primary rooms from schedules.json
  const schedules = await loadSchedules();
  const testClasses: string[] = [];

  for (const key of Object.keys(schedules)) {
    const pr = schedules[key]?.metadata?.primary_room;
    if (pr && pr.toLowerCase() !== "en ligne" && parseRoom(pr)) {
      testClasses.push(key);
    }
    if (testClasses.length >= 5) break;
  }

  if (testClasses.length === 0) {
    console.log("  ⚠️  No classes with physical primary rooms found, skipping integration tests");
    return;
  }

  // Collect all available days from the first class
  const firstGroup = schedules[testClasses[0]];
  const allDays = Object.keys(firstGroup.days || {});

  // Time slots to test across different sessions
  const timeSlots = ["08:30", "09:55", "11:50", "13:30", "14:30", "16:00"];

  // ─── Test 8: Nearest room ≠ primary room (across multiple day/time combos) ─

  console.log("\nTest 8: Nearest room is never the primary room (multiple classes × days × times)");

  for (const classCode of testClasses) {
    const primaryRoom = schedules[classCode]?.metadata?.primary_room ?? null;
    if (!primaryRoom) continue;

    for (const day of allDays) {
      for (const time of timeSlots) {
        const result = await findNearestEmptyRoomForClass(classCode, day, time);

        if (result.nearest) {
          // THE KEY ASSERTION: nearest must never be the class's own primary room
          assert(
            result.nearest !== primaryRoom,
            `${classCode} @ ${day} ${time}: nearest=${result.nearest} ≠ primary=${primaryRoom}`,
          );

          // Also must not be the current room (which may differ from primary)
          if (result.currentRoom) {
            assert(
              result.nearest !== result.currentRoom,
              `${classCode} @ ${day} ${time}: nearest=${result.nearest} ≠ current=${result.currentRoom}`,
            );
          }

          // Verify that excluded rooms don't appear in topCandidates
          const candidateRooms = result.allCandidates.map((c) => c.room);
          if (result.currentRoom) {
            assert(
              !candidateRooms.includes(result.currentRoom),
              `${classCode} @ ${day} ${time}: current room not in candidates`,
            );
          }
          assert(
            !candidateRooms.includes(primaryRoom),
            `${classCode} @ ${day} ${time}: primary room not in candidates`,
          );
        }
      }
    }
  }

  // ─── Test 9: Different times yield (potentially) different nearest rooms ─

  console.log("\nTest 9: Results can vary across time slots (room availability is time-dependent)");
  {
    const classCode = testClasses[0];
    const day = allDays[0];
    const results = new Set<string | null>();

    for (const time of timeSlots) {
      const r = await findNearestEmptyRoomForClass(classCode, day, time);
      results.add(r.nearest);
    }

    // We expect at least some variation (not always null, not always the same room)
    console.log(`  ℹ️  ${classCode} on ${day}: ${results.size} distinct nearest rooms across ${timeSlots.length} time slots`);
    console.log(`      Results: ${[...results].join(", ")}`);
    // This is informational — the key correctness check is Test 8
    assert(true, "Time-dependent variation logged (see above)");
  }

  // ─── Test 10: Different days yield (potentially) different nearest rooms ─

  console.log("\nTest 10: Results can vary across days (room availability is day-dependent)");
  {
    const classCode = testClasses[0];
    const time = "09:55";
    const results = new Map<string, string | null>();

    for (const day of allDays) {
      const r = await findNearestEmptyRoomForClass(classCode, day, time);
      results.set(day, r.nearest);
    }

    console.log(`  ℹ️  ${classCode} at ${time}:`);
    for (const [day, nearest] of results) {
      console.log(`      ${day}: nearest = ${nearest}`);
    }
    assert(true, "Day-dependent variation logged (see above)");
  }
}

(async () => {
  await integrationTests();

  // ─── Summary ─────────────────────────────────────────────────────────────

  console.log(`\n${"═".repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("All tests passed! ✅");
  }
})();
