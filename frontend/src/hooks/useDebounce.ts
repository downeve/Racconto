import { useEffect, useState } from 'react'

/**
 * value 가 delay(ms) 동안 변하지 않으면 그 값을 반환. 검색 입력 throttle 용도.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])

  return debounced
}
