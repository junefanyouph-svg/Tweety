import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabase'

export default function BottomNav() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [unreadMsgCount, setUnreadMsgCount] = useState(0)
  const [showMenu, setShowMenu] = useState(false)
  const [isMenuClosing, setIsMenuClosing] = useState(false)
  const [isLightMode, setIsLightMode] = useState(() => {
    return localStorage.getItem('theme') === 'light'
  })
  const navigate = useNavigate()
  const location = useLocation()

  const [stats, setStats] = useState({ followers: 0, following: 0 })

  const getUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    if (user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()
      setProfile(profileData)

      const [
        { count: followersCount },
        { count: followingCount }
      ] = await Promise.all([
        supabase.from('followers').select('id', { count: 'exact' }).eq('following_id', user.id),
        supabase.from('followers').select('id', { count: 'exact' }).eq('follower_id', user.id)
      ])
      setStats({ followers: followersCount || 0, following: followingCount || 0 })
    }
  }

  useEffect(() => {
    getUserData()
  }, [])

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
    if (!user) return

    const profileChannel = supabase
      .channel(`bottom-nav-profile-${user.id}-${Math.random()}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        setProfile(payload.new)
      })
      .subscribe()

    const handleProfileUpdate = () => { getUserData() }
    window.addEventListener('tweety_profile_updated', handleProfileUpdate)

    fetchUnreadCount()
    fetchUnreadMsgCount()

    const notifChannel = supabase
      .channel(`bottom-nav-notifications-${Math.random()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        fetchUnreadCount()
      })
      .subscribe()

    const msgChannel = supabase
      .channel(`bottom-nav-messages-${Math.random()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        fetchUnreadMsgCount()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(profileChannel)
      supabase.removeChannel(notifChannel)
      supabase.removeChannel(msgChannel)
      window.removeEventListener('tweety_profile_updated', handleProfileUpdate)
    }
  }, [user?.id])

  useEffect(() => {
    setShowMenu(false)
    setIsMenuClosing(false)
  }, [location.pathname])

  useEffect(() => {
    if (!showMenu) return

    const prevBodyOverflow = document.body.style.overflow
    const prevHtmlOverflow = document.documentElement.style.overflow
    const prevBodyOverscroll = document.body.style.overscrollBehavior
    const prevHtmlOverscroll = document.documentElement.style.overscrollBehavior

    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'none'
    document.documentElement.style.overscrollBehavior = 'none'

    return () => {
      document.body.style.overflow = prevBodyOverflow
      document.documentElement.style.overflow = prevHtmlOverflow
      document.body.style.overscrollBehavior = prevBodyOverscroll
      document.documentElement.style.overscrollBehavior = prevHtmlOverscroll
    }
  }, [showMenu])

  const closeMenu = () => {
    if (!showMenu || isMenuClosing) return
    setIsMenuClosing(true)
    setTimeout(() => {
      setShowMenu(false)
      setIsMenuClosing(false)
    }, 260)
  }

  const toggleMenu = () => {
    if (showMenu) {
      closeMenu()
      return
    }
    setIsMenuClosing(false)
    setShowMenu(true)
  }

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
    { icon: 'home', path: '/feed' },
    { icon: 'search', extraActive: 'shadow-md', path: '/search' },
    { icon: 'notifications', path: '/notifications', badge: unreadCount },
    { icon: 'mail', path: '/messages', badge: unreadMsgCount },
  ]

  const toggleTheme = async () => {
    const nextMode = !isLightMode

    if (
      !document.startViewTransition ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setIsLightMode(nextMode)
      return
    }

    const transition = document.startViewTransition(() => {
      setIsLightMode(nextMode)
    })

    await transition.ready

    const x = nextMode ? window.innerWidth : 0
    const y = nextMode ? 0 : window.innerHeight
    const endRadius = Math.hypot(window.innerWidth, window.innerHeight)

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
    )
  }

  return (
    <>
      {showMenu && (
        <>
          <div className={`fixed inset-0 bg-black/25 z-[200] ${isMenuClosing ? 'animate-[bottomNavBackdropOut_0.22s_ease-in_forwards]' : 'animate-[bottomNavBackdropIn_0.2s_ease-out_forwards]'}`} onClick={closeMenu} />
          <div className={`fixed inset-x-0 bottom-0 h-[50vh] bg-surface/98 border-t border-border-dark rounded-t-[24px] p-5 pb-[calc(2rem+env(safe-area-inset-bottom))] z-[201] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${isMenuClosing ? 'animate-[bottomNavPushDown_0.26s_cubic-bezier(0.4,0,1,1)_forwards]' : 'animate-[bottomNavPushUp_0.34s_cubic-bezier(0.22,1,0.36,1)_forwards]'}`}>
            <div className={`w-12 h-1 rounded-full mx-auto mb-4 border ${isLightMode ? 'bg-black/45 border-black/25' : 'bg-white/35 border-white/20'}`} />
            <div
              className="flex items-center gap-4 p-2 pb-4 cursor-pointer active:opacity-70 transition-opacity"
              onClick={() => { navigate(`/profile/${username}`); closeMenu() }}
            >
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-[1.4rem] font-bold text-white shrink-0 shadow-lg border-2 border-primary/20 overflow-hidden">
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt="avatar" />
                  : (username?.charAt(0) || '').toUpperCase()
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-text-main text-lg truncate">{profile?.display_name || username}</p>
                <p className="text-primary text-[0.9rem] mb-2 truncate">@{username}</p>
                <div className="flex gap-4 text-text-dim text-[0.85rem]">
                  <span><strong className="text-text-main">{stats.following}</strong> Following</span>
                  <span><strong className="text-text-main">{stats.followers}</strong> Followers</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-text-dim/30">chevron_right</span>
            </div>

            <div className={`h-[1px] my-3 ${isLightMode ? 'bg-black/20' : 'bg-border-dark/60'}`} />

            <nav className="flex flex-col gap-1">
              <button className="flex items-center gap-4 w-full p-3.5 px-4 bg-transparent border-none cursor-pointer text-text-main text-base rounded-xl text-left hover:bg-white/5 active:bg-white/10 transition-colors" onClick={toggleTheme}>
                <span className={`material-symbols-outlined w-5 text-center ${isLightMode ? 'text-indigo-500' : 'text-yellow-500'}`}>
                  {isLightMode ? 'dark_mode' : 'light_mode'}
                </span>
                {isLightMode ? 'Dark Mode' : 'Light Mode'}
              </button>
              <button className="flex items-center gap-4 w-full p-3.5 px-4 bg-transparent border-none cursor-pointer text-text-main text-base rounded-xl text-left hover:bg-white/5 active:bg-white/10 transition-colors" onClick={() => { navigate('/settings'); closeMenu() }}>
                <span className="material-symbols-outlined w-5 text-center text-primary">settings</span> Settings
              </button>
              <button className="flex items-center gap-4 w-full p-3.5 px-4 bg-transparent border-none cursor-pointer text-text-main text-base rounded-xl text-left hover:bg-white/5 active:bg-white/10 transition-colors" onClick={() => { navigate('/switch-account'); closeMenu() }}>
                <span className="material-symbols-outlined w-5 text-center text-primary">swap_horiz</span> Switch Account
              </button>

              <div className={`h-[1px] my-3 ${isLightMode ? 'bg-black/20' : 'bg-border-dark/60'}`} />

              <button className="flex items-center gap-4 w-full p-3.5 px-4 bg-transparent border-none cursor-pointer text-red-500 text-base rounded-xl text-left hover:bg-red-500/10 active:bg-red-500/20 transition-colors" onClick={handleLogout}>
                <span className="material-symbols-outlined w-5 text-center">logout</span> Log Out
              </button>
            </nav>
          </div>
        </>
      )}

      <div className="fixed bottom-0 left-0 right-0 h-[calc(64px+env(safe-area-inset-bottom))] bg-bg-dark border-t border-border-dark flex items-start justify-around z-[100] px-4 md:hidden pb-[env(safe-area-inset-bottom)] pt-2">
        {navItems.map(item => (
          <button
            key={item.path}
            className={`border-none cursor-pointer p-2 px-4 rounded-xl flex items-center justify-center transition-all active:scale-90 ${isActive(item.path) ? 'bg-transparent text-primary' : 'bg-transparent text-text-dim hover:bg-white/5'}`}
            onClick={() => {
              if (item.path === '/feed' && location.pathname === '/feed') {
                window.scrollTo({ top: 0, behavior: 'smooth' })
              } else if (item.path === '/search' && location.pathname === '/search') {
                window.dispatchEvent(new CustomEvent('tweety_focus_search'))
              } else {
                navigate(item.path)
              }
            }}
          >
            <div className="relative inline-block">
              <span className={`material-symbols-outlined text-[1.6rem] transition-all ${isActive(item.path) ? 'filled ' + (item.extraActive || '') : 'text-text-dim'}`}>{item.icon}</span>
              {item.badge > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-primary text-white rounded-full w-4 h-4 flex items-center justify-center text-[0.65rem] font-bold ring-2 ring-bg-dark">{item.badge}</span>
              )}
            </div>
          </button>
        ))}

        <button
          className="bg-transparent border-none cursor-pointer p-1 rounded-full flex items-center justify-center active:scale-90 transition-all"
          onClick={toggleMenu}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center overflow-hidden border-2 transition-all shadow-sm ${showMenu ? 'bg-primary border-primary scale-110' : 'bg-surface border-border-dark'}`}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} className="w-full h-full object-cover" alt="avatar" />
            ) : (
              <span className="text-white text-[0.8rem] font-bold">
                {(username?.charAt(0) || '').toUpperCase()}
              </span>
            )}
          </div>
        </button>
      </div>
    </>
  )
}
