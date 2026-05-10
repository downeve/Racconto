import { useEffect, useState } from 'react'

export function useChromeAutoHide(timeout = 2500) {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    let t: number
    const show = () => {
      setVisible(true)
      clearTimeout(t)
      t = window.setTimeout(() => setVisible(false), timeout)
    }
    show()
    window.addEventListener('mousemove', show)
    window.addEventListener('keydown', show)
    return () => {
      window.removeEventListener('mousemove', show)
      window.removeEventListener('keydown', show)
      clearTimeout(t)
    }
  }, [timeout])
  return visible
}
