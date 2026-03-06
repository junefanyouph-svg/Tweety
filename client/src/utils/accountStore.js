const STORE_KEY = 'tweety_accounts'

export const getAccounts = () => {
    try {
        return JSON.parse(localStorage.getItem(STORE_KEY) || '[]')
    } catch {
        return []
    }
}

export const saveAccount = (session, profile) => {
    const accounts = getAccounts()
    const idx = accounts.findIndex(a => a.user_id === session.user.id)
    const entry = {
        user_id: session.user.id,
        username: profile?.username || session.user.user_metadata?.username || '',
        display_name: profile?.display_name || '',
        avatar_url: profile?.avatar_url || null,
        access_token: session.access_token,
        refresh_token: session.refresh_token,
    }
    if (idx >= 0) {
        accounts[idx] = entry
    } else {
        accounts.push(entry)
    }
    localStorage.setItem(STORE_KEY, JSON.stringify(accounts))
}

export const removeAccount = (user_id) => {
    const accounts = getAccounts().filter(a => a.user_id !== user_id)
    localStorage.setItem(STORE_KEY, JSON.stringify(accounts))
}

export const updateAccountTokens = (user_id, access_token, refresh_token) => {
    const accounts = getAccounts()
    const idx = accounts.findIndex(a => a.user_id === user_id)
    if (idx >= 0) {
        accounts[idx] = { ...accounts[idx], access_token, refresh_token }
        localStorage.setItem(STORE_KEY, JSON.stringify(accounts))
    }
}
