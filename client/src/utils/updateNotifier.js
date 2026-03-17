const VERSION_POLL_INTERVAL_MS = 60 * 1000
const RELOAD_DELAY_MS = 2500

function getCurrentBuildId() {
  return import.meta.env.VITE_BUILD_ID || null
}

async function fetchLatestBuildId() {
  const response = await fetch(`/version.json?ts=${Date.now()}`, {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache'
    }
  })

  if (!response.ok) {
    throw new Error(`Version check failed with status ${response.status}`)
  }

  const data = await response.json()
  return data?.buildId || null
}

export function startUpdateNotifier() {
  if (import.meta.env.DEV || typeof window === 'undefined') {
    return () => {}
  }

  const currentBuildId = getCurrentBuildId()
  if (!currentBuildId) {
    return () => {}
  }

  let isReloading = false
  let reloadTimeoutId = null
  let toastElement = null

  const removeToast = () => {
    if (toastElement) {
      toastElement.remove()
      toastElement = null
    }
  }

  const showToast = () => {
    if (toastElement) return

    toastElement = document.createElement('div')
    toastElement.textContent = 'New version available, refreshing...'
    Object.assign(toastElement.style, {
      position: 'fixed',
      left: '50%',
      bottom: '24px',
      transform: 'translateX(-50%) translateY(10px)',
      zIndex: '999999',
      padding: '10px 16px',
      borderRadius: '999px',
      border: '1px solid rgba(0, 191, 166, 0.35)',
      background: 'rgba(15, 17, 23, 0.96)',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
      color: '#e8e8e8',
      fontSize: '0.9rem',
      fontWeight: '600',
      letterSpacing: '0.01em',
      opacity: '0',
      transition: 'opacity 0.18s ease, transform 0.18s ease'
    })

    document.body.appendChild(toastElement)
    window.requestAnimationFrame(() => {
      if (!toastElement) return
      toastElement.style.opacity = '1'
      toastElement.style.transform = 'translateX(-50%) translateY(0)'
    })
  }

  const reloadToLatest = () => {
    if (isReloading) return
    isReloading = true
    showToast()
    reloadTimeoutId = window.setTimeout(() => {
      window.location.reload()
    }, RELOAD_DELAY_MS)
  }

  const checkForUpdate = async () => {
    try {
      const latestBuildId = await fetchLatestBuildId()
      if (latestBuildId && latestBuildId !== currentBuildId) {
        console.log(`[updateNotifier] new build detected: ${latestBuildId}`)
        reloadToLatest()
      }
    } catch (error) {
      console.error('[updateNotifier] version check failed:', error)
    }
  }

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      checkForUpdate()
    }
  }

  const intervalId = window.setInterval(checkForUpdate, VERSION_POLL_INTERVAL_MS)
  window.addEventListener('focus', checkForUpdate)
  document.addEventListener('visibilitychange', handleVisibilityChange)

  checkForUpdate()

  return () => {
    window.clearInterval(intervalId)
    if (reloadTimeoutId) {
      window.clearTimeout(reloadTimeoutId)
    }
    removeToast()
    window.removeEventListener('focus', checkForUpdate)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
}
