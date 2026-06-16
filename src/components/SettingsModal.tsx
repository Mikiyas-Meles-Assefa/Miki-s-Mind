/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AppState, GymRoutine } from "../types";
import { X, Plus, Trash2, ShieldCheck, Dumbbell, Flame, Droplet, ChevronUp, ChevronDown, Shuffle, Cloud, Loader2 } from "lucide-react";
import { auth } from "../firebase";
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from "firebase/auth";
import { isIosNativeApp, requestHealthKitAuth } from "../utils/nativeBridge";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  onSaveState: (updatedState: AppState) => void;
  user: User | null;
  dbLoading: boolean;
}

export function SettingsModal({ isOpen, onClose, state, onSaveState, user, dbLoading }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"gym" | "goals" | "themes" | "sync">("gym");
  const [selectedRoutineId, setSelectedRoutineId] = useState<string>("A");

  // Credentials and Auth states
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [healthAuthStatus, setHealthAuthStatus] = useState<"unchecked" | "authorizing" | "success" | "failed">("unchecked");

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
      setAuthEmail("");
      setAuthPassword("");
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || "Authentication failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm("Log out from cloud sync?")) {
      await signOut(auth);
    }
  };

  // Local transient states for form management
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseSets, setNewExerciseSets] = useState(3);

  // States for adding custom routines
  const [newRoutineId, setNewRoutineId] = useState("");
  const [newRoutineName, setNewRoutineName] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const THEMES_LIST = [
    { id: "current", name: "Slate Obsidian Dev", bg: "bg-[#050608]", desc: "Original dark minimalist slate" },
    { id: "apple-light", name: "Apple light typical Reminders", bg: "bg-[#f2f2f7]", border: "border-zinc-300", desc: "Clean iOS reminders-like off-white calendar, red highlights" },
    { id: "apple-dark", name: "Apple dark Calendars", bg: "bg-[#000000]", desc: "True pitch-black iOS reminders layout, crimson highlights" },
    { id: "apple-reminders-dark", name: "Apple Reminders Dark", bg: "bg-black border border-white/10", desc: "Sleek iOS dark mode reminders layout with circular red highlights" },
    { id: "apple-health", name: "Apple Health Active", bg: "bg-white border border-[#ff2d55]/40", text: "text-[#ff2d55]", desc: "Clean energetic light layout with crimson, purple, and green outlines" },
    { id: "apple-glass", name: "Liquid Glass (Fjord)", bg: "bg-slate-900 border border-white/10", desc: "Clean aesthetic glass card floating atop a stunning scenic mountain fjord lake" },
    { id: "apple-glass-forest", name: "Liquid Glass (Forest)", bg: "bg-emerald-950 border border-white/10", desc: "Frosted glass floating atop a misty green forest canopy" },
    { id: "apple-glass-mountain", name: "Liquid Glass (Mountain)", bg: "bg-sky-950 border border-white/10", desc: "Frosted glass floating atop majestic snowy alpine peaks" },
    { id: "apple-glass-night", name: "Liquid Glass (Aurora)", bg: "bg-indigo-950 border border-white/10", desc: "Frosted glass floating atop a starry midnight sky & aurora waves" },
    { id: "cyberpunk", name: "Cyberpunk Terminal Aura", bg: "bg-[#010103]", text: "text-[#39ff14]", desc: "Neon toxic lime codes & warning yellow amber plates" },
    { id: "nordic", name: "Nordic Frost Ice", bg: "bg-[#e2e8f0]", desc: "Calm chilling blue-grays & snow elements, arctic focus" },
    { id: "forest", name: "Earthy Forest Moss", bg: "bg-[#09110e]", desc: "Earthy quiet green canopies & sweet golden honey brass" },
    { id: "sepia", name: "Vintage Literary Sepia", bg: "bg-[#f3ecdb]", desc: "Warm printed paper cards & organic coffee leather tones" },
  ];

  if (!isOpen) return null;

  const currentRoutine = state.routines.find((r) => r.id === selectedRoutineId);

  const handleUpdateRoutineName = (name: string) => {
    const updatedRoutines = state.routines.map((r) =>
      r.id === selectedRoutineId ? { ...r, name } : r
    );
    onSaveState({ ...state, routines: updatedRoutines });
  };

  const handleAddRoutine = () => {
    const id = newRoutineId.trim().toUpperCase();
    const name = newRoutineName.trim();
    if (!id || !name) return;
    if (state.routines.some(r => r.id === id)) {
      setErrorMessage(`Routine with ID "${id}" already exists!`);
      setTimeout(() => setErrorMessage(""), 4000);
      return;
    }
    const newRoutine = {
      id,
      name,
      exercises: []
    };
    onSaveState({
      ...state,
      routines: [...state.routines, newRoutine],
      targets: {
        ...state.targets,
        [id]: {
          calories: 2800,
          fat: 80,
          tier1Protein: 125,
          tier2Protein: 35,
          water: 3000
        }
      }
    });
    setNewRoutineId("");
    setNewRoutineName("");
    setErrorMessage("");
    setSelectedRoutineId(id);
  };

  const handleDeleteRoutine = (routineId: string) => {
    if (routineId === "R") {
      setErrorMessage("Cannot delete the Rest routine!");
      setTimeout(() => setErrorMessage(""), 4000);
      return;
    }
    if (confirmingDeleteId !== routineId) {
      setConfirmingDeleteId(routineId);
      return;
    }
    const updatedRoutines = state.routines.filter(r => r.id !== routineId);
    const updatedTargets = { ...state.targets };
    delete updatedTargets[routineId];
    onSaveState({
      ...state,
      routines: updatedRoutines,
      targets: updatedTargets
    });
    setConfirmingDeleteId(null);
    setSelectedRoutineId(updatedRoutines[0]?.id || "A");
  };

  const handleMoveExercise = (exId: string, direction: "up" | "down") => {
    if (!currentRoutine) return;
    const idx = currentRoutine.exercises.findIndex(e => e.id === exId);
    if (idx === -1) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === currentRoutine.exercises.length - 1) return;

    const newExercises = [...currentRoutine.exercises];
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    
    // Swap
    const temp = newExercises[idx];
    newExercises[idx] = newExercises[targetIdx];
    newExercises[targetIdx] = temp;

    const updatedRoutines = state.routines.map(r => 
      r.id === selectedRoutineId ? { ...r, exercises: newExercises } : r
    );
    onSaveState({ ...state, routines: updatedRoutines });
  };

  const handleAddAlternative = (exId: string, altName: string) => {
    if (!currentRoutine) return;
    const updatedRoutines = state.routines.map((r) => {
      if (r.id === selectedRoutineId) {
        const updatedExs = r.exercises.map((ex) => {
          if (ex.id === exId) {
            const currentAlts = ex.alternatives || [];
            return {
              ...ex,
              alternatives: [
                ...currentAlts,
                { id: "alt_" + Date.now(), name: altName, defaultSets: ex.defaultSets }
              ]
            };
          }
          return ex;
        });
        return { ...r, exercises: updatedExs };
      }
      return r;
    });
    onSaveState({ ...state, routines: updatedRoutines });
  };

  const handleDeleteAlternative = (exId: string, altId: string) => {
    if (!currentRoutine) return;
    const updatedRoutines = state.routines.map((r) => {
      if (r.id === selectedRoutineId) {
        const updatedExs = r.exercises.map((ex) => {
          if (ex.id === exId) {
            return {
              ...ex,
              alternatives: (ex.alternatives || []).filter((alt) => alt.id !== altId)
            };
          }
          return ex;
        });
        return { ...r, exercises: updatedExs };
      }
      return r;
    });
    onSaveState({ ...state, routines: updatedRoutines });
  };

  const handleAddExercise = () => {
    if (!newExerciseName.trim() || !currentRoutine) return;
    const newExercise = {
      id: "ex_" + Date.now(),
      name: newExerciseName.trim(),
      defaultSets: Number(newExerciseSets) || 3,
      alternatives: []
    };
    const updatedRoutines = state.routines.map((r) => {
      if (r.id === selectedRoutineId) {
        return { ...r, exercises: [...r.exercises, newExercise] };
      }
      return r;
    });
    onSaveState({ ...state, routines: updatedRoutines });
    setNewExerciseName("");
  };

  const handleDeleteExercise = (exId: string) => {
    if (!currentRoutine) return;
    const updatedRoutines = state.routines.map((r) => {
      if (r.id === selectedRoutineId) {
        return { ...r, exercises: r.exercises.filter((ex) => ex.id !== exId) };
      }
      return r;
    });
    onSaveState({ ...state, routines: updatedRoutines });
  };

  const handleUpdateTargetValue = (field: string, value: number) => {
    const updatedTargets = {
      ...state.targets,
      [selectedRoutineId]: {
        ...state.targets[selectedRoutineId],
        [field]: value,
      },
    };
    onSaveState({ ...state, targets: updatedTargets });
  };

  return (
    <div id="settings-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Blurry Backdrop */}
      <div 
        id="settings-backdrop"
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-all duration-300"
        onClick={onClose}
      />

      {/* Glass Panel Centered Container */}
      <div 
        id="settings-container" 
        className="relative w-full max-w-2xl glass-panel-heavy rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col z-10"
      >
        {/* Header */}
        <div id="settings-header" className="flex items-center justify-between pb-6 border-b border-white/5">
          <div id="settings-title-group">
            <h2 id="settings-title" className="font-display text-2xl font-semibold text-white tracking-wide">
              Mickey Mind OS / <span className="text-zinc-400">Settings</span>
            </h2>
            <p id="settings-subtitle" className="text-xs text-zinc-500 mt-1">
              Configure system routines, exercise structures, and dynamic goals.
            </p>
          </div>
          <button
            id="settings-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          >
            <X id="settings-close-icon" size={20} />
          </button>
        </div>

        {/* Tab Controls */}
        <div id="settings-tabs" className="flex gap-4 mt-6 border-b border-white/5 pb-0.5">
          <button
            id="tab-gym-btn"
            onClick={() => setActiveTab("gym")}
            className={`font-display text-xs tracking-widest uppercase pb-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "gym"
                ? "border-emerald-400 text-emerald-400 font-semibold"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            Gym Routines
          </button>
          <button
            id="tab-goals-btn"
            onClick={() => setActiveTab("goals")}
            className={`font-display text-xs tracking-widest uppercase pb-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "goals"
                ? "border-emerald-400 text-emerald-400 font-semibold"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            Nutrition & Water
          </button>
          <button
            id="tab-themes-btn"
            onClick={() => setActiveTab("themes")}
            className={`font-display text-xs tracking-widest uppercase pb-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "themes"
                ? "border-emerald-400 text-emerald-400 font-semibold"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            System Themes
          </button>
          <button
            id="tab-sync-btn"
            onClick={() => setActiveTab("sync")}
            className={`font-display text-xs tracking-widest uppercase pb-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "sync"
                ? "border-emerald-400 text-emerald-400 font-semibold"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            Device Sync
          </button>
        </div>

        {/* Content Box */}
        <div id="settings-content" className="flex-1 overflow-y-auto no-scrollbar space-y-6 mt-6 py-2">
          
          {/* Routine Selector */}
          {activeTab !== "themes" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider">Active Routine Selector</span>
                {selectedRoutineId !== "A" && selectedRoutineId !== "B" && selectedRoutineId !== "R" && (
                  <div className="flex items-center gap-1.5">
                    {confirmingDeleteId === selectedRoutineId ? (
                      <div className="flex items-center gap-2 text-[10px] font-mono">
                        <span className="text-rose-400 font-medium">Delete context?</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteRoutine(selectedRoutineId)}
                          className="bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white px-2 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-colors border border-rose-500/30"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingDeleteId(null)}
                          className="text-zinc-400 hover:text-white cursor-pointer px-1 text-[9px]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDeleteRoutine(selectedRoutineId)}
                        className="text-rose-400 hover:text-rose-300 transition-colors text-[10px] font-mono flex items-center gap-1 cursor-pointer"
                        title="Delete this custom routine"
                      >
                        <Trash2 size={12} /> Delete Routine {selectedRoutineId}
                      </button>
                    )}
                  </div>
                )}
              </div>
              {errorMessage && (
                <div className="text-[10px] font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg uppercase">
                  {errorMessage}
                </div>
              )}
              <div id="routine-selector-group" className="flex flex-wrap gap-1.5 p-1 bg-zinc-950/40 rounded-xl">
                {state.routines.map((routine) => (
                  <button
                    key={routine.id}
                    id={`routine-select-${routine.id}`}
                    onClick={() => setSelectedRoutineId(routine.id)}
                    className={`flex-1 min-w-[60px] text-center py-2 rounded-lg font-display text-xs tracking-wider transition-all uppercase ${
                      selectedRoutineId === routine.id
                        ? "bg-white/10 text-white font-medium shadow-sm"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Routine {routine.id}
                  </button>
                ))}
              </div>

              {/* Add Custom Routine inline panel */}
              <div className="p-2.5 rounded-xl bg-zinc-950/20 border border-white/5 flex flex-col sm:flex-row gap-2 items-center">
                <span className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase shrink-0 sm:mr-2">Create New Routine:</span>
                <input
                  type="text"
                  maxLength={3}
                  value={newRoutineId}
                  onChange={(e) => setNewRoutineId(e.target.value)}
                  placeholder="ID (e.g. C)"
                  className="w-full sm:w-20 bg-zinc-900/60 border border-white/5 rounded-lg px-2.5 py-1 text-xs text-white uppercase text-center focus:outline-none"
                />
                <input
                  type="text"
                  value={newRoutineName}
                  onChange={(e) => setNewRoutineName(e.target.value)}
                  placeholder="Title (e.g. Legs & Cardio)"
                  className="flex-1 w-full bg-zinc-900/60 border border-white/5 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddRoutine}
                  className="w-full sm:w-auto bg-white/10 hover:bg-white text-zinc-400 hover:text-zinc-950 px-3 py-1 rounded-lg text-xs font-semibold uppercase flex items-center justify-center gap-1 cursor-pointer transition-all shrink-0"
                >
                  <Plus size={12} /> Create
                </button>
              </div>
            </div>
          )}

          {activeTab === "gym" && currentRoutine && (
            <div id="gym-config-panel" className="space-y-6">
              {/* Routine Meta Info */}
              <div id="routine-meta-section">
                <label id="routine-name-label" className="block text-[11px] uppercase tracking-wider text-zinc-500 font-mono mb-2">
                  Routine Title
                </label>
                <input
                  id="routine-name-input"
                  type="text"
                  value={currentRoutine.name}
                  onChange={(e) => handleUpdateRoutineName(e.target.value)}
                  className="w-full bg-zinc-900/60 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-green/40 transition-colors"
                  placeholder="e.g. Incline Push Day"
                />
              </div>

              {/* Exercises List */}
              <div id="routine-exercises-section" className="space-y-3">
                <h3 id="exercises-list-heading" className="text-[11px] uppercase tracking-wider text-zinc-500 font-mono">
                  Exercise Structure ({currentRoutine.exercises.length})
                </h3>

                {currentRoutine.exercises.length === 0 ? (
                  <p id="no-exercises-msg" className="text-zinc-500 text-xs italic py-2">
                    No exercises defined. Rest day logic applies.
                  </p>
                ) : (
                  <div id="exercises-list-container" className="space-y-3">
                    {currentRoutine.exercises.map((ex, idx) => {
                      const alts = ex.alternatives || [];
                      return (
                        <div
                          key={ex.id}
                          id={`exercise-row-${ex.id}`}
                          className="p-3 bg-white/[0.01] border border-white/5 rounded-xl space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div id={`exercise-info-${ex.id}`} className="flex flex-col">
                              <span id={`exercise-name-${ex.id}`} className="text-xs font-semibold text-zinc-200 uppercase tracking-widest font-mono">{ex.name}</span>
                              <span id={`exercise-sets-${ex.id}`} className="text-[10px] text-zinc-500 font-mono mt-0.5">
                                Sets: {ex.defaultSets}
                              </span>
                            </div>

                            {/* Control Actions: Up / Down / Trash */}
                            <div className="flex items-center gap-1 pt-0.5">
                              <button
                                onClick={() => handleMoveExercise(ex.id, "up")}
                                disabled={idx === 0}
                                className={`p-1 rounded text-zinc-500 hover:text-white hover:bg-white/5 transition-all ${idx === 0 ? "opacity-25" : "cursor-pointer"}`}
                                title="Move Up"
                              >
                                <ChevronUp size={14} />
                              </button>
                              <button
                                onClick={() => handleMoveExercise(ex.id, "down")}
                                disabled={idx === currentRoutine.exercises.length - 1}
                                className={`p-1 rounded text-zinc-500 hover:text-white hover:bg-white/5 transition-all ${idx === currentRoutine.exercises.length - 1 ? "opacity-25" : "cursor-pointer"}`}
                                title="Move Down"
                              >
                                <ChevronDown size={14} />
                              </button>
                              <button
                                id={`exercise-delete-${ex.id}`}
                                onClick={() => handleDeleteExercise(ex.id)}
                                className="text-zinc-650 hover:text-rose-450 text-zinc-550 hover:text-rose-400 p-1 transition-colors rounded hover:bg-white/5 cursor-pointer ml-1"
                                title="Delete Exercise"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          {/* Alternatives lists Inside this exercise */}
                          <div className="bg-zinc-950/40 p-2.5 rounded-lg border border-white/[0.01] space-y-2">
                            <div className="flex justify-between items-center text-[9px] font-mono tracking-wider text-zinc-500 uppercase">
                              <span className="flex items-center gap-1"><Shuffle size={10} /> Alternatives &amp; Gym Swaps ({alts.length})</span>
                            </div>

                            {alts.length > 0 && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-mono text-[9px]">
                                {alts.map((alt) => (
                                  <div key={alt.id} className="flex items-center justify-between bg-zinc-950/50 px-2.5 py-1.5 rounded border border-white/[0.03] uppercase text-zinc-400">
                                    <span>{alt.name}</span>
                                    <button
                                      onClick={() => handleDeleteAlternative(ex.id, alt.id)}
                                      className="text-zinc-600 hover:text-rose-450 p-0.5 cursor-pointer hover:text-white font-bold"
                                      title="Remove Alt"
                                    >
                                      &times;
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Add alternative inline form */}
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                const form = e.currentTarget;
                                const input = form.elements.namedItem("altNameInput") as HTMLInputElement;
                                if (input && input.value.trim()) {
                                  handleAddAlternative(ex.id, input.value.trim());
                                  input.value = "";
                                }
                              }}
                              className="flex gap-2"
                            >
                              <input
                                name="altNameInput"
                                type="text"
                                placeholder="Add variation (e.g. Dumbbell Bench Press)..."
                                className="flex-1 bg-zinc-900/60 border border-white/5 rounded px-2.5 py-1 text-[10px] text-zinc-300 focus:outline-none"
                              />
                              <button
                                type="submit"
                                className="bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white px-2.5 py-1 rounded text-[9px] font-mono uppercase tracking-wider transition-all cursor-pointer"
                              >
                                + Add Alt
                              </button>
                            </form>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add Exercise Controller */}
              <div id="add-exercise-section" className="p-4 rounded-2xl bg-zinc-950/20 border border-white/5 space-y-3">
                <span id="add-exercise-label" className="block text-[11px] uppercase tracking-wider text-zinc-500 font-mono">
                  Add Custom Exercise
                </span>
                <div id="add-exercise-inputs" className="flex flex-col sm:flex-row gap-3">
                  <input
                    id="new-exercise-name-input"
                    type="text"
                    value={newExerciseName}
                    onChange={(e) => setNewExerciseName(e.target.value)}
                    placeholder="Incline DB Press..."
                    className="flex-1 bg-zinc-900/60 border border-white/5 rounded-xl px-4 py-2 text-xs text-white focus:outline-none"
                  />
                  <div id="new-exercise-sets-group" className="flex items-center gap-2 bg-zinc-900/60 border border-white/5 rounded-xl px-3 py-1">
                    <span id="new-exercise-sets-label" className="text-[10px] text-zinc-500 uppercase font-mono">Sets</span>
                    <input
                      id="new-exercise-sets-input"
                      type="number"
                      value={newExerciseSets}
                      onChange={(e) => setNewExerciseSets(Math.max(1, Number(e.target.value)))}
                      className="w-10 bg-transparent text-xs text-white font-mono text-center focus:outline-none"
                    />
                  </div>
                  <button
                    id="add-exercise-confirm-btn"
                    onClick={handleAddExercise}
                    className="bg-zinc-100 hover:bg-brand-green hover:text-black text-zinc-900 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all uppercase flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "goals" && (
            <div id="goals-config-panel" className="space-y-6">
              <p id="goals-intro" className="text-xs text-zinc-400 leading-relaxed font-mono">
                These dynamic goals are active on days with <span className="text-zinc-200">Routine {selectedRoutineId}</span> logged in your timeline.
              </p>

              <div id="goals-grid" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Calories */}
                <div id="goal-calories" className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 space-y-2">
                  <div id="goal-calories-hdr" className="flex justify-between items-center text-[10px] uppercase font-mono text-zinc-500">
                    <span className="flex items-center gap-1"><Flame size={12} className="text-orange-400" /> CALORIES</span>
                    <span className="text-zinc-300 font-semibold">{state.targets[selectedRoutineId]?.calories ?? 2000} kcal</span>
                  </div>
                  <input
                    id="goal-calories-slider"
                    type="range"
                    min="1200"
                    max="5000"
                    step="50"
                    value={state.targets[selectedRoutineId]?.calories ?? 2000}
                    onChange={(e) => handleUpdateTargetValue("calories", Number(e.target.value))}
                    className="w-full accent-brand-cyan"
                  />
                </div>

                {/* Fats */}
                <div id="goal-fat" className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 space-y-2">
                  <div id="goal-fat-hdr" className="flex justify-between items-center text-[10px] uppercase font-mono text-zinc-500">
                    <span>🔥 DIETARY FAT</span>
                    <span className="text-zinc-300 font-semibold">{state.targets[selectedRoutineId]?.fat ?? 70}g</span>
                  </div>
                  <input
                    id="goal-fat-slider"
                    type="range"
                    min="30"
                    max="180"
                    step="5"
                    value={state.targets[selectedRoutineId]?.fat ?? 70}
                    onChange={(e) => handleUpdateTargetValue("fat", Number(e.target.value))}
                    className="w-full accent-brand-cyan"
                  />
                </div>

                {/* Tier 1 Protein */}
                <div id="goal-tier1" className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 space-y-2">
                  <div id="goal-tier1-hdr" className="flex justify-between items-center text-[10px] uppercase font-mono text-zinc-400">
                    <span className="text-red-400 font-medium">🥩 TIER 1 Protein (Animal)</span>
                    <span className="text-zinc-200 font-semibold">{state.targets[selectedRoutineId]?.tier1Protein ?? 100}g</span>
                  </div>
                  <input
                    id="goal-tier1-slider"
                    type="range"
                    min="50"
                    max="250"
                    step="5"
                    value={state.targets[selectedRoutineId]?.tier1Protein ?? 100}
                    onChange={(e) => handleUpdateTargetValue("tier1Protein", Number(e.target.value))}
                    className="w-full accent-brand-cyan"
                  />
                </div>

                {/* Tier 2 Protein */}
                <div id="goal-tier2" className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 space-y-2">
                  <div id="goal-tier2-hdr" className="flex justify-between items-center text-[10px] uppercase font-mono text-zinc-400">
                    <span className="text-amber-400 font-medium">🌱 TIER 2 Protein (Other)</span>
                    <span className="text-zinc-200 font-semibold">{state.targets[selectedRoutineId]?.tier2Protein ?? 30}g</span>
                  </div>
                  <input
                    id="goal-tier2-slider"
                    type="range"
                    min="10"
                    max="120"
                    step="5"
                    value={state.targets[selectedRoutineId]?.tier2Protein ?? 30}
                    onChange={(e) => handleUpdateTargetValue("tier2Protein", Number(e.target.value))}
                    className="w-full accent-brand-cyan"
                  />
                </div>

                {/* Water Goal */}
                <div id="goal-water" className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 space-y-2 sm:col-span-2">
                  <div id="goal-water-hdr" className="flex justify-between items-center text-[10px] uppercase font-mono text-zinc-500">
                    <span className="flex items-center gap-1"><Droplet size={12} className="text-sky-400" /> DAILY HYDRATION</span>
                    <span className="text-zinc-300 font-semibold">{state.targets[selectedRoutineId]?.water ?? 2500} ml</span>
                  </div>
                  <input
                    id="goal-water-slider"
                    type="range"
                    min="1000"
                    max="6000"
                    step="250"
                    value={state.targets[selectedRoutineId]?.water ?? 2500}
                    onChange={(e) => handleUpdateTargetValue("water", Number(e.target.value))}
                    className="w-full accent-brand-cyan"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "themes" && (
            <div id="themes-config-panel" className="space-y-4 animate-fade-in pb-4">
              <p id="themes-intro" className="text-xs text-zinc-400 leading-relaxed font-mono">
                Select an immersive UI style. Ambient grids, custom fonts, borders, and colors update immediately across the entire workspace.
              </p>

              <div id="themes-grid" className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[45vh] overflow-y-auto pr-1">
                {THEMES_LIST.map((theme) => {
                  const isSelected = (state.theme || "current") === theme.id;
                  return (
                    <button
                      key={theme.id}
                      onClick={() => onSaveState({ ...state, theme: theme.id })}
                      className={`flex items-start gap-3 p-3 rounded-2xl border text-left transition-all hover:bg-white/[0.03] cursor-pointer ${
                        isSelected 
                          ? "border-emerald-400 bg-white/[0.04]" 
                          : "border-white/5 bg-transparent opacity-80 hover:opacity-100"
                      }`}
                    >
                      {/* Theme color square indicator */}
                      <div className={`w-8 h-8 rounded-lg ${theme.bg} ${theme.border || "border border-white/10"} flex items-center justify-center shrink-0`}>
                        <span className={`text-[11px] uppercase font-mono font-bold ${theme.text || "text-zinc-400"}`}>
                          Aa
                        </span>
                      </div>
                      
                      {/* Meta info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-zinc-205 block truncate">{theme.name}</span>
                          {isSelected && (
                            <span className="px-1 py-0.2 bg-emerald-400/20 text-emerald-400 text-[8px] font-mono rounded uppercase">Active</span>
                          )}
                        </div>
                        <span className="text-[9px] text-zinc-500 line-clamp-2 mt-0.5 leading-snug">{theme.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {activeTab === "sync" && (
            <div id="sync-config-panel" className="space-y-6 animate-fade-in pb-4">
              <p id="sync-intro" className="text-xs text-zinc-400 leading-relaxed font-mono">
                {user 
                  ? "Your account is automatically synchronizing all changes in real-time."
                  : "Sign in or create a free account to automatically back up your workspace and sync across devices."
                }
              </p>

              {user ? (
                <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 space-y-4 font-mono text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Sync Account:</span>
                    <span className="text-emerald-400 font-semibold truncate max-w-[200px]" title={user.email || ""}>
                      {user.email}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">User ID (UID):</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-300 select-all font-semibold truncate max-w-[120px]" title={user.uid}>
                        {user.uid}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(user.uid);
                          alert("User ID copied to clipboard!");
                        }}
                        className="text-[10px] text-zinc-400 hover:text-white cursor-pointer px-2 py-0.5 rounded bg-white/5 border border-white/10 transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Status:</span>
                    <span className={dbLoading ? "text-amber-400 animate-pulse" : "text-emerald-400"}>
                      {dbLoading ? "Uploading/Downloading..." : "Synced & Online"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full bg-rose-500/10 hover:bg-rose-500 text-rose-450 hover:text-white py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer border border-rose-500/20"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <form onSubmit={handleAuthSubmit} className="space-y-4">
                  {authError && (
                    <div className="text-[10px] font-mono text-rose-450 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg leading-tight">
                      {authError}
                    </div>
                  )}
                  
                  <div className="space-y-1">
                    <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-mono">Email Address</label>
                    <input
                      type="email"
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-zinc-900/60 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-green/40 transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-mono">Password</label>
                    <input
                      type="password"
                      required
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-zinc-900/60 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-green/40 transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full bg-zinc-100 hover:bg-brand-green hover:text-black text-zinc-900 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all uppercase flex items-center justify-center gap-1.5 cursor-pointer mt-6"
                  >
                    {authLoading ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : isSignUp ? (
                      "Create Account"
                    ) : (
                      "Sign In"
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUp(!isSignUp);
                        setAuthError("");
                      }}
                      className="text-[10px] text-zinc-500 hover:text-white transition-colors cursor-pointer underline font-mono"
                    >
                      {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up for Free"}
                    </button>
                  </div>
                </form>
              )}

              {/* Apple Health integration inside settings under native wrapper */}
              {isIosNativeApp() && (
                <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 space-y-3 font-mono text-xs mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Apple Health Integration</span>
                    <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-1 py-0.2 rounded font-bold uppercase">iOS Native</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-normal">
                    Sync your daily water logging, weight logs, and nutrition macros directly into Apple Health on your iPhone.
                  </p>
                  <button
                    type="button"
                    disabled={healthAuthStatus === "authorizing" || healthAuthStatus === "success"}
                    onClick={async () => {
                      setHealthAuthStatus("authorizing");
                      const success = await requestHealthKitAuth();
                      if (success) {
                        setHealthAuthStatus("success");
                      } else {
                        setHealthAuthStatus("failed");
                        setTimeout(() => setHealthAuthStatus("unchecked"), 3000);
                      }
                    }}
                    className={`w-full py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer border ${
                      healthAuthStatus === "success"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : healthAuthStatus === "authorizing"
                        ? "bg-zinc-800 text-zinc-500 border-zinc-700"
                        : "bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border-white/10"
                    }`}
                  >
                    {healthAuthStatus === "success"
                      ? "Apple Health Synced"
                      : healthAuthStatus === "authorizing"
                      ? "Authorizing..."
                      : healthAuthStatus === "failed"
                      ? "Auth Failed"
                      : "Sync Apple Health"}
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div id="settings-footer" className="mt-6 pt-4 border-t border-white/5 flex items-center justify-end text-[11px] text-zinc-500 font-mono">
          <span>SYSTEM V1.0</span>
        </div>
      </div>
    </div>
  );
}
