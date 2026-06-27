import { format, startOfWeek, endOfWeek } from 'date-fns';
import { supabase } from '../lib/supabase';
import type { DailyLog, WeeklySummary, WeightTrendPoint } from '../types';

export async function getDailyLog(date: string): Promise<DailyLog | null> {
  const { data, error } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('date', date)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertDailyLog(
  log: Pick<DailyLog, 'date' | 'calories' | 'protein' | 'weight'>
): Promise<DailyLog> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('daily_logs')
    .upsert(
      { ...log, user_id: user.id },
      { onConflict: 'user_id,date' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getWeeklySummary(
  weekStart: Date,
  calorieTarget: number | null
): Promise<WeeklySummary> {
  const start = startOfWeek(weekStart, { weekStartsOn: 1 });
  const end = endOfWeek(weekStart, { weekStartsOn: 1 });
  const startStr = format(start, 'yyyy-MM-dd');
  const endStr = format(end, 'yyyy-MM-dd');

  const { data, error } = await supabase
    .from('daily_logs')
    .select('*')
    .gte('date', startStr)
    .lte('date', endStr)
    .order('date', { ascending: true });

  if (error) throw error;
  const logs = (data ?? []) as DailyLog[];

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
  const { data, error } = await supabase
    .from('daily_logs')
    .select('date, weight')
    .not('weight', 'is', null)
    .order('date', { ascending: true })
    .limit(days);

  if (error) throw error;
  const entries = (data ?? []).filter(d => d.weight != null) as { date: string; weight: number }[];

  return entries.map((entry, idx) => {
    const window = entries.slice(Math.max(0, idx - 6), idx + 1);
    const movingAvg =
      window.length >= 1
        ? window.reduce((s, e) => s + e.weight, 0) / window.length
        : null;
    return {
      date: entry.date,
      weight: entry.weight,
      movingAvg: movingAvg != null ? Math.round(movingAvg * 10) / 10 : null,
    };
  });
}

export async function getRecentLogs(days: number = 7): Promise<DailyLog[]> {
  const { data, error } = await supabase
    .from('daily_logs')
    .select('*')
    .order('date', { ascending: false })
    .limit(days);

  if (error) throw error;
  return (data ?? []) as DailyLog[];
}
