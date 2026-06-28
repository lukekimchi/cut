import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { getDailyLog, getMeals, addMeal, deleteMeal, logWeight, logExpenditure } from '../services/logs';
import { getSavedMeals, createSavedMeal, deleteSavedMeal } from '../services/savedMeals';
import { useGoals } from '../hooks/useGoals';
import type { Meal, SavedMeal } from '../types';

export function LogEntry() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [date, setDate] = useState(today);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [weight, setWeight] = useState('');
  const [caloriesBurned, setCaloriesBurned] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingWeight, setSavingWeight] = useState(false);
  const [weightSaved, setWeightSaved] = useState(false);
  const [savingExpenditure, setSavingExpenditure] = useState(false);
  const [expenditureSaved, setExpenditureSaved] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [mealName, setMealName] = useState('');
  const [mealCalories, setMealCalories] = useState('');
  const [mealProtein, setMealProtein] = useState('');
  const [saveAsQuick, setSaveAsQuick] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deletingSaved, setDeletingSaved] = useState<string | null>(null);
  const [quickAdding, setQuickAdding] = useState<string | null>(null);
  const { goals } = useGoals();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setShowForm(false);
      const [log, dayMeals, quick] = await Promise.all([
        getDailyLog(date),
        getMeals(date),
        getSavedMeals(),
      ]);
      if (!cancelled) {
        setWeight(log?.weight?.toString() ?? '');
        setCaloriesBurned(log?.calories_burned?.toString() ?? '');
        setMeals(dayMeals);
        setSavedMeals(quick);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [date]);

  const totalCalories = meals.reduce((s, m) => s + (m.calories ?? 0), 0);
  const totalProtein = meals.reduce((s, m) => s + (m.protein ?? 0), 0);
  const calorieTarget = goals?.calorie_target ?? null;
  const proteinTarget = goals?.protein_target ?? null;

  const handleQuickAdd = async (sm: SavedMeal) => {
    setQuickAdding(sm.id);
    try {
      const meal = await addMeal(date, { name: sm.name, calories: sm.calories, protein: sm.protein });
      setMeals(prev => [...prev, meal]);
      setShowForm(false);
    } finally {
      setQuickAdding(null);
    }
  };

  const handleDeleteSaved = async (id: string) => {
    setDeletingSaved(id);
    try {
      await deleteSavedMeal(id);
      setSavedMeals(prev => prev.filter(m => m.id !== id));
    } finally {
      setDeletingSaved(null);
    }
  };

  const handleAddMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealName.trim()) return;
    setAdding(true);
    try {
      const payload = {
        name: mealName.trim(),
        calories: mealCalories ? Number(mealCalories) : null,
        protein: mealProtein ? Number(mealProtein) : null,
      };
      const [meal] = await Promise.all([
        addMeal(date, payload),
        saveAsQuick ? createSavedMeal(payload).then(sm => setSavedMeals(prev => [...prev, sm])) : Promise.resolve(),
      ]);
      setMeals(prev => [...prev, meal]);
      setMealName('');
      setMealCalories('');
      setMealProtein('');
      setSaveAsQuick(false);
      setShowForm(false);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteMeal(date, id);
      setMeals(prev => prev.filter(m => m.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  const handleSaveWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWeight(true);
    setWeightSaved(false);
    try {
      await logWeight(date, weight ? parseFloat(weight) : null);
      setWeightSaved(true);
      setTimeout(() => setWeightSaved(false), 2000);
    } finally {
      setSavingWeight(false);
    }
  };

  const handleSaveExpenditure = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingExpenditure(true);
    setExpenditureSaved(false);
    try {
      await logExpenditure(date, caloriesBurned ? Math.round(Number(caloriesBurned)) : null);
      setExpenditureSaved(true);
      setTimeout(() => setExpenditureSaved(false), 2000);
    } finally {
      setSavingExpenditure(false);
    }
  };

  if (loading) return <div className="page-loading">Loading...</div>;

  const caloriePct = calorieTarget ? Math.min((totalCalories / calorieTarget) * 100, 100) : 0;
  const over = calorieTarget != null && totalCalories > calorieTarget;

  const macroLabel = (sm: SavedMeal) => {
    const parts = [];
    if (sm.calories != null) parts.push(`${sm.calories} kcal`);
    if (sm.protein != null) parts.push(`${sm.protein}g protein`);
    return parts.join(' · ');
  };

  return (
    <div className="page log-page">
      <div className="page-header">
        <h2>{date === today ? 'Today' : format(new Date(date + 'T00:00:00'), 'EEE, MMM d')}</h2>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          max={today}
          className="input date-inline"
        />
      </div>

      <div className="page-header">
        <h2>Body Weight</h2>
      </div>

      <form onSubmit={handleSaveWeight} className="weight-form">
        <input
          type="number"
          placeholder="e.g. 80.5 kg"
          value={weight}
          onChange={e => { setWeight(e.target.value); setWeightSaved(false); }}
          min={20}
          max={300}
          step={0.1}
          className="input"
        />
        <button type="submit" className="btn btn-secondary" disabled={savingWeight}>
          {savingWeight ? 'Saving...' : weightSaved ? 'Saved ✓' : 'Save'}
        </button>
      </form>

      <div className="page-header">
        <h2>Calories Burned</h2>
      </div>

      <form onSubmit={handleSaveExpenditure} className="weight-form">
        <input
          type="number"
          placeholder="e.g. 2800 kcal"
          value={caloriesBurned}
          onChange={e => { setCaloriesBurned(e.target.value); setExpenditureSaved(false); }}
          min={0}
          max={10000}
          step={1}
          className="input"
        />
        <button type="submit" className="btn btn-secondary" disabled={savingExpenditure}>
          {savingExpenditure ? 'Saving...' : expenditureSaved ? 'Saved ✓' : 'Save'}
        </button>
      </form>

      <div className="page-header">
        <h2>Food Log</h2>
      </div>

      <div className="log-totals">
        <div className="log-total-row">
          <span className="log-total-label">Calories</span>
          <span className="log-total-value">
            {totalCalories}
            {calorieTarget && <span className="log-total-target"> / {calorieTarget}</span>}
            <span className="log-total-unit"> kcal</span>
          </span>
        </div>
        {calorieTarget && (
          <div className="progress-bar">
            <div className={`progress-fill${over ? ' over' : ''}`} style={{ width: `${caloriePct}%` }} />
          </div>
        )}
        <div className="log-total-row">
          <span className="log-total-label">Protein</span>
          <span className="log-total-value">
            {totalProtein}
            {proteinTarget && <span className="log-total-target"> / {proteinTarget}</span>}
            <span className="log-total-unit">g</span>
          </span>
        </div>
      </div>

      <section>
        <h3 className="section-title">Meals & Snacks</h3>

        {showForm && (
          <form className="add-meal-form" onSubmit={handleAddMeal} style={{ marginBottom: 10 }}>
            {savedMeals.length > 0 && (
              <>
                <p className="section-title" style={{ marginBottom: 6 }}>Quick Add</p>
                <div className="meal-list" style={{ marginBottom: 4 }}>
                  {savedMeals.map(sm => (
                    <div
                      key={sm.id}
                      className={`quick-add-item${quickAdding === sm.id ? ' loading' : ''}`}
                      onClick={() => quickAdding === sm.id ? null : handleQuickAdd(sm)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && handleQuickAdd(sm)}
                    >
                      <div className="meal-item-info">
                        <span className="meal-item-name">{sm.name}</span>
                        {macroLabel(sm) && <span className="meal-item-macros">{macroLabel(sm)}</span>}
                      </div>
                      <div className="quick-add-actions">
                        <span className="quick-add-plus">{quickAdding === sm.id ? '…' : '+'}</span>
                        <button
                          type="button"
                          className="meal-delete-btn"
                          onClick={e => { e.stopPropagation(); handleDeleteSaved(sm.id); }}
                          disabled={deletingSaved === sm.id}
                          aria-label="Remove saved meal"
                        >
                          {deletingSaved === sm.id ? '…' : '×'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="form-divider" />
              </>
            )}
            <input
              type="text"
              placeholder="e.g. Chicken & rice"
              value={mealName}
              onChange={e => setMealName(e.target.value)}
              className="input"
              required
              autoFocus={savedMeals.length === 0}
            />
            <div className="form-row">
              <div className="form-group">
                <label>Calories (kcal)</label>
                <input
                  type="number"
                  placeholder="500"
                  value={mealCalories}
                  onChange={e => setMealCalories(e.target.value)}
                  min={0}
                  className="input"
                />
              </div>
              <div className="form-group">
                <label>Protein (g)</label>
                <input
                  type="number"
                  placeholder="40"
                  value={mealProtein}
                  onChange={e => setMealProtein(e.target.value)}
                  min={0}
                  className="input"
                />
              </div>
            </div>
            <label className="save-toggle">
              <input
                type="checkbox"
                checked={saveAsQuick}
                onChange={e => setSaveAsQuick(e.target.checked)}
              />
              Save for quick add
            </label>
            <div className="form-row">
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={adding || !mealName.trim()}>
                {adding ? 'Adding...' : 'Add'}
              </button>
            </div>
          </form>
        )}

        {meals.length === 0 ? (
          <p className="empty-state">Nothing logged yet.</p>
        ) : (
          <div className="meal-list">
            {meals.map(m => (
              <div key={m.id} className="meal-item">
                <div className="meal-item-info">
                  <span className="meal-item-name">{m.name}</span>
                  {(m.calories != null || m.protein != null) && (
                    <span className="meal-item-macros">
                      {m.calories != null && `${m.calories} kcal`}
                      {m.calories != null && m.protein != null && ' · '}
                      {m.protein != null && `${m.protein}g protein`}
                    </span>
                  )}
                </div>
                <button
                  className="meal-delete-btn"
                  onClick={() => handleDelete(m.id)}
                  disabled={deleting === m.id}
                  aria-label="Delete meal"
                >
                  {deleting === m.id ? '…' : '×'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>


      {!showForm && (
        <button
          className="fab"
          onClick={() => setShowForm(true)}
          aria-label="Add meal"
        >
          + Add Meal
        </button>
      )}
    </div>
  );
}
