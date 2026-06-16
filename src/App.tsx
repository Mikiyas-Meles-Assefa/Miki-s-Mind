/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { AppState } from "./types";
import { generateDefaultState, getRelativeDateKey, formatShortDate } from "./utils";
import { SettingsModal } from "./components/SettingsModal";
import { HomeHabitTracker } from "./components/HomeHabitTracker";
import { GymTracker } from "./components/GymTracker";
import { NutritionTracker } from "./components/NutritionTracker";
import { WaterTracker } from "./components/WaterTracker";
import { 
  Settings, 
  Home, 
  Dumbbell, 
  Apple, 
  Droplet, 
  Clock
} from "lucide-react";
import { auth, db } from "./firebase";
import { onIdTokenChanged, User } from "firebase/auth";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { 
  isIosNativeApp, 
  updateWidgetMetrics, 
  updateWaterNudge, 
  updateAuthUid
} from "./utils/nativeBridge";

export default function App() {
  const [state, setState] = useState<AppState>(() => {
    // Attempt local storage hydration on load
    const saved = localStorage.getItem("mickey_mind_os_state");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.routines && parsed.targets && parsed.dailyLogs) {
          const aRoutine = parsed.routines.find((r: any) => r.id === "A");
          const hasOldRoutines = !aRoutine || aRoutine.exercises.length < 5 || aRoutine.exercises.some((e: any) => e.name === "Incline Bench Press" || e.name === "Hack Squat");
          if (hasOldRoutines) {
            const freshDefault = generateDefaultState();
            return {
              ...parsed,
              routines: freshDefault.routines,
              targets: freshDefault.targets,
            };
          }
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse saved Mickey Mind state:", e);
      }
    }
    return generateDefaultState();
  });

  const [activeTab, setActiveTab] = useState<"home" | "gym" | "nutrition" | "water">("home");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [hasLoadedFromDb, setHasLoadedFromDb] = useState(false);

  const lastSyncedStateRef = useRef<string>("");
  const hasLoadedFromDbRef = useRef<boolean>(false);

  // 1. Auth subscription
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (u) => {
      setUser(u);
      if (isIosNativeApp()) {
        const token = u ? await u.getIdToken() : null;
        updateAuthUid(u ? u.uid : null, token);
      }
      if (!u) {
        setHasLoadedFromDb(false);
        hasLoadedFromDbRef.current = false;
        // Logged out: fallback to local storage
        const saved = localStorage.getItem("mickey_mind_os_state");
        if (saved) {
          try {
            setState(JSON.parse(saved));
          } catch (e) {
            console.error("Failed to load local storage state on logout:", e);
          }
        }
      }
    });
    return unsubscribe;
  }, []);

  // 2. Firestore Sync: Listener
  useEffect(() => {
    if (!user) {
      setHasLoadedFromDb(false);
      hasLoadedFromDbRef.current = false;
      return;
    }

    setDbLoading(true);
    const docRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      setDbLoading(false);
      if (docSnap.exists()) {
        const dbData = docSnap.data() as AppState;
        const dbDataStr = JSON.stringify(dbData);
        if (dbDataStr !== lastSyncedStateRef.current) {
          lastSyncedStateRef.current = dbDataStr;
          setState(dbData);
        }
        hasLoadedFromDbRef.current = true;
        setHasLoadedFromDb(true);
      } else {
        // Document does not exist in DB yet: write current local state
        const currentLocalStr = JSON.stringify(state);
        lastSyncedStateRef.current = currentLocalStr;
        setDoc(docRef, state).then(() => {
          hasLoadedFromDbRef.current = true;
          setHasLoadedFromDb(true);
        }).catch((err) => {
          console.error("Error setting initial doc in Firestore:", err);
        });
      }
    }, (error) => {
      console.error("Firestore sync error:", error);
      setDbLoading(false);
    });

    return unsubscribe;
  }, [user]);

  // 3. Firestore Sync: Local changes writeback
  useEffect(() => {
    const stateStr = JSON.stringify(state);
    localStorage.setItem("mickey_mind_os_state", stateStr);

    // Only write back to cloud if we have successfully synced from the cloud first!
    if (user && hasLoadedFromDbRef.current && stateStr !== lastSyncedStateRef.current) {
      lastSyncedStateRef.current = stateStr;
      const docRef = doc(db, "users", user.uid);
      setDoc(docRef, state).catch((err) => {
        console.error("Error writing local state to Firestore:", err);
      });
    }
  }, [state, user]);

  // 4. iOS Widget & Notifications Native Sync
  useEffect(() => {
    if (!isIosNativeApp()) return;

    const todayKey = getRelativeDateKey(0);
    const log = state.dailyLogs[todayKey] || {
      date: todayKey,
      routineId: "R",
      meals: [],
      waterIntake: 0
    };
    
    const rId = log.routineId || "R";
    const targets = state.targets[rId] || {
      calories: 2200,
      fat: 70,
      tier1Protein: 100,
      tier2Protein: 30,
      water: 2500
    };

    const mealsList = log.meals || [];
    const caloriesLogged = mealsList.reduce((sum, m) => sum + m.calories, 0);
    const fatLogged = mealsList.reduce((sum, m) => sum + m.fat, 0);
    const t1Logged = mealsList.reduce((sum, m) => sum + m.tier1Protein, 0);
    const t2Logged = mealsList.reduce((sum, m) => sum + m.tier2Protein, 0);
    const proteinLogged = t1Logged + t2Logged;
    const waterLogged = log.waterIntake || 0;

    const caloriesTarget = targets.calories;
    const proteinTarget = targets.tier1Protein + targets.tier2Protein;
    const waterTarget = targets.water;
    const fatTarget = targets.fat;

    updateWidgetMetrics({
      caloriesTarget,
      caloriesLogged,
      proteinTarget,
      proteinLogged,
      waterTarget,
      waterLogged,
      fatTarget,
      fatLogged
    });

    const waterRemaining = Math.max(0, waterTarget - waterLogged);
    updateWaterNudge(waterRemaining);
  }, [state]);


  const handleSaveState = (updatedState: AppState) => {
    // Inject widgetToday summary on save so it's always up-to-date in database
    const todayKey = getRelativeDateKey(0);
    const log = updatedState.dailyLogs[todayKey] || {
      date: todayKey,
      routineId: "R",
      meals: [],
      waterIntake: 0
    };
    const rId = log.routineId || "R";
    const targets = updatedState.targets[rId] || {
      calories: 2200,
      fat: 70,
      tier1Protein: 100,
      tier2Protein: 30,
      water: 2500
    };

    const mealsList = log.meals || [];
    const caloriesLogged = mealsList.reduce((sum, m) => sum + m.calories, 0);
    const fatLogged = mealsList.reduce((sum, m) => sum + m.fat, 0);
    const t1Logged = mealsList.reduce((sum, m) => sum + m.tier1Protein, 0);
    const t2Logged = mealsList.reduce((sum, m) => sum + m.tier2Protein, 0);
    const proteinLogged = t1Logged + t2Logged;
    const waterLogged = log.waterIntake || 0;

    const widgetState = {
      ...updatedState,
      widgetToday: {
        caloriesTarget: targets.calories,
        caloriesLogged,
        proteinTarget: targets.tier1Protein + targets.tier2Protein,
        proteinLogged,
        waterTarget: targets.water,
        waterLogged,
        fatTarget: targets.fat,
        fatLogged
      }
    };
    setState(widgetState);
  };

  // Human date display for header
  const targetTodayKey = getRelativeDateKey(0); // Anchored to 2026-06-14 from utils
  const { dayName, dayNum, monthName } = formatShortDate(targetTodayKey);

  const currentTheme = state.theme || "current";

  return (
    <div 
      id="mickey-mind-root" 
      className={`min-h-screen transition-all duration-300 flex flex-col relative pb-16 antialiased theme-${currentTheme}`}
    >
      
      {/* Main Glassmorphic Layout Frame */}
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 flex-1 flex flex-col pt-8 space-y-6">
        
        {/* Borderless Glassmorphic Desktop Header */}
        <header id="os-header" className="flex flex-col sm:flex-row items-center justify-between py-4 border-b border-white/[0.02] gap-4">
          
          {/* Logo Name */}
          <div id="os-logo" className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-display font-medium text-sm text-zinc-100">
              M
            </div>
            <div>
              <h1 className="font-display font-medium text-lg tracking-tight text-white flex items-center gap-1.5 leading-none">
                Mickey Mind
              </h1>
            </div>
          </div>

          {/* Time indicator and Settings controller */}
          <div id="os-clock-controls" className="flex items-center gap-3">
            {/* System Date */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.01] border border-white/5 font-mono text-[11px] text-zinc-400">
              <Clock size={11} className="text-zinc-500" />
              <span>{dayName} {monthName} {dayNum}, 2026</span>
            </div>

            {/* Gear Config Menu */}
            <button
              id="gear-settings-btn"
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 rounded-lg bg-white/[0.01] hover:bg-white/5 border border-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer relative group"
              title="Settings"
            >
              <Settings size={14} className="group-hover:rotate-45 transition-transform duration-300" />
            </button>
          </div>
        </header>

        {/* Global Navigator Tabs */}
        <nav id="os-navigator" className="flex justify-center px-1">
          <div className="p-0.5 glass-pill rounded-full flex gap-0.5 relative z-20 max-w-full">
            {/* Home/Timeline Tab */}
            <button
              id="nav-home-btn"
              onClick={() => setActiveTab("home")}
              className={`px-2.5 sm:px-4 py-1.5 rounded-full font-display text-[11px] tracking-wider transition-all uppercase cursor-pointer flex items-center gap-1 sm:gap-1.5 ${
                activeTab === "home"
                  ? "bg-white/5 text-white font-medium"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Home size={12} />
              <span className="hidden min-[440px]:inline">Timeline</span>
            </button>

            {/* Gym Tab */}
            <button
              id="nav-gym-btn"
              onClick={() => setActiveTab("gym")}
              className={`px-2.5 sm:px-4 py-1.5 rounded-full font-display text-[11px] tracking-wider transition-all uppercase cursor-pointer flex items-center gap-1 sm:gap-1.5 ${
                activeTab === "gym"
                  ? "bg-white/5 text-white font-medium"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Dumbbell size={12} />
              <span className="hidden min-[440px]:inline">Gym</span>
            </button>

            {/* Nutrition Tab */}
            <button
              id="nav-nutrition-btn"
              onClick={() => setActiveTab("nutrition")}
              className={`px-2.5 sm:px-4 py-1.5 rounded-full font-display text-[11px] tracking-wider transition-all uppercase cursor-pointer flex items-center gap-1 sm:gap-1.5 ${
                activeTab === "nutrition"
                  ? "bg-white/5 text-white font-medium"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Apple size={12} />
              <span className="hidden min-[440px]:inline">Nutrition</span>
            </button>

            {/* Water Tab */}
            <button
              id="nav-water-btn"
              onClick={() => setActiveTab("water")}
              className={`px-2.5 sm:px-4 py-1.5 rounded-full font-display text-[11px] tracking-wider transition-all uppercase cursor-pointer flex items-center gap-1 sm:gap-1.5 ${
                activeTab === "water"
                  ? "bg-white/5 text-white font-medium"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Droplet size={12} />
              <span className="hidden min-[440px]:inline">Water</span>
            </button>
          </div>
        </nav>

        {/* Selected Modular Area Viewport */}
        <main id="os-viewport" className="flex-1 py-1 focus:outline-none">
          {activeTab === "home" && (
            <HomeHabitTracker 
              state={state} 
              onSaveState={handleSaveState} 
            />
          )}

          {activeTab === "gym" && (
            <GymTracker 
              state={state} 
              onSaveState={handleSaveState} 
            />
          )}

          {activeTab === "nutrition" && (
            <NutritionTracker 
              state={state} 
              onSaveState={handleSaveState} 
            />
          )}

          {activeTab === "water" && (
            <WaterTracker 
              state={state} 
              onSaveState={handleSaveState} 
            />
          )}
        </main>

      </div>

      {/* Core Setup Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        state={state}
        onSaveState={handleSaveState}
        user={user}
        dbLoading={dbLoading}
      />

    </div>
  );
}
