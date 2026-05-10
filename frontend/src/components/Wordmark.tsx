import { Link } from 'react-router-dom'

interface Props {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  asLink?: boolean
}

const sizeMap = {
  sm: 'text-h3',
  md: 'text-h2',
  lg: 'text-h1',
  xl: 'text-display',
}

export function Wordmark({ className = '', size = 'md', asLink = true }: Props) {
  const inner = (
    <span
      className={`font-serif font-bold ${sizeMap[size]} text-edit-ink tracking-[0.08em]
                  inline-block translate-y-px
                  ${className}`}
    >
      Racconto
    </span>
  )
  if (!asLink) return inner
  return <Link to="/" className="inline-block">{inner}</Link>
}
