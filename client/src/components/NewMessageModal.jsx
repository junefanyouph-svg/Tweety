import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { styles } from '../styles/NewMessageModal.styles'

export default function NewMessageModal({ onClose }) {
    const [activeTab, setActiveTab] = useState('suggested')
    const [query, setQuery] = useState('')
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(false)
    const [currentUser, setCurrentUser] = useState(null)
    const navigate = useNavigate()

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => setCurrentUser(user))
    }, [])

    useEffect(() => {
        if (activeTab === 'suggested') {
            fetchSuggestedUsers()
        } else if (query.trim()) {
            const timeoutId = setTimeout(() => handleSearch(), 400)
            return () => clearTimeout(timeoutId)
        } else {
            setUsers([])
        }
    }, [activeTab, query])

    const fetchSuggestedUsers = async () => {
        setLoading(true)
        // Fetch some recent users or people you follow (placeholder: just get some random profiles)
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .limit(10)
        setUsers(data?.filter(u => u.user_id !== currentUser?.id) || [])
        setLoading(false)
    }

    const handleSearch = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .ilike('username', `%${query}%`)
            .limit(10)
        setUsers(data?.filter(u => u.user_id !== currentUser?.id) || [])
        setLoading(false)
    }

    const selectUser = (userId) => {
        navigate(`/messages/${userId}`)
        onClose()
    }

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                <header style={styles.header}>
                    <h2 style={styles.title}>New message</h2>
                    <button style={styles.closeBtn} onClick={onClose}>
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </header>

                <div style={styles.tabs}>
                    <button
                        style={{ ...styles.tab, ...(activeTab === 'suggested' ? styles.activeTab : {}) }}
                        onClick={() => setActiveTab('suggested')}
                    >
                        Suggested
                    </button>
                    <button
                        style={{ ...styles.tab, ...(activeTab === 'search' ? styles.activeTab : {}) }}
                        onClick={() => setActiveTab('search')}
                    >
                        Search
                    </button>
                </div>

                <div style={styles.content}>
                    {activeTab === 'search' && (
                        <div style={styles.searchWrapper}>
                            <input
                                style={styles.searchInput}
                                placeholder="Search people"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                autoFocus
                            />
                        </div>
                    )}

                    <div style={styles.userList}>
                        {loading ? (
                            <p style={styles.emptyText}>Loading users...</p>
                        ) : users.length === 0 ? (
                            <p style={styles.emptyText}>
                                {activeTab === 'search' ? 'No users found.' : 'No suggestions found.'}
                            </p>
                        ) : (
                            users.map(u => (
                                <div
                                    key={u.id}
                                    style={styles.userCard}
                                    onClick={() => selectUser(u.user_id)}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = styles.userCardHover.backgroundColor}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <div style={styles.avatar}>
                                        {u.avatar_url ? (
                                            <img src={u.avatar_url} style={styles.avatarImg} alt="avatar" />
                                        ) : (
                                            (u.display_name || u.username)?.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <div style={styles.userInfo}>
                                        <span style={styles.displayName}>{u.display_name || u.username}</span>
                                        <span style={styles.username}>@{u.username}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
