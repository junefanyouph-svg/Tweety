import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { styles } from '../styles/Notifications.styles'
import PullToRefresh from '../components/PullToRefresh'
import { API_URL } from '../utils/apiUrl'
import { mergeCachedProfiles, setCachedProfile } from '../utils/profileCache'

import { SkeletonScrollLocker } from '../components/Skeleton'

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deletingIds, setDeletingIds] = useState(new Set())
  const navigate = useNavigate()

  useEffect(() => {
    let channel;
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/'); return }
      setUser(user)
      await fetchNotifications(user.id)
      await markAllRead(user.id)

      // Real-time listener
      channel = supabase
        .channel(`notifications-channel-${Math.random()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
          fetchNotifications(user.id)
        })
        .subscribe()
    }
    init()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    const handleProfileUpdated = (e) => {
      const detail = e.detail
      if (!detail?.user_id) return
      setNotifications(prev => prev.map(notification => {
        if (notification.sender_id !== detail.user_id) return notification
        const nextProfile = { ...(notification.sender_profile || {}), ...detail }
        if (nextProfile.username) {
          setCachedProfile(nextProfile.username, nextProfile)
        }
        return {
          ...notification,
          sender_profile: nextProfile
        }
      }))
    }

    window.addEventListener('tweety_profile_updated', handleProfileUpdated)
    return () => window.removeEventListener('tweety_profile_updated', handleProfileUpdated)
  }, [])

  const fetchNotifications = async (user_id) => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', user_id)
      .order('created_at', { ascending: false })

    let enriched = data || []

    if (enriched.length > 0) {
      const senderIds = Array.from(new Set(enriched.map(n => n.sender_id).filter(Boolean)))

      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, avatar_url, display_name, username')
          .in('user_id', senderIds)

        const mergedProfiles = mergeCachedProfiles(profiles || [])
        const profileMap = new Map()
          ; mergedProfiles.forEach(p => {
            profileMap.set(p.user_id, p)
            if (p.username) {
              setCachedProfile(p.username, p)
            }
          })

        enriched = enriched.map(n => ({
          ...n,
          sender_profile: profileMap.get(n.sender_id) || null
        }))
      }
    }

    setNotifications(enriched)
    setLoading(false)
  }

  const markAllRead = async (user_id) => {
    await fetch(`${API_URL}/notifications/read/${user_id}`, { method: 'PATCH' })
  }

  const handleDelete = async (id) => {
    setDeletingIds(prev => new Set(prev).add(id))
    try {
      await fetch(`${API_URL}/notifications/${id}`, { method: 'DELETE' })
      setNotifications(prev => prev.filter(n => n.id !== id))
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const getNotificationText = (n) => {
    switch (n.type) {
      case 'like': return 'liked your post'
      case 'comment': return 'commented on your post'
      case 'follow': return 'followed you'
      case 'mention': return 'tagged you in a post'
      case 'comment_mention': return 'tagged you in a comment'
      default: return 'tagged you in a post'
    }
  }

  const getNotificationIcon = (type) => {
    const isMention = type === 'mention' || type === 'comment_mention'
    const iconStyle = { fontSize: isMention ? '15px' : '12px' }
    
    switch (type) {
      case 'like': return <span className="material-symbols-outlined filled" style={iconStyle}>favorite</span>
      case 'comment': return <span className="material-symbols-outlined filled" style={iconStyle}>chat_bubble</span>
      case 'follow': return <span className="material-symbols-outlined filled" style={iconStyle}>person_add</span>
      case 'mention': return <span className="material-symbols-outlined filled" style={iconStyle}>alternate_email</span>
      case 'comment_mention': return <span className="material-symbols-outlined filled" style={iconStyle}>alternate_email</span>
      default: return <span className="material-symbols-outlined filled" style={iconStyle}>notifications</span>
    }
  }

  const getNotificationAccent = (type) => {
    switch (type) {
      case 'like': return { backgroundColor: '#e0245e' }
      case 'comment': return { backgroundColor: '#00BFA6' }
      case 'follow': return { backgroundColor: '#8B5CF6' }
      case 'mention': return { backgroundColor: '#1d9bf0' }
      case 'comment_mention': return { backgroundColor: '#1d9bf0' }
      default: return { backgroundColor: '#00BFA6' }
    }
  }

  const handleRefresh = async () => {
    if (user) {
      await fetchNotifications(user.id)
      await markAllRead(user.id)
    }
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div style={styles.container}>
      <style>{`
        @keyframes notif-skeleton {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <div style={styles.header}>
        <h2 style={styles.title}>Notifications</h2>
        {notifications.length > 0 && (
          <span style={styles.count}>{notifications.length}</span>
        )}
      </div>

      {loading ? (
        <div style={styles.skeletonList}>
          <SkeletonScrollLocker />
          {Array(15).fill(0).map((_, i) => (
            <div key={i} style={styles.skeletonRow}>
              <div style={styles.skeletonIcon} />
              <div style={styles.skeletonInfo}>
                <div style={styles.skeletonLineUser} />
                <div style={styles.skeletonLineText} />
                <div style={styles.skeletonLineMeta} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.list}>
          {notifications.length === 0 && (
            <div style={styles.emptyState}>
              <span className="material-symbols-outlined" style={styles.emptyIcon}>notifications</span>
              <p style={styles.emptyText}>No notifications yet</p>
            </div>
          )}
          {notifications.map(n => (
            <div key={n.id} style={{ ...styles.notification, ...(n.read ? {} : styles.unread) }}>
              <div style={styles.left}>
                <div style={styles.avatarWrapper}>
                  <div style={styles.avatarCircle}>
                    {n.sender_profile?.avatar_url ? (
                      <img
                        src={n.sender_profile.avatar_url}
                        alt="avatar"
                        style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      (n.sender_profile?.display_name || n.sender_username || '?').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div style={{ ...styles.typeIcon, ...getNotificationAccent(n.type) }}>
                    {getNotificationIcon(n.type)}
                  </div>
                </div>
              </div>
              <div style={styles.notifInfo} onClick={() => {
                if (n.post_id) {
                  const hash = n.comment_id ? `#comment-${n.comment_id}` : ''
                  navigate(`/post/${n.post_id}${hash}`)
                } else {
                  navigate(`/profile/${n.sender_username}`)
                }
              }}>
                <div style={styles.notifLine}>
                  <span style={styles.sender}>{n.sender_profile?.display_name || n.sender_username}</span>
                  <span style={styles.notifText}>{getNotificationText(n)}</span>
                </div>
                <span style={styles.notifDate}>
                  {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {' · '}
                  {new Date(n.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <button 
                style={{ ...styles.deleteBtn, opacity: deletingIds.has(n.id) ? 0.5 : 1, cursor: deletingIds.has(n.id) ? 'not-allowed' : 'pointer', pointerEvents: deletingIds.has(n.id) ? 'none' : 'auto' }} 
                onClick={() => handleDelete(n.id)}
                disabled={deletingIds.has(n.id)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
    </PullToRefresh>
  )
}
