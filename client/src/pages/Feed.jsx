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
  const isHistoryPushed = useRef(false)

  useEffect(() => {
    const handleScroll = () => {
      if (!headerRef.current) return
      const HEADER_HEIGHT = headerRef.current.offsetHeight
      const currentScrollY = window.scrollY
      const delta = currentScrollY - lastScrollY.current
      lastScrollY.current = currentScrollY

      headerOffset.current = Math.min(0, Math.max(-HEADER_HEIGHT, headerOffset.current - delta))
      if (currentScrollY <= 0) headerOffset.current = 0
      headerRef.current.style.transform = `translateY(${headerOffset.current}px)`

      // Mobile "Back to top" logic: push history state when scrolled down enough
      const threshold = 600
      if (currentScrollY > threshold && !isHistoryPushed.current) {
        window.history.pushState({ backToTop: true }, '')
        isHistoryPushed.current = true
      } else if (currentScrollY < 100 && isHistoryPushed.current) {
        // If they scroll back to the very top manually, remove our temporary state
        if (window.history.state?.backToTop) {
          window.history.back()
        }
        isHistoryPushed.current = false
      }
    }

    const handlePopState = (e) => {
      // Only scroll to top if we had a state pushed and the current state no longer has it
      if (isHistoryPushed.current && !window.history.state?.backToTop) {
        window.scrollTo({ top: 0, behavior: 'smooth' })
        isHistoryPushed.current = false
      }
    }

    // Check if we're already scrolled down on load (e.g. refresh)
    if (window.scrollY > 600 && !isHistoryPushed.current) {
      window.history.pushState({ backToTop: true }, '')
      isHistoryPushed.current = true
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('popstate', handlePopState)
      // Cleanup: if we navigate away from Feed, pop the state if it's ours
      if (isHistoryPushed.current && window.history.state?.backToTop) {
        window.history.back()
      }
    }
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
    const res = await fetch(`${API_URL}/posts/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      console.error('Delete failed:', await res.text())
      return
    }
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
              ? Array(10).fill(0).map((_, i) => <PostSkeleton key={i} />)
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

    </>
  )
}
