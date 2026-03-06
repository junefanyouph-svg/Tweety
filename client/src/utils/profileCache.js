const STORE_KEY = 'tweety_profile_cache'

const getStore = () => {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '{}')
  } catch {
    return {}
  }
}

export const getProfile = async (username, apiUrl) => {
  const store = getStore()
  if (store[username]) return store[username]

  try {
    const res = await fetch(`${apiUrl}/profiles/${username}`)
    const data = await res.json()
    if (data && !data.error) {
      store[username] = data
      localStorage.setItem(STORE_KEY, JSON.stringify(store))
    }
    return data
  } catch {
    return null
  }
}

export const invalidateProfile = (username) => {
  const store = getStore()
  delete store[username]
  localStorage.setItem(STORE_KEY, JSON.stringify(store))
}