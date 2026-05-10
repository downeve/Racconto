import { Loader2 } from 'lucide-react'

interface Props {
  size?: number
  className?: string
}

export function Spinner({ size = 14, className = '' }: Props) {
  return (
    <Loader2
      size={size}
      strokeWidth={1.5}
      className={`animate-spin ${className}`}
    />
  )
}
