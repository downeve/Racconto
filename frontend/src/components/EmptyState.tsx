import type { ReactNode } from 'react'

interface EmptyStateProps {
  heading: string
  body?: string
  cta?: ReactNode
  darkMode?: boolean
}

export default function EmptyState({ heading, body, cta, darkMode }: EmptyStateProps) {
  const textClass = darkMode ? 'text-stone-400' : 'text-muted'
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-center max-w-md mx-auto">
      <p className={`text-h3 font-serif [word-break:keep-all] ${textClass}`}>{heading}</p>
      {body && <p className={`text-small [word-break:keep-all] ${textClass}`}>{body}</p>}
      {cta}
    </div>
  )
}
