const variants = {
  default: { bg: 'var(--bg-hover)', text: 'var(--text-secondary)', border: 'var(--border-color)' },
  primary: {
    bg: 'var(--badge-primary-bg)',
    text: 'var(--badge-primary-text)',
    border: 'var(--badge-primary-border)',
  },
  secondary: {
    bg: 'var(--badge-secondary-bg)',
    text: 'var(--badge-secondary-text)',
    border: 'var(--badge-secondary-border)',
  },
  success: {
    bg: 'var(--badge-success-bg)',
    text: 'var(--badge-success-text)',
    border: 'var(--badge-success-border)',
  },
  warning: {
    bg: 'var(--badge-warning-bg)',
    text: 'var(--badge-warning-text)',
    border: 'var(--badge-warning-border)',
  },
  danger: {
    bg: 'var(--badge-danger-bg)',
    text: 'var(--badge-danger-text)',
    border: 'var(--badge-danger-border)',
  },
}

export default function Badge({ children, variant = 'default', className = '' }) {
  const tone = variants[variant] ?? variants.default
  return (
    <span
      className={`inline-flex items-center rounded-md border ${className}`}
      style={{
        backgroundColor: tone.bg,
        color: tone.text,
        borderColor: tone.border,
        fontSize: '0.7rem',
        fontWeight: 600,
        padding: '2px 8px',
        lineHeight: 1.5,
      }}
    >
      {children}
    </span>
  )
}
