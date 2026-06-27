import { supabase } from '../lib/supabase';
import type { Goals } from '../types';

export async function getUserGoals(): Promise<Goals | null> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateGoals(
  goals: Pick<Goals, 'target_weight' | 'target_date' | 'calorie_target' | 'protein_target'>
): Promise<Goals> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('goals')
    .upsert({ ...goals, user_id: user.id }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}
