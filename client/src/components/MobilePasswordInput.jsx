import { useState, useEffect, useRef } from 'react'

/**
 * MobilePasswordInput
 * On touch devices (mobile), briefly reveals the last typed character for ~600ms
 * before masking it. On desktop, behaves like a standard password input.
 */
export default function MobilePasswordInput({ value, onChange, style, ...rest }) {
  const [isMobile, setIsMobile] = useState(false)
  const [displayValue, setDisplayValue] = useState('')
  const peekTimerRef = useRef(null)
  const prevLengthRef = useRef(value?.length || 0)

  useEffect(() => {
    // Detect touch-capable mobile device
    const checkMobile = () => {
      const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isSmallScreen = window.innerWidth < 768
      setIsMobile(hasTouchScreen && isSmallScreen)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Build displayValue whenever value or mobile status changes
  useEffect(() => {
    if (!isMobile) {
      setDisplayValue('')
      return
    }

    const len = value?.length || 0
    const prevLen = prevLengthRef.current
    prevLengthRef.current = len

    // Only peek when a character is ADDED (not deleted/pasted bulk)
    if (len > prevLen && len - prevLen === 1) {
      // Show all masked except the last char
      const masked = '•'.repeat(Math.max(0, len - 1))
      const lastChar = value.charAt(len - 1)
      setDisplayValue(masked + lastChar)

      // Clear any previous timer
      if (peekTimerRef.current) clearTimeout(peekTimerRef.current)

      // After delay, mask everything
      peekTimerRef.current = setTimeout(() => {
        setDisplayValue('•'.repeat(len))
      }, 600)
    } else {
      // Deleted or bulk change: mask everything immediately
      setDisplayValue('•'.repeat(len))
    }

    return () => {
      if (peekTimerRef.current) clearTimeout(peekTimerRef.current)
    }
  }, [value, isMobile])

  // Desktop: standard password input
  if (!isMobile) {
    return (
      <input
        type="password"
        value={value}
        onChange={onChange}
        style={style}
        {...rest}
      />
    )
  }

  // Mobile: text input with manual masking
  const handleChange = (e) => {
    const newDisplay = e.target.value
    const oldLen = value?.length || 0
    const newLen = newDisplay.length

    if (newLen > oldLen) {
      // Character(s) added — extract only the new real characters
      // The new chars are at positions that don't match the bullet mask
      let realValue = value || ''
      const addedChars = newDisplay.slice(oldLen)
      realValue += addedChars
      onChange({ target: { value: realValue } })
    } else if (newLen < oldLen) {
      // Character(s) deleted — remove from the end of the real value
      const charsRemoved = oldLen - newLen
      const realValue = (value || '').slice(0, -charsRemoved)
      onChange({ target: { value: realValue } })
    }
  }

  return (
    <input
      type="text"
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck="false"
      value={displayValue}
      onChange={handleChange}
      style={{
        ...style,
        // Prevent text-security from overriding our masking
        WebkitTextSecurity: 'none',
      }}
      {...rest}
    />
  )
}
