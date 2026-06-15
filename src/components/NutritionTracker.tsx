/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AppState, DailyLog, Meal, RoutineTargets } from "../types";
import { getRelativeDateKey, formatShortDate, isNutritionMet } from "../utils";
import { Plus, Trash2, Check, X, ChevronLeft, ChevronRight } from "lucide-react";

interface NutritionTrackerProps {
  state: AppState;
  onSaveState: (updatedState: AppState) => void;
}

export function NutritionTracker({ state, onSaveState }: NutritionTrackerProps) {
  const [activeDateKey, setActiveDateKey] = useState<string>(getRelativeDateKey(0));
  const [activeFeedMode, setActiveFeedMode] = useState<"daily" | "chronology">("daily");

  // Draft state for new inline row being added
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

    const updatedMeals = [...mealsList, newMeal];
    const updatedLog: DailyLog = {
      ...activeLog,
      meals: updatedMeals,
    };

    onSaveState({
      ...state,
      dailyLogs: {
        ...state.dailyLogs,
        [activeDateKey]: updatedLog,
      },
    });

    setEditingMealId(freshId);
    setDraftMeal(newMeal);
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

    // Write directly into active logged list
    const updatedMeals = mealsList.map((m) => (m.id === editingMealId ? { ...m, ...nextDraft } : m));
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
  };

  const handleSaveMealPress = () => {
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
    }
  };

  // Generate date array for the chronological feed (representing descending order: recent days first)
  const chronologicalFeedDates: string[] = [];
  for (let i = 0; i <= 14; i++) {
    chronologicalFeedDates.push(getRelativeDateKey(i));
  }

  // Simple step back / forward for single screen date pagination
  const handleDateShift = (direction: number) => {
    // Basic day shifts
    const index = chronologicalFeedDates.indexOf(activeDateKey);
    if (index !== -1) {
      const nextIdx = Math.min(chronologicalFeedDates.length - 1, Math.max(0, index + direction));
      setActiveDateKey(chronologicalFeedDates[nextIdx]);
    }
  };

  return (
    <div id="nutrition-tracker-module" className="space-y-4">
      
      {/* Top level toggle selector view switch (Daily vs Chronology) */}
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
                : "text-zinc-550 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            CHRONOLOGY
          </button>
        </div>

        {/* Dynamic date selector shown in Daily View */}
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

      {/* Conditionally render views: No concurrent messy displays */}
      
      {activeFeedMode === "daily" && (
        <div id="meals-excel-panel" className="glass-panel rounded-xl p-4">
          <div id="excel-table-container" className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-white/5 text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
                  <th className="pb-2.5 pl-2">Meal description</th>
                  <th className="pb-2.5 text-center">T1 Ani</th>
                  <th className="pb-2.5 text-center">T2 Veg</th>
                  <th className="pb-2.5 text-center">Prot</th>
                  <th className="pb-2.5 text-center">Fats</th>
                  <th className="pb-2.5 text-center">Carbs</th>
                  <th className="pb-2.5 text-right pr-2">Calories</th>
                  <th className="pb-2.5 text-center w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.01]">
                {mealsList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-zinc-600 text-xs italic font-display">
                      Blank line entry list. Use (+) to log meals.
                    </td>
                  </tr>
                ) : (
                  mealsList.map((meal) => {
                    const isMealEditing = editingMealId === meal.id;
                    const totalProt = meal.tier1Protein + meal.tier2Protein;

                    return (
                      <tr 
                        key={meal.id} 
                        className="group/row hover:bg-white/[0.005] text-xs font-medium"
                      >
                        {/* Name cell */}
                        <td className="py-2 pl-2">
                          {isMealEditing ? (
                            <input
                              type="text"
                              value={draftMeal.name || ""}
                              onChange={(e) => handleUpdateMealDraft("name", e.target.value)}
                              className="bg-transparent text-white border-b border-white/15 w-full focus:outline-none"
                              placeholder="Meal name..."
                            />
                          ) : (
                            <span className="text-zinc-300 font-display">{meal.name || "Unnamed meal"}</span>
                          )}
                        </td>

                        {/* Tier 1 Animal Protein */}
                        <td className="py-2 text-center font-mono">
                          {isMealEditing ? (
                            <input
                              type="number"
                              value={draftMeal.tier1Protein ?? ""}
                              onChange={(e) => handleUpdateMealDraft("tier1Protein", e.target.value)}
                              className="bg-zinc-950 w-10 text-center text-white focus:outline-none rounded py-0.5 border border-white/5"
                            />
                          ) : (
                            <span className="text-zinc-300">{meal.tier1Protein}g</span>
                          )}
                        </td>

                        {/* Tier 2 Veg Protein */}
                        <td className="py-2 text-center font-mono">
                          {isMealEditing ? (
                            <input
                              type="number"
                              value={draftMeal.tier2Protein ?? ""}
                              onChange={(e) => handleUpdateMealDraft("tier2Protein", e.target.value)}
                              className="bg-zinc-950 w-10 text-center text-white focus:outline-none rounded py-0.5 border border-white/5"
                            />
                          ) : (
                            <span className="text-zinc-400">{meal.tier2Protein}g</span>
                          )}
                        </td>

                        {/* Total protein */}
                        <td className="py-2 text-center font-mono text-zinc-300 font-bold">
                          {totalProt}g
                        </td>

                        {/* Fats */}
                        <td className="py-2 text-center font-mono">
                          {isMealEditing ? (
                            <input
                              type="number"
                              value={draftMeal.fat ?? ""}
                              onChange={(e) => handleUpdateMealDraft("fat", e.target.value)}
                              className="bg-zinc-950 w-10 text-center text-white focus:outline-none rounded py-0.5 border border-white/5"
                            />
                          ) : (
                            <span className="text-zinc-400">{meal.fat}g</span>
                          )}
                        </td>

                        {/* Carbs */}
                        <td className="py-2 text-center font-mono">
                          {isMealEditing ? (
                            <input
                              type="number"
                              value={draftMeal.carbs ?? ""}
                              onChange={(e) => handleUpdateMealDraft("carbs", e.target.value)}
                              className="bg-zinc-950 w-10 text-center text-white focus:outline-none rounded py-0.5 border border-white/5"
                            />
                          ) : (
                            <span className="text-zinc-400">{meal.carbs}g</span>
                          )}
                        </td>

                        {/* Calories */}
                        <td className="py-2 text-right font-mono pr-2">
                          {isMealEditing ? (
                            <input
                              type="number"
                              value={draftMeal.calories ?? ""}
                              onChange={(e) => handleUpdateMealDraft("calories", e.target.value)}
                              className="bg-zinc-950 w-14 text-right text-white focus:outline-none rounded py-0.5 border border-white/5"
                            />
                          ) : (
                            <span className="text-zinc-200">{meal.calories} kcal</span>
                          )}
                        </td>

                        {/* Delete Commit actions */}
                        <td className="py-2 text-center">
                          <div className="flex gap-1.5 justify-center">
                            {isMealEditing ? (
                              <button
                                onClick={handleSaveMealPress}
                                className="p-0.5 rounded bg-white text-zinc-950 cursor-pointer"
                                title="Commit"
                              >
                                <Check size={11} strokeWidth={3} />
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingMealId(meal.id);
                                  setDraftMeal(meal);
                                }}
                                className="opacity-0 group-hover/row:opacity-100 text-[10px] text-zinc-500 hover:text-zinc-200 font-mono transition-opacity cursor-pointer"
                              >
                                Edit
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteMeal(meal.id)}
                              className="opacity-0 group-hover/row:opacity-100 text-zinc-600 hover:text-white transition-opacity cursor-pointer"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}

                {/* Relational dynamic sums / targets at the end of active meal log table (Simplifying targets module) */}
                <tr className="border-t border-white/[0.08] text-[10px] font-mono bg-white/[0.02] font-bold">
                  <td className="py-3 pl-2 text-zinc-100 uppercase tracking-widest font-extrabold text-[11px]">Sum / Target</td>
                  
                  {/* T1 target comparison */}
                  <td className="py-3 text-center text-zinc-100">
                    <span className="font-extrabold text-[11px]">
                      {totalTier1}g
                    </span>
                    <span className="text-[9px] text-zinc-400 font-bold"> / {activeTargets.tier1Protein}g</span>
                  </td>

                  {/* T2 target comparison */}
                  <td className="py-3 text-center text-zinc-100">
                    <span className="font-extrabold text-[11px]">
                      {totalTier2}g
                    </span>
                    <span className="text-[9px] text-zinc-400 font-bold"> / {activeTargets.tier2Protein}g</span>
                  </td>

                  {/* Total protein target comparison */}
                  <td className="py-3 text-center text-zinc-100">
                    <span className="font-extrabold text-[11px]">
                      {totalProtein}g
                    </span>
                    <span className="text-[9px] text-zinc-400 font-bold"> / {activeTargets.tier1Protein + activeTargets.tier2Protein}g</span>
                  </td>

                  {/* Fat target comparison */}
                  <td className="py-3 text-center text-zinc-100">
                    <span className="font-extrabold text-[11px]">
                      {totalFat}g
                    </span>
                    <span className="text-[9px] text-zinc-400 font-bold"> / {activeTargets.fat}g</span>
                  </td>

                  {/* Carbs (Generic sum) */}
                  <td className="py-3 text-center text-zinc-100 font-extrabold text-[11px]">
                    {totalCarbs}g
                  </td>

                  {/* Calories target comparison */}
                  <td className="py-3 text-right pr-2 text-zinc-100">
                    <span className="font-extrabold text-[11px]">
                      {totalCalories}
                    </span>
                    <span className="text-[9px] text-zinc-400 font-bold"> / {activeTargets.calories} kcal</span>
                  </td>

                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Plus button with absolutely no descriptive text label (Only visible on hover) */}
          <div className="flex justify-center transition-all duration-300 opacity-0 hover:opacity-100 h-8 hover:h-12 flex items-center justify-center mt-2 border-t border-white/[0.01]">
            <button
              onClick={handleAddNewMealRow}
              className="p-1.5 rounded-full bg-white hover:bg-zinc-200 text-zinc-950 transition-all cursor-pointer flex items-center justify-center shadow"
              title="Add Row"
            >
              <Plus size={13} strokeWidth={2.5} />
            </button>
          </div>

          {/* Morning & Night Weight, and Water Quick Log Tray */}
          <div className="flex flex-wrap items-center gap-4 py-2.5 px-3 bg-white/[0.01] rounded-lg border border-white/[0.04] text-[10px] font-mono mt-4">
            <span className="text-zinc-500 uppercase tracking-widest font-bold">Metrics Log:</span>
            
            {/* Water intake */}
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
                className="w-16 bg-zinc-950/60 border border-white/10 rounded px-1.5 py-0.5 text-center text-white focus:outline-none focus:border-white/30"
              />
              <span className="text-zinc-500">ml</span>
            </div>

            {/* Morning Weight Input */}
            <div className="flex items-center gap-1.5 border-r border-white/5 pr-3">
              <span className="text-zinc-400 font-mono uppercase">Morning Weight (AM):</span>
              <input
                type="number"
                step="0.1"
                placeholder="--"
                value={activeLog.morningWeight ?? ""}
                onChange={(e) => {
                  const val = e.target.value === "" ? undefined : parseFloat(e.target.value);
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
                className="w-14 bg-zinc-950/60 border border-white/10 rounded px-1.5 py-0.5 text-center text-white focus:outline-none focus:border-white/30"
                title="Morning Weight"
              />
              <span className="text-zinc-500">kg</span>
            </div>

            {/* Night Weight Input */}
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400 font-mono uppercase">Night Weight (PM):</span>
              <input
                type="number"
                step="0.1"
                placeholder="--"
                value={activeLog.nightWeight ?? ""}
                onChange={(e) => {
                  const val = e.target.value === "" ? undefined : parseFloat(e.target.value);
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
                className="w-14 bg-zinc-950/60 border border-white/10 rounded px-1.5 py-0.5 text-center text-white focus:outline-none focus:border-white/30"
                title="Night Weight"
              />
              <span className="text-zinc-500">kg</span>
            </div>
          </div>
        </div>
      )}

      {/* Chronological Vertical logs switch view - pristine layout table */}
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
                      
                      {/* Calories highlight */}
                      <td className={`py-2 text-right pr-1 transition-all ${calsMet ? "text-zinc-100 font-bold" : "text-zinc-500"}`}>
                        {totalCals}g
                      </td>

                      {/* Tier 1 highlighting */}
                      <td className={`py-2 text-right pr-1 transition-all ${t1Met ? "text-zinc-100 font-bold" : "text-zinc-500"}`}>
                        {totalT1}g
                      </td>

                      {/* Tier 2 highlighting */}
                      <td className={`py-2 text-right pr-1 transition-all ${t2Met ? "text-zinc-100 font-bold" : "text-zinc-500"}`}>
                        {totalT2}g
                      </td>

                      {/* Total Protein highlighting */}
                      <td className={`py-2 text-right pr-1 transition-all ${protMet ? "text-zinc-100 font-bold" : "text-zinc-500"}`}>
                        {totalP}g
                      </td>

                      {/* Fats column */}
                      <td className="py-2 text-right pr-1 text-zinc-400">
                        {totalFat > 0 ? `${totalFat}g` : "·"}
                      </td>

                      {/* Water column */}
                      <td className="py-2 text-right pr-1 text-zinc-400">
                        {totalWater > 0 ? `${totalWater}ml` : "·"}
                      </td>

                      {/* AM Wt column */}
                      <td className="py-2 text-right pr-1 text-zinc-400">
                        {amWt !== undefined ? `${amWt}kg` : "·"}
                      </td>

                      {/* PM Wt column */}
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

    </div>
  );
}
