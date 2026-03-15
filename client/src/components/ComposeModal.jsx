import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../supabase'
import GifPicker from './GifPicker'
import UserMentionPicker from './UserMentionPicker'
import RichTextEditor from './RichTextEditor'
import { API_URL } from '../utils/apiUrl'
import { getProfile } from '../utils/profileCache'

export default function ComposeModal({ isOpen, onClose, onSuccess }) {
  const [content, setContent] = useState('')
  const [user, setUser] = useState(null)
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
  const [isComposeClosing, setIsComposeClosing] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  const [viewportHeight, setViewportHeight] = useState('100dvh')
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false)
  
  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)
  const composeBoxRef = useRef(null)
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
      setYoutubeData({
        video_id: videoId,
        title: 'YouTube Video',
        thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
      })
    }
  }

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        const profile = await getProfile(user.user_metadata?.username, API_URL)
        if (profile) setUserProfile(profile)
      }
    }
    getUser()

    if (typeof window !== 'undefined' && window.visualViewport) {
      const updateVp = () => {
        setViewportHeight(`${window.visualViewport.height}px`)
        setIsMobile(window.innerWidth < 768)
      }
      window.visualViewport.addEventListener('resize', updateVp)
      window.addEventListener('resize', updateVp)
      updateVp()
      
      return () => {
        window.visualViewport.removeEventListener('resize', updateVp)
        window.removeEventListener('resize', updateVp)
      }
    } else if (typeof window !== 'undefined') {
      const updateVp = () => setIsMobile(window.innerWidth < 768)
      window.addEventListener('resize', updateVp)
      return () => window.removeEventListener('resize', updateVp)
    }
  }, [])

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

    const cursorPos = e.target.selectionStart ?? newContent.length
    lastCursorPos.current = cursorPos

    const textBeforeCursor = newContent.slice(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1)
      const hasSpace = textAfterAt.includes(' ')

      if (!hasSpace && textAfterAt.length >= 0) {
        setMentionSearchQuery(textAfterAt)
        setShowMentionPicker(true)

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
    if (!user) return
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

    try {
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

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to create post')
      }

      setContent('')
      clearImage()
      setMentions([])
      setYoutubeData(null)
      closeModal()
      if (onSuccess) onSuccess()
    } catch (err) {
      console.error('Error creating post:', err)
      alert(`Could not create post: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleMentionSelect = (selectedUser) => {
    const cursorPos = lastCursorPos.current || content.length
    const textBeforeCursor = content.slice(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')

    if (lastAtIndex !== -1) {
      const beforeAt = content.slice(0, lastAtIndex)
      const afterCursor = content.slice(cursorPos)
      const newContent = beforeAt + '@' + selectedUser.username + ' ' + afterCursor
      setContent(newContent)
    } else {
      const separator = content.length > 0 && !content.endsWith(' ') ? ' ' : ''
      setContent(content + separator + '@' + selectedUser.username + ' ')
    }

    if (!mentions.find(m => m.user_id === selectedUser.user_id)) {
      setMentions(prev => [...prev, selectedUser])
    }

    setShowMentionPicker(false)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const closeModal = () => {
    setIsComposeClosing(true)
    setTimeout(() => {
      setIsComposeClosing(false)
      onClose()
    }, 260)
  }

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 50)
    }
  }, [isOpen])

  // Handle hardware back button / popstate to close compose
  useEffect(() => {
    if (!isOpen) return

    // Simple scroll lock using body and HTML overflow
    const prevBodyOverflow = document.body.style.overflow
    const prevHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    // Push a fake history entry so hardware "back" closes compose
    window.history.pushState({ compose: true }, '')
    
    // Auto-detect Android back button dismissing keyboard (viewport height increases significantly)
    let initialVpHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight
    const handleVpResize = () => {
      if (!window.visualViewport) return
      const currentHeight = window.visualViewport.height
      // If height increased by > 100px (keyboard closed by system back button)
      if (currentHeight - initialVpHeight > 100) {
        closeModal()
        // Safely pop state if it hasn't been popped
        if (window.history.state?.compose) window.history.back()
      }
      initialVpHeight = currentHeight
    }

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVpResize)
    }

    const handlePopState = () => {
      closeModal()
    }
    window.addEventListener('popstate', handlePopState)

    return () => {
      document.body.style.overflow = prevBodyOverflow
      document.documentElement.style.overflow = prevHtmlOverflow
      window.removeEventListener('popstate', handlePopState)
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVpResize)
      }
    }
  }, [isOpen])

  if (!isOpen && !isComposeClosing) return null

  const composeUI = (
    <div className="relative" ref={composeBoxRef}>
      {/* Header for mobile */}
      {isMobile && (
        <div className="flex justify-between items-center mb-4 px-1">
          <button
            className="bg-none border-none cursor-pointer text-text-dim text-xl p-1 hover:text-text-main transition-colors"
            onClick={() => {
              window.history.back()
            }}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
          <button
            className={`py-2 px-6 bg-primary text-white border-none rounded-full text-[0.9rem] font-bold transition-all ${((!content.trim() && !imagePreview && !youtubeData) || uploading) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-primary-hover active:scale-95'}`}
            onClick={handlePost}
            disabled={(!content.trim() && !imagePreview && !youtubeData) || uploading}
          >
            {uploading ? 'Posting...' : 'Post'}
          </button>
        </div>
      )}

      <div className="flex gap-3 items-start">
        {/* User Avatar */}
        <div className="shrink-0 mt-1">
          {userProfile?.avatar_url ? (
            <img src={userProfile.avatar_url} className="w-10 h-10 rounded-full object-cover border-2 border-border-dark" alt="" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-base font-bold text-white">
              {(user?.user_metadata?.username?.charAt(0) || '').toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <RichTextEditor
            content={content}
            onChange={handleContentChange}
            placeholder="What's happening?"
            textareaRef={textareaRef}
            minHeight={isMobile ? '120px' : '80px'}
            autoFocus
          />
        </div>
      </div>

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

      {/* Desktop Bottom toolbar */}
      {!isMobile && (
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-border-dark">
          <div className="flex gap-1 items-center">
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
      )}
    </div>
  )

  const mobileToolbar = isMobile ? (
    <div className="flex justify-between items-center px-4 py-3 border-t border-border-dark bg-surface shrink-0 mt-auto">
      <div className="flex gap-1 items-center">
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
        <button
          className="bg-none border-none cursor-pointer text-primary p-2 hover:bg-primary/10 rounded-lg transition-colors flex items-center"
          onClick={() => setShowGifPicker(true)}
          title="Add GIF"
        >
          <span className="font-bold text-[0.85rem] border-2 border-primary rounded-md px-1 py-0.5">GIF</span>
        </button>
      </div>

      <span className={`text-[0.85rem] ${content.length > 260 ? 'text-red-500 font-bold' : 'text-text-dim'}`}>
        {content.length}/280
      </span>
    </div>
  ) : null

  return createPortal(
    <>
      {showGifPicker && (
        <GifPicker
          onSelect={handleGifSelect}
          onClose={() => setShowGifPicker(false)}
        />
      )}

      {/* Desktop: centered modal */}
      {!isMobile && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[10vh]">
          <div
            className={`bg-surface border border-border-dark rounded-2xl p-5 w-[560px] max-w-[90vw] shadow-[0_20px_60px_rgba(0,0,0,0.5)] ${isComposeClosing ? 'animate-[composeModalOut_0.22s_ease-in_forwards]' : 'animate-[composeModalIn_0.28s_cubic-bezier(0.22,1,0.36,1)_forwards]'}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <button
                className="bg-none border-none cursor-pointer text-text-dim text-xl p-1 hover:text-text-main transition-colors"
                onClick={closeModal}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            {composeUI}
          </div>
          <div className="absolute inset-0 -z-10" onClick={closeModal} />
        </div>
      )}

      {/* Mobile: full-screen slide-up sheet */}
      {isMobile && (
        <div 
          className={`fixed top-0 left-0 right-0 z-[9999] bg-surface flex flex-col ${isComposeClosing ? 'animate-[composeSheetOut_0.26s_cubic-bezier(0.4,0,1,1)_forwards]' : 'animate-[composeSheetIn_0.34s_cubic-bezier(0.22,1,0.36,1)_forwards]'}`}
          style={{ height: viewportHeight, touchAction: 'none' }}
        >
          <div className="flex flex-col w-full h-full">
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-0 overscroll-none" style={{ touchAction: 'auto' }}>
              {composeUI}
            </div>
            {mobileToolbar}
          </div>
        </div>
      )}
    </>,
    document.body
  )
}
