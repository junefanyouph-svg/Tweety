import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

import { PostSkeleton } from '../components/Skeleton'
import PostCard from '../components/PostCard'
import { setCache, getCache, invalidateCache } from '../utils/cache'
import PullToRefresh from '../components/PullToRefresh'
import { API_URL } from '../utils/apiUrl'

export default function Feed() {
  const [posts, setPosts] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const lastScrollY = useRef(0)
  const headerOffset = useRef(0)
  const headerRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handleScroll = () => {
      if (!headerRef.current) return
      const HEADER_HEIGHT = headerRef.current.offsetHeight
      const currentScrollY = window.scrollY
      const delta = currentScrollY - lastScrollY.current
      lastScrollY.current = currentScrollY

      // Accumulate offset: positive delta (scroll down) pushes header up, negative (scroll up) reveals it
      headerOffset.current = Math.min(0, Math.max(-HEADER_HEIGHT, headerOffset.current - delta))

      // At the very top of the page, always fully show
      if (currentScrollY <= 0) headerOffset.current = 0

      headerRef.current.style.transform = `translateY(${headerOffset.current}px)`
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const init = async () => {
      await getUser()
      fetchPosts()
    }
    init()

    const channel = supabase
      .channel(`feed-posts-${Math.random()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        invalidateCache('feed-posts')
        fetchPosts()
      })
      .subscribe()

    const handlePostCreated = () => fetchPosts()
    window.addEventListener('postCreated', handlePostCreated)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('postCreated', handlePostCreated)
    }
  }, [])

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) navigate('/')
    else setUser(user)
  }

  const fetchPosts = async () => {
    const cached = getCache('feed-posts')
    if (cached) {
      setPosts(cached)
      setLoading(false)
      const { data } = await supabase
        .from('posts')
        .select('*, profiles(username, display_name, avatar_url)')
        .order('created_at', { ascending: false })
      if (data) {
        setPosts(data)
        setCache('feed-posts', data)
      }
      return
    }

    const { data, error } = await supabase
      .from('posts')
      .select('*, profiles(username, display_name, avatar_url)')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching posts:', error)
      // Fallback to regular posts table if view fails
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('posts')
        .select('*, profiles(username, display_name, avatar_url)')
        .order('created_at', { ascending: false })
      
      if (fallbackError) {
        console.error('Fallback fetch also failed:', fallbackError)
        setPosts([])
      } else {
        setPosts(fallbackData || [])
        setCache('feed-posts', fallbackData || [])
      }
    } else {
      setPosts(data || [])
      setCache('feed-posts', data || [])
    }
    setLoading(false)
  }

  const handleDelete = async (id) => {
    await fetch(`${API_URL}/posts/${id}`, { method: 'DELETE' })
    setPosts(prev => prev.filter(p => p.id !== id))
    invalidateCache('feed-posts')
  }

  return (
    <>
      <PullToRefresh onRefresh={fetchPosts}>
        <div className="max-w-[620px] mx-auto w-full box-border pb-6 px-4 max-md:px-0">
          {/* Mobile-only Sticky Header */}
          <div
            ref={headerRef}
            className="md:hidden sticky top-0 z-[50] bg-bg-dark border-b border-border-dark flex items-center px-4 py-3"
            style={{ willChange: 'transform' }}
          >
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div 
                className="w-7 h-7 bg-primary" 
                style={{ 
                  maskImage: "url('/Jargon_icon.svg')", 
                  WebkitMaskImage: "url('/Jargon_icon.svg')",
                  maskSize: 'contain',
                  WebkitMaskSize: 'contain',
                  maskRepeat: 'no-repeat',
                  WebkitMaskRepeat: 'no-repeat'
                }} 
              />
              <span className="text-[1.3rem] font-bold text-primary">Jargon</span>
            </div>
          </div>

          {/* Posts Feed */}
          <div className="flex flex-col gap-px pb-8">
            {loading
              ? Array(4).fill(0).map((_, i) => <PostSkeleton key={i} />)
              : posts.length === 0
                ? <p className="text-center text-text-dim mt-8 text-[0.95rem]">No posts yet. Be the first! 🚀</p>
                : posts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    user={user}
                    onDelete={handleDelete}
                    onNavigate={() => navigate(`/post/${post.id}`, { state: { from: '/feed', fromLabel: 'Feed' } })}
                  />
                ))
            }
            {!loading && posts.length > 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-text-dim text-[0.85rem] gap-1 opacity-60">
                <span className="material-symbols-outlined filled text-[1.4rem]">check_circle</span>
                <span>You're all caught up!</span>
              </div>
            )}
          </div>
        </div>
      </PullToRefresh>

      {/* Floating Compose Button (FAB) relative to viewport */}
      <button
        className="fixed z-[150] w-[56px] h-[56px] rounded-full bg-primary text-white border-none shadow-[0_6px_24px_rgba(0,191,166,0.4)] cursor-pointer flex items-center justify-center text-[1.4rem] hover:scale-105 active:scale-95 transition-all bottom-[100px] right-5 md:bottom-10 md:right-10"
        onClick={() => window.dispatchEvent(new CustomEvent('openCompose'))}
        aria-label="Create post"
      >
        <span className="material-symbols-outlined filled">add</span>
      </button>
    </>
  )
}
