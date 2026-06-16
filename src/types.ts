/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Exercise {
  id: string;
  name: string;
  defaultSets: number;
  alternatives?: { id: string; name: string; defaultSets: number }[];
}

export interface GymRoutine {
  id: string; // "A", "B", "R" (Rest)
  name: string;
  exercises: Exercise[];
}

export interface RoutineTargets {
  calories: number;
  fat: number;
  tier1Protein: number; // Tier 1 (High quality/Animal)
  tier2Protein: number; // Tier 2 (Other)
  water: number; // in ml
}

// Map from routineId -> Targets
export type NutritionWaterConfig = Record<string, RoutineTargets>;

export interface SetLog {
  reps: number;
  weight: number;
}

export interface Meal {
  id: string;
  name: string;
  tier1Protein: number;
  tier2Protein: number;
  fat: number;
  carbs: number;
  calories: number;
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  routineId: string; // "A", "B", "R" or "" (unlogged)
  gymLog: Record<string, SetLog[]>; // exerciseId -> SetLog[]
  meals: Meal[];
  waterIntake: number; // in ml
  customHabits: Record<string, boolean>; // habitName -> boolean Checked
  morningWeight?: number; // AM weight
  nightWeight?: number; // PM weight
  selectedExercises?: Record<string, string>; // primaryExerciseId -> selectedExerciseId
}

export interface AppState {
  routines: GymRoutine[];
  targets: NutritionWaterConfig;
  dailyLogs: Record<string, DailyLog>; // date -> DailyLog
  customHabitsList: string[]; // List of registered custom habits
  theme?: string; // Selected theme ID
  widgetToday?: {
    caloriesTarget: number;
    caloriesLogged: number;
    proteinTarget: number;
    proteinLogged: number;
    waterTarget: number;
    waterLogged: number;
    fatTarget: number;
    fatLogged: number;
  };
}
