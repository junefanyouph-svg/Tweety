import { useState, useEffect } from 'react'
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
  const navigate = useNavigate()

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
        .from('posts_with_user_likes')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) {
        setPosts(data)
        setCache('feed-posts', data)
      }
      return
    }

    const { data, error } = await supabase
      .from('posts_with_user_likes')
      .select('*')
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
        <div className="max-w-[620px] mx-auto px-3 w-full box-border pb-6">
          {/* Posts Feed */}
          <div className="flex flex-col gap-[5px] pb-8 pt-3">
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
