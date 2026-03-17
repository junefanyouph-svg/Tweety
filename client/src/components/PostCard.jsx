import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import GifPicker from './GifPicker'
import UserMentionPicker from './UserMentionPicker'
import { getCache, setCache, invalidateCache } from '../utils/cache'
import { getCachedProfile, getProfile, setCachedProfile } from '../utils/profileCache'
import RichTextEditor from './RichTextEditor'
import { broadcastLike, broadcastComment, broadcastCommentLike } from '../utils/interactionsChannel'
import { API_URL } from '../utils/apiUrl'
import { formatDate } from '../utils/formatDate'
import { DEFAULT_IMAGE_UPLOAD_OPTIONS, compressImageForUpload, getUploadExtension } from '../utils/imageUpload'
import { removeCachedMedia } from '../utils/mediaCache'
import CachedImage from './CachedImage'
import { getPostImageUrls } from '../utils/postMedia'

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function highlightText(text, q) {
  if (!text) return text
  const terms = (q || '').trim().split(/\s+/).filter(Boolean).filter(t => t.length >= 2)
  if (terms.length === 0) return text
  const pattern = terms.map(escapeRegExp).join('|')
  const regex = new RegExp(`(${pattern})`, 'gi')
  const parts = String(text).split(regex)
  return parts.map((part, idx) => regex.test(part) ? <b key={idx}>{part}</b> : <span key={idx}>{part}</span>)
}

const renderContent = (text, navigate, query = '') => {
  if (!text) return null
  const lines = String(text).split('\n')
  const getYoutubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/|\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
    const match = url.match(regExp)
    return (match && match[2].length === 11) ? match[2] : null
  }
  return lines.map((line, lineIdx) => {
    const parts = line.split(/(@[a-zA-Z0-9_]+)/g)
    const renderedLine = parts.map((part, idx) => {
      if (part.startsWith('@')) {
        const username = part.slice(1)
        return (
          <span key={`${lineIdx}-${idx}`} style={{ color: 'rgb(0, 191, 166)', cursor: 'pointer', fontWeight: 'bold' }} onClick={(e) => { e.stopPropagation(); navigate(`/profile/${username}`) }}>
            {part}
          </span>
        )
      }
      const urlRegex = /(https?:\/\/[^\s]+)/g
      const urlParts = part.split(urlRegex)
      return urlParts.map((urlPart, urlIdx) => {
        if (urlRegex.test(urlPart)) {
          const ytId = getYoutubeId(urlPart)
          if (ytId) {
            return (
              <div key={`${lineIdx}-${idx}-${urlIdx}`} style={{ marginTop: '10px', marginBottom: '10px' }}>
                <iframe width="100%" height="315" src={`https://www.youtube.com/embed/${ytId}`} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ borderRadius: '12px', border: 'none' }} onClick={(e) => e.stopPropagation()}></iframe>
              </div>
            )
          }
          return <a key={`${lineIdx}-${idx}-${urlIdx}`} href={urlPart} target="_blank" rel="noopener noreferrer" style={{ color: '#1d9bf0', textDecoration: 'underline', wordBreak: 'break-all' }} onClick={(e) => e.stopPropagation()}>{urlPart}</a>
        }
        return highlightText(urlPart, query)
      })
    })
    return <div key={lineIdx} style={{ minHeight: '1.2em' }}>{renderedLine}</div>
  })
}

function ScopedConfirmDialog({ title, message, confirmLabel, onCancel, onConfirm, tone = 'danger', isSubmitting = false }) {
  const confirmClassName = tone === 'danger'
    ? 'bg-red-500 hover:bg-red-600'
    : 'bg-primary hover:bg-primary-hover'

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/65 backdrop-blur-sm flex items-center justify-center"
      onClick={onCancel}
    >
      <div
        className="rounded-2xl border border-border-dark bg-surface p-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)] w-[360px] max-w-[calc(100vw-32px)]"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="mb-3 text-lg font-bold text-text-main">{title}</h3>
        <p className="mb-5 text-sm text-text-dim leading-relaxed">{message}</p>
        <div className="flex justify-end gap-3">
          <button className={`cursor-pointer rounded-xl border border-border-dark bg-transparent px-5 py-2.5 text-[0.9rem] font-medium text-text-dim transition-all hover:bg-white/5 ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`} onClick={onCancel} disabled={isSubmitting}>Cancel</button>
          <button className={`cursor-pointer rounded-xl px-5 py-2.5 text-[0.9rem] font-bold text-white shadow-lg transition-all active:scale-95 ${confirmClassName} ${isSubmitting ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`} onClick={onConfirm} disabled={isSubmitting}>{isSubmitting ? 'Working...' : confirmLabel}</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function PostCard({ post, user, onDelete, onNavigate, defaultOpenComments = false, highlightQuery = '' }) {
  const [likes, setLikes] = useState([])
  const [comments, setComments] = useState([])
  const [commentInput, setCommentInput] = useState('')
  const [commentImage, setCommentImage] = useState(null)
  const [commentImagePreview, setCommentImagePreview] = useState(null)
  const [commentGifUrl, setCommentGifUrl] = useState(null)
  const [showCommentGifPicker, setShowCommentGifPicker] = useState(false)
  const [showComments, setShowComments] = useState(defaultOpenComments)
  const [closingComments, setClosingComments] = useState(false)
  const [commentMenuOpen, setCommentMenuOpen] = useState(null)
  const [hiddenComments, setHiddenComments] = useState([])
  const [deletingCommentId, setDeletingCommentId] = useState(null)
  const [viewingImage, setViewingImage] = useState(null)
  const [commentSending, setCommentSending] = useState(false)
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyContent, setReplyContent] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [toast, setToast] = useState(false)
  const [heartAnim, setHeartAnim] = useState(false)
  const [authorDisplayName, setAuthorDisplayName] = useState(post.profiles?.display_name || post.display_name || null)
  const [authorAvatarUrl, setAuthorAvatarUrl] = useState(post.profiles?.avatar_url || post.avatar_url || null)
  const postUsername = post.profiles?.username || post.username || null
  const [animatingCommentId, setAnimatingCommentId] = useState(null)
  const [collapsedThreads, setCollapsedThreads] = useState([])
  const [showMentionPicker, setShowMentionPicker] = useState(false)
  const [mentionSearchQuery, setMentionSearchQuery] = useState('')
  const [mentionPickerPosition, setMentionPickerPosition] = useState({ top: 0, left: 0 })
  const [activeComposer, setActiveComposer] = useState(null) // 'main' or comment.id
  const [showMediaMenu, setShowMediaMenu] = useState(null)
  const [editingPost, setEditingPost] = useState(false)
  const [editPostText, setEditPostText] = useState('')
  const [editingComment, setEditingComment] = useState(null)
  const [editCommentText, setEditCommentText] = useState('')
  const [deleteDialog, setDeleteDialog] = useState(null)
  const [editPostSubmitting, setEditPostSubmitting] = useState(false)
  const [editCommentSubmitting, setEditCommentSubmitting] = useState(false)
  const [isDeletingPost, setIsDeletingPost] = useState(false)
  const [isDeletingComment, setIsDeletingComment] = useState(false)
  const likesRef = useRef([])
  const menuRef = useRef(null)
  const [hoveredComment, setHoveredComment] = useState(null)
  const commentMenuRef = useRef(null)
  const commentFileRef = useRef(null)
  const commentInputRef = useRef(null)
  const commentBoxRef = useRef(null)
  const carouselRef = useRef(null)
  const lastCommentCursorPos = useRef(0)
  const navigate = useNavigate()
  const fetchFnRef = useRef({ fetchLikes: null, fetchComments: null })
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const commentsRef = useRef([])
  const closeCommentsTimerRef = useRef(null)
  const postImageUrls = getPostImageUrls(post)

  fetchFnRef.current.fetchLikes = async () => {
    const { data } = await supabase.from('likes').select('*').eq('post_id', post.id)
    if (data) { likesRef.current = data; setLikes(data) }
  }
  fetchFnRef.current.fetchComments = async () => {
    const { data } = await supabase.from('comments').select('*, profiles(username, avatar_url, display_name), comment_likes(user_id)').eq('post_id', post.id).order('created_at', { ascending: true })
    if (data) {
      const mergedComments = data.map(comment => {
        const cachedProfile = getCachedProfile(comment.profiles?.username)
        const nextComment = cachedProfile
          ? { ...comment, profiles: { ...cachedProfile, ...comment.profiles } }
          : comment
        if (nextComment.profiles?.username) {
          setCachedProfile(nextComment.profiles.username, nextComment.profiles)
        }
        return nextComment
      })
      setComments(mergedComments)
      commentsRef.current = mergedComments
    }
  }

  useEffect(() => {
    fetchFnRef.current.fetchLikes(); fetchFnRef.current.fetchComments();
    const handleGlobalLike = (e) => {
      const p = e.detail; if ((p.new && String(p.new.post_id) === String(post.id)) || (p.old && String(p.old.post_id) === String(post.id))) fetchFnRef.current.fetchLikes()
    }
    const handleGlobalComment = (e) => {
      const p = e.detail; if ((p.new && String(p.new.post_id) === String(post.id)) || (p.old && String(p.old.post_id) === String(post.id))) fetchFnRef.current.fetchComments()
    }
    const handleGlobalCommentLike = (e) => {
      const p = e.detail; const cId = p.new?.comment_id || p.old?.comment_id
      if (cId && commentsRef.current.some(c => String(c.id) === String(cId))) fetchFnRef.current.fetchComments()
    }
    window.addEventListener('tweety_global_like', handleGlobalLike); window.addEventListener('tweety_global_comment', handleGlobalComment); window.addEventListener('tweety_global_comment_like', handleGlobalCommentLike);
    return () => { window.removeEventListener('tweety_global_like', handleGlobalLike); window.removeEventListener('tweety_global_comment', handleGlobalComment); window.removeEventListener('tweety_global_comment_like', handleGlobalCommentLike); }
  }, [post.id])

  useEffect(() => {
    // Always fetch fresh profile data to catch newly-set avatars (especially for new accounts)
    if (!postUsername) return
    getProfile(postUsername, API_URL).then(d => {
      if (d) {
        if (d.display_name) setAuthorDisplayName(d.display_name)
        if (d.avatar_url) setAuthorAvatarUrl(d.avatar_url)
        if (d.username) setCachedProfile(d.username, d)
      }
    })
  }, [postUsername])

  // Listen for avatar updates from profile page so feed cards update in real-time
  useEffect(() => {
    const handleProfileUpdated = (e) => {
      const detail = e.detail
      if (!detail) return
      // Match by user_id (the post's user_id)
      if (detail.user_id === post.user_id && detail.avatar_url) {
        setAuthorAvatarUrl(detail.avatar_url)
      }
      setComments(prev => {
        const nextComments = prev.map(comment => {
          if (comment.user_id !== detail.user_id) return comment
          const nextProfile = { ...(comment.profiles || {}), ...detail }
          if (nextProfile.username) {
            setCachedProfile(nextProfile.username, nextProfile)
          }
          return {
            ...comment,
            profiles: nextProfile
          }
        })
        commentsRef.current = nextComments
        return nextComments
      })
    }
    window.addEventListener('tweety_profile_updated', handleProfileUpdated)
    return () => window.removeEventListener('tweety_profile_updated', handleProfileUpdated)
  }, [post.user_id])

  useEffect(() => {
    return () => {
      if (closeCommentsTimerRef.current) clearTimeout(closeCommentsTimerRef.current)
    }
  }, [])

  // On initial load (and only when new comment IDs appear), add any comment-with-replies
  // that isn't already tracked. Uses additive state so user-expanded branches are NOT
  // reset when a realtime comment arrives and re-triggers this effect  // On first load, all branches start collapsed.
  useEffect(() => {
    if (!comments.length) return
    const idsWithReplies = comments
      .filter(c => comments.some(r => r.parent_id === c.id))
      .map(c => c.id)
    setCollapsedThreads(prev => {
      // Additive: only add IDs that aren't already there to avoid reset/flicker
      const toAdd = idsWithReplies.filter(id => !prev.includes(id))
      return toAdd.length > 0 ? [...prev, ...toAdd] : prev
    })
  }, [comments.length > 0]) // eslint-disable-line react-hooks/exhaustive-deps

  const fixLines = (postEl) => {
    const _forceReflow = postEl.offsetHeight;

    postEl.querySelectorAll('.thread-line-stem').forEach(stem => {
      const container = stem.parentElement
      if (!container) return

      // Use the user-suggested term '.children' for the container
      const childrenContainer = container.querySelector(':scope > .children')
      if (!childrenContainer) return

      const isCollapsed = childrenContainer.classList.contains('thread-replies-collapsed') || childrenContainer.offsetHeight === 0;

      if (isCollapsed) {
        stem.style.height = '0px'
        stem.style.opacity = '0'
        return
      }

      // MEASUREMENT RULE: Reach only to the top edge of the last direct child only.
      // We use :scope > div > .comments-slide to guarantee we never measure spanning grandchildren.
      const slides = Array.from(childrenContainer.querySelectorAll(':scope > div > .comments-slide'))
      if (!slides.length) {
        stem.style.height = '0px'
        stem.style.opacity = '0'
        return
      }

      const lastSlide = slides[slides.length - 1]
      const lastElbow = lastSlide.querySelector(':scope > .thread-branch-elbow')
      const targetY = lastElbow
        ? lastElbow.getBoundingClientRect().top + lastElbow.getBoundingClientRect().height / 2
        : lastSlide.getBoundingClientRect().top + 22

      const containerTop = container.getBoundingClientRect().top
      const stemTopOffset = parseFloat(stem.style.top) || 30
      const height = Math.ceil(targetY - containerTop - stemTopOffset) + 1

      if (height > 0) {
        stem.style.height = height + 'px'
        stem.style.opacity = '1'
        stem.style.bottom = 'auto'
      }
    })
  }

  useEffect(() => {
    const postEl = document.getElementById(`post-${post.id}`)
    if (!postEl) return

    let rafId
    let timerId

    const schedule = () => {
      cancelAnimationFrame(rafId)
      // DOUBLE rAF: Wait two frames to guarantee the browser has painted the 
      // result of the state change / toggle before measuring.
      rafId = requestAnimationFrame(() => {
        rafId = requestAnimationFrame(() => fixLines(postEl))
      })
    }

    // Trigger on mount and state changes
    schedule()

    // Re-measure whenever layout shifts occur (images loading, content expanding)
    const obs = new ResizeObserver(() => {
      // Small debounce/rAF to ensure we don't spam measurements during layout
      schedule()
    })

    postEl.querySelectorAll('.thread-replies-wrapper, .comments-slide, img').forEach(el => obs.observe(el))

    return () => {
      cancelAnimationFrame(rafId)
      if (timerId) clearTimeout(timerId)
      obs.disconnect()
    }
  }, [comments, collapsedThreads, replyingTo, post.id])

  const toggleComments = () => {
    if (showComments) {
      if (closingComments) return
      setClosingComments(true)
      if (closeCommentsTimerRef.current) clearTimeout(closeCommentsTimerRef.current)
      closeCommentsTimerRef.current = setTimeout(() => {
        setShowComments(false)
        setClosingComments(false)

        // Reset the entire thread tree to the default collapsed state on close.
        // This ensures that when the comments are reopened, it starts fresh 
        // with only top-level comments visible.
        const currentComments = commentsRef.current || []
        const idsWithReplies = currentComments
          .filter(c => currentComments.some(r => r.parent_id === c.id))
          .map(c => c.id)
        setCollapsedThreads(idsWithReplies)
      }, 220)
      return
    }
    if (closeCommentsTimerRef.current) clearTimeout(closeCommentsTimerRef.current)
    setClosingComments(false)
    setShowComments(true)
  }

  // Collect all descendant comment IDs (replies of replies, recursively)
  const getAllDescendantIds = (parentId, allComments) => {
    const directChildren = allComments.filter(c => c.parent_id === parentId)
    return directChildren.flatMap(child => [child.id, ...getAllDescendantIds(child.id, allComments)])
  }

  const toggleCollapse = (id) => {
    // Use commentsRef.current (always fresh) instead of the render-closure 'comments'
    // so descendant lookup is never stale when the updater runs asynchronously.
    const latestComments = commentsRef.current
    setCollapsedThreads(prev => {
      if (prev.includes(id)) {
        // EXPAND: remove only this node — every child stays in its own collapsed state
        return prev.filter(x => x !== id)
      } else {
        // COLLAPSE: this node + every descendant at every depth is forced back to collapsed.
        // When the parent expands again it will show only direct children, all collapsed.
        const descendants = getAllDescendantIds(id, latestComments)
        const extra = [id, ...descendants].filter(x => !prev.includes(x))
        return extra.length > 0 ? [...prev, ...extra] : prev
      }
    })
  }

  const handleCommentFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > DEFAULT_IMAGE_UPLOAD_OPTIONS.maxInputBytes) {
        alert('Image must be under 20 MB before compression.')
        if (commentFileRef.current) commentFileRef.current.value = ''
        return
      }
      setCommentImage(file)
      const reader = new FileReader()
      reader.onloadend = () => setCommentImagePreview(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const attachCommentImage = (file) => {
    if (!file) return false
    if (file.size > DEFAULT_IMAGE_UPLOAD_OPTIONS.maxInputBytes) {
      alert('Image must be under 20 MB before compression.')
      return true
    }

    setCommentImage(file)
    setCommentGifUrl(null)
    const reader = new FileReader()
    reader.onloadend = () => setCommentImagePreview(reader.result)
    reader.readAsDataURL(file)
    return true
  }

  const handleCommentPaste = async (e) => {
    const items = Array.from(e.clipboardData?.items || [])
    const imageItem = items.find(item => item.type.startsWith('image/'))
    if (!imageItem) return false

    e.preventDefault()
    const file = imageItem.getAsFile()
    return attachCommentImage(file)
  }

  const handleLike = async () => {
    if (!user) return
    const userId = user.id
    const username = user.user_metadata?.username
    const already = likesRef.current.find(l => l.user_id === userId)
    if (already) {
      const newLikes = likesRef.current.filter(l => l.user_id !== userId)
      likesRef.current = newLikes
      setLikes(newLikes)
      fetch(`${API_URL}/likes`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: post.id, user_id: userId })
      }).catch(err => console.error('Unlike API error:', err))
      await broadcastLike({ sender_id: userId, post_id: post.id, action: 'unlike' })
    } else {
      setHeartAnim(true); setTimeout(() => setHeartAnim(false), 400)
      const newLike = { post_id: post.id, user_id: userId }
      const newLikes = [...likesRef.current, newLike]
      likesRef.current = newLikes
      setLikes(newLikes)
      // Use the API endpoint so the server can fire a like notification to the post owner
      fetch(`${API_URL}/likes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: post.id, user_id: userId, username })
      }).catch(err => console.error('Like API error:', err))
      await broadcastLike({ sender_id: userId, post_id: post.id, action: 'like' })
    }
  }

  const handleEditPost = async () => {
    if (!editPostText.trim()) return
    setEditPostSubmitting(true)
    try {
      const res = await fetch(`${API_URL}/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editPostText })
      })
      if (res.ok) {
        setEditingPost(false)
      }
    } finally {
      setEditPostSubmitting(false)
    }
  }

  const handleEditComment = async (commentId) => {
    if (!editCommentText.trim()) return
    setEditCommentSubmitting(true)
    try {
      const res = await fetch(`${API_URL}/replies/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editCommentText })
      })
      if (res.ok) {
        const updated = await res.json()
        const updatedComments = commentsRef.current.map(c =>
          c.id === commentId ? { ...c, content: updated.content, edited: true } : c
        )
        commentsRef.current = updatedComments
        setComments(updatedComments)
        setEditingComment(null)
        setEditCommentText('')
      }
    } finally {
      setEditCommentSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId) => {
    setIsDeletingComment(true)
    try {
      const targetComment = commentsRef.current.find(comment => comment.id === commentId)
      const res = await fetch(`${API_URL}/replies/${commentId}`, { method: 'DELETE' })

      if (!res.ok) {
        let message = 'Failed to delete comment'

        try {
          const errorData = await res.json()
          message = errorData.error || message
        } catch {
          // Ignore parse failures and keep generic message.
        }

        alert(message)
        return
      }

      setDeletingCommentId(null)
      setDeleteDialog(null)
      if (targetComment?.image_url) {
        await removeCachedMedia(targetComment.image_url)
      }
      fetchFnRef.current.fetchComments()
    } finally {
      setIsDeletingComment(false)
    }
  }

  const openDeleteDialog = (type, targetId) => {
    const element = document.getElementById(targetId)
    const rect = element?.getBoundingClientRect()

    setDeleteDialog({
      type,
      anchorTop: rect ? rect.top + rect.height / 2 : window.innerHeight / 2,
      anchorLeft: rect ? (rect.left + rect.width / 2) - 300 : (window.innerWidth / 2) - 100
    })
  }

  const handleCommentLike = async (comment) => {
    if (!user) return; const id = comment.id; const already = comment.comment_likes?.some(l => l.user_id === user.id)
    if (!already) { setAnimatingCommentId(id); setTimeout(() => setAnimatingCommentId(null), 400) }

    // Update local state and ref if we had a commentsRef (we do)
    const updatedComments = commentsRef.current.map(c =>
      c.id === id ? {
        ...c,
        comment_likes: already
          ? (c.comment_likes || []).filter(l => l.user_id !== user.id)
          : [...(c.comment_likes || []), { user_id: user.id, comment_id: id }]
      } : c
    )
    commentsRef.current = updatedComments
    setComments(updatedComments)

    if (already) {
      await fetch(`${API_URL}/comment_likes`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment_id: id, user_id: user.id })
      })
      await broadcastCommentLike({ sender_id: user.id, comment_id: id, action: 'unlike' })
    } else {
      await fetch(`${API_URL}/comment_likes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment_id: id, user_id: user.id })
      })
      await broadcastCommentLike({ sender_id: user.id, comment_id: id, action: 'like' })
    }
  }

  const handleComment = async (e, parent_id = null) => {
    const content = parent_id ? replyContent : commentInput
    if (!content.trim() && !commentImage && !commentGifUrl) return; 
    setCommentSending(true)
    try {
      let imageUrl = commentGifUrl
      if (commentImage) {
        const { file: uploadImage, mimeType } = await compressImageForUpload(commentImage, DEFAULT_IMAGE_UPLOAD_OPTIONS)
        const fileName = `comment-${user.id}-${Date.now()}.${getUploadExtension(uploadImage, mimeType)}`
        const { error } = await supabase.storage.from('post-images').upload(fileName, uploadImage, { contentType: mimeType })
        if (error) throw error
        imageUrl = supabase.storage.from('post-images').getPublicUrl(fileName).data.publicUrl
      }
      const res = await fetch(`${API_URL}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: post.id, user_id: user.id, username: user.user_metadata.username, content, image_url: imageUrl, parent_id })
      })
      const json = await res.json()
      const serverComment = Array.isArray(json) ? json[0] : json

      if (serverComment) {
        fetchFnRef.current.fetchComments()
        // Notification to the post owner is handled server-side in /routes/comments.js
        await broadcastComment({ sender_id: user.id, post_id: post.id, comment_id: serverComment.id, action: 'insert', parent_id })
      }
      if (parent_id) { setReplyingTo(null); setReplyContent('') } else { setCommentInput(''); setCommentImage(null); setCommentImagePreview(null); setCommentGifUrl(null) }
      if (commentFileRef.current) commentFileRef.current.value = ''
    } catch (error) {
      console.error('Comment upload failed:', error)
      alert(error.message || 'We couldn’t optimize that image for upload. Try a smaller image.')
    } finally {
      setCommentSending(false)
    }
  }

  const handleComposerChange = (e, type, id = null) => {
    const newContent = e.target.value
    if (type === 'main') setCommentInput(newContent)
    else setReplyContent(newContent)

    const cursorPos = e.target.selectionStart ?? newContent.length
    lastCommentCursorPos.current = cursorPos

    const textBeforeCursor = newContent.slice(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1)
      const hasSpace = textAfterAt.includes(' ')

      if (!hasSpace && textAfterAt.length >= 0) {
        setMentionSearchQuery(textAfterAt)
        setShowMentionPicker(true)
        setActiveComposer(id || 'main')

        // Position calculation
        const inputRef = type === 'main' ? commentInputRef : { current: e.target }
        const boxRef = commentBoxRef // Relative to this or the group

        if (inputRef.current && boxRef.current) {
          const boxRect = boxRef.current.getBoundingClientRect()
          const selection = window.getSelection()
          let positioned = false

          if (selection.rangeCount > 0) {
            try {
              const range = selection.getRangeAt(0).cloneRange()
              const rects = range.getClientRects()
              if (rects.length > 0) {
                const rect = rects[0]
                setMentionPickerPosition({
                  top: rect.bottom - boxRect.top + 5,
                  left: Math.min(rect.left - boxRect.left, boxRect.width - 320)
                })
                positioned = true
              }
            } catch (err) { }
          }
          if (!positioned) {
            const editorRect = inputRef.current.getBoundingClientRect()
            setMentionPickerPosition({
              top: editorRect.bottom - boxRect.top + 5,
              left: 48
            })
          }
        }
      } else {
        setShowMentionPicker(false)
      }
    } else {
      setShowMentionPicker(false)
    }
  }

  const handleMentionSelect = (selectedUser) => {
    const currentContent = activeComposer === 'main' ? commentInput : replyContent
    const cursorPos = lastCommentCursorPos.current || currentContent.length
    const textBeforeCursor = currentContent.slice(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')

    if (lastAtIndex !== -1) {
      const beforeAt = currentContent.slice(0, lastAtIndex)
      const afterCursor = currentContent.slice(cursorPos)
      const newContent = beforeAt + '@' + selectedUser.username + ' ' + afterCursor
      if (activeComposer === 'main') setCommentInput(newContent)
      else setReplyContent(newContent)
    }
    setShowMentionPicker(false)
  }

  const handleCopyLink = () => { navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`); setToast(true); setTimeout(() => setToast(false), 2000) }
  const openPostMediaGallery = (initialIndex = 0) => {
    navigate(`/post/${post.id}/media`, {
      state: {
        images: postImageUrls,
        initialIndex,
        from: window.location.pathname,
        fromLabel: 'Back'
      }
    })
  }

  const handleImageScroll = (e) => {
    const scrollLeft = e.target.scrollLeft
    const width = e.target.clientWidth
    const newIndex = Math.round(scrollLeft / width)
    if (newIndex !== currentImageIndex) {
      setCurrentImageIndex(newIndex)
    }
  }

  const scrollCarousel = (e, direction) => {
    e.stopPropagation()
    if (carouselRef.current) {
      const { scrollLeft, clientWidth } = carouselRef.current
      const newScroll = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth
      carouselRef.current.scrollTo({ left: newScroll, behavior: 'smooth' })
    }
  }

  const renderCommentThread = (comment, depth = 0, isLast = false) => {
    const replies = comments.filter(c => c.parent_id === comment.id);
    const hasReplies = replies.length > 0;
    const isCollapsed = collapsedThreads.includes(comment.id);
    const commentUsername = comment.profiles?.username || comment.username || null;

    return (
      <div key={comment.id} className={depth === 0 ? "border-b border-border-dark relative thread-container" : 'comments-slide ml-12 py-3 bg-surface border-b-0 relative'} style={depth > 0 ? { paddingBottom: isLast ? '16px' : '12px' } : {}} onClick={e => e.stopPropagation()}>
        {hasReplies && (
          <div
            className={`thread-line-stem absolute w-[2px] bg-thread z-[1] ${isCollapsed ? 'thread-replies-collapsed' : ''}`}
            style={{
              left: depth === 0 ? '14px' : '16px',
              top: depth === 0 ? '30px' : '20px'
              // height is set by the ResizeObserver useEffect after DOM layout
            }}
            onClick={() => toggleCollapse(comment.id)}
            title="Collapse thread"
          />
        )}
        {depth > 0 && (
          <div
            className="thread-branch-elbow absolute top-[10px] h-[24px] border-l-2 border-b-2 border-thread rounded-bl-xl z-[1] cursor-pointer"
            style={{
              left: depth === 1 ? '-34px' : '-32px',
              width: depth === 1 ? '34px' : '32px'
            }}
            onClick={() => toggleCollapse(comment.id)}
            title="Collapse thread"
          />
        )}

        <div id={`comment-${comment.id}`} className={`${depth === 0 ? 'py-4 bg-surface border-b-0' : ''} relative`} style={depth === 0 ? { paddingBottom: (replies.length > 0 || replyingTo === comment.id) ? '12px' : '16px' } : {}}>
          <div className="flex justify-between mb-1.5 items-center">
            <div className="flex items-center gap-2 relative z-[2] cursor-pointer" onClick={() => commentUsername && navigate(`/profile/${commentUsername}`)}>
              <div className={`relative z-[2] ${depth > 0 ? 'w-8 h-8' : ''}`}>
                {comment.profiles?.avatar_url
                  ? <img src={comment.profiles.avatar_url} className={`${depth > 0 ? 'w-8 h-8' : 'w-7 h-7'} rounded-full object-cover block`} alt="" />
                  : <div className={`${depth > 0 ? 'w-8 h-8 flex items-center justify-center text-[0.8rem]' : 'w-7 h-7 flex items-center justify-center text-[0.75rem]'} rounded-full bg-primary text-white`}>{commentUsername?.charAt(0)}</div>}
              </div>
              <div className="flex flex-col"><span className="font-bold text-[0.85rem] text-text-main">{comment.profiles?.display_name || commentUsername}<span className="text-text-dim font-normal text-[0.72rem] ml-1.5">· {formatDate(comment.created_at)}</span></span><span className="text-[0.75rem] text-text-dim">@{commentUsername}</span></div>
            </div>
          </div>
          <div className={depth > 0 ? "ml-10" : "ml-12"}>
            {editingComment === comment.id ? (
              <div className="mt-1 mb-2">
                <textarea
                  className="w-full bg-white/5 border border-primary rounded-xl p-3 text-text-main text-[0.9rem] resize-none outline-none focus:border-primary focus:bg-white/10 transition-all"
                  rows={3}
                  value={editCommentText}
                  onChange={e => setEditCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditComment(comment.id) } if (e.key === 'Escape') { setEditingComment(null) } }}
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button className={`py-1.5 px-4 bg-primary text-white border-none rounded-xl text-[0.82rem] font-bold transition-colors ${editCommentSubmitting ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer hover:bg-primary-hover'}`} onClick={() => handleEditComment(comment.id)} disabled={editCommentSubmitting}>{editCommentSubmitting ? 'Saving...' : 'Save'}</button>
                  <button className={`py-1.5 px-4 bg-transparent text-text-dim border border-border-dark rounded-xl text-[0.82rem] transition-colors ${editCommentSubmitting ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer hover:bg-white/5'}`} onClick={() => setEditingComment(null)} disabled={editCommentSubmitting}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className={`text-[${depth > 0 ? '0.85rem' : '0.9rem'}] text-text-reply leading-relaxed`}>
                {renderContent(comment.content, navigate)}
                {comment.edited && <span className="text-text-dim text-[0.7rem] ml-1.5 italic">(edited)</span>}
              </div>
            )}
            {comment.image_url && <CachedImage src={comment.image_url} fallbackSrc={comment.image_url} className="mt-2 max-w-[60%] max-h-[150px] object-contain rounded-lg cursor-pointer" alt="" onClick={() => setViewingImage(comment.image_url)} />}
            <div className="flex gap-4 mt-2 items-center">
              <button className={`bg-none border-none cursor-pointer text-[0.8rem] flex items-center gap-1 transition-colors ${comment.comment_likes?.some(l => l.user_id === user?.id) ? 'text-[#e0245e]' : 'text-text-dim'} ${animatingCommentId === comment.id ? 'heart-bounce' : ''}`} onClick={() => handleCommentLike(comment)}>
                <span className={`material-symbols-outlined text-[1.1rem] ${comment.comment_likes?.some(l => l.user_id === user?.id) ? 'filled text-[#e0245e]' : ''}`}>favorite</span> <span className={comment.comment_likes?.some(l => l.user_id === user?.id) ? 'font-bold' : 'font-normal'}>{comment.comment_likes?.length || 0}</span>
              </button>
              <button className="bg-none border-none cursor-pointer text-[0.8rem] text-text-dim flex items-center gap-1 hover:text-primary transition-colors" onClick={() => {
                setReplyingTo(replyingTo === comment.id ? null : comment.id);
                setReplyContent(comment.username === user?.username ? '' : `@${comment.username} `);
                if (collapsedThreads.includes(comment.id)) { toggleCollapse(comment.id); }
              }}><span className="material-symbols-outlined filled">reply</span></button>
              {user?.id === comment.user_id && (
                <>
                  <button
                    className="bg-none border-none cursor-pointer text-[0.78rem] text-text-dim flex items-center gap-1 hover:text-primary transition-colors"
                    title="Edit comment"
                    onClick={() => { setEditingComment(comment.id); setEditCommentText(comment.content) }}
                  >
                    <span className="material-symbols-outlined filled">edit</span>
                  </button>
                  <button
                    className="bg-none border-none cursor-pointer text-[0.78rem] text-text-dim flex items-center gap-1 hover:text-red-500 transition-colors"
                    title="Delete comment"
                    onClick={() => { setDeletingCommentId(comment.id); openDeleteDialog('comment', `comment-${comment.id}`) }}
                  >
                    <span className="material-symbols-outlined filled">delete</span>
                  </button>
                </>
              )}
            </div>
          </div>
          {deletingCommentId === comment.id && (
            <ScopedConfirmDialog
              title="Delete Comment?"
              message="This comment will be removed from this thread."
              confirmLabel="Delete"
              anchorTop={deleteDialog?.anchorTop ?? window.innerHeight / 2}
              anchorLeft={deleteDialog?.anchorLeft ?? window.innerWidth / 2}
              onCancel={() => { setDeletingCommentId(null); setDeleteDialog(null) }}
              onConfirm={() => handleDeleteComment(comment.id)}
              isSubmitting={isDeletingComment}
            />
          )}
        </div>

        <div className={`children ${isCollapsed ? 'thread-replies-collapsed' : ''}`}>
          {replyingTo === comment.id && (
            <div className="ml-12 relative bg-none border-none py-3 px-0">
              <div
                className="thread-branch-elbow absolute top-[18px] h-[24px] border-l-2 border-b-2 border-thread rounded-bl-xl z-[1] cursor-pointer"
                style={{
                  left: depth === 0 ? '-34px' : '-32px',
                  width: depth === 0 ? '34px' : '32px'
                }}
                onClick={() => toggleCollapse(comment.id)}
                title="Collapse thread"
              />
              <div className="pill-input-outer relative">
                <button className="circle-action-btn" onClick={() => setShowMediaMenu(showMediaMenu === comment.id ? null : comment.id)}>
                  <span className={`material-symbols-outlined text-[1.1rem]`}>{showMediaMenu === comment.id ? 'close' : 'add'}</span>
                </button>

                {showMediaMenu === comment.id && (
                  <div className="media-menu-popover">
                    <div className="media-menu-item" onClick={() => { commentFileRef.current.click(); setShowMediaMenu(null) }}>
                      <span className="material-symbols-outlined">image</span> Image
                    </div>
                    <div className="media-menu-item" onClick={() => { setShowCommentGifPicker(comment.id); setShowMediaMenu(null) }}>
                      <span className="material-symbols-outlined filled">bolt</span> GIF
                    </div>
                  </div>
                )}

                <div className="pill-input-container">
                  <RichTextEditor placeholder="Start a new reply..." content={replyContent} onChange={(e) => handleComposerChange(e, 'reply', comment.id)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(null, comment.id) } }} onPaste={handleCommentPaste} minHeight="36px" />
                  <button
                    className={`circle-action-btn ${(replyContent.trim() || commentImage || commentGifUrl) ? 'send-btn-pop' : 'send-btn-hide'} ${commentSending ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                    style={{ flexShrink: 0, backgroundColor: '#00BFA6', color: 'white', border: 'none', pointerEvents: (replyContent.trim() || commentImage || commentGifUrl) ? 'auto' : 'none' }}
                    onClick={() => handleComment(null, comment.id)}
                    disabled={commentSending}
                  >
                    <span className="material-symbols-outlined filled">arrow_upward</span>
                  </button>
                </div>
              </div>
              {(commentImagePreview || commentGifUrl) && (
                <div className="ml-12 mt-2.5">
                  <div className="relative w-fit rounded-xl overflow-hidden border border-border-dark">
                    <img src={commentImagePreview || commentGifUrl} className="max-w-[200px] max-h-[150px] block" alt="Preview" />
                    <button
                      onClick={() => { setCommentImage(null); setCommentImagePreview(null); setCommentGifUrl(null) }}
                      className="absolute top-2 right-2 bg-black/70 text-white border-none rounded-full w-6 h-6 cursor-pointer flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined filled">close</span>
                    </button>
                  </div>
                </div>
              )}
              {showCommentGifPicker === comment.id && (
                <div className="mt-2.5">
                  <GifPicker
                    onSelect={(url) => { setCommentGifUrl(url); setShowCommentGifPicker(false) }}
                    onClose={() => setShowCommentGifPicker(null)}
                  />
                </div>
              )}
              <div className="flex gap-2 mt-2.5 ml-12">
                <button className="bg-none border-none text-text-dim py-1 px-2 text-[0.75rem] cursor-pointer hover:text-red-500 transition-colors" onClick={() => setReplyingTo(null)}>Cancel</button>
              </div>
            </div>
          )}

          <div className="relative mt-3">
            {replies.map((reply, rIdx) => renderCommentThread(reply, depth + 1, rIdx === replies.length - 1))}
          </div>
        </div>

        {isCollapsed && replies.length > 0 && (
          <div style={{ marginLeft: depth === 0 ? '48px' : '40px', padding: '8px 0' }}>
            <div className="replies-collapsed-badge" onClick={() => toggleCollapse(comment.id)}>
              <span className="material-symbols-outlined filled mr-1.5">expand_more</span>
              View {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
            </div>
          </div>
        )}
      </div>
    )
  }


  return (
    <div className="bg-surface rounded-none p-5 border border-border-dark mb-0 relative" id={`post-${post.id}`}>
      {toast && <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-primary text-white py-3 px-6 rounded-xl z-[99999] flex items-center gap-2"><span className="material-symbols-outlined filled">check</span> Link copied</div>}

      {/* Navigation Wrapper - Clicks here go to the post page */}
      <div onClick={onNavigate} className="cursor-pointer">
        <div className="flex justify-between mb-3 items-center">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={(e) => { e.stopPropagation(); if (postUsername) navigate(`/profile/${postUsername}`) }}>
            <div className="shrink-0">{authorAvatarUrl ? <img src={authorAvatarUrl} className="w-[38px] h-[38px] rounded-full object-cover border-2 border-border-dark" alt="" /> : <div className="w-[38px] h-[38px] rounded-full bg-primary flex items-center justify-center text-base font-bold text-white">{postUsername?.charAt(0)}</div>}</div>
            <div><div className="font-bold text-text-main text-[0.95rem]">{authorDisplayName || postUsername}<span className="text-text-dim font-normal text-[0.78rem] ml-1.5">· {formatDate(post.created_at)}</span></div><div className="text-primary text-[0.78rem]">@{postUsername}</div></div>
          </div>
          <div className="relative" ref={menuRef}>
            <button className="bg-none border-none cursor-pointer text-text-dim text-xl" onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}>
              <span className="material-symbols-outlined filled">more_horiz</span>
            </button>
            {showMenu && (
              <div className="absolute right-0 top-7 bg-surface border border-border-dark rounded-xl p-1.5 z-[999] min-w-[150px]" onClick={e => e.stopPropagation()}>
                <button className="flex items-center gap-2 w-full py-2 px-3 bg-none border-none cursor-pointer text-text-main text-[0.9rem] rounded-md hover:bg-primary-dim" onClick={handleCopyLink}><span className="material-symbols-outlined filled">link</span> Copy Link</button>
                {user?.id === post.user_id && (
                  <>
                    <button className="flex items-center gap-2 w-full py-2 px-3 bg-none border-none cursor-pointer text-text-main text-[0.9rem] rounded-md hover:bg-primary-dim" onClick={() => { setEditPostText(post.content); setEditingPost(true); setShowMenu(false) }}><span className="material-symbols-outlined filled">edit</span> Edit</button>
                    <button className="flex items-center gap-2 w-full py-2 px-3 bg-none border-none cursor-pointer text-red-500 text-[0.9rem] rounded-md hover:bg-red-500/10" onClick={() => { setShowMenu(false); setShowDeleteModal(true); openDeleteDialog('post', `post-${post.id}`) }}><span className="material-symbols-outlined filled">delete</span> Delete</button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="text-base leading-relaxed text-text-main mb-1">{renderContent(post.content, navigate, highlightQuery)}{post.edited && <span className="text-text-dim text-[0.72rem] ml-1.5 italic">(edited)</span>}</div>
        {postImageUrls.length === 1 && (
          <div className="mt-3 overflow-hidden rounded-2xl max-h-[500px] flex justify-center bg-black/5">
            <CachedImage src={postImageUrls[0]} fallbackSrc={postImageUrls[0]} className="max-w-full max-h-[500px] w-auto h-auto object-contain cursor-pointer" alt="" onClick={(e) => { e.stopPropagation(); setViewingImage(postImageUrls[0]) }} />
          </div>
        )}
        {postImageUrls.length > 1 && (
          <div className="mt-3 relative group">
            <div className="carousel-container rounded-2xl overflow-hidden bg-black/5 flex h-[350px] relative" onScroll={handleImageScroll} ref={carouselRef}>
              {postImageUrls.map((imageUrl, index) => (
                <div key={index} className="carousel-slide relative h-full w-full shrink-0 flex items-center justify-center">
                  <CachedImage src={imageUrl} fallbackSrc={imageUrl} className="w-full h-full object-cover cursor-pointer" alt="" onClick={(e) => { e.stopPropagation(); setViewingImage(imageUrl) }} />
                </div>
              ))}
            </div>
            
            {/* Navigation Arrows */}
            {currentImageIndex > 0 && (
              <button 
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center cursor-pointer border-none opacity-0 group-hover:opacity-100 transition-opacity z-10"
                onClick={(e) => scrollCarousel(e, 'left')}
              >
                <span className="material-symbols-outlined filled text-sm">arrow_back_ios_new</span>
              </button>
            )}
            
            {currentImageIndex < postImageUrls.length - 1 && (
              <button 
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center cursor-pointer border-none opacity-0 group-hover:opacity-100 transition-opacity z-10"
                onClick={(e) => scrollCarousel(e, 'right')}
              >
                <span className="material-symbols-outlined filled text-sm">arrow_forward_ios</span>
              </button>
            )}

            {/* Pagination Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 bg-black/40 px-3 py-1.5 rounded-full pointer-events-none">
              {postImageUrls.map((_, index) => (
                <div 
                  key={index} 
                  className={`rounded-full transition-all duration-300 ${index === currentImageIndex ? 'bg-primary w-2 h-2 scale-110' : 'bg-white/60 w-1.5 h-1.5'}`} 
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-4 items-center border-t border-border-dark pt-3 relative z-10" onClick={(e) => { e.stopPropagation(); toggleComments(); }}>
        <button className={`bg-none border-none cursor-pointer text-[0.9rem] py-1.5 px-3 rounded-lg flex items-center gap-1.5 hover:bg-primary-dim transition-colors ${likes.some(l => l.user_id === user?.id) ? 'text-[#e0245e]' : 'text-text-dim'} ${heartAnim ? 'heart-bounce' : ''}`} onClick={(e) => { e.stopPropagation(); handleLike(); }}><span className={`material-symbols-outlined text-[1.1rem] ${likes.some(l => l.user_id === user?.id) ? 'filled' : ''}`}>favorite</span> <span>{likes.length}</span></button>
        <button className={`bg-none border-none cursor-pointer text-[0.9rem] py-1.5 px-3 rounded-lg flex items-center gap-1.5 hover:bg-primary-dim transition-colors ${showComments ? 'text-primary' : 'text-text-dim'}`} onClick={(e) => { e.stopPropagation(); toggleComments(); }}><span className="material-symbols-outlined">mode_comment</span> <span>{comments.length}</span></button>
      </div>
      {(showComments || closingComments) && (
        <div className={`mt-4 ${closingComments ? 'comments-slide-up' : 'comments-slide'}`} onClick={e => e.stopPropagation()}>
          <input type="file" ref={commentFileRef} onChange={handleCommentFileChange} className="hidden" accept="image/*" />


          {comments.filter(c => !c.parent_id).map(comment => renderCommentThread(comment))}

          <div className="mt-8 relative" ref={commentBoxRef}>
            <div className="flex items-center gap-2.5 w-full relative">
              <button className="w-8 h-8 text-[0.9rem] rounded-full border border-white/10 bg-none text-primary flex items-center justify-center cursor-pointer hover:bg-primary/10 hover:border-primary transition-all" onClick={() => setShowMediaMenu(showMediaMenu === 'main' ? null : 'main')}>
                <span className={`material-symbols-outlined text-[1.1rem]`}>{showMediaMenu === 'main' ? 'close' : 'add'}</span>
              </button>

              {showMediaMenu === 'main' && (
                <div className="absolute bottom-[calc(100%+10px)] left-0 bg-surface border border-border-dark rounded-xl p-2 flex flex-col gap-1 shadow-[0_4px_20px_rgba(0,0,0,0.3)] z-[1000] animate-[mediaMenuPop_0.25s_cubic-bezier(0.175,0.885,0.32,1.275)]">
                  <div className="flex items-center gap-2.5 py-2 px-3 rounded-lg text-text-main cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors text-[0.9rem] whitespace-nowrap" onClick={() => { commentFileRef.current.click(); setShowMediaMenu(null) }}>
                    <span className="material-symbols-outlined">image</span> Image
                  </div>
                  <div className="flex items-center gap-2.5 py-2 px-3 rounded-lg text-text-main cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors text-[0.9rem] whitespace-nowrap" onClick={() => { setShowCommentGifPicker('main'); setShowMediaMenu(null) }}>
                    <span className="material-symbols-outlined filled">bolt</span> GIF
                  </div>
                </div>
              )}

              <div className="flex-1 bg-white/5 border border-white/10 rounded-[25px] py-1 px-1.5 pl-4 flex items-center gap-2 relative transition-all focus-within:bg-white/10 focus-within:border-primary">
                <RichTextEditor textareaRef={commentInputRef} placeholder="Start a new message..." content={commentInput} onChange={(e) => handleComposerChange(e, 'main')} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment() } }} onPaste={handleCommentPaste} minHeight="40px" />
                <button
                  className={`w-8 h-8 text-[0.9rem] rounded-full border-none flex items-center justify-center transition-all shrink-0 bg-primary text-white ${(commentInput.trim() || commentImage || commentGifUrl) ? 'scale-100 opacity-100 animate-[popIn_0.3s_cubic-bezier(0.175,0.885,0.32,1.275)]' : 'scale-0 opacity-0 pointer-events-none'} ${commentSending ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}`}
                  onClick={handleComment}
                  disabled={commentSending}
                >
                  <span className="material-symbols-outlined filled">arrow_upward</span>
                </button>
              </div>
            </div>
            {(commentImagePreview || commentGifUrl) && (
              <div className="mt-2.5 ml-12">
                <div className="relative w-fit rounded-xl overflow-hidden border border-border-dark">
                  <img src={commentImagePreview || commentGifUrl} className="max-w-[200px] max-h-[150px] block" alt="Preview" />
                  <button
                    onClick={() => { setCommentImage(null); setCommentImagePreview(null); setCommentGifUrl(null) }}
                    className="absolute top-2 right-2 bg-black/70 text-white border-none rounded-full w-6 h-6 cursor-pointer flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined filled">close</span>
                  </button>
                </div>
              </div>
            )}
            {showCommentGifPicker === 'main' && (
              <div className="mt-2.5">
                <GifPicker
                  onSelect={(url) => { setCommentGifUrl(url); setShowCommentGifPicker(false) }}
                  onClose={() => setShowCommentGifPicker(null)}
                />
              </div>
            )}
            {showMentionPicker && (
              <UserMentionPicker
                onSelect={handleMentionSelect}
                onClose={() => setShowMentionPicker(false)}
                searchQuery={mentionSearchQuery}
                position={{ top: mentionPickerPosition.top, left: mentionPickerPosition.left }}
                currentUserId={user?.id}
              />
            )}
          </div>
        </div>
      )}
      {viewingImage && createPortal(
        <div className="fixed inset-0 bg-black/85 z-[99999] flex items-center justify-center backdrop-blur-md" onClick={() => setViewingImage(null)}>
          <div className="relative animate-[popIn_0.3s_ease-out]">
            <button className="absolute -top-10 right-0 text-white cursor-pointer bg-none border-none text-xl hover:text-primary transition-colors" onClick={() => setViewingImage(null)}>
              <span className="material-symbols-outlined filled">close</span>
            </button>
            <CachedImage src={viewingImage} fallbackSrc={viewingImage} className="max-w-[90vw] max-h-[85vh] rounded-lg shadow-2xl" alt="" />
          </div>
        </div>,
        document.body
      )}
      {showDeleteModal && (
        <ScopedConfirmDialog
          title="Delete Post?"
          message="This action cannot be undone and will remove the post from your timeline."
          confirmLabel="Delete"
          anchorTop={deleteDialog?.anchorTop ?? window.innerHeight / 2}
          anchorLeft={deleteDialog?.anchorLeft ?? window.innerWidth / 2}
          onCancel={() => { setShowDeleteModal(false); setDeleteDialog(null) }}
          onConfirm={async () => { 
            setIsDeletingPost(true)
            try {
              await removeCachedMedia([
                ...postImageUrls,
                ...commentsRef.current.map(comment => comment.image_url)
              ])
              await onDelete(post.id)
            } finally {
              setIsDeletingPost(false)
              setShowDeleteModal(false)
              setDeleteDialog(null)
            }
          }}
          isSubmitting={isDeletingPost}
        />
      )}
      {editingPost && createPortal(
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] backdrop-blur-sm" onClick={() => setEditingPost(false)}>
          <div className="bg-surface rounded-2xl p-6 border border-border-dark w-[520px] max-w-[95vw] shadow-2xl animate-[popIn_0.3s_cubic-bezier(0.175,0.885,0.32,1.275)]" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><span className="material-symbols-outlined filled text-primary">edit</span> Edit Post</h3>
            <textarea
              className="w-full bg-white/5 border border-border-dark rounded-xl p-4 text-text-main text-[0.95rem] resize-none outline-none focus:border-primary focus:bg-white/8 transition-all min-h-[120px]"
              value={editPostText}
              onChange={e => setEditPostText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') setEditingPost(false) }}
              autoFocus
            />
            <div className="flex justify-between items-center mt-3">
              <span className={`text-[0.82rem] ${editPostText.length > 260 ? 'text-red-500 font-bold' : 'text-text-dim'}`}>{editPostText.length}/280</span>
              <div className="flex gap-2">
                <button className={`py-2 px-5 bg-transparent text-text-dim border border-border-dark rounded-xl text-[0.88rem] transition-colors ${editPostSubmitting ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer hover:bg-white/5'}`} onClick={() => setEditingPost(false)} disabled={editPostSubmitting}>Cancel</button>
                <button className={`py-2 px-5 bg-primary text-white border-none rounded-xl text-[0.88rem] font-bold transition-colors ${(!editPostText.trim() || editPostText.length > 280 || editPostSubmitting) ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer hover:bg-primary-hover'}`} onClick={handleEditPost} disabled={!editPostText.trim() || editPostText.length > 280 || editPostSubmitting}>{editPostSubmitting ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}



