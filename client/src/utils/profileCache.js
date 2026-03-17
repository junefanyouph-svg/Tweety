const STORE_KEY = 'tweety_profile_cache'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

const getStore = () => {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '{}')
  } catch {
    return {}
  }
}

const saveStore = (store) => {
  localStorage.setItem(STORE_KEY, JSON.stringify(store))
}

export const getCachedProfile = (username) => {
  const store = getStore()
  return store[username] || null
}

export const setCachedProfile = (username, profile) => {
  if (!username || !profile) return
  const store = getStore()
  store[username] = { ...store[username], ...profile, _ts: Date.now() }
  saveStore(store)
}

export const getProfile = async (username, apiUrl) => {
  const store = getStore()
  const cached = store[username]

  // Use cache only if it exists, has an avatar, and hasn't expired
  if (cached && cached.avatar_url && cached._ts && (Date.now() - cached._ts < CACHE_TTL)) {
    return cached
  }

  try {
    const res = await fetch(`${apiUrl}/profiles/${username}`)
    const data = await res.json()
    if (data && !data.error) {
      store[username] = { ...data, _ts: Date.now() }
      saveStore(store)
    }
    return data
  } catch {
    // If fetch fails but we have stale cache, return it
    return cached || null
  }
}

export const invalidateProfile = (username) => {
  const store = getStore()
  delete store[username]
  saveStore(store)
}
