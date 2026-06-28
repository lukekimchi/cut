interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  highlight?: 'good' | 'warn' | 'neutral';
  onClick?: () => void;
}

export function StatCard({ label, value, unit, sub, highlight = 'neutral', onClick }: StatCardProps) {
  return (
    <div
      className={`stat-card stat-card--${highlight}${onClick ? ' stat-card--clickable' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className="stat-label">{label}{onClick ? <span className="stat-card-chevron"> ›</span> : null}</div>
      <div className="stat-value">
        {value}
        {unit && <span className="stat-unit">{unit}</span>}
      </div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}
