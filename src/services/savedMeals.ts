import { collection, getDocs, addDoc, deleteDoc, doc, orderBy, query } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { SavedMeal } from '../types';

function col(uid: string) {
  return collection(db, 'savedMeals', uid, 'items');
}

export async function getSavedMeals(): Promise<SavedMeal[]> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const snap = await getDocs(query(col(user.uid), orderBy('createdAt')));
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<SavedMeal, 'id'>) }));
}

export async function createSavedMeal(
  meal: { name: string; calories: number | null; protein: number | null }
): Promise<SavedMeal> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const createdAt = new Date().toISOString();
  const ref = await addDoc(col(user.uid), { ...meal, createdAt });
  return { id: ref.id, ...meal, createdAt };
}

export async function deleteSavedMeal(id: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  await deleteDoc(doc(col(user.uid), id));
}
