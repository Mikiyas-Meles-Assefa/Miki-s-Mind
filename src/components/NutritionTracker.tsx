/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AppState, DailyLog, Meal, RoutineTargets } from "../types";
import { getRelativeDateKey, formatShortDate } from "../utils";
import { Plus, Trash2, Check, X, ChevronLeft, ChevronRight, Apple } from "lucide-react";
import { isIosNativeApp, writeMealToHealthKit, writeWeightToHealthKit } from "../utils/nativeBridge";

interface NutritionTrackerProps {
  state: AppState;
  onSaveState: (updatedState: AppState) => void;
}

export function NutritionTracker({ state, onSaveState }: NutritionTrackerProps) {
  const [activeDateKey, setActiveDateKey] = useState<string>(getRelativeDateKey(0));
  const [activeFeedMode, setActiveFeedMode] = useState<"daily" | "chronology">("daily");

  // Peak View / Modal States
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [draftMeal, setDraftMeal] = useState<Partial<Meal>>({});

  const activeLog: DailyLog = state.dailyLogs[activeDateKey] || {
    date: activeDateKey,
    routineId: "R",
    gymLog: {},
    meals: [],
    waterIntake: 0,
    customHabits: {},
  };

  const dayRoutineId = activeLog.routineId || "R";
  const activeTargets: RoutineTargets = state.targets[dayRoutineId] || {
    calories: 2200,
    fat: 70,
    tier1Protein: 100,
    tier2Protein: 30,
    water: 2500,
  };

  // Compute Today's Sums
  const mealsList = activeLog.meals || [];
  const totalCalories = mealsList.reduce((sum, m) => sum + m.calories, 0);
  const totalFat = mealsList.reduce((sum, m) => sum + m.fat, 0);
  const totalCarbs = mealsList.reduce((sum, m) => sum + m.carbs, 0);
  const totalTier1 = mealsList.reduce((sum, m) => sum + m.tier1Protein, 0);
  const totalTier2 = mealsList.reduce((sum, m) => sum + m.tier2Protein, 0);
  const totalProtein = totalTier1 + totalTier2;

  // Opens peak view modal with a fresh meal template
  const handleAddNewMealRow = () => {
    const freshId = "meal_" + Date.now();
    const newMeal: Meal = {
      id: freshId,
      name: "",
      tier1Protein: 0,
      tier2Protein: 0,
      fat: 0,
      carbs: 0,
      calories: 0,
    };
    setDraftMeal(newMeal);
    setEditingMealId(freshId);
  };

  const handleUpdateMealDraft = (field: keyof Meal, val: string) => {
    let rawVal: any = val;
    if (field !== "name") {
      rawVal = parseFloat(val) || 0;
    }

    const nextDraft = { ...draftMeal, [field]: rawVal };
    
    // Automatically calculate generic Atwater factor calorie estimate if fields mutate
    if (field !== "name" && field !== "calories") {
      const p1 = field === "tier1Protein" ? rawVal : (draftMeal.tier1Protein || 0);
      const p2 = field === "tier2Protein" ? rawVal : (draftMeal.tier2Protein || 0);
      const f = field === "fat" ? rawVal : (draftMeal.fat || 0);
      const c = field === "carbs" ? rawVal : (draftMeal.carbs || 0);
      nextDraft.calories = Math.round((p1 + p2) * 4 + c * 4 + f * 9);
    }

    setDraftMeal(nextDraft);
  };

  const handleSaveMealPress = () => {
    if (!editingMealId) return;

    const exists = mealsList.some((m) => m.id === editingMealId);
    let updatedMeals: Meal[];

    if (exists) {
      updatedMeals = mealsList.map((m) =>
        m.id === editingMealId ? ({ ...m, ...draftMeal } as Meal) : m
      );
    } else {
      updatedMeals = [...mealsList, { ...draftMeal, id: editingMealId } as Meal];
    }

    if (isIosNativeApp()) {
      writeMealToHealthKit(
        draftMeal.calories || 0,
        (draftMeal.tier1Protein || 0) + (draftMeal.tier2Protein || 0),
        draftMeal.fat || 0,
        draftMeal.carbs || 0,
        draftMeal.name || "Meal"
      );
    }

    onSaveState({
      ...state,
      dailyLogs: {
        ...state.dailyLogs,
        [activeDateKey]: {
          ...activeLog,
          meals: updatedMeals,
        },
      },
    });

    setEditingMealId(null);
    setDraftMeal({});
  };

  const handleDeleteMeal = (mealId: string) => {
    const updatedMeals = mealsList.filter((m) => m.id !== mealId);
    onSaveState({
      ...state,
      dailyLogs: {
        ...state.dailyLogs,
        [activeDateKey]: {
          ...activeLog,
          meals: updatedMeals,
        },
      },
    });
    if (editingMealId === mealId) {
      setEditingMealId(null);
      setDraftMeal({});
    }
  };

  // Generate date array for chronological feed
  const chronologicalFeedDates: string[] = [];
  for (let i = 0; i <= 14; i++) {
    chronologicalFeedDates.push(getRelativeDateKey(i));
  }

  const handleDateShift = (direction: number) => {
    const index = chronologicalFeedDates.indexOf(activeDateKey);
    if (index !== -1) {
      const nextIdx = Math.min(chronologicalFeedDates.length - 1, Math.max(0, index + direction));
      setActiveDateKey(chronologicalFeedDates[nextIdx]);
    }
  };

  return (
    <div id="nutrition-tracker-module" className="space-y-4">
      
      {/* Top Toggle Selector */}
      <div className="flex justify-between items-center bg-white/[0.01] p-1 rounded-lg border border-white/[0.02]">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveFeedMode("daily")}
            className={`px-3 py-1 rounded text-[11px] font-mono tracking-wider transition-all cursor-pointer ${
              activeFeedMode === "daily"
                ? "bg-white/5 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            DAILY LOG
          </button>
          <button
            onClick={() => setActiveFeedMode("chronology")}
            className={`px-3 py-1 rounded text-[11px] font-mono tracking-wider transition-all cursor-pointer ${
              activeFeedMode === "chronology"
                ? "bg-white/5 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            CHRONOLOGY
          </button>
        </div>

        {/* Date Selector */}
        {activeFeedMode === "daily" && (
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-400">
            <button 
              onClick={() => handleDateShift(1)}
              className="p-1 text-zinc-500 hover:text-white transition-colors cursor-pointer flex items-center justify-center bg-white/[0.01] hover:bg-white/5 rounded"
              title="Previous Day"
            >
              <ChevronLeft size={11} />
            </button>
            <span className="text-zinc-200">
              {formatShortDate(activeDateKey).monthName} {formatShortDate(activeDateKey).dayNum} (Routine {dayRoutineId})
            </span>
            <button 
              onClick={() => handleDateShift(-1)}
              className="p-1 text-zinc-500 hover:text-white transition-colors cursor-pointer flex items-center justify-center bg-white/[0.01] hover:bg-white/5 rounded"
              title="Next Day"
            >
              <ChevronRight size={11} />
            </button>
          </div>
        )}
      </div>

      {activeFeedMode === "daily" && (
        <div id="meals-excel-panel" className="glass-panel rounded-xl p-4">
          
          {/* Main Clean Spreadsheet Table */}
          <div id="excel-table-container" className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse min-w-[340px] sm:min-w-[600px]">
              <thead>
                <tr className="border-b border-white/5 text-[8px] sm:text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
                  <th className="pb-1.5 pl-1">Meal description</th>
                  <th className="pb-1.5 text-center px-0.5">T1 Ani</th>
                  <th className="pb-1.5 text-center px-0.5">T2 Veg</th>
                  <th className="pb-1.5 text-center px-0.5 font-bold">Prot</th>
                  <th className="pb-1.5 text-center px-0.5">Fats</th>
                  <th className="pb-1.5 text-center px-0.5">Carbs</th>
                  <th className="pb-1.5 text-right pr-1">Calories</th>
                  <th className="pb-1.5 text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.01]">
                {mealsList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-6 text-zinc-600 text-[10px] sm:text-xs italic font-display">
                      Blank line entry list. Use (+) to log meals.
                    </td>
                  </tr>
                ) : (
                  mealsList.map((meal) => {
                    const totalProt = meal.tier1Protein + meal.tier2Protein;

                    return (
                      <tr 
                        key={meal.id} 
                        className="group/row hover:bg-white/[0.005] active:bg-white/[0.01] text-[10px] sm:text-xs font-medium transition-colors"
                      >
                        {/* Name */}
                        <td className="py-1.5 sm:py-2 pl-1">
                          <span className="text-zinc-300 font-display truncate max-w-[120px] sm:max-w-none inline-block">{meal.name || "Unnamed meal"}</span>
                        </td>

                        {/* T1 */}
                        <td className="py-1.5 sm:py-2 px-0.5 text-center font-mono text-zinc-400">
                          {meal.tier1Protein}g
                        </td>

                        {/* T2 */}
                        <td className="py-1.5 sm:py-2 px-0.5 text-center font-mono text-zinc-400">
                          {meal.tier2Protein}g
                        </td>

                        {/* Total protein */}
                        <td className="py-1.5 sm:py-2 px-0.5 text-center font-mono text-zinc-300 font-bold">
                          {totalProt}g
                        </td>

                        {/* Fats */}
                        <td className="py-1.5 sm:py-2 px-0.5 text-center font-mono text-zinc-450">
                          {meal.fat}g
                        </td>

                        {/* Carbs */}
                        <td className="py-1.5 sm:py-2 px-0.5 text-center font-mono text-zinc-450">
                          {meal.carbs}g
                        </td>

                        {/* Calories */}
                        <td className="py-1.5 sm:py-2 pr-1 text-right font-mono text-zinc-200">
                          {meal.calories}
                        </td>

                        {/* Hover/Touch actions */}
                        <td className="py-1.5 sm:py-2 text-center">
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => {
                                setEditingMealId(meal.id);
                                setDraftMeal(meal);
                              }}
                              className="opacity-0 group-hover/row:opacity-100 group-active/row:opacity-100 focus:opacity-100 text-[9px] sm:text-[10px] text-zinc-400 hover:text-white font-mono transition-opacity cursor-pointer px-0.5"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteMeal(meal.id)}
                              className="opacity-0 group-hover/row:opacity-100 group-active/row:opacity-100 focus:opacity-100 text-zinc-600 hover:text-rose-400 transition-opacity cursor-pointer p-0.5"
                              title="Delete Meal"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}

                {/* Relational sums/targets */}
                <tr className="border-t border-white/[0.08] text-[9px] sm:text-[10px] font-mono bg-white/[0.01] font-bold">
                  <td className="py-2 pl-1 text-zinc-300 uppercase tracking-wider font-extrabold">Sum/Tgt</td>
                  <td className="py-2 text-center text-zinc-200">
                    <span className="font-extrabold">{totalTier1}</span>
                    <span className="text-[8px] text-zinc-500 font-normal">/{activeTargets.tier1Protein}</span>
                  </td>
                  <td className="py-2 text-center text-zinc-200">
                    <span className="font-extrabold">{totalTier2}</span>
                    <span className="text-[8px] text-zinc-500 font-normal">/{activeTargets.tier2Protein}</span>
                  </td>
                  <td className="py-2 text-center text-zinc-200">
                    <span className="font-extrabold">{totalProtein}</span>
                    <span className="text-[8px] text-zinc-500 font-normal">/{activeTargets.tier1Protein + activeTargets.tier2Protein}</span>
                  </td>
                  <td className="py-2 text-center text-zinc-200">
                    <span className="font-extrabold">{totalFat}</span>
                    <span className="text-[8px] text-zinc-500 font-normal">/{activeTargets.fat}</span>
                  </td>
                  <td className="py-2 text-center text-zinc-200 font-extrabold">
                    {totalCarbs}
                  </td>
                  <td className="py-2 text-right pr-1 text-zinc-200">
                    <span className="font-extrabold">{totalCalories}</span>
                    <span className="text-[8px] text-zinc-500 font-normal">/{activeTargets.calories}</span>
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Plus button (Visible on mobile/tablet, invisible on PC till approached) */}
          <div className="flex justify-center items-center mt-3 pt-2 border-t border-white/[0.02] transition-opacity duration-300 opacity-100 md:opacity-0 hover:opacity-100 focus-within:opacity-100">
            <button
              onClick={handleAddNewMealRow}
              className="p-1 rounded-full bg-zinc-900/60 hover:bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 border border-white/5 transition-all cursor-pointer flex items-center justify-center shadow-md"
              title="Add Meal"
            >
              <Plus size={11} strokeWidth={2.5} />
            </button>
          </div>

          {/* Metrics log tray */}
          <div className="flex flex-wrap items-center gap-3.5 py-2 px-3 bg-white/[0.01] rounded-lg border border-white/[0.03] text-[10px] font-mono mt-4">
            <span className="text-zinc-500 uppercase tracking-widest font-bold">Metrics Log:</span>
            
            {/* Water */}
            <div className="flex items-center gap-1.5 border-r border-white/5 pr-3">
              <span className="text-zinc-400 font-mono uppercase">Water:</span>
              <input
                type="number"
                step="50"
                placeholder="0"
                value={activeLog.waterIntake ?? ""}
                onChange={(e) => {
                  const val = e.target.value === "" ? 0 : parseInt(e.target.value, 10);
                  onSaveState({
                    ...state,
                    dailyLogs: {
                      ...state.dailyLogs,
                      [activeDateKey]: {
                        ...activeLog,
                        waterIntake: val
                      }
                    }
                  });
                }}
                className="w-12 bg-zinc-950/60 border border-white/10 rounded px-1 py-0.5 text-center text-white focus:outline-none focus:border-white/30"
              />
              <span className="text-zinc-500">ml</span>
            </div>

            {/* Morning Weight */}
            <div className="flex items-center gap-1.5 border-r border-white/5 pr-3">
              <span className="text-zinc-400 font-mono uppercase">AM Wt:</span>
              <input
                type="number"
                step="0.1"
                placeholder="--"
                value={activeLog.morningWeight ?? ""}
                onChange={(e) => {
                  const val = e.target.value === "" ? undefined : parseFloat(e.target.value);
                  if (val && isIosNativeApp()) {
                    writeWeightToHealthKit(val);
                  }
                  onSaveState({
                    ...state,
                    dailyLogs: {
                      ...state.dailyLogs,
                      [activeDateKey]: {
                        ...activeLog,
                        morningWeight: val
                      }
                    }
                  });
                }}
                className="w-10 bg-zinc-950/60 border border-white/10 rounded px-1 py-0.5 text-center text-white focus:outline-none focus:border-white/30"
              />
              <span className="text-zinc-500">kg</span>
            </div>

            {/* Night Weight */}
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400 font-mono uppercase">PM Wt:</span>
              <input
                type="number"
                step="0.1"
                placeholder="--"
                value={activeLog.nightWeight ?? ""}
                onChange={(e) => {
                  const val = e.target.value === "" ? undefined : parseFloat(e.target.value);
                  if (val && isIosNativeApp()) {
                    writeWeightToHealthKit(val);
                  }
                  onSaveState({
                    ...state,
                    dailyLogs: {
                      ...state.dailyLogs,
                      [activeDateKey]: {
                        ...activeLog,
                        nightWeight: val
                      }
                    }
                  });
                }}
                className="w-10 bg-zinc-950/60 border border-white/10 rounded px-1 py-0.5 text-center text-white focus:outline-none focus:border-white/30"
              />
              <span className="text-zinc-500">kg</span>
            </div>
          </div>

          {/* Remaining Goals Progress Card */}
          <div className="glass-panel rounded-xl p-3.5 mt-4 font-mono text-[10px] sm:text-[11px] space-y-3">
            <h4 className="text-zinc-500 uppercase tracking-wider font-bold text-[8px] sm:text-[9px] mb-1">Remaining Goals</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5">
              {/* Proteins */}
              <div className="space-y-1">
                <div className="flex justify-between text-zinc-400">
                  <span>Proteins Remaining:</span>
                  <span className="font-bold text-zinc-200">{Math.max(0, (activeTargets.tier1Protein + activeTargets.tier2Protein) - totalProtein)}g</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-zinc-950/60 rounded-full overflow-hidden border border-white/[0.02]">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        (totalProtein / (activeTargets.tier1Protein + activeTargets.tier2Protein)) * 100 < 50 
                          ? "bg-zinc-500/60" 
                          : (totalProtein / (activeTargets.tier1Protein + activeTargets.tier2Protein)) * 100 < 90 
                            ? "bg-amber-500/60" 
                            : "bg-emerald-500/80"
                      }`}
                      style={{ width: `${Math.min(100, Math.round((totalProtein / (activeTargets.tier1Protein + activeTargets.tier2Protein)) * 100))}%` }}
                    />
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-zinc-500 w-8 text-right">
                    {Math.min(100, Math.round((totalProtein / (activeTargets.tier1Protein + activeTargets.tier2Protein)) * 100))}%
                  </span>
                </div>
              </div>

              {/* T1 Animal */}
              <div className="space-y-1">
                <div className="flex justify-between text-zinc-400">
                  <span>T1 Remaining:</span>
                  <span className="font-bold text-zinc-200">{Math.max(0, activeTargets.tier1Protein - totalTier1)}g</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-zinc-950/60 rounded-full overflow-hidden border border-white/[0.02]">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        (totalTier1 / activeTargets.tier1Protein) * 100 < 50 
                          ? "bg-zinc-500/60" 
                          : (totalTier1 / activeTargets.tier1Protein) * 100 < 90 
                            ? "bg-amber-500/60" 
                            : "bg-emerald-500/80"
                      }`}
                      style={{ width: `${Math.min(100, Math.round((totalTier1 / activeTargets.tier1Protein) * 100))}%` }}
                    />
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-zinc-500 w-8 text-right">
                    {Math.min(100, Math.round((totalTier1 / activeTargets.tier1Protein) * 100))}%
                  </span>
                </div>
              </div>

              {/* Calories */}
              <div className="space-y-1">
                <div className="flex justify-between text-zinc-400">
                  <span>Calories Remaining:</span>
                  <span className="font-bold text-zinc-200">{Math.max(0, activeTargets.calories - totalCalories)} kcal</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-zinc-950/60 rounded-full overflow-hidden border border-white/[0.02]">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        (totalCalories / activeTargets.calories) * 100 < 50 
                          ? "bg-zinc-500/60" 
                          : (totalCalories / activeTargets.calories) * 100 < 90 
                            ? "bg-amber-500/60" 
                            : "bg-emerald-500/80"
                      }`}
                      style={{ width: `${Math.min(100, Math.round((totalCalories / activeTargets.calories) * 100))}%` }}
                    />
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-zinc-500 w-8 text-right">
                    {Math.min(100, Math.round((totalCalories / activeTargets.calories) * 100))}%
                  </span>
                </div>
              </div>

              {/* Fat */}
              <div className="space-y-1">
                <div className="flex justify-between text-zinc-400">
                  <span>Fat Remaining:</span>
                  <span className="font-bold text-zinc-200">{Math.max(0, activeTargets.fat - totalFat)}g</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-zinc-950/60 rounded-full overflow-hidden border border-white/[0.02]">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        (totalFat / activeTargets.fat) * 100 < 50 
                          ? "bg-zinc-500/60" 
                          : (totalFat / activeTargets.fat) * 100 < 90 
                            ? "bg-amber-500/60" 
                            : "bg-emerald-500/80"
                      }`}
                      style={{ width: `${Math.min(100, Math.round((totalFat / activeTargets.fat) * 100))}%` }}
                    />
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-zinc-500 w-8 text-right">
                    {Math.min(100, Math.round((totalFat / activeTargets.fat) * 100))}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chronology View */}
      {activeFeedMode === "chronology" && (
        <div id="master-chronicles-panel" className="glass-panel rounded-xl p-4">
          <div id="master-logs-scroller" className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-[11px] font-mono border-collapse min-w-[700px]">
              <thead>
                <tr className="text-zinc-500 text-[9px] uppercase tracking-wider border-b border-white/5 pb-2 border-collapse">
                  <th className="py-2 pl-2">Date</th>
                  <th className="py-2">Routine</th>
                  <th className="py-2 text-right">Calories</th>
                  <th className="py-2 text-right">T1 Ani</th>
                  <th className="py-2 text-right">T2 Veg</th>
                  <th className="py-2 text-right">Protein</th>
                  <th className="py-2 text-right">Fat</th>
                  <th className="py-2 text-right">Water</th>
                  <th className="py-2 text-right">AM Wt</th>
                  <th className="py-2 text-right pr-2">PM Wt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.01]">
                {chronologicalFeedDates.map((dateKey) => {
                  const log = state.dailyLogs[dateKey];
                  const rId = log ? log.routineId : "R";
                  const targets = state.targets[rId];
                  
                  if (!log) return null;

                  const totalCals = log.meals.reduce((sum,m) => sum + m.calories,0);
                  const totalT1 = log.meals.reduce((sum,m) => sum + m.tier1Protein,0);
                  const totalT2 = log.meals.reduce((sum,m) => sum + m.tier2Protein,0);
                  const totalP = totalT1 + totalT2;
                  const totalFat = log.meals.reduce((sum,m) => sum + (m.fat || 0),0);
                  const totalWater = log.waterIntake || 0;
                  const amWt = log.morningWeight;
                  const pmWt = log.nightWeight;

                  const calsMet = targets ? totalCals >= targets.calories * 0.95 : false;
                  const t1Met = targets ? totalT1 >= targets.tier1Protein : false;
                  const t2Met = targets ? totalT2 >= targets.tier2Protein : false;
                  const protMet = targets ? totalP >= (targets.tier1Protein + targets.tier2Protein) : false;

                  const isTodayCenter = dateKey === getRelativeDateKey(0);

                  return (
                    <tr 
                      key={dateKey} 
                      className={`hover:bg-white/[0.005] ${isTodayCenter ? "bg-white/[0.01]" : ""}`}
                    >
                      <td className="py-2 pl-2 text-zinc-400">
                        {formatShortDate(dateKey).monthName} {formatShortDate(dateKey).dayNum} 
                        {isTodayCenter && <span className="text-zinc-200 ml-1.5 text-[8px] bg-white/5 px-1 py-0.5 rounded font-bold">TODAY</span>}
                      </td>
                      <td className="py-2">
                        <span className="text-zinc-500 font-bold uppercase">{rId || "·"}</span>
                      </td>
                      <td className={`py-2 text-right pr-1 transition-all ${calsMet ? "text-zinc-100 font-bold" : "text-zinc-500"}`}>
                        {totalCals}g
                      </td>
                      <td className={`py-2 text-right pr-1 transition-all ${t1Met ? "text-zinc-100 font-bold" : "text-zinc-500"}`}>
                        {totalT1}g
                      </td>
                      <td className={`py-2 text-right pr-1 transition-all ${t2Met ? "text-zinc-100 font-bold" : "text-zinc-500"}`}>
                        {totalT2}g
                      </td>
                      <td className={`py-2 text-right pr-1 transition-all ${protMet ? "text-zinc-100 font-bold" : "text-zinc-500"}`}>
                        {totalP}g
                      </td>
                      <td className="py-2 text-right pr-1 text-zinc-400">
                        {totalFat > 0 ? `${totalFat}g` : "·"}
                      </td>
                      <td className="py-2 text-right pr-1 text-zinc-400">
                        {totalWater > 0 ? `${totalWater}ml` : "·"}
                      </td>
                      <td className="py-2 text-right pr-1 text-zinc-400">
                        {amWt !== undefined ? `${amWt}kg` : "·"}
                      </td>
                      <td className="py-2 text-right pr-2 text-zinc-400">
                        {pmWt !== undefined ? `${pmWt}kg` : "·"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Immersive Glassmorphic Peak View / Log Meal Modal */}
      {editingMealId !== null && (
        <div id="meal-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Blur Backdrop */}
          <div 
            id="meal-modal-backdrop" 
            className="absolute inset-0 bg-black/60 backdrop-blur-md transition-all"
            onClick={() => {
              setEditingMealId(null);
              setDraftMeal({});
            }}
          />
          
          {/* Glass Card Container */}
          <div 
            id="meal-modal-card" 
            className="relative w-full max-w-sm glass-panel-heavy rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden z-10 animate-fade-in"
          >
            <div className="flex justify-between items-center pb-3 border-b border-white/5 mb-5">
              <h3 className="font-display text-base font-semibold text-white tracking-wide flex items-center gap-2">
                <Apple size={16} className="text-emerald-400" />
                <span>{mealsList.some(m => m.id === editingMealId) ? "Edit Meal Log" : "Log New Meal"}</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingMealId(null);
                  setDraftMeal({});
                }}
                className="p-1 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveMealPress();
              }}
              className="space-y-4"
            >
              {/* Meal Name */}
              <div className="space-y-1">
                <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-mono">Meal Description</label>
                <input
                  type="text"
                  required
                  value={draftMeal.name || ""}
                  onChange={(e) => handleUpdateMealDraft("name", e.target.value)}
                  placeholder="e.g. Scrambled Eggs & Avocado Toast"
                  className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-green/40 transition-colors"
                />
              </div>

              {/* Macros Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-mono">T1 Animal (g)</label>
                  <input
                    type="number"
                    step="any"
                    value={draftMeal.tier1Protein ?? ""}
                    onChange={(e) => handleUpdateMealDraft("tier1Protein", e.target.value)}
                    placeholder="0"
                    className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-green/45"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-mono">T2 Veg/Other (g)</label>
                  <input
                    type="number"
                    step="any"
                    value={draftMeal.tier2Protein ?? ""}
                    onChange={(e) => handleUpdateMealDraft("tier2Protein", e.target.value)}
                    placeholder="0"
                    className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-green/45"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-mono">Fats (g)</label>
                  <input
                    type="number"
                    step="any"
                    value={draftMeal.fat ?? ""}
                    onChange={(e) => handleUpdateMealDraft("fat", e.target.value)}
                    placeholder="0"
                    className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-green/45"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-mono">Carbs (g)</label>
                  <input
                    type="number"
                    step="any"
                    value={draftMeal.carbs ?? ""}
                    onChange={(e) => handleUpdateMealDraft("carbs", e.target.value)}
                    placeholder="0"
                    className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-green/45"
                  />
                </div>
              </div>

              {/* Calories Input */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between items-center">
                  <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-mono">Calories (kcal)</label>
                  <span className="text-[8px] text-zinc-500 font-mono italic">auto-calculated if left alone</span>
                </div>
                <input
                  type="number"
                  step="any"
                  value={draftMeal.calories ?? ""}
                  onChange={(e) => handleUpdateMealDraft("calories", e.target.value)}
                  placeholder="0"
                  className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-green/45"
                />
              </div>

              {/* Form actions */}
              <div className="flex gap-2.5 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-zinc-100 hover:bg-brand-green hover:text-black text-zinc-900 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check size={14} /> Log Meal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
