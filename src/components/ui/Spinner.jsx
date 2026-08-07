export default function Spinner({ size = 'md', className = '' }) {
  const s = size === 'sm' ? 'h-4 w-4 border-2' : size === 'lg' ? 'h-10 w-10 border-4' : 'h-6 w-6 border-2'
  return (
    <div
      className={[
        'animate-spin rounded-full border-border border-t-primary',
        s,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    />
  )
}
