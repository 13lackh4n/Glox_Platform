export default function Card({ children, className = '', hover = false, padding = true }) {
  return (
    <div
      className={[
        'card-surface',
        hover && 'card-hoverable',
        padding && 'p-6',
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
  return (
    <h3
      className={`text-lg font-semibold text-text-main ${className}`}
      style={{ letterSpacing: '-0.02em' }}
    >
      {children}
    </h3>
  )
}

Card.Footer = function CardFooter({ children, className = '' }) {
  return (
    <div className={`mt-4 border-t border-border pt-4 ${className}`}>{children}</div>
  )
}
