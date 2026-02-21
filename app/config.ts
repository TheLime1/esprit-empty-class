// =====================================
// MAINTENANCE MODE CONFIGURATION
// =====================================
// Set this to false when ready to show the regular site
export const MAINTENANCE_MODE = false;

// =====================================
// RAMADAN MODE CONFIGURATION
// =====================================
// Set to true during Ramadan to use adjusted schedule times
// Morning: 08:30 - 11:10 | Afternoon: 11:50 - 14:30
// Normal:  09:00 - 12:15 | Afternoon: 13:30 - 16:45
export const RAMADAN_MODE = true;

// Time slot constants derived from RAMADAN_MODE
export const TIME_SLOTS = RAMADAN_MODE
  ? {
      morningStart: "08:30",
      morningEnd: "11:10",
      afternoonStart: "11:50",
      afternoonEnd: "14:30",
      morningLabel: "8:30 AM - 11:10 AM",
      afternoonLabel: "11:50 AM - 2:30 PM",
      morningValue: "08:30",
      afternoonValue: "11:50",
      // Lunch break boundaries (in minutes since midnight)
      lunchBreakStart: 670, // 11:10
      lunchBreakEnd: 710, // 11:50
    }
  : {
      morningStart: "09:00",
      morningEnd: "12:15",
      afternoonStart: "13:30",
      afternoonEnd: "16:45",
      morningLabel: "9:00 AM - 12:15 PM",
      afternoonLabel: "1:30 PM - 4:45 PM",
      morningValue: "09:00",
      afternoonValue: "13:30",
      // Lunch break boundaries (in minutes since midnight)
      lunchBreakStart: 735, // 12:15
      lunchBreakEnd: 810, // 13:30
    };

// Friday-specific afternoon time slot
export const FRIDAY_AFTERNOON = RAMADAN_MODE
  ? { label: "11:40 AM - 2:45 PM", value: "11:40" }
  : { label: "1:45 PM - 5:00 PM", value: "13:45" };

// Contributors (shown in footer, hidden if empty)
export const CONTRIBUTORS: { name: string; url: string }[] = [
  // { name: "Contributor Name", url: "https://github.com/username" },
];
