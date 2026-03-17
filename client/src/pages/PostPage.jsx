import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { supabase } from '../supabase'
import PostCard from '../components/PostCard'
import { API_URL } from '../utils/apiUrl'

export default function PostPage() {
  const { id } = useParams()
  const [post, setPost] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  // Where to go back to
  const from = location.state?.from || '/feed'
  const fromLabel = location.state?.fromLabel || 'Feed'

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/'); return }
      setUser(user)
      fetchPost()
    }
    init()
  }, [id])

  const fetchPost = async () => {
    const res = await fetch(`${API_URL}/posts/single/${id}`)
    const data = await res.json()
    if (data.error || !data.id) {
      setNotFound(true)
    } else {
      setPost(data)
    }
    setLoading(false)
  }

  const handleDelete = async (postId) => {
    const res = await fetch(`${API_URL}/posts/${postId}`, { method: 'DELETE' })
    if (!res.ok) {
      console.error('Delete failed:', await res.text())
      return
    }
    navigate(from)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh] text-text-dim">
      <span className="material-symbols-outlined filled animate-spin text-2xl mr-3">autorenew</span>
      Loading...
    </div>
  )

  if (notFound) return (
    <div className="max-w-[620px] mx-auto px-4 w-full box-border pb-8">
      <div className="flex items-center gap-4 py-3 border-b border-border-dark sticky top-0 bg-bg-dark/80 backdrop-blur-md z-10">
        <button
          className="p-2 hover:bg-white/5 rounded-full text-text-main transition-colors flex items-center gap-2 text-[0.95rem]"
          onClick={() => navigate(from)}
        >
          <span className="material-symbols-outlined filled">arrow_back</span> Back
        </button>
      </div>
      <div className="text-center mt-20 text-text-dim flex flex-col items-center gap-4">
        <span className="material-symbols-outlined filled text-[4rem] opacity-20">block</span>
        <p className="text-lg">This post doesn't exist or has been deleted.</p>
        <button
          className="mt-4 py-2 px-6 bg-primary text-white font-bold rounded-full hover:opacity-90 transition-opacity"
          onClick={() => navigate('/feed')}
        >
          Go to Feed
        </button>
      </div>
    </div>
  )

  return (
    <div className="max-w-[620px] mx-auto px-4 w-full box-border pb-8">
      <div className="flex items-center gap-4 py-3 border-b border-border-dark sticky top-0 bg-bg-dark/80 backdrop-blur-md z-10">
        <button
          className="p-2 hover:bg-white/5 rounded-full text-text-main transition-colors flex items-center gap-2 text-[0.95rem] font-bold"
          onClick={() => navigate(from)}
        >
          <span className="material-symbols-outlined filled">arrow_back</span> {fromLabel}
        </button>
      </div>
      <div className="mt-5">
        {post && user && (
          <PostCard
            post={post}
            user={user}
            onDelete={handleDelete}
            onNavigate={null}
            defaultOpenComments={true}
          />
        )}
      </div>
    </div>
  )
}
