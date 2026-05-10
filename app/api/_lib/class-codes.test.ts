/**
 * Test flexible class-code matching shared by timetable and exams APIs.
 *
 * Run with: npx tsx app/api/_lib/class-codes.test.ts
 */

import { findMatchingClassKey, normalizeClassCode } from "./class-codes";

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

const classKeys = ["4ERP-BI3", "4MécaT1", "1A1", "4NIDS1"];

console.log("\nClass-code matching tests");

assert(
  normalizeClassCode("4MécaT1") === "4MECAT1",
  "normalization removes accents and punctuation",
);
assert(
  findMatchingClassKey("4bi3", classKeys) === "4ERP-BI3",
  "short ERP-BI alias matches full class key",
);
assert(
  findMatchingClassKey("4mecat1", classKeys) === "4MécaT1",
  "accent-insensitive search matches accented class key",
);
assert(
  findMatchingClassKey("4nids1", classKeys) === "4NIDS1",
  "case-insensitive direct match works",
);
assert(
  findMatchingClassKey("missing", classKeys) === null,
  "non-class text does not match",
);

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
