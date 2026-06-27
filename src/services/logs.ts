import { format, startOfWeek, endOfWeek } from 'date-fns';
import type { DocumentData } from 'firebase/firestore';
import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { DailyLog, WeeklySummary, WeightTrendPoint } from '../types';

function logsCol(uid: string) {
  return collection(db, 'dailyLogs', uid, 'entries');
}

function toLog(uid: string, date: string, data: DocumentData): DailyLog {
  return {
    id: date,
    user_id: uid,
    date: data.date ?? date,
    calories: data.calories ?? null,
    protein: data.protein ?? null,
    weight: data.weight ?? null,
    created_at: data.created_at ?? '',
    updated_at: data.updated_at ?? '',
  };
}

export async function getDailyLog(date: string): Promise<DailyLog | null> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const snap = await getDoc(doc(logsCol(user.uid), date));
  if (!snap.exists()) return null;
  return toLog(user.uid, date, snap.data());
}

export async function upsertDailyLog(
  log: Pick<DailyLog, 'date' | 'calories' | 'protein' | 'weight'>
): Promise<DailyLog> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const now = new Date().toISOString();
  const ref = doc(logsCol(user.uid), log.date);
  const existing = await getDoc(ref);
  const data = {
    ...log,
    updated_at: now,
    created_at: existing.exists() ? (existing.data().created_at ?? now) : now,
  };
  await setDoc(ref, data, { merge: true });
  return toLog(user.uid, log.date, data);
}

export async function getWeeklySummary(
  weekStart: Date,
  calorieTarget: number | null
): Promise<WeeklySummary> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const start = startOfWeek(weekStart, { weekStartsOn: 1 });
  const end = endOfWeek(weekStart, { weekStartsOn: 1 });
  const startStr = format(start, 'yyyy-MM-dd');
  const endStr = format(end, 'yyyy-MM-dd');

  const snap = await getDocs(
    query(logsCol(user.uid), where('date', '>=', startStr), where('date', '<=', endStr), orderBy('date'))
  );
  const logs = snap.docs.map(d => toLog(user.uid, d.id, d.data()));

  const calorieLogs = logs.filter(l => l.calories != null);
  const proteinLogs = logs.filter(l => l.protein != null);
  const weightLogs = logs.filter(l => l.weight != null);

  const totalCalories = calorieLogs.reduce((s, l) => s + (l.calories ?? 0), 0);
  const totalProtein = proteinLogs.reduce((s, l) => s + (l.protein ?? 0), 0);
  const daysTracked = calorieLogs.length;

  const weightStart = weightLogs[0]?.weight ?? null;
  const weightEnd = weightLogs[weightLogs.length - 1]?.weight ?? null;
  const weightChange =
    weightStart != null && weightEnd != null ? weightEnd - weightStart : null;

  const caloricSurplusDeficit =
    calorieTarget != null && daysTracked > 0
      ? totalCalories - calorieTarget * daysTracked
      : null;

  return {
    weekStart: startStr,
    weekEnd: endStr,
    totalCalories,
    avgCalories: daysTracked > 0 ? Math.round(totalCalories / daysTracked) : 0,
    totalProtein,
    avgProtein: proteinLogs.length > 0 ? Math.round(totalProtein / proteinLogs.length) : 0,
    weightStart,
    weightEnd,
    weightChange,
    daysTracked,
    caloricSurplusDeficit,
  };
}

export async function getWeightTrend(days: number = 14): Promise<WeightTrendPoint[]> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const snap = await getDocs(
    query(logsCol(user.uid), orderBy('date', 'asc'), limit(days * 3))
  );
  const entries = snap.docs
    .map(d => toLog(user.uid, d.id, d.data()))
    .filter((l): l is DailyLog & { weight: number } => l.weight != null)
    .slice(-days);

  return entries.map((entry, idx) => {
    const window = entries.slice(Math.max(0, idx - 6), idx + 1);
    const movingAvg = window.reduce((s, e) => s + e.weight, 0) / window.length;
    return {
      date: entry.date,
      weight: entry.weight,
      movingAvg: Math.round(movingAvg * 10) / 10,
    };
  });
}

export async function getRecentLogs(days: number = 7): Promise<DailyLog[]> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const snap = await getDocs(
    query(logsCol(user.uid), orderBy('date', 'desc'), limit(days))
  );
  return snap.docs.map(d => toLog(user.uid, d.id, d.data()));
}
