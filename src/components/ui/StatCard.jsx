import { ArrowUp, ArrowDown } from 'lucide-react'

const TONES = {
  indigo: { bg: 'var(--stat-indigo-bg)', icon: 'var(--stat-indigo-icon)' },
  cyan: { bg: 'var(--stat-cyan-bg)', icon: 'var(--stat-cyan-icon)' },
  green: { bg: 'var(--stat-green-bg)', icon: 'var(--stat-green-icon)' },
  orange: { bg: 'var(--stat-orange-bg)', icon: 'var(--stat-orange-icon)' },
}

export default function StatCard({ icon: Icon, value, label, trend, trendLabel, color = 'indigo' }) {
  const tone = TONES[color] ?? TONES.indigo

  return (
    <div className="card-surface card-hoverable flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between">
        <div
          className="flex items-center justify-center rounded-[10px]"
          style={{ width: 40, height: 40, backgroundColor: tone.bg }}
        >
          {Icon && <Icon size={20} strokeWidth={2} style={{ color: tone.icon }} />}
        </div>
        {trend !== undefined && (
          <span
            className={[
              'flex items-center gap-0.5 text-xs font-semibold',
              trend >= 0 ? 'text-success' : 'text-danger',
            ].join(' ')}
          >
            {trend >= 0 ? <ArrowUp size={12} strokeWidth={2.5} /> : <ArrowDown size={12} strokeWidth={2.5} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-3xl font-bold text-text-main" style={{ letterSpacing: '-0.02em' }}>
          {value ?? '—'}
        </p>
        <p className="mt-0.5 text-sm text-text-secondary">{label}</p>
        {trendLabel && <p className="mt-1 text-xs text-text-muted">{trendLabel}</p>}
      </div>
    </div>
  )
}
