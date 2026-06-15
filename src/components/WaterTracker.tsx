/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AppState, DailyLog } from "../types";
import { getRelativeDateKey, formatShortDate } from "../utils";
import { GlassWater, Droplet, Plus, Trash2, Delete, RotateCcw } from "lucide-react";

interface WaterTrackerProps {
  state: AppState;
  onSaveState: (updatedState: AppState) => void;
}

export function WaterTracker({ state, onSaveState }: WaterTrackerProps) {
  const [customAmountStr, setCustomAmountStr] = useState("");
  const activeDateKey = getRelativeDateKey(0); // Today

  const todayLog = state.dailyLogs[activeDateKey] || {
    date: activeDateKey,
    routineId: "R",
    gymLog: {},
    meals: [],
    waterIntake: 0,
    customHabits: {},
  };

  const todayRoutineId = todayLog.routineId || "R";
  const waterTarget = state.targets[todayRoutineId]?.water || 2500;
  const currentIntake = todayLog.waterIntake || 0;

  const quickPills = [
    { label: "Glass", amount: 250 },
    { label: "Diet Soda", amount: 330 },
    { label: "Sports Shaker", amount: 500 },
    { label: "Thermos Flask", amount: 750 },
    { label: "Hydration Jug", amount: 1000 },
  ];

  const handleAddWater = (amount: number) => {
    const updatedIntake = currentIntake + amount;
    const updatedLog: DailyLog = {
      ...todayLog,
      waterIntake: updatedIntake,
    };

    onSaveState({
      ...state,
      dailyLogs: {
        ...state.dailyLogs,
        [activeDateKey]: updatedLog,
      },
    });
  };

  const handleResetWater = () => {
    onSaveState({
      ...state,
      dailyLogs: {
        ...state.dailyLogs,
        [activeDateKey]: {
          ...todayLog,
          waterIntake: 0,
        },
      },
    });
  };

  const handleNumPadPress = (val: string) => {
    if (customAmountStr.length >= 4) return;
    setCustomAmountStr(customAmountStr + val);
  };

  const handleNumPadDelete = () => {
    setCustomAmountStr(customAmountStr.slice(0, -1));
  };

  const handleAddCustomAmount = () => {
    const amt = parseInt(customAmountStr, 10);
    if (!amt) return;
    handleAddWater(amt);
    setCustomAmountStr("");
  };

  const percent = Math.min(100, Math.round((currentIntake / waterTarget) * 100));

  return (
    <div id="water-tracker-container" className="max-w-md mx-auto">
      
      {/* Wave progress illustration & quick items */}
      <div id="water-viz-panel" className="glass-panel rounded-3xl p-6 shadow-md flex flex-col justify-between space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div>
            <h5 className="font-display font-medium text-zinc-200">Hydration</h5>
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Target: {waterTarget} ml</span>
          </div>
          <GlassWater size={18} className="text-purple-400" />
        </div>

        {/* Big circular progress gauge */}
        <div className="flex flex-col items-center justify-center p-4 relative">
          <div className="relative w-44 h-44 rounded-full border border-white/5 flex flex-col items-center justify-center bg-zinc-950/40 overflow-hidden shadow-inner font-mono water-circle-container">
            {/* Wave fill indicator */}
            <div 
              className="absolute bottom-0 left-0 right-0 bg-white/5 border-t border-white/10 transition-all duration-700 ease-out water-wave-fill"
              style={{ height: `${percent}%` }}
            />
            
            <div className="z-10 text-center space-y-1">
              <span className="font-display text-4xl font-semibold text-white tracking-wide">{currentIntake}</span>
              <span className="block text-[10px] text-zinc-500">/ {waterTarget} ml</span>
              <span className="block text-xs font-semibold text-white mt-1">{percent}%</span>
            </div>
          </div>
        </div>

        {/* Quick containers list */}
        <div className="space-y-4">
          <span className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase select-none">
            Containers
          </span>
          <div className="flex flex-wrap gap-2">
            {quickPills.map((p) => (
              <button
                key={p.label}
                id={`pill-add-${p.amount}`}
                onClick={() => handleAddWater(p.amount)}
                className="glass-pill px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 font-medium text-zinc-200 hover:text-white cursor-pointer"
              >
                <Plus size={10} />
                <span>{p.label}</span>
                <span className="text-[10px] font-mono text-zinc-500">+{p.amount}ml</span>
              </button>
            ))}
          </div>

          {/* Clean Inline Custom Input Box */}
          <div className="flex items-center gap-2 bg-white/[0.01] border border-white/5 rounded-xl px-2.5 py-2 text-xs">
            <span className="font-mono text-zinc-500 uppercase text-[9px] tracking-wider select-none">Custom Drink:</span>
            <input
              type="number"
              placeholder="---"
              value={customAmountStr}
              onChange={(e) => setCustomAmountStr(e.target.value)}
              className="w-20 bg-zinc-950/60 border border-white/10 rounded px-1.5 py-1 text-center text-white focus:outline-none focus:border-white/30 text-xs font-mono"
            />
            <span className="text-zinc-500 font-mono text-[9px]">ml</span>
            <button
              onClick={() => {
                const amt = parseInt(customAmountStr, 10);
                if (amt > 0) {
                  handleAddWater(amt);
                  setCustomAmountStr("");
                }
              }}
              className="ml-auto px-3 py-1 bg-white hover:bg-zinc-200 text-zinc-950 rounded-lg text-[10px] font-mono tracking-wider transition-colors cursor-pointer font-bold"
            >
              + ADD
            </button>
          </div>
        </div>

        <button 
          onClick={handleResetWater}
          className="w-full text-center py-2 text-[10px] uppercase font-mono tracking-widest text-zinc-650 hover:text-white transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          Reset Intake
        </button>
      </div>

    </div>
  );
}
