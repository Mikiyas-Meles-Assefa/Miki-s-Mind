/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AppState, DailyLog, SetLog, Exercise } from "../types";
import { getRelativeDateKey, formatShortDate } from "../utils";
import { TrendingUp, Trash2, Plus, Check, X, Dumbbell, ChevronLeft, ChevronRight, Lightbulb, Shuffle, ChevronDown, ChevronUp } from "lucide-react";

interface GymTrackerProps {
  state: AppState;
  onSaveState: (updatedState: AppState) => void;
}

export function GymTracker({ state, onSaveState }: GymTrackerProps) {
  const [selectedDateKey, setSelectedDateKey] = useState<string>(getRelativeDateKey(0));
  const [hoveredDateKey, setHoveredDateKey] = useState<string | null>(null);
  const [activeExerciseHistory, setActiveExerciseHistory] = useState<string | null>(null); // Center peek exercise ID
  
  // Guidelines FAQ States
  const [isGuidelinesOpen, setIsGuidelinesOpen] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<string | null>("goal");

  // Alternatives Toggle states
  const [showAltsForExId, setShowAltsForExId] = useState<string | null>(null);

  // To deal with inline set logging
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [tempWeight, setTempWeight] = useState<string>("");
  const [tempRepsList, setTempRepsList] = useState<string[]>([""]);

  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth()); // 0-11

  // Generate days for viewed month/year
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const calendarDays: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const monthStr = String(currentMonth + 1).padStart(2, "0");
    const dayStr = String(d).padStart(2, "0");
    calendarDays.push(`${currentYear}-${monthStr}-${dayStr}`);
  }

  // Find day of week the 1st of the month falls on (0 is Sunday, 6 is Saturday)
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const emptyPrefixSlots = firstDayOfWeek;

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // Cycle day routine: "" (unlogged/dot) -> "A" -> "B" -> "R" -> ""
  const cycleDayRoutine = (dateKey: string) => {
    const existingLog = state.dailyLogs[dateKey] || {
      date: dateKey,
      routineId: "",
      gymLog: {},
      meals: [],
      waterIntake: 0,
      customHabits: {},
    };

    let nextId = "A";
    if (!existingLog.routineId) nextId = "A";
    else if (existingLog.routineId === "A") nextId = "B";
    else if (existingLog.routineId === "B") nextId = "R";
    else if (existingLog.routineId === "R") nextId = "";

    const updatedLog: DailyLog = {
      ...existingLog,
      routineId: nextId,
    };

    onSaveState({
      ...state,
      dailyLogs: {
        ...state.dailyLogs,
        [dateKey]: updatedLog,
      },
    });
  };

  // Get active exercise variation (can be primary or one of its alternatives)
  const getActiveExerciseForDay = (primaryEx: Exercise, log: DailyLog | undefined): { id: string; name: string; defaultSets: number } => {
    if (!log || !log.selectedExercises || !log.selectedExercises[primaryEx.id]) {
      return primaryEx;
    }
    const chosenId = log.selectedExercises[primaryEx.id];
    if (chosenId === primaryEx.id) return primaryEx;

    const alt = (primaryEx.alternatives || []).find(a => a.id === chosenId);
    return alt ? { id: alt.id, name: alt.name, defaultSets: alt.defaultSets } : primaryEx;
  };

  const handleSelectExerciseVariation = (dateKey: string, primaryExId: string, chosenExId: string) => {
    const existingLog = state.dailyLogs[dateKey] || {
      date: dateKey,
      routineId: "",
      gymLog: {},
      meals: [],
      waterIntake: 0,
      customHabits: {},
    };

    const updatedSelected = {
      ...(existingLog.selectedExercises || {}),
      [primaryExId]: chosenExId
    };

    const updatedLog: DailyLog = {
      ...existingLog,
      selectedExercises: updatedSelected
    };

    onSaveState({
      ...state,
      dailyLogs: {
        ...state.dailyLogs,
        [dateKey]: updatedLog
      }
    });
  };

  // Extract raw peek text for hovering tooltip
  const getRawPeekText = (dateKey: string) => {
    const log = state.dailyLogs[dateKey];
    if (!log || !log.routineId || log.routineId === "R") {
      return log?.routineId === "R" ? "Rest Day" : "No routine scheduled";
    }

    const routine = state.routines.find(r => r.id === log.routineId);
    if (!routine) return "Routine " + log.routineId;

    const sections: string[] = [];
    routine.exercises.forEach(primaryEx => {
      const activeEx = getActiveExerciseForDay(primaryEx, log);
      const sets = log.gymLog[activeEx.id] || [];
      if (sets.length > 0) {
        const weight = sets[0].weight;
        const reps = sets.map(s => s.reps).join(" ");
        sections.push(`${activeEx.name}: ${weight}kg (${reps})`);
      }
    });

    if (sections.length === 0) {
      return "0 sets logged";
    }
    return sections.join(" / ");
  };

  const handleStartEditing = (ex: Exercise, currentSets: SetLog[]) => {
    setEditingExerciseId(ex.id);
    if (currentSets.length > 0) {
      setTempWeight(String(currentSets[0].weight));
      setTempRepsList(currentSets.map(s => String(s.reps)));
    } else {
      setTempWeight("60");
      setTempRepsList(["10", "10", "10"]);
    }
  };

  const handleAddTempSet = () => {
    setTempRepsList([...tempRepsList, "10"]);
  };

  const handleRemoveTempSet = (idx: number) => {
    setTempRepsList(tempRepsList.filter((_, i) => i !== idx));
  };

  const handleUpdateTempRep = (idx: number, val: string) => {
    const nextList = [...tempRepsList];
    nextList[idx] = val;
    setTempRepsList(nextList);
  };

  const handleSaveSets = (dateKey: string, exId: string) => {
    const existingLog = state.dailyLogs[dateKey] || {
      date: dateKey,
      routineId: "",
      gymLog: {},
      meals: [],
      waterIntake: 0,
      customHabits: {},
    };

    const weightNum = parseFloat(tempWeight) || 0;
    const formattedSets: SetLog[] = tempRepsList
      .map(repStr => ({
        weight: weightNum,
        reps: parseInt(repStr, 10) || 0
      }))
      .filter(s => s.reps > 0);

    const updatedGymLog = {
      ...(existingLog.gymLog || {}),
      [exId]: formattedSets
    };

    const updatedLog: DailyLog = {
      ...existingLog,
      gymLog: updatedGymLog
    };

    onSaveState({
      ...state,
      dailyLogs: {
        ...state.dailyLogs,
        [dateKey]: updatedLog
      }
    });

    setEditingExerciseId(null);
  };

  const handleDayClick = (dateKey: string) => {
    if (selectedDateKey === dateKey) {
      // Second click on focused day cycles the routine type
      cycleDayRoutine(dateKey);
    } else {
      // First click focuses the day
      setSelectedDateKey(dateKey);
    }
  };

  const selectedLog = state.dailyLogs[selectedDateKey];
  const activeRoutineId = (selectedLog && selectedLog.routineId) ? selectedLog.routineId : "R";
  const activeRoutine = state.routines.find(r => r.id === activeRoutineId);

  // Gathering history
  const getExerciseHistory = (exId: string): { date: string; sets: SetLog[]; exerciseName?: string }[] => {
    const historyList: { date: string; sets: SetLog[]; exerciseName?: string }[] = [];
    const clickedExercise = state.routines
      .flatMap(r => r.exercises.flatMap(e => [e, ...(e.alternatives || [])]))
      .find(e => e.id === exId);
    if (!clickedExercise) return [];

    const targetName = clickedExercise.name.trim().toLowerCase();
    const matchingIds = new Set<string>();
    matchingIds.add(exId);

    state.routines.forEach(r => {
      r.exercises.forEach(ex => {
        if (ex.name.trim().toLowerCase() === targetName) {
          matchingIds.add(ex.id);
        }
        (ex.alternatives || []).forEach(alt => {
          if (alt.name.trim().toLowerCase() === targetName) {
            matchingIds.add(alt.id);
          }
        });
      });
    });

    Object.keys(state.dailyLogs).forEach(date => {
      const log = state.dailyLogs[date];
      if (log && log.gymLog) {
        matchingIds.forEach(id => {
          if (log.gymLog[id] && log.gymLog[id].length > 0) {
            const exObj = state.routines
              .flatMap(r => r.exercises.flatMap(e => [e, ...(e.alternatives || [])]))
              .find(e => e.id === id);

            historyList.push({
              date,
              sets: log.gymLog[id],
              exerciseName: exObj?.name || clickedExercise.name
            });
          }
        });
      }
    });

    const uniqueHistory: Record<string, { date: string; sets: SetLog[]; exerciseName?: string }> = {};
    historyList.forEach(item => {
      // Keep the most comprehensive log if there are duplicates for the same day
      if (!uniqueHistory[item.date] || item.sets.length > uniqueHistory[item.date].sets.length) {
        uniqueHistory[item.date] = item;
      }
    });

    return Object.values(uniqueHistory).sort((a,b) => b.date.localeCompare(a.date));
  };

  const selectedHistoryEx = activeExerciseHistory 
    ? state.routines.flatMap(r => r.exercises.flatMap(e => [e, ...(e.alternatives || [])])).find(e => e.id === activeExerciseHistory)
    : null;

  return (
    <div id="gym-tracker" className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* Super Minimal Month View Calendar (No outlines, very small) */}
        <div id="gym-calendar" className="glass-panel rounded-xl p-3 lg:col-span-4 w-full">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-1 rounded bg-white/[0.02] hover:bg-white/5 border border-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer flex items-center justify-center"
              title="Previous Month"
            >
              <ChevronLeft size={11} />
            </button>
            <span className="text-[10px] font-mono text-zinc-300 uppercase tracking-widest">
              {months[currentMonth]} {currentYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1 rounded bg-white/[0.02] hover:bg-white/5 border border-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer flex items-center justify-center"
              title="Next Month"
            >
              <ChevronRight size={11} />
            </button>
            <button
              onClick={() => setIsGuidelinesOpen(true)}
              className="p-1 rounded bg-white/[0.02] hover:bg-white/5 border border-white/5 text-amber-350 hover:text-amber-250 text-amber-300 transition-all cursor-pointer flex items-center justify-center ml-1.5"
              title="Training Rules & Guidelines"
            >
              <Lightbulb size={12} className="fill-amber-450/10" />
            </button>
          </div>
          <span className="text-[9px] font-mono text-zinc-500">
            Selected: {formatShortDate(selectedDateKey).monthName} {formatShortDate(selectedDateKey).dayNum}
          </span>
        </div>

        {/* 7 columns grid */}
        <div className="grid grid-cols-7 gap-1 text-center font-mono text-[9px] text-zinc-600 mb-1">
          <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
        </div>

        <div className="grid grid-cols-7 gap-1 relative">
          {/* Prefix slots */}
          {Array.from({ length: emptyPrefixSlots }).map((_, idx) => (
            <div key={`empty-${idx}`} className="w-8 h-8" />
          ))}

          {/* Month Days */}
          {calendarDays.map((dateKey) => {
            const isSelected = selectedDateKey === dateKey;
            const log = state.dailyLogs[dateKey];
            const routineId = log?.routineId;

            let routineChar = "•";
            let circleStyle = "bg-white/[0.01] hover:bg-white/5 text-zinc-500 font-normal";

            if (routineId === "A") {
              routineChar = "A";
              circleStyle = "bg-white/5 hover:bg-white/10 text-white font-medium";
            } else if (routineId === "B") {
              routineChar = "B";
              circleStyle = "bg-white/5 hover:bg-white/10 text-white font-medium";
            } else if (routineId === "R") {
              routineChar = "R";
              circleStyle = "bg-white/5 hover:bg-white/10 text-zinc-400 font-medium";
            }

            if (isSelected) {
              circleStyle = "bg-white text-zinc-950 font-bold";
            }

            return (
              <div
                key={dateKey}
                className="relative flex justify-center items-center"
                onMouseEnter={() => setHoveredDateKey(dateKey)}
                onMouseLeave={() => setHoveredDateKey(null)}
              >
                <button
                  type="button"
                  onClick={() => handleDayClick(dateKey)}
                  className={`w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer text-[10px] ${circleStyle}`}
                >
                  {routineChar}
                </button>

                {/* Micro tooltip */}
                {hoveredDateKey === dateKey && (
                  <div className="absolute z-50 bottom-9 left-1/2 -translate-x-1/2 bg-zinc-950 border border-white/5 rounded px-2.5 py-1.5 w-48 text-[9px] font-mono text-zinc-300 shadow-xl leading-normal text-center pointer-events-none calendar-tooltip-popover">
                    <div className="text-zinc-500 uppercase tracking-widest font-semibold text-[8px] mb-0.5 calendar-tooltip-title">
                      {formatShortDate(dateKey).monthName} {formatShortDate(dateKey).dayNum}
                    </div>
                    <div className="calendar-tooltip-body">{getRawPeekText(dateKey)}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily Exercises Details and Inline logs */}
      <div id="workout-detail-section" className="glass-panel rounded-xl p-4 lg:col-span-8 w-full">
        <div className="flex items-center justify-between border-b border-white/[0.02] pb-3 mb-4">
          <h5 className="font-display text-sm font-medium text-zinc-100">
            {activeRoutine ? activeRoutine.name : "Rest Day / Recovery"}
          </h5>
          <span className="text-[10px] font-mono text-zinc-505 text-zinc-500 uppercase">
            {selectedLog?.routineId || "R"}
          </span>
        </div>

        {!activeRoutine || activeRoutine.exercises.length === 0 ? (
          <div className="text-center py-6 text-zinc-550 text-zinc-500 text-xs italic">
            Rest and recover physically.
          </div>
        ) : (
          <div className="space-y-3">
            {activeRoutine.exercises.map((primaryEx) => {
              const activeEx = getActiveExerciseForDay(primaryEx, selectedLog);
              const loggedSets = selectedLog?.gymLog[activeEx.id] || [];
              const isEditing = editingExerciseId === activeEx.id;
              const hasAlternatives = primaryEx.alternatives && primaryEx.alternatives.length > 0;

              return (
                <div 
                  key={primaryEx.id} 
                  className="p-3 rounded-lg bg-white/[0.01] hover:bg-white/[0.02] border border-white/[0.02] transition-all flex flex-col gap-2"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {/* Click exercise to open sleek Center Peek View */}
                      <button
                        type="button"
                        onClick={() => setActiveExerciseHistory(activeEx.id)}
                        className="text-left cursor-pointer group flex items-center gap-1.5"
                      >
                        <span className="text-xs font-medium text-zinc-100 group-hover:text-zinc-300 transition-colors uppercase tracking-wider font-mono">
                          {activeEx.name}
                        </span>
                        {activeEx.id !== primaryEx.id && (
                          <span className="text-[8px] bg-white/10 text-zinc-400 font-mono px-1 py-0.2 rounded uppercase">Alt</span>
                        )}
                      </button>

                      {/* Alternatives Trigger button */}
                      {hasAlternatives && (
                        <button
                          type="button"
                          onClick={() => setShowAltsForExId(showAltsForExId === primaryEx.id ? null : primaryEx.id)}
                          className="p-1 rounded hover:bg-white/5 text-zinc-500 hover:text-white transition-all flex items-center gap-0.5 cursor-pointer"
                          title="Switch Variations / Alternatives"
                        >
                          <Shuffle size={10} />
                          <ChevronDown size={10} className={`transition-transform duration-200 ${showAltsForExId === primaryEx.id ? "rotate-180" : ""}`} />
                        </button>
                      )}
                    </div>

                    {/* Inline sets summary or Log button */}
                    {!isEditing && (
                      <div 
                        className="cursor-pointer min-h-8 flex items-center justify-end rounded px-2 hover:bg-white/[0.03] transition-all"
                        onClick={() => handleStartEditing(activeEx as Exercise, loggedSets)}
                      >
                        {loggedSets.length === 0 ? (
                          <span className="text-[10px] text-zinc-500 font-mono flex items-center">
                            + Log
                          </span>
                        ) : (
                          <div className="font-mono text-[11px] text-right">
                            <span className="text-zinc-200 font-medium mr-2">{loggedSets[0].weight}kg</span>
                            <span className="text-zinc-500">{loggedSets.map(s => s.reps).join(" ")}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Alternatives Selector Toggle List nested */}
                  {showAltsForExId === primaryEx.id && hasAlternatives && (
                    <div className="bg-zinc-950/40 p-2 rounded-lg border border-white/5 space-y-1 mt-1 animate-fade-in select-none">
                      <span className="text-[8px] font-mono tracking-widest text-zinc-500 uppercase block pl-1 mb-1">Select Active Lift Variation</span>
                      <div className="flex flex-col gap-0.5 font-mono">
                        {/* Primary Option */}
                        <button
                          onClick={() => {
                            handleSelectExerciseVariation(selectedDateKey, primaryEx.id, primaryEx.id);
                            setShowAltsForExId(null);
                          }}
                          className={`flex items-center justify-between text-[10px] px-2.5 py-1.5 rounded transition-all text-left uppercase ${
                            activeEx.id === primaryEx.id
                              ? "bg-white/10 text-white font-medium"
                              : "text-zinc-400 hover:text-white hover:bg-white/[0.02]"
                          }`}
                        >
                          <span>{primaryEx.name} (Primary)</span>
                          {activeEx.id === primaryEx.id && <Check size={10} className="text-emerald-400" />}
                        </button>

                        {/* Alternate options list */}
                        {(primaryEx.alternatives || []).map((alt) => (
                          <button
                            key={alt.id}
                            onClick={() => {
                              handleSelectExerciseVariation(selectedDateKey, primaryEx.id, alt.id);
                              setShowAltsForExId(null);
                            }}
                            className={`flex items-center justify-between text-[10px] px-2.5 py-1.5 rounded transition-all text-left uppercase ${
                              activeEx.id === alt.id
                                ? "bg-white/10 text-white font-medium"
                                : "text-zinc-400 hover:text-white hover:bg-white/[0.02]"
                            }`}
                          >
                            <span>{alt.name}</span>
                            {activeEx.id === alt.id && <Check size={10} className="text-emerald-400" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sleek inline set picker */}
                  {isEditing && (
                    <div className="bg-zinc-950/50 rounded p-2.5 border border-white/[0.02] space-y-2.5 mt-1 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-mono tracking-widest text-zinc-500 uppercase">Input metrics</span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleSaveSets(selectedDateKey, activeEx.id)}
                            className="p-1 rounded bg-white hover:bg-zinc-200 text-zinc-950 transition-colors cursor-pointer"
                            title="Save"
                          >
                            <Check size={11} strokeWidth={3} />
                          </button>
                          <button
                            onClick={() => setEditingExerciseId(null)}
                            className="p-1 rounded hover:bg-white/5 text-zinc-400 transition-all cursor-pointer"
                            title="Cancel"
                          >
                            <X size={11} />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="flex items-center gap-1.5 bg-zinc-900 border border-white/5 rounded px-2 py-1 shrink-0 font-mono text-[10px]">
                          <span className="text-zinc-650 text-zinc-500">KG</span>
                          <input
                            type="number"
                            value={tempWeight}
                            onChange={(e) => setTempWeight(e.target.value)}
                            className="w-12 bg-transparent text-white font-medium focus:outline-none"
                            placeholder="0"
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {tempRepsList.map((reps, i) => (
                            <div key={i} className="flex items-center gap-0.5">
                              <span className="text-[8px] text-zinc-600 font-mono w-2 select-none">{i+1}</span>
                              <input
                                type="number"
                                value={reps}
                                onChange={(e) => handleUpdateTempRep(i, e.target.value)}
                                className="w-8 h-6 bg-zinc-900 border border-white/5 rounded text-center text-[10px] font-mono text-zinc-200 focus:outline-none focus:border-white/10"
                                placeholder="0"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveTempSet(i)}
                                className="text-[11px] text-zinc-650 hover:text-white px-0.5"
                              >
                                &times;
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={handleAddTempSet}
                            className="h-6 w-6 rounded border border-white/5 hover:bg-white/5 flex items-center justify-center text-zinc-500 cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      </div>

      {/* Sleek Center-peek Modal for Progression and History */}
      {activeExerciseHistory && selectedHistoryEx && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel-heavy rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl relative border border-white/[0.04]">
            
            <button 
              onClick={() => setActiveExerciseHistory(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="space-y-1">
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block font-bold">
                Progression History
              </span>
              <h4 className="font-display text-base font-semibold text-zinc-100">
                {selectedHistoryEx.name}
              </h4>
            </div>

            {/* Custom Center-peek sleek custom graph/progress baseline bar */}
            <div className="bg-zinc-950/40 rounded-lg p-3 space-y-2 border border-white/[0.02]">
              <span className="text-[9px] font-mono text-zinc-400 block uppercase">
                Lift Baseline &amp; Peak Progress
              </span>
              {(() => {
                const history = getExerciseHistory(activeExerciseHistory);
                if (history.length === 0) {
                  return <p className="text-zinc-500 text-[11px] italic">No lift inputs registered yet.</p>;
                }
                const weights = history.map(h => h.sets[0]?.weight).filter(Boolean);
                const maxWeight = Math.max(...weights, 0);
                const minWeight = Math.min(...weights, 0);
                const lastWeight = weights[0] || 0;

                const percent = maxWeight > 0 ? (lastWeight / maxWeight) * 100 : 0;

                return (
                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                      <span>Min: {minWeight}kg</span>
                      <span className="text-white font-semibold">Current: {lastWeight}kg</span>
                      <span>Peak: {maxWeight}kg</span>
                    </div>
                    {/* Linear Sleek Progression Bar */}
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-white" 
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Historical Entries Scroll list */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto no-scrollbar">
              {getExerciseHistory(activeExerciseHistory).length === 0 ? (
                <p className="text-zinc-600 text-xs italic text-center py-4">No entries.</p>
              ) : (
                getExerciseHistory(activeExerciseHistory).map((item) => (
                  <div 
                    key={item.date} 
                    className="flex items-center justify-between p-2 rounded bg-zinc-900/40 border border-white/[0.01]"
                  >
                    <span className="text-[10px] font-mono text-zinc-400">
                      {formatShortDate(item.date).monthName} {formatShortDate(item.date).dayNum}, {item.date.split("-")[0]}
                    </span>
                    <div className="text-right font-mono text-[11px]">
                      <p className="text-zinc-300">
                        <span className="font-semibold text-white">{item.sets[0]?.weight}kg</span>
                        {" "}<span className="text-zinc-500">{item.sets.map(s => s.reps).join(" ")}</span>
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveExerciseHistory(null)}
                className="bg-white hover:bg-zinc-200 text-zinc-950 font-medium px-4 py-1.5 rounded-lg text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Immersive Guidelines & Training Rules Center-peek Dialog */}
      {isGuidelinesOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel-heavy rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative border border-white/[0.04]">
            <button 
              onClick={() => setIsGuidelinesOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="space-y-1">
              <span className="text-[9px] font-mono text-amber-400 uppercase tracking-widest block font-bold">
                Knowledge Hub
              </span>
              <h4 className="font-display text-sm font-semibold text-zinc-100 flex items-center gap-1.5">
                <Lightbulb size={16} className="text-amber-300 fill-amber-300/10 animate-pulse" /> Rules &amp; Guidelines
              </h4>
            </div>

            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 no-scrollbar select-none text-xs">
              
              {/* FAQ Row: Core Goal */}
              <div className="border border-white/5 rounded-xl overflow-hidden bg-zinc-950/20">
                <button
                  type="button"
                  onClick={() => setExpandedFaq(expandedFaq === "goal" ? null : "goal")}
                  className="w-full text-left p-3 font-medium text-zinc-200 flex justify-between items-center hover:bg-white/[0.02]"
                >
                  <span>🎯 Core Goal (10 weeks)</span>
                  <ChevronDown size={12} className={`text-zinc-500 transition-transform ${expandedFaq === "goal" ? "rotate-180" : ""}`} />
                </button>
                {expandedFaq === "goal" && (
                  <div className="p-3 pt-0 text-zinc-400 leading-relaxed space-y-1.5 border-t border-white/[0.02] bg-zinc-950/30 text-[11px]">
                    <p>
                      Increase bodyweight steadily while building shoulder, chest, back, and arm size with controlled fat gain.
                    </p>
                    <p className="font-mono text-[10px] text-emerald-400">
                      Focus heavily on progressive overload & clean metrics tracking.
                    </p>
                  </div>
                )}
              </div>

              {/* FAQ Row: Weekly Structure */}
              <div className="border border-white/5 rounded-xl overflow-hidden bg-zinc-950/20">
                <button
                  type="button"
                  onClick={() => setExpandedFaq(expandedFaq === "structure" ? null : "structure")}
                  className="w-full text-left p-3 font-medium text-zinc-200 flex justify-between items-center hover:bg-white/[0.02]"
                >
                  <span>🗓️ Weekly Structure</span>
                  <ChevronDown size={12} className={`text-zinc-500 transition-transform ${expandedFaq === "structure" ? "rotate-180" : ""}`} />
                </button>
                {expandedFaq === "structure" && (
                  <div className="p-3 pt-0 text-zinc-400 leading-relaxed space-y-1 border-t border-white/[0.02] bg-zinc-950/30 text-[11px]">
                    <p className="font-mono text-[10px] text-zinc-300">A / B / Rest / A / B / Rest / Rest</p>
                    <div className="mt-1 space-y-0.5 text-[10px] font-mono text-zinc-500">
                      <p>• Day 1: Routine A (Push + Legs)</p>
                      <p>• Day 2: Routine B (Pull + Core)</p>
                      <p>• Day 3: Routine R (Rest)</p>
                      <p>• Day 4: Routine A (Push + Legs)</p>
                      <p>• Day 5: Routine B (Pull + Core)</p>
                      <p>• Day 6: Routine R (Rest)</p>
                      <p>• Day 7: Routine R (Rest)</p>
                    </div>
                  </div>
                )}
              </div>

              {/* FAQ Row: Calories Rules */}
              <div className="border border-white/5 rounded-xl overflow-hidden bg-zinc-950/20">
                <button
                  type="button"
                  onClick={() => setExpandedFaq(expandedFaq === "calories" ? null : "calories")}
                  className="w-full text-left p-3 font-medium text-zinc-200 flex justify-between items-center hover:bg-white/[0.02]"
                >
                  <span>🔥 Calories Target</span>
                  <ChevronDown size={12} className={`text-zinc-500 transition-transform ${expandedFaq === "calories" ? "rotate-180" : ""}`} />
                </button>
                {expandedFaq === "calories" && (
                  <div className="p-3 pt-0 text-zinc-400 leading-relaxed space-y-1 border-t border-white/[0.02] bg-zinc-950/30 text-[11px]">
                    <p className="font-mono text-[10px] text-zinc-300">
                      • <span className="text-white">Gym / Workout Day</span>: 3800 kcal
                    </p>
                    <p className="font-mono text-[10px] text-zinc-300">
                      • <span className="text-white">Rest / Normal Day</span>: 3050 kcal
                    </p>
                  </div>
                )}
              </div>

              {/* FAQ Row: Protein targets */}
              <div className="border border-white/5 rounded-xl overflow-hidden bg-zinc-950/20">
                <button
                  type="button"
                  onClick={() => setExpandedFaq(expandedFaq === "protein" ? null : "protein")}
                  className="w-full text-left p-3 font-medium text-zinc-200 flex justify-between items-center hover:bg-white/[0.02]"
                >
                  <span>🥩 Protein Targets</span>
                  <ChevronDown size={12} className={`text-zinc-500 transition-transform ${expandedFaq === "protein" ? "rotate-180" : ""}`} />
                </button>
                {expandedFaq === "protein" && (
                  <div className="p-3 pt-0 text-zinc-400 leading-relaxed space-y-1.5 border-t border-white/[0.02] bg-zinc-950/30 text-[11px]">
                    <p className="font-semibold text-zinc-350">130g Daily Total requirement:</p>
                    <div className="font-mono text-[10px] space-y-1 pl-1">
                      <p>
                        • <span className="text-emerald-400">Gym Days (A/B)</span>:
                        <br />&nbsp;&nbsp;Tier 1 (Animal/high quality): 100g 
                        <br />&nbsp;&nbsp;Tier 2 (Oats, Bread, etc.): 30g
                      </p>
                      <p>
                        • <span className="text-zinc-450">Rest Days (R)</span>:
                        <br />&nbsp;&nbsp;Tier 1 (Animal/high quality): 90g
                        <br />&nbsp;&nbsp;Tier 2 (Oats, Bread, etc.): 40g
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* FAQ Row: Rest Rules */}
              <div className="border border-white/5 rounded-xl overflow-hidden bg-zinc-950/20">
                <button
                  type="button"
                  onClick={() => setExpandedFaq(expandedFaq === "rest" ? null : "rest")}
                  className="w-full text-left p-3 font-medium text-zinc-200 flex justify-between items-center hover:bg-white/[0.02]"
                >
                  <span>⏱️ Training Rest Times</span>
                  <ChevronDown size={12} className={`text-zinc-500 transition-transform ${expandedFaq === "rest" ? "rotate-180" : ""}`} />
                </button>
                {expandedFaq === "rest" && (
                  <div className="p-3 pt-0 text-zinc-400 leading-relaxed space-y-1 border-t border-white/[0.02] bg-zinc-950/30 font-mono text-[10px]">
                    <p>• Compound lifts: 90–120 sec</p>
                    <p>• Medium lifts: 60–90 sec</p>
                    <p>• Isolation: 45–60 sec</p>
                    <p>• Between exercises: 2–3 min</p>
                  </div>
                )}
              </div>

              {/* FAQ Row: Progression */}
              <div className="border border-white/5 rounded-xl overflow-hidden bg-zinc-950/20">
                <button
                  type="button"
                  onClick={() => setExpandedFaq(expandedFaq === "progression" ? null : "progression")}
                  className="w-full text-left p-3 font-medium text-zinc-200 flex justify-between items-center hover:bg-white/[0.02]"
                >
                  <span>📈 Progression &amp; Weight Pick</span>
                  <ChevronDown size={12} className={`text-zinc-500 transition-transform ${expandedFaq === "progression" ? "rotate-180" : ""}`} />
                </button>
                {expandedFaq === "progression" && (
                  <div className="p-3 pt-0 text-zinc-400 leading-relaxed space-y-1.5 border-t border-white/[0.02] bg-zinc-950/30 text-[11px]">
                    <p>
                      <strong>How to Pick Weight:</strong> Choose load where Set 1 is hard at 8–10 reps, the last 2 reps are slow but clean, and you cannot do more than +2 reps after finishing.
                    </p>
                    <p>
                      • Hit top reps on all sets → increase load next session.
                      <br />• If form breaks → reduce load.
                    </p>
                  </div>
                )}
              </div>

            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setIsGuidelinesOpen(false)}
                className="bg-white hover:bg-zinc-200 text-zinc-950 font-medium px-4 py-1.5 rounded-lg text-xs cursor-pointer"
              >
                Hide
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
