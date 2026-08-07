export default function Input({
  label,
  error,
  icon,
  className = '',
  containerClassName = '',
  ...props
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label className="text-sm font-medium text-text-main">{label}</label>
      )}
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
            {icon}
          </span>
        )}
        <input
          {...props}
          className={[
            'w-full rounded-lg border bg-card py-2.5 text-sm text-text-main placeholder-text-secondary outline-none transition',
            icon ? 'pl-10 pr-3' : 'px-3',
            error
              ? 'border-danger focus:border-danger'
              : 'border-border focus:border-primary',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
        />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
