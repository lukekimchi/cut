import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { getDailyLog, upsertDailyLog } from '../services/logs';

interface LogEntryProps {
  onNavigate: (page: 'dashboard') => void;
}

export function LogEntry({ onNavigate }: LogEntryProps) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [weight, setWeight] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLog = async () => {
      setFetching(true);
      setSaved(false);
      try {
        const log = await getDailyLog(date);
        if (log) {
          setCalories(log.calories?.toString() ?? '');
          setProtein(log.protein?.toString() ?? '');
          setWeight(log.weight?.toString() ?? '');
        } else {
          setCalories('');
          setProtein('');
          setWeight('');
        }
      } finally {
        setFetching(false);
      }
    };
    fetchLog();
  }, [date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await upsertDailyLog({
        date,
        calories: calories ? parseInt(calories) : null,
        protein: protein ? parseInt(protein) : null,
        weight: weight ? parseFloat(weight) : null,
      });
      setSaved(true);
      setTimeout(() => onNavigate('dashboard'), 800);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Log Entry</h2>
      </div>

      <form onSubmit={handleSubmit} className="log-form">
        <div className="form-group">
          <label htmlFor="date">Date</label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            max={format(new Date(), 'yyyy-MM-dd')}
            className="input"
          />
        </div>

        {fetching ? (
          <div className="form-loading">Loading existing log...</div>
        ) : (
          <>
            <div className="form-group">
              <label htmlFor="calories">Calories (kcal)</label>
              <input
                id="calories"
                type="number"
                placeholder="e.g. 2000"
                value={calories}
                onChange={e => setCalories(e.target.value)}
                min={0}
                max={10000}
                className="input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="protein">Protein (g)</label>
              <input
                id="protein"
                type="number"
                placeholder="e.g. 150"
                value={protein}
                onChange={e => setProtein(e.target.value)}
                min={0}
                max={500}
                className="input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="weight">Weight (kg)</label>
              <input
                id="weight"
                type="number"
                placeholder="e.g. 80.5"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                min={20}
                max={300}
                step={0.1}
                className="input"
              />
            </div>

            {error && <p className="error-text">{error}</p>}
            {saved && <p className="success-text">Saved!</p>}

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Log'}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
