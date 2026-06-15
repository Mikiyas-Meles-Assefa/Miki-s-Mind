/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppState, DailyLog, RoutineTargets, NutritionWaterConfig } from "./types";

// Format a Date object to YYYY-MM-DD in local time
export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Get YYYY-MM-DD from today minus/plus days
export function getRelativeDateKey(offsetDays: number): string {
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - offsetDays);
  return formatDateKey(baseDate);
}

// Formats a date key to a short text like "Sun 14" or "Jun 14"
export function formatShortDate(dateKey: string): { dayName: string; dayNum: string; monthName: string } {
  const date = new Date(`${dateKey}T12:00:00`);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return {
    dayName: days[date.getDay()],
    dayNum: String(date.getDate()),
    monthName: months[date.getMonth()],
  };
}

export function generateDefaultState(): AppState {
  const defaultRoutines = [
    {
      id: "A",
      name: "A Day (Push + Legs)",
      exercises: [
        { 
          id: "bench_press", 
          name: "Bench Press", 
          defaultSets: 3,
          alternatives: [
            { id: "alt_db_bench", name: "Dumbbell Bench Press", defaultSets: 3 },
            { id: "alt_chest_press", name: "Machine Chest Press", defaultSets: 3 },
            { id: "alt_weighted_push_ups", name: "Weighted Push-ups", defaultSets: 3 }
          ]
        },
        { 
          id: "incline_db_press", 
          name: "Incline Dumbbell Press", 
          defaultSets: 3,
          alternatives: [
            { id: "alt_incline_bb", name: "Incline Barbell Press", defaultSets: 3 },
            { id: "alt_incline_mach", name: "Incline Machine Press", defaultSets: 3 },
            { id: "alt_cable_fly", name: "Low-to-High Cable Fly", defaultSets: 3 }
          ]
        },
        { 
          id: "shoulder_press", 
          name: "Shoulder Press", 
          defaultSets: 3,
          alternatives: [
            { id: "alt_arnold_press", name: "Arnold Press", defaultSets: 3 },
            { id: "alt_mach_shoulder", name: "Machine Shoulder Press", defaultSets: 3 },
            { id: "alt_pike_pushups", name: "Pike Push-ups", defaultSets: 3 }
          ]
        },
        { 
          id: "lateral_raises", 
          name: "Lateral Raises", 
          defaultSets: 3,
          alternatives: [
            { id: "alt_cable_lateral", name: "Cable Lateral Raises", defaultSets: 3 },
            { id: "alt_mach_lateral", name: "Machine Lateral Raises", defaultSets: 3 },
            { id: "alt_db_upright_rows", name: "Dumbbell Upright Rows", defaultSets: 3 }
          ]
        },
        { 
          id: "triceps_pushdown", 
          name: "Triceps Pushdown", 
          defaultSets: 3,
          alternatives: [
            { id: "alt_triceps_dips", name: "Triceps Dips", defaultSets: 3 },
            { id: "alt_overhead_cable", name: "Overhead Cable Extension", defaultSets: 3 },
            { id: "alt_db_skullcrushers", name: "Dumbbell Skullcrushers", defaultSets: 3 }
          ]
        },
        { 
          id: "leg_press", 
          name: "Leg Press", 
          defaultSets: 3,
          alternatives: [
            { id: "alt_bulgarian_squats", name: "Bulgarian Split Squats", defaultSets: 3 },
            { id: "alt_lunges", name: "Walking Lunges", defaultSets: 3 },
            { id: "alt_db_stepups", name: "Dumbbell Step-ups", defaultSets: 3 }
          ]
        },
        { 
          id: "squat", 
          name: "Squat", 
          defaultSets: 3,
          alternatives: [
            { id: "alt_goblet_squat", name: "Goblet Squat", defaultSets: 3 },
            { id: "alt_smith_squat", name: "Smith Machine Squat", defaultSets: 3 },
            { id: "alt_hack_squat", name: "Hack Squat", defaultSets: 3 }
          ]
        },
      ],
    },
    {
      id: "B",
      name: "B Day (Pull + Core)",
      exercises: [
        { 
          id: "lat_pulldown", 
          name: "Lat Pulldown", 
          defaultSets: 3,
          alternatives: [
            { id: "alt_assisted_pullups", name: "Assisted Pull-ups", defaultSets: 3 },
            { id: "alt_banded_pulldowns", name: "Banded Pulldowns", defaultSets: 3 },
            { id: "alt_straight_arm_pulldowns", name: "Straight-Arm Pulldowns", defaultSets: 3 }
          ]
        },
        { 
          id: "row_machine_db", 
          name: "Row (Machine/Dumbbell)", 
          defaultSets: 3,
          alternatives: [
            { id: "alt_bb_bent_row", name: "Barbell Bent-Over Row", defaultSets: 3 },
            { id: "alt_tbar_row", name: "T-Bar Row", defaultSets: 3 },
            { id: "alt_cable_row", name: "Seated Cable Row", defaultSets: 3 }
          ]
        },
        { 
          id: "one_arm_db_row", 
          name: "One-arm Dumbbell Row", 
          defaultSets: 3,
          alternatives: [
            { id: "alt_chest_supported_row", name: "Chest-Supported Row", defaultSets: 3 },
            { id: "alt_meadows_row", name: "Meadows Row", defaultSets: 3 },
            { id: "alt_single_arm_cable_row", name: "Single-Arm Cable Row", defaultSets: 3 }
          ]
        },
        { 
          id: "face_pull", 
          name: "Face Pull", 
          defaultSets: 3,
          alternatives: [
            { id: "alt_db_reverse_fly", name: "Dumbbell Reverse Fly", defaultSets: 3 },
            { id: "alt_machine_delt_fly", name: "Machine Rear Delt Fly", defaultSets: 3 },
            { id: "alt_band_pullaparts", name: "Band Pull-Aparts", defaultSets: 3 }
          ]
        },
        { 
          id: "biceps_curl", 
          name: "Biceps Curl", 
          defaultSets: 3,
          alternatives: [
            { id: "alt_ez_bar_curl", name: "EZ Bar Curl", defaultSets: 3 },
            { id: "alt_cable_biceps", name: "Cable Biceps Curl", defaultSets: 3 },
            { id: "alt_machine_preacher", name: "Machine Preacher Curl", defaultSets: 3 }
          ]
        },
        { 
          id: "hammer_curl", 
          name: "Hammer Curl", 
          defaultSets: 3,
          alternatives: [
            { id: "alt_rope_hammer_curl", name: "Rope Cable Hammer Curl", defaultSets: 3 },
            { id: "alt_cross_body_curl", name: "Cross-Body Curl", defaultSets: 3 },
            { id: "alt_plate_curls", name: "Plate Curls", defaultSets: 3 }
          ]
        },
        { 
          id: "core_plank_leg_raises", 
          name: "Core: Plank + Leg Raises", 
          defaultSets: 3,
          alternatives: [
            { id: "alt_ab_wheel_crunches", name: "Ab Wheel + Crunches", defaultSets: 3 },
            { id: "alt_cable_crunch_knee_raise", name: "Cable Crunch + Knee Raise", defaultSets: 3 },
            { id: "alt_russian_twists", name: "Russian Twist + V-Ups", defaultSets: 3 }
          ]
        },
      ],
    },
    {
      id: "R",
      name: "Rest Day",
      exercises: [],
    },
  ];

  const defaultTargets: Record<string, any> = {
    A: {
      calories: 3800,
      fat: 85,
      tier1Protein: 100, // animal (T1)
      tier2Protein: 30,  // other (T2 = 130 - 100)
      water: 3500,
    },
    B: {
      calories: 3800,
      fat: 85,
      tier1Protein: 100, // animal (T1)
      tier2Protein: 30,  // other (T2 = 130 - 100)
      water: 3500,
    },
    R: {
      calories: 3050,
      fat: 70,
      tier1Protein: 90,  // animal (T1)
      tier2Protein: 40,  // other (T2 = 130 - 90)
      water: 2500,
    },
  };

  const customHabitsList = ["Deep Work 4 Hrs", "Stretch & Mobility", "Read 10 Pages"];

  const dailyLogs: Record<string, DailyLog> = {};

  return {
    routines: defaultRoutines,
    targets: defaultTargets,
    dailyLogs,
    customHabitsList,
  };
}

// Checks if nutrition targets were fully met for a specific daily log
export function isNutritionMet(log: DailyLog | undefined, targets: RoutineTargets | undefined): boolean {
  if (!log || !targets) return false;
  const totalCalories = log.meals.reduce((sum, m) => sum + m.calories, 0);
  const totalFat = log.meals.reduce((sum, m) => sum + m.fat, 0);
  const totalTier1 = log.meals.reduce((sum, m) => sum + m.tier1Protein, 0);
  const totalTier2 = log.meals.reduce((sum, m) => sum + m.tier2Protein, 0);

  // Nutrition is met if we hit or exceed target calories, fats, tier1 protein, and tier2 protein.
  // To make it realistic, calories should be within +/- 150 calories or at least close,
  // but to adhere strictly to "dynamic were met": let's say:
  // Calories >= targets.calories * 0.95 (within 5%) and fats/proteins >= 90% of target. E.g.
  return (
    totalCalories >= targets.calories * 0.95 &&
    totalFat >= targets.fat * 0.9 &&
    totalTier1 >= targets.tier1Protein * 0.95 &&
    totalTier2 >= targets.tier2Protein * 0.9
  );
}

// Checks if water intake target was met for a specific daily log
export function isWaterMet(log: DailyLog | undefined, targets: RoutineTargets | undefined): boolean {
  if (!log || !targets) return false;
  return log.waterIntake >= targets.water;
}

// Calculate the current active continuous streaks
export function calculateStreak(
  type: "gym" | "nutrition" | "water" | string,
  dailyLogs: Record<string, DailyLog>,
  targets: NutritionWaterConfig,
  customHabitList: string[]
): number {
  let streak = 0;
  let offset = 0;

  // We start scanning backwards from today (offset = 0)
  while (true) {
    const dateKey = getRelativeDateKey(offset);
    const log = dailyLogs[dateKey];

    // If there is no entry seeded, we stop
    if (!log) {
      break;
    }

    let success = false;

    if (type === "gym") {
      // Gym adds to streak if any non-empty routine is logged
      success = !!(log && log.routineId && log.routineId !== "");
    } else if (type === "nutrition") {
      const dayTargets = targets[log.routineId];
      success = isNutritionMet(log, dayTargets);
    } else if (type === "water") {
      const dayTargets = targets[log.routineId];
      success = isWaterMet(log, dayTargets);
    } else {
      // Custom habit manual completion
      success = !!log.customHabits[type];
    }

    if (success) {
      streak++;
      offset++;
    } else {
      // If today is index 0 and hasn't had logs yet, we might check if yesterday was successful and count yesterday's streak
      if (offset === 0) {
        offset++; // check yesterday
        continue;
      }
      break;
    }
  }

  return streak;
}
