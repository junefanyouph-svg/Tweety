import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabase'
import { styles } from '../styles/SwitchAccount.styles'
import { getAccounts, saveAccount, removeAccount } from '../utils/accountStore'
import { API_URL } from '../utils/apiUrl'

export default function SwitchAccount() {
    const [accounts, setAccounts] = useState([])
    const [currentUserId, setCurrentUserId] = useState(null)
    const [notification, setNotification] = useState('')
    const [switching, setSwitching] = useState(false)
    const [accountToRemove, setAccountToRemove] = useState(null)
    const navigate = useNavigate()

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { navigate('/'); return }
            setCurrentUserId(user.id)

            // Sync current session tokens into store
            const { data: { session } } = await supabase.auth.getSession()
            if (session) {
                // Fetch the profile to keep display_name/avatar up to date
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('username, display_name, avatar_url')
                    .eq('user_id', user.id)
                    .single()
                saveAccount(session, profile)
            }

            setAccounts(getAccounts())
        }
        init()
    }, [])

    const handleSwitch = async (account) => {
        if (account.user_id === currentUserId) {
            navigate('/feed')
            return
        }

        setSwitching(true)
        try {
            const { data, error } = await supabase.auth.setSession({
                access_token: account.access_token,
                refresh_token: account.refresh_token,
            })

            if (error || !data.session) {
                // Token expired — remove from store and prompt re-login
                removeAccount(account.user_id)
                setAccounts(getAccounts())
                setSwitching(false)
                alert(`Session for @${account.username} has expired. Please add the account again.`)
                return
            }

            // Update stored tokens (may have been refreshed)
            saveAccount(data.session, {
                username: account.username,
                display_name: account.display_name,
                avatar_url: account.avatar_url,
            })

            navigate('/feed')
        } catch {
            setSwitching(false)
        }
    }

    const showNotification = (msg) => {
        setNotification(msg)
        setTimeout(() => setNotification(''), 2000)
    }

    const handleLogoutClick = (account) => {
        setAccountToRemove(account)
    }

    const confirmRemove = async () => {
        if (!accountToRemove) return

        const account = accountToRemove
        const isCurrent = account.user_id === currentUserId

        removeAccount(account.user_id)
        const remaining = getAccounts()
        setAccounts(remaining)

        if (isCurrent) {
            await supabase.auth.signOut()
            setCurrentUserId(null)
        }

        setAccountToRemove(null)
        showNotification('Account removed')

        if (remaining.length === 0) {
            setTimeout(() => navigate('/'), 1500)
        }
    }

    const handleAddAccount = async () => {
        setSwitching(true)
        await supabase.auth.signOut()
        navigate('/')
    }

    return (
        <div style={styles.container}>
            {/* Back Button */}
            {currentUserId && (
                <button style={styles.backBtn} onClick={() => navigate('/feed')}>
                    <i className="fa-solid fa-arrow-left"></i> Back to Feed
                </button>
            )}

            {notification && (
                <div style={styles.notification}>
                    {notification}
                </div>
            )}

            {/* Confirmation Modal */}
            {accountToRemove && (
                <div style={styles.modalOverlay} onClick={() => setAccountToRemove(null)}>
                    <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <h3 style={styles.modalTitle}>Remove Account?</h3>
                        <p style={styles.modalText}>
                            Are you sure you want to remove @{accountToRemove.username} from this device?
                            You'll need to sign in again to use this account.
                        </p>
                        <div style={styles.modalActions}>
                            <button style={styles.cancelBtn} onClick={() => setAccountToRemove(null)}>
                                Cancel
                            </button>
                            <button style={styles.confirmBtn} onClick={confirmRemove}>
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes fadeInDown { 
                    from { opacity: 0; transform: translate(-50%, -20px); } 
                    to { opacity: 1; transform: translate(-50%, 0); } 
                }
            `}</style>

            {switching && (
                <div style={styles.switchingOverlay}>
                    <i className="fa-solid fa-rotate" style={{ color: '#00BFA6', fontSize: '2rem', animation: 'spin 1s linear infinite' }} />
                    <span style={styles.switchingText}>Preparing...</span>
                </div>
            )}

            <div style={styles.content}>
                <div style={styles.header}>
                    <span style={styles.logo}>🐦</span>
                    <h2 style={styles.title}>Switch Account</h2>
                </div>

                {accounts.length > 0 ? (
                    <div style={{ marginBottom: '20px' }}>
                        {accounts.map(account => {
                            const isActive = account.user_id === currentUserId
                            return (
                                <div
                                    key={account.user_id}
                                    style={{ ...styles.accountCard, ...(isActive ? styles.activeCard : {}) }}
                                    onClick={() => handleSwitch(account)}
                                >
                                    {account.avatar_url
                                        ? <img src={account.avatar_url} style={styles.avatarImg} alt="avatar" />
                                        : <div style={styles.avatar}>{(account.display_name || account.username)?.charAt(0).toUpperCase()}</div>
                                    }

                                    <div style={styles.accountInfo}>
                                        <div style={styles.displayName}>{account.display_name || account.username}</div>
                                        <div style={styles.username}>@{account.username}</div>
                                    </div>

                                    <div style={styles.cardActions}>
                                        {isActive && <span style={styles.activeBadge}>Active</span>}
                                        <button
                                            style={styles.logoutBtn}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleLogoutClick(account);
                                            }}
                                            title="Remove account"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', color: '#888', marginBottom: '20px', fontSize: '0.9rem' }}>
                        No accounts saved yet.
                    </div>
                )}

                <div style={styles.addAccount} onClick={handleAddAccount}>
                    <i className="fa-solid fa-plus" />
                    Add an existing account
                </div>
            </div>
        </div>
    )
}
