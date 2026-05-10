import { Link } from 'react-router-dom'

interface Props {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  tone?: 'on-paper' | 'on-ink'
  asLink?: boolean
}

const sizeMap = {
  sm: 'text-body',
  md: 'text-h3',
  lg: 'text-h2',
}

const toneMap = {
  'on-paper': 'text-edit-ink',
  'on-ink': 'text-hair',
}

export function Wordmark({ className = '', size = 'md', tone = 'on-paper', asLink = true }: Props) {
  const inner = (
    <span
      className={`font-serif font-bold ${sizeMap[size]} ${toneMap[tone]} tracking-[0.08em]
                  inline-block translate-y-px
                  ${className}`}
    >
      Racconto
    </span>
  )
  if (!asLink) return inner
  return <Link to="/" className="inline-block">{inner}</Link>
}
