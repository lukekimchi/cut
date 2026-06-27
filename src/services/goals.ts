import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { Goals } from '../types';

export async function getUserGoals(): Promise<Goals | null> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const snap = await getDoc(doc(db, 'goals', user.uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    user_id: user.uid,
    target_weight: data.target_weight ?? null,
    target_date: data.target_date ?? null,
    calorie_target: data.calorie_target ?? null,
    protein_target: data.protein_target ?? null,
  };
}

export async function updateGoals(
  goals: Pick<Goals, 'target_weight' | 'target_date' | 'calorie_target' | 'protein_target'>
): Promise<Goals> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  await setDoc(doc(db, 'goals', user.uid), goals, { merge: true });
  return { id: user.uid, user_id: user.uid, ...goals };
}
