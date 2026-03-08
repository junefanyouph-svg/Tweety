import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

import { PostSkeleton } from '../components/Skeleton'
import PostCard from '../components/PostCard'
import GifPicker from '../components/GifPicker'
import UserMentionPicker from '../components/UserMentionPicker'
import RichTextEditor from '../components/RichTextEditor'
import { setCache, getCache, invalidateCache } from '../utils/cache'
import PullToRefresh from '../components/PullToRefresh'

const API_URL = import.meta.env.VITE_API_URL

export default function Feed() {
  const [posts, setPosts] = useState([])
  const [content, setContent] = useState('')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [gifUrl, setGifUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [showMentionPicker, setShowMentionPicker] = useState(false)
  const [mentionSearchQuery, setMentionSearchQuery] = useState('')
  const [mentions, setMentions] = useState([])
  const [youtubeData, setYoutubeData] = useState(null)
  const [mentionPickerPosition, setMentionPickerPosition] = useState({ top: 0, left: 0 })
  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)
  const composeBoxRef = useRef(null)
  const navigate = useNavigate()
  const lastCursorPos = useRef(0)

  // YouTube URL patterns
  const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/g

  const extractYoutubeId = (url) => {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)
    return match ? match[1] : null
  }

  const fetchYoutubeData = async (videoId) => {
    try {
      const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`)
      const data = await response.json()
      if (data.title) {
        setYoutubeData({
          video_id: videoId,
          title: data.title,
          thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          author: data.author_name
        })
      }
    } catch (err) {
      // Fallback to basic thumbnail
      setYoutubeData({
        video_id: videoId,
        title: 'YouTube Video',
        thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
      })
    }
  }

  useEffect(() => {
    getUser()
    fetchPosts()

    const channel = supabase
      .channel(`feed-posts-${Math.random()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        invalidateCache('feed-posts')
        fetchPosts()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
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
        .select('*, profiles(display_name, avatar_url)')
        .order('created_at', { ascending: false })
      if (data) {
        setPosts(data)
        setCache('feed-posts', data)
      }
      return
    }

    const { data } = await supabase
      .from('posts')
      .select('*, profiles(display_name, avatar_url)')
      .order('created_at', { ascending: false })
    setPosts(data || [])
    setCache('feed-posts', data || [])
    setLoading(false)
  }

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5MB!')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setImageFile(file)
    setGifUrl(null)
    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target.result)
    reader.readAsDataURL(file)
  }

  const handleGifSelect = (url) => {
    setGifUrl(url)
    setImageFile(null)
    setImagePreview(url)
    setShowGifPicker(false)
  }

  const clearImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setGifUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const clearYoutube = () => {
    setYoutubeData(null)
  }

  const handleContentChange = (e) => {
    const newContent = e.target.value
    setContent(newContent)

    // Store cursor position from the synthetic event provided by RichTextEditor
    const cursorPos = e.target.selectionStart ?? newContent.length
    lastCursorPos.current = cursorPos

    // Check for @ mention
    const textBeforeCursor = newContent.slice(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1)
      // Check if there's a space after @ (which means user finished typing the mention)
      const hasSpace = textAfterAt.includes(' ')

      if (!hasSpace && textAfterAt.length >= 0) {
        // Show mention picker
        setMentionSearchQuery(textAfterAt)
        setShowMentionPicker(true)

        // Calculate position for the dropdown
        if (textareaRef.current && composeBoxRef.current) {
          const composeRect = composeBoxRef.current.getBoundingClientRect()
          const selection = window.getSelection()
          let positioned = false

          if (selection.rangeCount > 0) {
            try {
              const range = selection.getRangeAt(0).cloneRange()
              const rects = range.getClientRects()
              if (rects.length > 0) {
                const rect = rects[0]
                setMentionPickerPosition({
                  top: rect.bottom - composeRect.top + 5,
                  left: Math.min(rect.left - composeRect.left, composeRect.width - 320)
                })
                positioned = true
              }
            } catch (err) { /* fallback below */ }
          }

          if (!positioned) {
            const editorRect = textareaRef.current.getBoundingClientRect()
            setMentionPickerPosition({
              top: editorRect.bottom - composeRect.top + 5,
              left: 0
            })
          }
        }
      } else {
        setShowMentionPicker(false)
      }
    } else {
      setShowMentionPicker(false)
    }

    // Check for YouTube links
    const youtubeMatch = newContent.match(youtubeRegex)
    if (youtubeMatch) {
      const videoId = extractYoutubeId(youtubeMatch[0])
      if (videoId && (!youtubeData || youtubeData.video_id !== videoId)) {
        fetchYoutubeData(videoId)
      }
    } else {
      clearYoutube()
    }
  }

  const handlePost = async () => {
    if (!content.trim() && !imagePreview && !youtubeData) return
    setUploading(true)

    const contentToSend = content
    const senderUsername = user?.user_metadata?.username

    let image_url = null

    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${ext}`
      const { error } = await supabase.storage
        .from('post-images')
        .upload(fileName, imageFile)
      if (!error) {
        const { data } = supabase.storage.from('post-images').getPublicUrl(fileName)
        image_url = data.publicUrl
      }
    } else if (gifUrl) {
      image_url = gifUrl
    }

    const res = await fetch(`${API_URL}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: contentToSend,
        username: senderUsername,
        user_id: user.id,
        image_url,
        mentions: mentions.map(m => m.user_id),
        youtube_data: youtubeData
      })
    })



    setContent('')
    clearImage()
    setMentions([])
    setYoutubeData(null)
    setUploading(false)
    invalidateCache('feed-posts')
    fetchPosts()
  }

  const handleDelete = async (id) => {
    await fetch(`${API_URL}/posts/${id}`, { method: 'DELETE' })
    setPosts(prev => prev.filter(p => p.id !== id))
    invalidateCache('feed-posts')
  }

  const handleMentionSelect = (selectedUser) => {
    // Use the stored cursor position from the last input event
    const cursorPos = lastCursorPos.current || content.length
    const textBeforeCursor = content.slice(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')

    if (lastAtIndex !== -1) {
      const beforeAt = content.slice(0, lastAtIndex)
      const afterCursor = content.slice(cursorPos)
      const newContent = beforeAt + '@' + selectedUser.username + ' ' + afterCursor
      setContent(newContent)
    } else {
      // When triggered from button click, just append
      const separator = content.length > 0 && !content.endsWith(' ') ? ' ' : ''
      setContent(content + separator + '@' + selectedUser.username + ' ')
    }

    // Add to mentions if not already added
    if (!mentions.find(m => m.user_id === selectedUser.user_id)) {
      setMentions(prev => [...prev, selectedUser])
    }

    setShowMentionPicker(false)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  // Render draft content with highlighted mentions and YouTube links
  const renderDraftContent = (text) => {
    if (!text) return null

    const parts = text.split(/(@[a-zA-Z0-9_]+)/g)

    return parts.map((part, idx) => {
      // Highlight mentions
      if (part.startsWith('@')) {
        return (
          <span
            key={idx}
            style={{
              color: 'rgb(0, 191, 166)',
              fontWeight: 'bold',
            }}
          >
            {part}
          </span>
        )
      }

      // Highlight URLs
      const urlRegex = /(https?:\/\/[^\s]+)/g
      const urlParts = part.split(urlRegex)
      return urlParts.map((urlPart, urlIdx) => {
        if (urlRegex.test(urlPart)) {
          return (
            <span
              key={`${idx}-${urlIdx}`}
              style={{ color: '#1d9bf0', textDecoration: 'underline' }}
            >
              {urlPart}
            </span>
          )
        }
        return <span key={`${idx}-${urlIdx}`}>{urlPart}</span>
      })
    })
  }

  return (
    <PullToRefresh onRefresh={fetchPosts}>
      <div className="max-w-[620px] mx-auto px-3 w-full box-border">

      {/* Compose Box */}
      <div className="bg-surface rounded-2xl p-4 my-3 border border-border-dark relative transition-all duration-200 focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(0,191,166,0.22)]" ref={composeBoxRef}>
        <RichTextEditor
          content={content}
          onChange={handleContentChange}
          placeholder="What's happening?"
          textareaRef={textareaRef}
        />

        {/* Inline Mention Picker */}
        {showMentionPicker && (
          <UserMentionPicker
            onSelect={handleMentionSelect}
            onClose={() => setShowMentionPicker(false)}
            searchQuery={mentionSearchQuery}
            position={{ top: mentionPickerPosition.top, left: mentionPickerPosition.left }}
            currentUserId={user?.id}
          />
        )}

        {/* Image Preview */}
        {imagePreview && (
          <div className="relative mt-2.5 inline-block w-full">
            <img src={imagePreview} className="max-w-full max-h-[300px] rounded-xl border border-border-dark block" alt="preview" />
            <button className="absolute top-2 right-2 bg-black/70 border-none rounded-full w-7 h-7 cursor-pointer text-white flex items-center justify-center hover:bg-black transition-colors" onClick={clearImage}>
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        )}

        {/* YouTube Preview */}
        {youtubeData && (
          <div className="relative mt-3 flex flex-wrap items-center gap-3 p-3 bg-bg-dark rounded-xl border border-border-dark">
            <div className="w-full relative">
              <iframe
                width="100%"
                height="315"
                src={`https://www.youtube.com/embed/${youtubeData.video_id}`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className="rounded-xl border-none"
              />
            </div>
            <button className="absolute top-2 right-2 bg-black/70 border-none rounded-full w-7 h-7 cursor-pointer text-white flex items-center justify-center hover:bg-black transition-colors z-[10]" onClick={clearYoutube}>
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        )}

        <div className="flex justify-between items-center mt-2 pt-2 border-t border-border-dark">
          <div className="flex gap-1 items-center">
            {/* Image Upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
            <button
              className="bg-none border-none cursor-pointer text-primary text-[1.1rem] p-2 hover:bg-primary/10 rounded-lg transition-colors"
              onClick={() => fileInputRef.current.click()}
              title="Upload image"
            >
              <i className="fa-solid fa-image"></i>
            </button>

            {/* GIF Picker */}
            <button
              className="bg-none border-none cursor-pointer text-primary p-2 hover:bg-primary/10 rounded-lg transition-colors flex items-center"
              onClick={() => setShowGifPicker(true)}
              title="Add GIF"
            >
              <span className="font-bold text-[0.85rem] border-2 border-primary rounded-md px-1 py-0.5">GIF</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-[0.85rem] ${content.length > 260 ? 'text-red-500 font-bold' : 'text-text-dim'}`}>
              {content.length}/280
            </span>
            <button
              className={`py-2 px-7 bg-primary text-white border-none rounded-[20px] text-[0.95rem] font-bold transition-all ${((!content.trim() && !imagePreview && !youtubeData) || uploading) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-primary-hover active:scale-95'}`}
              onClick={handlePost}
              disabled={(!content.trim() && !imagePreview && !youtubeData) || uploading}
            >
              {uploading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      </div>

      {/* GIF Picker Modal */}
      {showGifPicker && (
        <GifPicker
          onSelect={handleGifSelect}
          onClose={() => setShowGifPicker(false)}
        />
      )}

      {/* Posts Feed */}
      <div className="flex flex-col gap-[5px] pb-8">
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
  )
}

