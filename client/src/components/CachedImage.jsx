import { useEffect, useState } from 'react'
import { getCachedMediaObjectUrl } from '../utils/mediaCache'

export default function CachedImage({ src, fallbackSrc, ...props }) {
  const [resolvedSrc, setResolvedSrc] = useState(fallbackSrc || src || '')

  useEffect(() => {
    let active = true

    if (!src) {
      return () => {
        active = false
      }
    }

    getCachedMediaObjectUrl(src).then(cachedSrc => {
      if (!active || !cachedSrc) return
      setResolvedSrc(cachedSrc)
    })

    return () => {
      active = false
    }
  }, [src])

  const displaySrc = src ? (resolvedSrc || fallbackSrc || src) : ''

  return <img {...props} src={displaySrc} />
}
