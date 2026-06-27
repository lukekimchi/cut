interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  highlight?: 'good' | 'warn' | 'neutral';
}

export function StatCard({ label, value, unit, sub, highlight = 'neutral' }: StatCardProps) {
  return (
    <div className={`stat-card stat-card--${highlight}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">
        {value}
        {unit && <span className="stat-unit">{unit}</span>}
      </div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}
