import { useState, useEffect } from 'react';
import { format, differenceInWeeks, parseISO } from 'date-fns';
import { useGoals } from '../hooks/useGoals';
import { getWeightTrend } from '../services/logs';
import type { WeightTrendPoint } from '../types';

export function Goals() {
  const { goals, loading, saveGoals } = useGoals();
  const [targetWeight, setTargetWeight] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [calorieTarget, setCalorieTarget] = useState('');
  const [proteinTarget, setProteinTarget] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trend, setTrend] = useState<WeightTrendPoint[]>([]);

  useEffect(() => {
    if (goals) {
      setTargetWeight(goals.target_weight?.toString() ?? '');
      setTargetDate(goals.target_date ?? '');
      setCalorieTarget(goals.calorie_target?.toString() ?? '');
      setProteinTarget(goals.protein_target?.toString() ?? '');
    }
  }, [goals]);

  useEffect(() => {
    getWeightTrend(14).then(setTrend).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await saveGoals({
        target_weight: targetWeight ? parseFloat(targetWeight) : null,
        target_date: targetDate || null,
        calorie_target: calorieTarget ? parseInt(calorieTarget) : null,
        protein_target: proteinTarget ? parseInt(proteinTarget) : null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const projection = () => {
    if (!goals?.target_weight || !goals.target_date || trend.length < 2) return null;

    const latestWeight = trend[trend.length - 1].weight;
    const avgMovingAvg = trend.slice(-7).reduce((s, t) => s + (t.movingAvg ?? t.weight), 0) / Math.min(trend.length, 7);
    const firstMovingAvg = trend[0].movingAvg ?? trend[0].weight;
    const weeklyRate = (avgMovingAvg - firstMovingAvg) / (trend.length / 7);
    const weeksLeft = differenceInWeeks(parseISO(goals.target_date), new Date());
    const projectedWeight = latestWeight + weeklyRate * weeksLeft;
    const onTrack = goals.target_weight > latestWeight
      ? projectedWeight >= goals.target_weight
      : projectedWeight <= goals.target_weight;

    return {
      currentWeight: latestWeight,
      projectedWeight: Math.round(projectedWeight * 10) / 10,
      weeklyRate: Math.round(weeklyRate * 10) / 10,
      weeksLeft,
      onTrack,
    };
  };

  const proj = projection();

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2>Goals</h2>
      </div>

      {proj && (
        <section className={`projection-banner projection-banner--${proj.onTrack ? 'good' : 'warn'}`}>
          <div className="projection-status">
            {proj.onTrack ? '✓ On Track' : '⚠ Off Track'}
          </div>
          <div className="projection-detail">
            Current: {proj.currentWeight}kg → Projected: {proj.projectedWeight}kg
            {' '}({proj.weeklyRate >= 0 ? '+' : ''}{proj.weeklyRate}kg/wk)
            {' '}· {proj.weeksLeft} weeks left
          </div>
        </section>
      )}

      <form onSubmit={handleSubmit} className="goals-form">
        <section>
          <h3 className="section-title">Weight Goal</h3>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="target-weight">Target Weight (kg)</label>
              <input
                id="target-weight"
                type="number"
                placeholder="e.g. 75"
                value={targetWeight}
                onChange={e => setTargetWeight(e.target.value)}
                min={20}
                max={300}
                step={0.1}
                className="input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="target-date">Target Date</label>
              <input
                id="target-date"
                type="date"
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
                className="input"
              />
            </div>
          </div>
        </section>

        <section>
          <h3 className="section-title">Daily Targets</h3>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="calorie-target">Calorie Target (kcal)</label>
              <input
                id="calorie-target"
                type="number"
                placeholder="e.g. 1800"
                value={calorieTarget}
                onChange={e => setCalorieTarget(e.target.value)}
                min={500}
                max={10000}
                className="input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="protein-target">Protein Target (g)</label>
              <input
                id="protein-target"
                type="number"
                placeholder="e.g. 160"
                value={proteinTarget}
                onChange={e => setProteinTarget(e.target.value)}
                min={0}
                max={500}
                className="input"
              />
            </div>
          </div>
        </section>

        {error && <p className="error-text">{error}</p>}
        {saved && <p className="success-text">Goals saved!</p>}

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : 'Save Goals'}
        </button>
      </form>
    </div>
  );
}
