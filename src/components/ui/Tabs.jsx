import { useState } from 'react'

export default function Tabs({ tabs, defaultTab }) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.key)
  const current = tabs.find((t) => t.key === active)

  return (
    <div>
      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={[
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all',
              active === tab.key
                ? 'border-b-2 border-primary text-primary'
                : 'text-text-secondary hover:text-text-main',
            ].join(' ')}
          >
            {tab.icon && <span>{tab.icon}</span>}
            {tab.label}
            {tab.badge != null && tab.badge > 0 && (
              <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-xs font-bold text-primary">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="mt-4 animate-fade-in">{current?.content}</div>
    </div>
  )
}
