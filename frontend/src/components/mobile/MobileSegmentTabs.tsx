import type { LucideIcon } from 'lucide-react'

interface Tab {
  key: string
  label: string
  icon?: LucideIcon
}

interface MobileSegmentTabsProps {
  tabs: Tab[]
  activeTab: string
  onChange: (key: string) => void
}

export default function MobileSegmentTabs({ tabs, activeTab, onChange }: MobileSegmentTabsProps) {
  return (
    <div
      className="flex bg-stone-100 border-b border-stone-200 shrink-0"
      style={{ position: 'sticky', top: 0, zIndex: 10 }}
    >
      {tabs.map(({ key, label, icon: Icon }) => {
        const active = key === activeTab
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 min-h-[44px] text-sm font-medium transition-colors border-b-2 ${
              active ? 'border-stone-900 text-stone-900' : 'border-transparent text-stone-400'
            }`}
          >
            {Icon && <Icon size={15} strokeWidth={1.5} />}
            {label}
          </button>
        )
      })}
    </div>
  )
}
