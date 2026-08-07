import { Inbox } from 'lucide-react'

export default function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Icon size={28} strokeWidth={1.75} className="text-primary" />
      </div>
      {title && <h3 className="text-lg font-semibold text-text-main">{title}</h3>}
      {description && <p className="max-w-sm text-sm text-text-secondary">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
