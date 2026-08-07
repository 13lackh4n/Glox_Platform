const variants = {
  primary: 'bg-primary text-white hover:bg-primary-hover active:scale-[0.98]',
  secondary:
    'bg-transparent border border-border text-text-secondary hover:bg-hover hover:text-text-main active:scale-[0.98]',
  danger:
    'bg-transparent border border-danger text-danger hover:bg-danger hover:text-white active:scale-[0.98]',
  ghost: 'text-text-secondary hover:text-text-main hover:bg-hover active:scale-[0.98]',
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
