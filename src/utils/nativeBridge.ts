/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Stub Native Bridge for Web-only platform deployment (iOS App Wrapper Abandoned)

export function isIosNativeApp(): boolean {
  return false;
}

export async function requestHealthKitAuth(): Promise<boolean> {
  return false;
}

export async function writeWaterToHealthKit(amountMl: number): Promise<boolean> {
  return false;
}

export async function writeWeightToHealthKit(weightKg: number): Promise<boolean> {
  return false;
}

export async function writeMealToHealthKit(
  calories: number,
  protein: number,
  fat: number,
  carbs: number,
  name: string
): Promise<boolean> {
  return false;
}

export async function readWaterFromHealthKit(): Promise<number> {
  return 0;
}

export async function readWeightFromHealthKit(): Promise<number> {
  return 0;
}

export async function requestNotificationAuth(): Promise<boolean> {
  return false;
}

export function updateWaterNudge(remainingMl: number) {}

export interface WidgetSummaryData {
  caloriesTarget: number;
  caloriesLogged: number;
  proteinTarget: number;
  proteinLogged: number;
  waterTarget: number;
  waterLogged: number;
  fatTarget: number;
  fatLogged: number;
}

export function updateWidgetMetrics(data: WidgetSummaryData) {}

export function updateAuthUid(uid: string | null, token: string | null = null) {}
