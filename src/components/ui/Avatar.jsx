const COLORS = [
  '#6366f1', '#22d3ee', '#22c55e', '#f59e0b',
  '#ef4444', '#a855f7', '#ec4899', '#14b8a6',
]

function getColor(name) {
  if (!name) return COLORS[0]
  let hash = 0
  for (const ch of name) hash = ch.charCodeAt(0) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

const sizes = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-14 w-14 text-xl',
  xl: 'h-20 w-20 text-3xl',
}

export default function Avatar({ name, size = 'md', className = '' }) {
  const initial = name ? name.charAt(0).toUpperCase() : '?'
  const bg = getColor(name)

  return (
    <div
      className={[
        'flex shrink-0 items-center justify-center rounded-full font-bold text-white',
        sizes[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ backgroundColor: bg }}
    >
      {initial}
    </div>
  )
}
