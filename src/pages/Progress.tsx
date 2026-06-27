import { useState, useEffect } from 'react';
import { format, subWeeks } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { getWeightTrend, getWeeklySummary } from '../services/logs';
import { useGoals } from '../hooks/useGoals';
import { StatCard } from '../components/StatCard';
import type { WeightTrendPoint, WeeklySummary } from '../types';

export function Progress() {
  const [trend, setTrend] = useState<WeightTrendPoint[]>([]);
  const [thisWeek, setThisWeek] = useState<WeeklySummary | null>(null);
  const [lastWeek, setLastWeek] = useState<WeeklySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const { goals } = useGoals();

  useEffect(() => {
    const load = async () => {
      try {
        const [t, tw, lw] = await Promise.all([
          getWeightTrend(14),
          getWeeklySummary(new Date(), goals?.calorie_target ?? null),
          getWeeklySummary(subWeeks(new Date(), 1), goals?.calorie_target ?? null),
        ]);
        setTrend(t);
        setThisWeek(tw);
        setLastWeek(lw);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [goals?.calorie_target]);

  const formatDate = (d: string) => format(new Date(d + 'T00:00:00'), 'MMM d');

  const weightDirection = () => {
    if (trend.length < 2) return null;
    const first = trend[0].movingAvg ?? trend[0].weight;
    const last = trend[trend.length - 1].movingAvg ?? trend[trend.length - 1].weight;
    return last - first;
  };

  const direction = weightDirection();

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2>Progress</h2>
      </div>

      <section>
        <h3 className="section-title">Weight Trend (14 days)</h3>
        {trend.length === 0 ? (
          <p className="empty-state">No weight data yet. Start logging your weight daily.</p>
        ) : (
          <>
            {direction != null && (
              <p className="trend-summary">
                {Math.abs(direction) < 0.1
                  ? 'Weight is stable'
                  : direction < 0
                  ? `Trending down ${Math.abs(direction).toFixed(1)}kg`
                  : `Trending up ${direction.toFixed(1)}kg`}{' '}
                over the last {trend.length} entries.
              </p>
            )}
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 11, fill: '#888' }}
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    tick={{ fontSize: 11, fill: '#888' }}
                    tickFormatter={v => `${v}`}
                  />
                  <Tooltip
                    formatter={(value) => [
                      `${Number(value).toFixed(1)}kg`,
                    ]}
                    labelFormatter={(label) => formatDate(String(label))}
                    contentStyle={{ background: '#1a1a1a', border: '1px solid #333' }}
                  />
                  <Legend
                    formatter={v => (v === 'weight' ? 'Actual' : '7d Avg')}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#555"
                    strokeWidth={1}
                    dot={{ r: 2 }}
                    strokeDasharray="4 2"
                  />
                  <Line
                    type="monotone"
                    dataKey="movingAvg"
                    stroke="#e2ff5d"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </section>

      <section>
        <h3 className="section-title">This Week</h3>
        {thisWeek && (
          <div className="stat-grid">
            <StatCard label="Total Calories" value={thisWeek.totalCalories} unit=" kcal" />
            <StatCard label="Avg Calories" value={thisWeek.avgCalories} unit=" kcal" />
            <StatCard label="Total Protein" value={thisWeek.totalProtein} unit="g" />
            <StatCard label="Avg Protein" value={thisWeek.avgProtein} unit="g" />
            <StatCard
              label="Days Tracked"
              value={thisWeek.daysTracked}
              unit=" / 7"
            />
            <StatCard
              label="Caloric Balance"
              value={
                thisWeek.caloricSurplusDeficit != null
                  ? (thisWeek.caloricSurplusDeficit >= 0 ? '+' : '') +
                    thisWeek.caloricSurplusDeficit
                  : '—'
              }
              unit=" kcal"
              highlight={
                thisWeek.caloricSurplusDeficit == null
                  ? 'neutral'
                  : thisWeek.caloricSurplusDeficit <= 0
                  ? 'good'
                  : 'warn'
              }
            />
          </div>
        )}
      </section>

      {lastWeek && lastWeek.daysTracked > 0 && (
        <section>
          <h3 className="section-title">Last Week</h3>
          <div className="stat-grid">
            <StatCard label="Avg Calories" value={lastWeek.avgCalories} unit=" kcal" />
            <StatCard label="Avg Protein" value={lastWeek.avgProtein} unit="g" />
            <StatCard
              label="Weight Change"
              value={
                lastWeek.weightChange != null
                  ? (lastWeek.weightChange >= 0 ? '+' : '') + lastWeek.weightChange.toFixed(1)
                  : '—'
              }
              unit="kg"
            />
          </div>
        </section>
      )}
    </div>
  );
}
