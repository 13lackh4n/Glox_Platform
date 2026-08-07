export default function StatCard({ icon, value, label, trend, trendLabel, color = 'primary' }) {
  const colorMap = {
    primary: 'bg-primary/15 text-primary',
    secondary: 'bg-secondary/15 text-secondary',
    success: 'bg-success/15 text-success',
    warning: 'bg-warning/15 text-warning',
    danger: 'bg-danger/15 text-danger',
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/40 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div
          className={[
            'flex h-11 w-11 items-center justify-center rounded-xl text-xl',
            colorMap[color] ?? colorMap.primary,
          ].join(' ')}
        >
          {icon}
        </div>
        {trend !== undefined && (
          <span
            className={[
              'flex items-center gap-1 text-xs font-semibold',
              trend >= 0 ? 'text-success' : 'text-danger',
            ].join(' ')}
          >
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-3xl font-bold text-text-main">{value ?? '—'}</p>
        <p className="mt-0.5 text-sm text-text-secondary">{label}</p>
        {trendLabel && <p className="mt-1 text-xs text-text-secondary">{trendLabel}</p>}
      </div>
    </div>
  )
}
