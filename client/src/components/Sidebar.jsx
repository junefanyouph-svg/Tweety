import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabase'

export default function Sidebar() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [showMenu, setShowMenu] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [unreadMsgCount, setUnreadMsgCount] = useState(0)
  const menuRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()

  const [isLightMode, setIsLightMode] = useState(() => {
    return localStorage.getItem('theme') === 'light'
  })

  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add('light-mode')
      localStorage.setItem('theme', 'light')
    } else {
      document.documentElement.classList.remove('light-mode')
      localStorage.setItem('theme', 'dark')
    }
  }, [isLightMode])

  useEffect(() => {
    let channel;
    const handleProfileUpdate = () => { if (user) fetchProfile(user); };
    window.addEventListener('tweety_profile_updated', handleProfileUpdate);

    const init = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        setUser(authUser)
        fetchProfile(authUser)

        // Listen for profile changes in real-time
        channel = supabase
          .channel(`sidebar-profile-${authUser.id}-${Math.random()}`)
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `user_id=eq.${authUser.id}`
          }, (payload) => {
            console.log('Sidebar Realtime Update:', payload.new)
            setProfile(payload.new)
          })
          .subscribe()
      }
    }
    init()
    return () => {
      if (channel) supabase.removeChannel(channel)
      window.removeEventListener('tweety_profile_updated', handleProfileUpdate);
    }
  }, [user?.id])

  const fetchProfile = async (user) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
    setProfile(data)
  }

  useEffect(() => {
    if (!user) return
    fetchUnreadCount()
    fetchUnreadMsgCount()

    const notifChannel = supabase
      .channel(`sidebar-notifications-${Math.random()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        fetchUnreadCount()
      })
      .subscribe()

    const msgChannel = supabase
      .channel(`sidebar-messages-${Math.random()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        fetchUnreadMsgCount()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(notifChannel)
      supabase.removeChannel(msgChannel)
    }
  }, [user])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchUnreadCount = async () => {
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact' })
      .eq('recipient_id', user.id)
      .eq('read', false)
    setUnreadCount(count || 0)
  }

  const fetchUnreadMsgCount = async () => {
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .eq('recipient_id', user.id)
      .eq('read', false)
    setUnreadMsgCount(count || 0)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const username = user?.user_metadata?.username
  const isActive = (path) => location.pathname === path

  const navItems = [
    { icon: 'fa-solid fa-house', label: 'Home', path: '/feed' },
    { icon: 'fa-solid fa-magnifying-glass', label: 'Search', path: '/search' },
    { icon: 'fa-solid fa-bell', label: 'Notifications', path: '/notifications', badge: unreadCount },
    { icon: 'fa-solid fa-envelope', label: 'Messages', path: '/messages', badge: unreadMsgCount },
    { icon: 'fa-solid fa-user', label: 'Profile', path: `/profile/${username}` },
  ]

  const toggleTheme = async (e) => {
    const nextMode = !isLightMode;

    if (
      !document.startViewTransition ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setIsLightMode(nextMode);
      return;
    }

    const transition = document.startViewTransition(() => {
      setIsLightMode(nextMode);
    });

    await transition.ready;

    const x = nextMode ? window.innerWidth : 0;
    const y = nextMode ? 0 : window.innerHeight;
    const endRadius = Math.hypot(window.innerWidth, window.innerHeight);

    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${endRadius}px at ${x}px ${y}px)`
        ]
      },
      {
        duration: 500,
        easing: 'ease-in-out',
        pseudoElement: '::view-transition-new(root)'
      }
    );
  };

  return (
    <div className="w-[260px] h-screen bg-bg-dark border-r border-border-dark flex flex-col p-6 px-4 fixed left-0 top-0 z-[100] max-md:hidden">
      <div className="flex items-center gap-3 mb-8 px-3 cursor-pointer" onClick={() => navigate('/feed')}>
        <div 
          className="w-8 h-8 bg-primary" 
          style={{ 
            maskImage: "url('/Jargon_icon.svg')", 
            WebkitMaskImage: "url('/Jargon_icon.svg')",
            maskSize: 'contain',
            WebkitMaskSize: 'contain',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat'
          }} 
        />
        <span className="text-[1.5rem] font-bold text-primary">Jargon</span>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map(item => (
          <button
            key={item.path}
            className={`flex items-center gap-3.5 p-3 px-4 rounded-xl border-none text-base cursor-pointer text-left transition-all active:scale-95 ${isActive(item.path) ? 'bg-primary/10 text-primary font-bold shadow-sm' : 'bg-transparent text-text-dim hover:bg-white/5'}`}
            onClick={() => {
              if (item.path === '/feed' && location.pathname === '/feed') {
                window.scrollTo({ top: 0, behavior: 'smooth' })
              } else {
                navigate(item.path)
              }
            }}
          >
            <i className={`${item.icon} w-5 text-center text-[1.1rem]`}></i>
            <span className="text-base">{item.label}</span>
            {item.badge > 0 && (
              <span className="ml-auto bg-primary text-white rounded-full px-1.5 py-0 min-w-[20px] h-5 flex items-center justify-center text-[0.75rem] font-bold shadow-lg animate-pulse">{item.badge}</span>
            )}
          </button>
        ))}
        
        <button
          className="mt-2 flex items-center justify-center gap-2 p-3.5 px-6 rounded-full bg-primary text-white border-none font-bold text-[1.05rem] cursor-pointer shadow-[0_4px_14px_rgba(0,191,166,0.35)] hover:scale-105 active:scale-95 transition-all w-full"
          onClick={() => window.dispatchEvent(new CustomEvent('openCompose'))}
        >
          <i className="fa-solid fa-feather"></i>
          <span className="hidden xl:inline">Compose</span>
        </button>
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-surface border border-border-dark text-text-main hover:bg-white/5 transition-colors shadow-sm cursor-pointer ml-1"
          title="Toggle Light/Dark Mode"
        >
          {isLightMode ? <i className="fa-solid fa-moon text-indigo-500"></i> : <i className="fa-solid fa-sun text-yellow-500"></i>}
        </button>

        {user && profile && (
          <div className="relative w-full" ref={menuRef}>
            {showMenu && (
              <div className="absolute bottom-[calc(100%+10px)] left-0 right-0 bg-surface border border-border-dark rounded-xl p-1.5 shadow-[0_-8px_24px_rgba(0,0,0,0.4)] z-[999] animate-[popIn_0.2s_cubic-bezier(0.175,0.885,0.32,1.275)] origin-bottom">
                <button className="flex items-center gap-2.5 w-full p-2.5 px-3 bg-transparent border-none cursor-pointer text-text-main text-[0.9rem] rounded-lg text-left hover:bg-white/5 transition-colors" onClick={() => { navigate(`/profile/${username}`); setShowMenu(false) }}>
                  <i className="fa-solid fa-user w-4 text-center"></i> View Profile
                </button>
                <button className="flex items-center gap-2.5 w-full p-2.5 px-3 bg-transparent border-none cursor-pointer text-text-main text-[0.9rem] rounded-lg text-left hover:bg-white/5 transition-colors" onClick={() => { navigate('/settings'); setShowMenu(false) }}>
                  <i className="fa-solid fa-gear w-4 text-center"></i> Settings
                </button>
                <button className="flex items-center gap-2.5 w-full p-2.5 px-3 bg-transparent border-none cursor-pointer text-text-main text-[0.9rem] rounded-lg text-left hover:bg-white/5 transition-colors" onClick={() => { navigate('/switch-account'); setShowMenu(false) }}>
                  <i className="fa-solid fa-arrow-right-arrow-left w-4 text-center"></i> Switch Account
                </button>
                <div className="h-[1px] bg-border-dark my-1" />
                <button className="flex items-center gap-2.5 w-full p-2.5 px-3 bg-transparent border-none cursor-pointer text-red-500 text-[0.9rem] rounded-lg text-left hover:bg-red-500/10 transition-colors" onClick={handleLogout}>
                  <i className="fa-solid fa-right-from-bracket w-4 text-center"></i> Log Out
                </button>
              </div>
            )}
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-surface/40 border border-border-dark backdrop-blur-sm">
              <div
                className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-[1.1rem] font-bold text-white shrink-0 cursor-pointer overflow-hidden border border-border-dark/50"
                onClick={() => navigate(`/profile/${username}`)}
              >
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt="avatar" />
                  : (username?.charAt(0) || '').toUpperCase()
                }
              </div>
              <div className="flex flex-col flex-1 overflow-hidden">
                <span
                  className="text-[0.9rem] font-bold text-text-main truncate cursor-pointer hover:text-primary transition-colors"
                  onClick={() => navigate(`/profile/${username}`)}
                >
                  {profile?.display_name || username}
                </span>
                <span className="text-[0.8rem] text-primary truncate">@{username}</span>
              </div>
              <button className="bg-none border-none cursor-pointer text-text-dim text-base p-1 shrink-0 hover:bg-white/10 rounded-md transition-all" onClick={() => setShowMenu(!showMenu)}>
                <i className="fa-solid fa-ellipsis"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

