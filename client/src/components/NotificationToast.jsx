import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function NotificationToast() {
  const [toasts, setToasts] = useState([])
  const [user, setUser] = useState(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const navigate = useNavigate()

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`notification-toast-${Math.random()}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${user.id}`
      }, (payload) => {
        const notif = payload.new
        if (notif.sender_id === user.id) return // Don't show your own actions
        addToast(notif)
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

  const addToast = (notif) => {
    const id = Date.now()
    setToasts(prev => [...prev, { ...notif, toastId: id }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.toastId !== id))
    }, 4000)
  }

  const removeToast = (toastId) => {
    setToasts(prev => prev.filter(t => t.toastId !== toastId))
  }

  const getIcon = (type) => {
    switch (type) {
      case 'like': return <i className="fa-solid fa-heart" style={{ color: '#e0245e' }}></i>
      case 'comment': return <i className="fa-solid fa-comment" style={{ color: '#00BFA6' }}></i>
      case 'follow': return <i className="fa-solid fa-user-plus" style={{ color: '#8B5CF6' }}></i>
      case 'mention': return <i className="fa-solid fa-at" style={{ color: '#1d9bf0' }}></i>
      case 'comment_mention': return <i className="fa-solid fa-at" style={{ color: '#1d9bf0' }}></i>
      default: return <i className="fa-solid fa-bell" style={{ color: '#00BFA6' }}></i>
    }
  }

  const getText = (type) => {
    switch (type) {
      case 'like': return 'liked your post'
      case 'comment': return 'commented on your post'
      case 'follow': return 'followed you'
      case 'mention': return 'tagged you in a post'
      case 'comment_mention': return 'tagged you in a comment'
      default: return 'interacted with you'
    }
  }

  const handleClick = (toast) => {
    if (toast.post_id) {
      navigate(`/post/${toast.post_id}`)
    } else {
      navigate(`/profile/${toast.sender_username}`)
    }
    removeToast(toast.toastId)
  }

  if (toasts.length === 0) return null

  return (
    <div style={isMobile ? toastStyles.containerMobile : toastStyles.containerDesktop}>
      {toasts.map(toast => (
        <div
          key={toast.toastId}
          style={isMobile ? toastStyles.toastMobile : toastStyles.toastDesktop}
          onClick={() => handleClick(toast)}
        >
          <div style={toastStyles.iconWrapper}>
            {getIcon(toast.type)}
          </div>
          <div style={toastStyles.content}>
            <p style={toastStyles.text}>
              <span style={toastStyles.sender}>@{toast.sender_username}</span>
              {' '}{getText(toast.type)}
            </p>
          </div>
          <button
            style={toastStyles.closeBtn}
            onClick={(e) => { e.stopPropagation(); removeToast(toast.toastId) }}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>

          {/* Progress bar */}
          <div style={toastStyles.progressBar}>
            <div style={toastStyles.progress}></div>
          </div>
        </div>
      ))}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideInTop {
          from { transform: translateY(-120%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
        .toast-desktop {
          animation: slideInRight 0.3s ease;
        }
        .toast-mobile {
          animation: slideInTop 0.3s ease;
        }
        .progress {
          animation: shrink 4s linear forwards;
        }
      `}</style>
    </div>
  )
}

const toastStyles = {
  containerDesktop: { position: 'fixed', bottom: '24px', right: '24px', zIndex: 99999, display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '320px' },
  containerMobile: { position: 'fixed', top: '0', left: '0', right: '0', zIndex: 99999, display: 'flex', flexDirection: 'column', gap: '0' },
  toastDesktop: { backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border-dark)', borderRadius: '16px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', animation: 'slideInRight 0.3s ease', position: 'relative', overflow: 'hidden', width: '300px' },
  toastMobile: { backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border-dark)', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.4)', animation: 'slideInTop 0.3s ease', position: 'relative', overflow: 'hidden' },
  iconWrapper: { width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--color-bg-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--color-border-dark)' },
  content: { flex: 1 },
  text: { fontSize: '0.9rem', color: 'var(--color-text-main)', lineHeight: '1.4' },
  sender: { fontWeight: 'bold', color: '#00BFA6' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-dim)', fontSize: '0.85rem', padding: '4px', flexShrink: 0 },
  progressBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', backgroundColor: 'var(--color-border-dark)' },
  progress: { height: '100%', backgroundColor: '#00BFA6', animation: 'shrink 4s linear forwards' },
}