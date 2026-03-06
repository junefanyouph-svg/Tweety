const STORE_KEY = 'tweety_general_cache'

const getStore = () => {
  try {
    return JSON.parse(sessionStorage.getItem(STORE_KEY) || '{}')
  } catch {
    return {}
  }
}

export const setCache = (key, data) => {
  const store = getStore()
  store[key] = { data, timestamp: Date.now() }
  sessionStorage.setItem(STORE_KEY, JSON.stringify(store))
}

export const getCache = (key, maxAgeMs = 30000) => {
  const store = getStore()
  const entry = store[key]
  if (!entry) return null
  if (Date.now() - entry.timestamp > maxAgeMs) return null
  return entry.data
}

export const invalidateCache = (key) => {
  const store = getStore()
  delete store[key]
  sessionStorage.setItem(STORE_KEY, JSON.stringify(store))
}

export const invalidatePattern = (pattern) => {
  const store = getStore()
  Object.keys(store).forEach(key => {
    if (key.includes(pattern)) delete store[key]
  })
  sessionStorage.setItem(STORE_KEY, JSON.stringify(store))
}