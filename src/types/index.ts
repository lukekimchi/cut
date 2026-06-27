export interface SavedMeal {
  id: string;
  name: string;
  calories: number | null;
  protein: number | null;
  createdAt: string;
}

export interface Meal {
  id: string;
  name: string;
  calories: number | null;
  protein: number | null;
  createdAt: string;
}

export interface DailyLog {
  id: string;
  user_id: string;
  date: string;
  calories: number | null;
  protein: number | null;
  weight: number | null;
  created_at: string;
  updated_at: string;
}

export interface Goals {
  id: string;
  user_id: string;
  target_weight: number | null;
  target_date: string | null;
  calorie_target: number | null;
  protein_target: number | null;
}

export interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  totalCalories: number;
  avgCalories: number;
  totalProtein: number;
  avgProtein: number;
  weightStart: number | null;
  weightEnd: number | null;
  weightChange: number | null;
  daysTracked: number;
  caloricSurplusDeficit: number | null;
}

export interface WeightTrendPoint {
  date: string;
  weight: number;
  movingAvg: number | null;
}
