const VERSION_POLL_INTERVAL_MS = 60 * 1000

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

  const reloadToLatest = () => {
    if (isReloading) return
    isReloading = true
    window.location.reload()
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
    window.removeEventListener('focus', checkForUpdate)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
}
