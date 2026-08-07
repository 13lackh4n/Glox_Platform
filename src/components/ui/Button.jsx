const variants = {
  primary: 'bg-primary text-white hover:opacity-90 active:scale-95',
  secondary: 'bg-card text-text-main border border-border hover:bg-hover active:scale-95',
  danger: 'bg-danger text-white hover:opacity-90 active:scale-95',
  ghost: 'text-text-secondary hover:text-text-main hover:bg-hover active:scale-95',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  ...props
}) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150',
        variants[variant],
        sizes[size],
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </button>
  )
}
