import { useState, useEffect } from 'react';
import { format, subWeeks } from 'date-fns';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { getWeightTrend, getWeeklySummary } from '../services/logs';
import { useGoals } from '../hooks/useGoals';
import type { WeightTrendPoint, WeeklySummary, DailyDeficitEntry } from '../types';

const KCAL_PER_KG = 7700;

export function Progress() {
  const [trend, setTrend] = useState<WeightTrendPoint[]>([]);
  const [weeks, setWeeks] = useState<WeeklySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const { goals } = useGoals();

  useEffect(() => {
    const load = async () => {
      try {
        const now = new Date();
        const [t, w0, w1, w2, w3] = await Promise.all([
          getWeightTrend(28),
          getWeeklySummary(now, goals?.calorie_target ?? null),
          getWeeklySummary(subWeeks(now, 1), goals?.calorie_target ?? null),
          getWeeklySummary(subWeeks(now, 2), goals?.calorie_target ?? null),
          getWeeklySummary(subWeeks(now, 3), goals?.calorie_target ?? null),
        ]);
        setTrend(t);
        setWeeks([w0, w1, w2, w3]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [goals?.calorie_target]);

  const latestWeight = trend.length > 0
    ? (trend[trend.length - 1].movingAvg ?? trend[trend.length - 1].weight)
    : null;
  const earliestWeight = trend.length > 0 ? trend[0].weight : null;

  const weeklyRate = (() => {
    if (trend.length < 3) return null;
    const win = trend.slice(-Math.min(14, trend.length));
    const first = win[0].movingAvg ?? win[0].weight;
    const last = win[win.length - 1].movingAvg ?? win[win.length - 1].weight;
    return ((last - first) / win.length) * 7;
  })();

  const weeksToGoal = (() => {
    if (!goals?.target_weight || latestWeight == null || weeklyRate == null || weeklyRate >= 0) return null;
    const remaining = latestWeight - goals.target_weight;
    if (remaining <= 0) return 0;
    return Math.ceil(remaining / Math.abs(weeklyRate));
  })();

  const goalPct = (() => {
    if (!goals?.target_weight || earliestWeight == null || latestWeight == null) return null;
    const total = earliestWeight - goals.target_weight;
    const done = earliestWeight - latestWeight;
    if (total <= 0) return null;
    return Math.min(Math.max((done / total) * 100, 0), 100);
  })();

  const thisWeek = weeks[0] ?? null;

  const formatDate = (d: string) => format(new Date(d + 'T00:00:00'), 'MMM d');
  const formatDay = (d: string) => format(new Date(d + 'T00:00:00'), 'EEE d');

  const direction = trend.length >= 2
    ? (trend[trend.length - 1].movingAvg ?? trend[trend.length - 1].weight) -
      (trend[0].movingAvg ?? trend[0].weight)
    : null;

  const deficitDisplay = (entry: DailyDeficitEntry) => {
    if (entry.deficit == null) return '—';
    return (entry.deficit > 0 ? '+' : '') + entry.deficit + ' kcal';
  };

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="page">

      {/* ── Goal Status ── */}
      <div className="goal-card">
        {!goals?.target_weight ? (
          <p className="empty-state">Set a target weight in Goals to see your status.</p>
        ) : (
          <>
            <div className="goal-card-weights">
              <div className="goal-weight-block">
                <span className="goal-weight-label">Now</span>
                <span className="goal-weight-value">
                  {latestWeight != null ? latestWeight.toFixed(1) : '—'}
                  <span className="goal-weight-unit"> kg</span>
                </span>
              </div>
              <span className="goal-card-arrow">→</span>
              <div className="goal-weight-block">
                <span className="goal-weight-label">Goal</span>
                <span className="goal-weight-value">
                  {goals.target_weight}
                  <span className="goal-weight-unit"> kg</span>
                </span>
              </div>
            </div>

            {latestWeight != null && (
              <div className="goal-card-meta">
                <div className="goal-meta-stat">
                  <span className="goal-weight-label">To go</span>
                  <span className="goal-meta-value">
                    {Math.abs(latestWeight - goals.target_weight).toFixed(1)} kg
                  </span>
                </div>
                <div className="goal-meta-stat">
                  <span className="goal-weight-label">Rate</span>
                  <span className="goal-meta-value">
                    {weeklyRate != null
                      ? `${weeklyRate < 0 ? '↓' : '↑'} ${Math.abs(weeklyRate).toFixed(2)} kg/wk`
                      : '—'}
                  </span>
                </div>
                <div className="goal-meta-stat">
                  <span className="goal-weight-label">ETA</span>
                  <span className="goal-meta-value">
                    {weeksToGoal === 0
                      ? 'Reached'
                      : weeksToGoal != null
                      ? `~${weeksToGoal} wks`
                      : '—'}
                  </span>
                </div>
              </div>
            )}

            {goalPct != null && (
              <div className="goal-progress-track">
                <div className="goal-progress-fill" style={{ width: `${goalPct}%` }} />
                <span className="goal-progress-pct">{Math.round(goalPct)}%</span>
              </div>
            )}

            <div className="goal-card-footer">
              {weeklyRate == null && (
                <span>Log weight daily to see rate & ETA</span>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Weight Trend ── */}
      <section>
        <h3 className="section-title">Weight Trend (28 days)</h3>
        {trend.length === 0 ? (
          <p className="empty-state">No weight data yet. Log your weight daily to see the trend.</p>
        ) : (
          <>
            {direction != null && (
              <p className="trend-summary">
                {Math.abs(direction) < 0.1
                  ? 'Weight is stable'
                  : direction < 0
                  ? `Trending down ${Math.abs(direction).toFixed(1)} kg`
                  : `Trending up ${direction.toFixed(1)} kg`}{' '}
                over {trend.length} entries.
              </p>
            )}
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11, fill: '#888' }} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: '#888' }} />
                  <Tooltip
                    formatter={v => [`${Number(v).toFixed(1)} kg`]}
                    labelFormatter={l => formatDate(String(l))}
                    contentStyle={{
                      background: 'rgba(10,10,18,0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                    }}
                  />
                  <Legend formatter={v => (v === 'weight' ? 'Actual' : '7d Avg')} wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="weight" stroke="rgba(255,255,255,0.2)" strokeWidth={1} dot={{ r: 2 }} strokeDasharray="4 2" />
                  <Line type="monotone" dataKey="movingAvg" stroke="#d4f544" strokeWidth={2} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </section>

      {/* ── Weekly Comparison ── */}
      <section>
        <h3 className="section-title">Weekly</h3>
        <div className="weekly-list">
          {weeks
            .filter((w, i) => i === 0 || w.daysTracked > 0 || w.weightChange != null || w.totalDeficit != null)
            .map((w, i) => {
              const estFatLoss = w.totalDeficit != null && w.totalDeficit < 0
                ? Math.abs(w.totalDeficit) / KCAL_PER_KG
                : null;
              return (
                <div key={w.weekStart} className="weekly-item">
                  <div className="weekly-item-header">
                    <span className="weekly-item-label">
                      {i === 0 ? 'This week' : i === 1 ? 'Last week' : `${i + 1} wks ago`}
                    </span>
                    <span className="weekly-item-dates">
                      {format(new Date(w.weekStart + 'T00:00:00'), 'MMM d')} –{' '}
                      {format(new Date(w.weekEnd + 'T00:00:00'), 'MMM d')}
                    </span>
                  </div>
                  <div className="weekly-item-stats">
                    <div className="weekly-stat">
                      <span className="weekly-stat-label">Weight Δ</span>
                      <span className={`weekly-stat-value${w.weightChange == null ? '' : w.weightChange < 0 ? ' good' : ' warn'}`}>
                        {w.weightChange != null
                          ? (w.weightChange > 0 ? '+' : '') + w.weightChange.toFixed(1) + ' kg'
                          : '—'}
                      </span>
                    </div>
                    <div className="weekly-stat">
                      <span className="weekly-stat-label">Deficit</span>
                      <span className={`weekly-stat-value${w.totalDeficit == null ? '' : w.totalDeficit < 0 ? ' good' : ' warn'}`}>
                        {w.totalDeficit != null
                          ? (w.totalDeficit > 0 ? '+' : '') + w.totalDeficit.toLocaleString() + ' kcal'
                          : '—'}
                      </span>
                    </div>
                    <div className="weekly-stat">
                      <span className="weekly-stat-label">Est. fat loss</span>
                      <span className={`weekly-stat-value${estFatLoss != null ? ' good' : ''}`}>
                        {estFatLoss != null ? `−${estFatLoss.toFixed(2)} kg` : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
        <p className="weekly-footnote">Est. based on 7,700 kcal ≈ 1 kg fat</p>
      </section>

      {/* ── This Week Daily Breakdown ── */}
      {thisWeek && thisWeek.dailyBreakdown.some(d => d.calories != null || d.calories_burned != null) && (
        <section>
          <h3 className="section-title">This Week · Daily</h3>
          <div className="deficit-breakdown">
            {thisWeek.dailyBreakdown
              .filter(d => d.calories != null || d.calories_burned != null)
              .map(entry => (
                <div key={entry.date} className="deficit-row">
                  <span className="deficit-date">{formatDay(entry.date)}</span>
                  <span className="deficit-detail">
                    {entry.calories_burned != null ? `${entry.calories_burned} burned` : '—'}
                    {' · '}
                    {entry.calories != null ? `${entry.calories} eaten` : '—'}
                  </span>
                  <span className={`deficit-value${entry.deficit == null ? '' : entry.deficit <= 0 ? ' good' : ' warn'}`}>
                    {deficitDisplay(entry)}
                  </span>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
