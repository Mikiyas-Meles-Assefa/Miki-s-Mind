/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { AppState, DailyLog } from "../types";
import { 
  getRelativeDateKey, 
  formatShortDate, 
  calculateStreak, 
  isNutritionMet, 
  isWaterMet 
} from "../utils";
import { Plus, Flame, Droplet, Dumbbell, Apple, Heart, Check, Sparkles, PlusCircle } from "lucide-react";

interface HomeHabitTrackerProps {
  state: AppState;
  onSaveState: (updatedState: AppState) => void;
}

export function HomeHabitTracker({ state, onSaveState }: HomeHabitTrackerProps) {
  const [newHabitName, setNewHabitName] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // We want to render 11 days scrollable, with Today (offset 0) centered in the middle.
  // So index from 5 days ago (i=5) down to 5 days in the future (i=-5) to display.
  const daysKeys: string[] = [];
  for (let i = 5; i >= -5; i--) {
    daysKeys.push(getRelativeDateKey(i));
  }

  // Scroll to center on mount so Today is displayed centered by default
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      const scrollWidth = container.scrollWidth;
      const clientWidth = container.clientWidth;
      if (scrollWidth > clientWidth) {
        container.scrollLeft = (scrollWidth - clientWidth) / 2;
      }
    }
  }, []);

  // Handle checking off custom habits on a specific day
  const toggleCustomHabit = (dateKey: string, habitName: string) => {
    const existingLog = state.dailyLogs[dateKey] || {
      date: dateKey,
      routineId: "",
      gymLog: {},
      meals: [],
      waterIntake: 0,
      customHabits: {},
    };

    const updatedCustomHabits = {
      ...(existingLog.customHabits || {}),
      [habitName]: !existingLog.customHabits?.[habitName],
    };

    const updatedLog: DailyLog = {
      ...existingLog,
      customHabits: updatedCustomHabits,
    };

    onSaveState({
      ...state,
      dailyLogs: {
        ...state.dailyLogs,
        [dateKey]: updatedLog,
      },
    });
  };

  // Add a brand new custom habit to the system
  const handleAddCustomHabit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newHabitName.trim();
    if (!name) return;
    if (state.customHabitsList.includes(name)) {
      setNewHabitName("");
      return;
    }

    onSaveState({
      ...state,
      customHabitsList: [...state.customHabitsList, name],
    });
    setNewHabitName("");
  };

  // Delete a custom habit
  const handleDeleteCustomHabit = (habitName: string) => {
    onSaveState({
      ...state,
      customHabitsList: state.customHabitsList.filter((h) => h !== habitName),
    });
  };

  // Calculate high level streaks
  const gymStreak = calculateStreak("gym", state.dailyLogs, state.targets, state.customHabitsList);
  const nutritionStreak = calculateStreak("nutrition", state.dailyLogs, state.targets, state.customHabitsList);
  const waterStreak = calculateStreak("water", state.dailyLogs, state.targets, state.customHabitsList);

  const isLightTheme = state.theme === "apple-light" || state.theme === "nordic" || state.theme === "sepia";

  return (
    <div id="home-habit-tracker" className="space-y-4">
      {/* Main Horizontal Timeline */}
      <div 
        id="timeline-panel" 
        className="glass-panel rounded-xl p-4 flex flex-col"
      >
        {/* Row labels & scrollable timeline columns side by side */}
        <div className="flex w-full overflow-hidden">
          
          {/* Left sidebar labels with subtle styling for timeline rows */}
          <div id="timeline-row-labels" className="w-[84px] sm:w-28 timeline-labels-bg flex flex-col justify-between pt-10 text-[10px] uppercase font-mono pr-2 border-r border-white/5 shrink-0 select-none">
            <div className="h-6 flex items-center justify-center gap-1.5 w-full habit-row-label">
              <span className="truncate habit-name">Gym</span>
              <span className="text-[9px] font-bold flex items-center gap-0.5 shrink-0 habit-streak">
                <Flame size={10} className="habit-streak-flame animate-pulse" /> {gymStreak}
              </span>
            </div>
            <div className="h-6 flex items-center justify-center gap-1.5 w-full habit-row-label">
              <span className="truncate habit-name">Meals</span>
              <span className="text-[9px] font-bold flex items-center gap-0.5 shrink-0 habit-streak">
                <Flame size={10} className="habit-streak-flame animate-pulse" /> {nutritionStreak}
              </span>
            </div>
            <div className="h-6 flex items-center justify-center gap-1.5 w-full habit-row-label">
              <span className="truncate habit-name">Water</span>
              <span className="text-[9px] font-bold flex items-center gap-0.5 shrink-0 habit-streak">
                <Flame size={10} className="habit-streak-flame animate-pulse" /> {waterStreak}
              </span>
            </div>
            {state.customHabitsList.map((habitName) => {
              const streak = calculateStreak(habitName, state.dailyLogs, state.targets, state.customHabitsList);
              return (
                <div key={habitName} className="h-6 flex items-center justify-center gap-1.5 w-full habit-row-label" title={habitName}>
                  <span className="truncate pr-1 habit-name">{habitName}</span>
                  <span className="text-[9px] font-bold flex items-center gap-0.5 shrink-0 habit-streak">
                    <Flame size={10} className="habit-streak-flame animate-pulse" /> {streak}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Swipe-friendly horizontal container containing ONLY the calendar columns */}
          <div 
            id="timeline-scroller"
            ref={containerRef}
            className="flex-1 overflow-x-auto no-scrollbar flex pb-3 scroll-smooth ml-1 sm:ml-3"
          >
            <div className="flex min-w-[500px] w-full">
              {/* Individual Columns containing days */}
              <div id="timeline-days-columns" className="flex flex-1 justify-between gap-1">
              {daysKeys.map((dateKey, index) => {
                const isToday = index === 5; // index 5 of 11 is exactly Today
                const isFuture = index > 5;
                const { dayName, dayNum } = formatShortDate(dateKey);
                const log = state.dailyLogs[dateKey];
                
                // Gym routine checks
                const gymOk = !!(log?.routineId && log.routineId !== "");
                
                // Nutrition checks
                const targetGoals = log ? state.targets[log.routineId] : undefined;
                const nutritionOk = isNutritionMet(log, targetGoals);

                // Water checks
                const waterOk = isWaterMet(log, targetGoals);

                return (
                  <div 
                    key={dateKey} 
                    id={`timeline-day-${dateKey}`}
                    className={`flex-1 flex flex-col items-center gap-2 py-1 rounded-lg transition-all relative ${
                      isFuture
                        ? "opacity-40 hover:opacity-85"
                        : "hover:bg-white/[0.005]"
                    }`}
                  >
                    {/* Header: Day and Number */}
                    <div className="text-center select-none shrink-0 mb-1">
                      <span className={`block text-[9px] font-mono uppercase ${isToday ? "text-white font-extrabold" : "text-zinc-500"}`}>
                        {dayName}
                      </span>
                      <span className={`block text-[11px] font-medium mt-0.5 ${isToday ? "text-white font-black underline decoration-white/20 underline-offset-2" : "text-zinc-400"}`}>
                        {dayNum}
                      </span>
                    </div>

                    {/* GYM row bubble */}
                    <div className="h-6 flex items-center justify-center relative">
                      <div 
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all duration-300 ${
                          gymOk 
                            ? "indicator-completed bg-zinc-100 scale-110 shadow-sm" 
                            : "indicator-empty bg-zinc-950 border border-white/10"
                        }`}
                        title={gymOk ? "Routine completed" : "Rest/Unlogged"}
                      >
                        {gymOk && <div className="w-1.5 h-1.5 rounded-full bg-zinc-950 indicator-completed-dot" />}
                      </div>
                    </div>

                    {/* NUTRITION row bubble */}
                    <div className="h-6 flex items-center justify-center">
                      <div 
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all duration-300 ${
                          nutritionOk 
                            ? "indicator-completed bg-zinc-100 scale-110 shadow-sm" 
                            : "indicator-empty bg-zinc-950 border border-white/10"
                        }`}
                        title={nutritionOk ? "Nutrition goal met" : "Incomplete"}
                      >
                        {nutritionOk && <div className="w-1.5 h-1.5 rounded-full bg-zinc-950 indicator-completed-dot" />}
                      </div>
                    </div>

                    {/* WATER row bubble */}
                    <div className="h-6 flex items-center justify-center">
                      <div 
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all duration-300 ${
                          waterOk 
                            ? "indicator-completed bg-zinc-100 scale-110 shadow-sm" 
                            : "indicator-empty bg-zinc-950 border border-white/10"
                        }`}
                        title={waterOk ? "Hydration goal met" : "Incomplete"}
                      >
                        {waterOk && <div className="w-1.5 h-1.5 rounded-full bg-zinc-950 indicator-completed-dot" />}
                      </div>
                    </div>

                    {/* Custom Habits rows */}
                    {state.customHabitsList.map((habitName) => {
                      const isCompleted = !!log?.customHabits?.[habitName];
                      return (
                        <div 
                          key={habitName} 
                          className="h-6 flex items-center justify-center"
                        >
                          <button
                            onClick={() => toggleCustomHabit(dateKey, habitName)}
                            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer ${
                              isCompleted 
                                ? "indicator-completed bg-zinc-100 scale-110 shadow-sm" 
                                : "indicator-empty bg-zinc-950 border border-white/10 hover:border-zinc-500"
                            }`}
                            aria-label={`Toggle ${habitName}`}
                          >
                            {isCompleted && <div className="w-1.5 h-1.5 rounded-full bg-zinc-950 indicator-completed-dot" />}
                          </button>
                        </div>
                      );
                    })}


                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

        {/* Dynamic Hover-to-Reveal Habit Management Drawer Area */}
        <div 
          id="timeline-add-habit-overlay" 
          onMouseEnter={() => setShowAddForm(true)}
          onMouseLeave={() => setShowAddForm(false)}
          className="border-t border-white/[0.02] mt-3 pt-2.5 transition-all duration-300 min-h-[12px] flex flex-col justify-end cursor-pointer"
        >
          {!showAddForm ? (
            <div className="h-2 w-full transition-all duration-300 pointer-events-none"></div>
          ) : (
            <div className="space-y-3 pt-1 pb-1 animate-fade-in transition-all duration-300">
              <form onSubmit={handleAddCustomHabit} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  placeholder="Add dynamic habit..."
                  className="flex-1 bg-zinc-950 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-white/10 habit-creator-input"
                  autoFocus
                />
                <button
                  type="submit"
                  className="bg-white hover:bg-zinc-200 text-zinc-950 p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center habit-creator-submit-btn"
                  title="Add Habit"
                >
                  <Plus size={14} strokeWidth={2.5} />
                </button>
              </form>

              {/* List of custom habits with delete buttons */}
              {state.customHabitsList.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {state.customHabitsList.map((habitName) => (
                    <div 
                      key={habitName}
                      className="flex items-center gap-1.5 py-0.5 px-2 bg-white/[0.02] text-[10px] font-mono text-zinc-400 border border-white/[0.02] habit-creator-pill"
                    >
                      <span className="habit-creator-pill-name">{habitName}</span>
                      <button 
                        type="button"
                        onClick={() => handleDeleteCustomHabit(habitName)}
                        className="text-zinc-650 hover:text-white transition-colors cursor-pointer habit-creator-pill-delete"
                        title="Delete Habit"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[10px] font-mono text-zinc-600 italic">No custom habits defined. Type above and click "+".</div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
