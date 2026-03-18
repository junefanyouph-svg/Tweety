import { useState, useEffect, useRef } from 'react'

/**
 * Custom hook to detect scroll direction
 * Returns 'up' or 'down'
 */
export function useScrollDirection() {
  const [scrollDirection, setScrollDirection] = useState('up')
  const lastScrollY = useRef(typeof window !== 'undefined' ? window.scrollY : 0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const diff = currentScrollY - lastScrollY.current
      
      // Ignore very small scrolls
      if (Math.abs(diff) < 10) return

      // Determine new direction
      const newDirection = diff > 0 ? 'down' : 'up'
      
      if (newDirection !== scrollDirection) {
        setScrollDirection(newDirection)
      }
      
      lastScrollY.current = currentScrollY > 0 ? currentScrollY : 0
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [scrollDirection])

  return scrollDirection
}
