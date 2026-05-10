/**
 * Test exam calendar lookup helpers.
 *
 * Run with: npx tsx app/api/_lib/exams.test.ts
 */

import { findExamClass, type ExamCalendarData } from "./exams";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  OK: ${msg}`);
    passed++;
  } else {
    console.error(`  FAIL: ${msg}`);
    failed++;
  }
}

const sampleData: ExamCalendarData = {
  metadata: {
    academicYear: "2025-2026",
    sourcePdf: "Calendrier_Session_Principale_2526_VF.pdf",
    pagesParsed: 42,
    classCount: 2,
    eventCount: 2,
  },
  classes: {
    "1A1": [
      {
        date: "2026-05-22",
        day: "Vendredi",
        time: "14:00",
        subject: "Communication, Culture and Citizenship A1 (EX:Ecrit)",
      },
    ],
    "4NIDS1": [
      {
        date: "2026-05-20",
        day: "Mercredi",
        time: "11:00",
        subject: "Communication, Culture et Citoyenneté A4 (EX:Ecrit)",
      },
    ],
  },
};

console.log("\nExam lookup tests");

const direct = findExamClass("1a1", sampleData);
assert(direct?.classCode === "1A1", "case-insensitive class lookup works");
assert(direct?.exams.length === 1, "matched class includes its exams");

const repaired = findExamClass("4nids1", sampleData);
assert(repaired?.classCode === "4NIDS1", "NIDS lookup returns canonical key");
assert(
  repaired?.exams[0]?.subject ===
    "Communication, Culture et Citoyenneté A4 (EX:Ecrit)",
  "exam subject shape is preserved",
);

assert(findExamClass("NOPE", sampleData) === null, "missing class returns null");

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
