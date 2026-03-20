import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { styles } from '../styles/Messages.styles'
import NewMessageModal from '../components/NewMessageModal'
import { API_URL } from '../utils/apiUrl'
import { mergeCachedProfile, setCachedProfile } from '../utils/profileCache'
import { SkeletonScrollLocker } from '../components/Skeleton'

export default function DirectMessages() {
    const [conversations, setConversations] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [currentUser, setCurrentUser] = useState(null)
    const navigate = useNavigate()

    useEffect(() => {
        let channel;
        let isMounted = true;
        const handleProfileUpdated = (e) => {
            const detail = e.detail
            if (!detail?.user_id) return
            setConversations(prev => prev.map(conv => {
                if (conv.id !== detail.user_id) return conv
                const nextConv = { ...conv, ...detail, display_name: detail.display_name || conv.display_name }
                if (nextConv.username) {
                    setCachedProfile(nextConv.username, nextConv)
                }
                return nextConv
            }))
        }
        window.addEventListener('tweety_profile_updated', handleProfileUpdated)

        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!isMounted) return
            setCurrentUser(user)

            if (user) {
                fetchConversations(user)

                channel = supabase
                    .channel(`dm-inbox-${Math.random()}`)
                    .on('postgres_changes', {
                        event: '*',
                        schema: 'public',
                        table: 'messages',
                    }, (payload) => {
                        if (isMounted) fetchConversations(user, true);
                    })
                    .subscribe();

                // Real-time listener for current user's profile
                const profileChannel = supabase
                    .channel(`dm-inbox-profile-${user.id}`)
                    .on('postgres_changes', {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'profiles',
                        filter: `user_id=eq.${user.id}`
                    }, (payload) => {
                        if (isMounted) setCurrentUser(prev => ({ ...prev, ...payload.new }));
                    })
                    .subscribe()

                return () => {
                    isMounted = false;
                    if (channel) supabase.removeChannel(channel);
                    if (profileChannel) supabase.removeChannel(profileChannel);
                }
            }
        }

        init()

        return () => {
            isMounted = false;
            if (channel) supabase.removeChannel(channel);
            window.removeEventListener('tweety_profile_updated', handleProfileUpdated)
        }
    }, [navigate])

    const fetchConversations = async (user, silent = false) => {
        if (!silent) setLoading(true)
        const { data, error } = await supabase
            .from('messages')
            .select(`
                *,
                sender:profiles!messages_sender_id_fkey(*),
                recipient:profiles!messages_recipient_id_fkey(*)
            `)
            .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching messages:', error)
            setLoading(false)
            return
        }

        const convMap = new Map()
        data.forEach(msg => {
            const isMeSender = msg.sender_id === user.id
            const otherPart = mergeCachedProfile(isMeSender ? msg.recipient : msg.sender)

            // It's possible for profile data to be missing if not yet synced
            if (!otherPart) return

            const otherId = otherPart.user_id

            // Skip if this message is deleted for me
            const isDeletedForMe = isMeSender ? msg.deleted_by_sender : msg.deleted_by_recipient
            if (isDeletedForMe) return

            if (!convMap.has(otherId)) {
                if (otherPart.username) {
                    setCachedProfile(otherPart.username, otherPart)
                }
                convMap.set(otherId, {
                    id: otherId,
                    display_name: otherPart.display_name || otherPart.username,
                    username: otherPart.username,
                    avatar_url: otherPart.avatar_url,
                    last_message: msg.content,
                    last_message_at: msg.created_at,
                    unread: !msg.read && msg.recipient_id === user.id
                })
            }
        })

        setConversations(Array.from(convMap.values()))
        setLoading(false)
    }

    return (
        <div style={styles.container}>
            <style>{`
                @keyframes dm-skeleton {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            `}</style>
            <header style={styles.header}>
                <h2 style={styles.title}>Messages</h2>
                <button
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#00BFA6', fontSize: '1.2rem', cursor: 'pointer' }}
                    onClick={() => setShowModal(true)}
                >
                    <span className="material-symbols-outlined filled">mark_email_read</span>
                </button>
            </header>

            {loading ? (
                <div style={styles.skeletonList}>
                    <SkeletonScrollLocker />
                    {Array(15).fill(0).map((_, i) => (
                        <div key={i} style={styles.skeletonRow}>
                            <div style={styles.skeletonAvatar} />
                            <div style={styles.skeletonInfo}>
                                <div style={styles.skeletonLineShort} />
                                <div style={styles.skeletonLineFull} />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
            <div style={styles.list}>
                {conversations.length === 0 ? (
                    <div style={styles.emptyState}>
                        <span className="material-symbols-outlined filled" style={styles.emptyIcon}>drafts</span>
                        <h3 style={{ color: '#e8e8e8', fontSize: '1.2rem', fontWeight: 'bold' }}>Welcome to your inbox!</h3>
                        <p style={styles.emptyText}>Drop a line, share a message, and more with private conversations between you and others on Jargon.</p>
                        <button
                            onClick={() => setShowModal(true)}
                            style={{
                                marginTop: '16px',
                                padding: '12px 24px',
                                backgroundColor: '#00BFA6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '24px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            Write a message
                        </button>
                    </div>
                ) : (
                    conversations.map(conv => (
                        <div
                            key={conv.id}
                            style={{
                                ...styles.conversation,
                                ...(conv.unread ? styles.unread : {})
                            }}
                            onClick={() => navigate(`/messages/${conv.id}`)}
                        >
                            <div style={styles.avatar}>
                                {conv.avatar_url ? (
                                    <img src={conv.avatar_url} style={styles.avatarImg} alt="avatar" />
                                ) : (
                                    conv.display_name?.charAt(0).toUpperCase()
                                )}
                            </div>
                            <div style={styles.info}>
                                <div style={styles.nameHeader}>
                                    <span style={styles.displayName}>{conv.display_name}</span>
                                    <span style={styles.date}>{new Date(conv.last_message_at).toLocaleDateString()}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <p style={styles.lastMessage}>{conv.last_message}</p>
                                    {conv.unread && <div style={styles.unreadBadge}></div>}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
            )}

            {showModal && <NewMessageModal onClose={() => setShowModal(false)} />}
        </div>
    )
}
