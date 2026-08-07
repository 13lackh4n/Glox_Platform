export default function Card({ children, className = '', hover = false, padding = true }) {
  return (
    <div
      className={[
        'rounded-xl border border-border bg-card',
        padding && 'p-6',
        hover && 'transition-all duration-200 hover:border-primary/50 hover:shadow-lg hover:scale-[1.01]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}

Card.Header = function CardHeader({ children, className = '' }) {
  return (
    <div className={`mb-4 flex items-center justify-between ${className}`}>{children}</div>
  )
}

Card.Title = function CardTitle({ children, className = '' }) {
  return <h3 className={`text-lg font-semibold text-text-main ${className}`}>{children}</h3>
}

Card.Footer = function CardFooter({ children, className = '' }) {
  return (
    <div className={`mt-4 border-t border-border pt-4 ${className}`}>{children}</div>
  )
}
