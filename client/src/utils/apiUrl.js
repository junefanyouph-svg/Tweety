const DEFAULT_API_PORT = '3001'

function isLoopbackHost(hostname) {
  return hostname === '127.0.0.1' || hostname === 'localhost'
}

function getApiBaseUrl() {
  const configuredUrl = import.meta.env.VITE_API_URL?.trim()

  if (!configuredUrl) {
    if (typeof window === 'undefined') return `http://127.0.0.1:${DEFAULT_API_PORT}`
    return `${window.location.protocol}//${window.location.hostname}:${DEFAULT_API_PORT}`
  }

  try {
    const url = new URL(configuredUrl)

    if (
      typeof window !== 'undefined' &&
      isLoopbackHost(url.hostname) &&
      !isLoopbackHost(window.location.hostname)
    ) {
      url.hostname = window.location.hostname

      if (!url.port) {
        url.port = DEFAULT_API_PORT
      }
    }

    return url.toString().replace(/\/$/, '')
  } catch {
    return configuredUrl.replace(/\/$/, '')
  }
}

export const API_URL = getApiBaseUrl()
