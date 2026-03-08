import React, { useState, useEffect, useRef } from 'react'

/**
 * PullToRefresh component for mobile interactions.
 * Provides a circular indicator and content translation when pulling down at the top of the page.
 */
export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Ref to track touch state without triggering re-renders for every pixel
  const stateRef = useRef({
    isPulling: false,
    startY: 0,
    pullDistance: 0,
    isRefreshing: false
  })

  // Keep stateRef in sync with React state for event listeners
  useEffect(() => {
    stateRef.current.isRefreshing = isRefreshing
  }, [isRefreshing])

  useEffect(() => {
    const threshold = 80
    const resistance = 0.4
    const maxPull = 140

    const handleTouchStart = (e) => {
      // Only start pulling if at the very top and not already refreshing
      if (window.scrollY === 0 && !stateRef.current.isRefreshing) {
        stateRef.current.startY = e.touches[0].pageY
        stateRef.current.isPulling = true
      }
    }

    const handleTouchMove = (e) => {
      if (!stateRef.current.isPulling || stateRef.current.isRefreshing || window.scrollY > 0) {
        return
      }

      const currentY = e.touches[0].pageY
      const diff = currentY - stateRef.current.startY

      if (diff > 0) {
        // Prevent default browser behavior (overscroll glow/refresh) to allow custom UI
        if (e.cancelable) e.preventDefault()
        
        // Apply resistance and cap the distance
        const d = Math.min(diff * resistance, maxPull)
        stateRef.current.pullDistance = d
        setPullDistance(d)
      } else {
        // User swiped up, cancel pull
        stateRef.current.isPulling = false
        stateRef.current.pullDistance = 0
        setPullDistance(0)
      }
    }

    const handleTouchEnd = () => {
      if (!stateRef.current.isPulling || stateRef.current.isRefreshing) return

      const finalDistance = stateRef.current.pullDistance
      stateRef.current.isPulling = false

      if (finalDistance >= threshold) {
        // Trigger Refresh
        setIsRefreshing(true)
        setPullDistance(threshold)
        
        if (onRefresh) {
          onRefresh().finally(() => {
            // Small delay so user sees the "spin" complete
            setTimeout(() => {
              setIsRefreshing(false)
              setPullDistance(0)
              stateRef.current.pullDistance = 0
            }, 800)
          })
        } else {
          setIsRefreshing(false)
          setPullDistance(0)
          stateRef.current.pullDistance = 0
        }
      } else {
        // Snap back
        stateRef.current.pullDistance = 0
        setPullDistance(0)
      }
    }

    // Passive: false is required to use preventDefault in touchmove for Chrome
    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleTouchEnd)

    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [onRefresh])

  // SVG circular progress calculation
  const radius = 10
  const circumference = 2 * Math.PI * radius
  const progressRatio = Math.min(pullDistance / 80, 1)
  const dashOffset = circumference * (1 - progressRatio)

  return (
    <div className="ptr-wrapper">
      <div 
        className="ptr-indicator"
        style={{ 
          opacity: pullDistance > 15 ? 1 : 0,
          transform: `translateY(${Math.min(pullDistance, 100)}px)`
        }}
      >
        <div className={`ptr-circle ${pullDistance > 20 ? 'visible' : ''}`}>
          <svg className={`ptr-spinner ${isRefreshing ? 'refreshing' : ''}`} viewBox="0 0 24 24">
            <circle
              cx="12"
              cy="12"
              r={radius}
              strokeDasharray={circumference}
              strokeDashoffset={isRefreshing ? circumference * 0.3 : dashOffset}
            />
          </svg>
        </div>
      </div>
      <div 
        className="ptr-content"
        style={{ 
          transform: `translateY(${pullDistance}px)`,
          // Snap back animation when pull ends but transition: none during active pull
          transition: pullDistance === 0 ? 'transform 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28)' : 'none'
        }}
      >
        {children}
      </div>
    </div>
  )
}
