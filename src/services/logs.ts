import { format, startOfWeek, endOfWeek } from 'date-fns';
import type { DocumentData } from 'firebase/firestore';
import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  addDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { DailyLog, Meal, WeeklySummary, WeightTrendPoint } from '../types';

function logsCol(uid: string) {
  return collection(db, 'dailyLogs', uid, 'entries');
}

function mealsCol(uid: string, date: string) {
  return collection(db, 'dailyLogs', uid, 'entries', date, 'meals');
}

function toLog(uid: string, date: string, data: DocumentData): DailyLog {
  return {
    id: date,
    user_id: uid,
    date: data.date ?? date,
    calories: data.calories ?? null,
    protein: data.protein ?? null,
    weight: data.weight ?? null,
    calories_burned: data.calories_burned ?? null,
    created_at: data.created_at ?? '',
    updated_at: data.updated_at ?? '',
  };
}

async function recomputeDayTotals(uid: string, date: string) {
  const [mealSnap, logSnap] = await Promise.all([
    getDocs(mealsCol(uid, date)),
    getDoc(doc(logsCol(uid), date)),
  ]);
  const mealDocs = mealSnap.docs.map(d => d.data());
  const calories = mealDocs.reduce((s, m) => s + (m.calories ?? 0), 0);
  const protein = mealDocs.reduce((s, m) => s + (m.protein ?? 0), 0);
  const now = new Date().toISOString();
  const existing = logSnap.exists() ? logSnap.data() : {};
  await setDoc(doc(logsCol(uid), date), {
    date,
    calories: calories || null,
    protein: protein || null,
    weight: existing.weight ?? null,
    calories_burned: existing.calories_burned ?? null,
    updated_at: now,
    created_at: existing.created_at ?? now,
  });
}

export async function getMeals(date: string): Promise<Meal[]> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const snap = await getDocs(query(mealsCol(user.uid, date), orderBy('createdAt')));
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Meal, 'id'>) }));
}

export async function addMeal(
  date: string,
  meal: { name: string; calories: number | null; protein: number | null }
): Promise<Meal> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const createdAt = new Date().toISOString();
  const ref = await addDoc(mealsCol(user.uid, date), { ...meal, createdAt });
  await recomputeDayTotals(user.uid, date);
  return { id: ref.id, ...meal, createdAt };
}

export async function deleteMeal(date: string, mealId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  await deleteDoc(doc(mealsCol(user.uid, date), mealId));
  await recomputeDayTotals(user.uid, date);
}

export async function logWeight(date: string, weight: number | null): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  await setDoc(
    doc(logsCol(user.uid), date),
    { weight, date, updated_at: new Date().toISOString() },
    { merge: true }
  );
}

export async function logExpenditure(date: string, caloriesBurned: number | null): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  await setDoc(
    doc(logsCol(user.uid), date),
    { calories_burned: caloriesBurned, date, updated_at: new Date().toISOString() },
    { merge: true }
  );
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

  const dailyBreakdown = logs.map(l => ({
    date: l.date,
    calories: l.calories,
    calories_burned: l.calories_burned,
    deficit: l.calories != null && l.calories_burned != null
      ? l.calories - l.calories_burned
      : null,
  }));
  const deficitDays = dailyBreakdown.filter(d => d.deficit != null);
  const totalDeficit = deficitDays.length > 0
    ? deficitDays.reduce((s, d) => s + (d.deficit ?? 0), 0)
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
    totalDeficit,
    dailyBreakdown,
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
