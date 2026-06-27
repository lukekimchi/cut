import { useState, useEffect } from 'react';
import type { Goals } from '../types';
import { getUserGoals, updateGoals } from '../services/goals';

export function useGoals() {
  const [goals, setGoals] = useState<Goals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUserGoals();
      setGoals(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGoals(); }, []);

  const saveGoals = async (g: Pick<Goals, 'target_weight' | 'target_date' | 'calorie_target' | 'protein_target'>) => {
    const updated = await updateGoals(g);
    setGoals(updated);
    return updated;
  };

  return { goals, loading, error, saveGoals, refetch: fetchGoals };
}
