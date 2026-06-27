import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { StatCard } from '../components/StatCard';
import { getDailyLog, getWeeklySummary } from '../services/logs';
import { useGoals } from '../hooks/useGoals';
import type { DailyLog, WeeklySummary } from '../types';

interface DashboardProps {
  onNavigate: (page: 'log' | 'progress' | 'goals') => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [todayLog, setTodayLog] = useState<DailyLog | null>(null);
  const [weekly, setWeekly] = useState<WeeklySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const { goals } = useGoals();

  useEffect(() => {
    const load = async () => {
      try {
        const [log, summary] = await Promise.all([
          getDailyLog(today),
          getWeeklySummary(new Date(), goals?.calorie_target ?? null),
        ]);
        setTodayLog(log);
        setWeekly(summary);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [today, goals?.calorie_target]);

  const calorieTarget = goals?.calorie_target;
  const proteinTarget = goals?.protein_target;

  const calorieHighlight = (): 'good' | 'warn' | 'neutral' => {
    if (!todayLog?.calories || !calorieTarget) return 'neutral';
    const ratio = todayLog.calories / calorieTarget;
    return ratio <= 1.05 ? 'good' : 'warn';
  };

  const onTrack = (): string => {
    if (!weekly || !goals?.target_weight || !weekly.weightEnd) return '—';
    const slope = weekly.weightChange ?? 0;
    const targetDelta = (goals.target_weight - weekly.weightEnd);
    if (Math.abs(targetDelta) < 0.1) return 'At goal';
    if (targetDelta < 0 && slope < 0) return 'On track';
    if (targetDelta > 0 && slope > 0) return 'On track';
    return 'Off track';
  };

  const surplusLabel = () => {
    if (!weekly?.caloricSurplusDeficit) return null;
    const val = weekly.caloricSurplusDeficit;
    return val >= 0 ? `+${val} kcal surplus` : `${val} kcal deficit`;
  };

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2>Today — {format(new Date(), 'EEE, MMM d')}</h2>
        <button className="btn btn-primary" onClick={() => onNavigate('log')}>
          {todayLog ? 'Edit Log' : '+ Log Today'}
        </button>
      </div>

      <section>
        <h3 className="section-title">Today</h3>
        <div className="stat-grid">
          <StatCard
            label="Calories"
            value={todayLog?.calories ?? '—'}
            unit={calorieTarget ? ` / ${calorieTarget}` : ' kcal'}
            highlight={calorieHighlight()}
          />
          <StatCard
            label="Protein"
            value={todayLog?.protein ?? '—'}
            unit={proteinTarget ? ` / ${proteinTarget}g` : 'g'}
          />
          <StatCard
            label="Weight"
            value={todayLog?.weight ?? '—'}
            unit="kg"
          />
        </div>
      </section>

      <section>
        <h3 className="section-title">This Week</h3>
        <div className="stat-grid">
          <StatCard
            label="Avg Calories"
            value={weekly?.avgCalories ?? '—'}
            unit=" kcal"
            sub={surplusLabel() ?? undefined}
          />
          <StatCard
            label="Avg Protein"
            value={weekly?.avgProtein ?? '—'}
            unit="g"
          />
          <StatCard
            label="Weight Change"
            value={
              weekly?.weightChange != null
                ? (weekly.weightChange >= 0 ? '+' : '') + weekly.weightChange.toFixed(1)
                : '—'
            }
            unit="kg"
          />
          <StatCard
            label="Goal Status"
            value={onTrack()}
            highlight={onTrack() === 'On track' ? 'good' : onTrack() === 'Off track' ? 'warn' : 'neutral'}
          />
        </div>
      </section>

      <div className="quick-links">
        <button className="btn btn-secondary" onClick={() => onNavigate('progress')}>
          View Progress →
        </button>
        <button className="btn btn-secondary" onClick={() => onNavigate('goals')}>
          {goals ? 'Edit Goals →' : 'Set Goals →'}
        </button>
      </div>
    </div>
  );
}
