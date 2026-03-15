import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { styles } from '../styles/Chat.styles'
import GifPicker from '../components/GifPicker'
import { API_URL } from '../utils/apiUrl'

export default function ChatPage() {
    const { userId } = useParams() // recipient user id or a conversation id
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [recipient, setRecipient] = useState(null)
    const [currentUser, setCurrentUser] = useState(null)
    const [showSettings, setShowSettings] = useState(false)
    const [isClosingSettings, setIsClosingSettings] = useState(false)
    const [showMediaInModal, setShowMediaInModal] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [isHoveringMedia, setIsHoveringMedia] = useState(false)
    const [isHoveringProfile, setIsHoveringProfile] = useState(false)
    const [mediaTab, setMediaTab] = useState('photos') // 'photos' or 'videos'
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [showSendBtn, setShowSendBtn] = useState(false)
    const [isClosingBtn, setIsClosingBtn] = useState(false)
    const [showPlusMenu, setShowPlusMenu] = useState(false)
    const [hoveredPlusItem, setHoveredPlusItem] = useState(null)
    const [showGifPicker, setShowGifPicker] = useState(false)
    const [mediaFile, setMediaFile] = useState(null)
    const [mediaPreview, setMediaPreview] = useState(null)
    const [mediaType, setMediaType] = useState(null) // 'image' or 'video'
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
    const [selectedMessageId, setSelectedMessageId] = useState(null)
    const textareaRef = useRef(null)
    const fileInputRef = useRef(null)
    const messagesEndRef = useRef(null)

    useEffect(() => {
        if (input.trim() || mediaPreview) {
            setShowSendBtn(true)
            setIsClosingBtn(false)
        } else if (showSendBtn) {
            setIsClosingBtn(true)
            setTimeout(() => {
                setShowSendBtn(false)
                setIsClosingBtn(false)
            }, 100) // matches 0.1s animation
        }
    }, [input, mediaPreview])

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])
    const navigate = useNavigate()

    useEffect(() => {
        let channel;

        const init = async () => {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            setCurrentUser(user)

            // Fetch recipient info
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', userId)
                .single()
            setRecipient(profile)

            // Fetch messages (only ones not deleted by me)
            const { data: msgs } = await supabase
                .from('messages')
                .select('*')
                .or(`and(sender_id.eq.${user.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${user.id})`)
                .order('created_at', { ascending: true })

            // Filter out messages that I deleted for myself
            const filteredMsgs = (msgs || []).filter(msg => {
                const isMeSender = msg.sender_id === user.id
                return isMeSender ? !msg.deleted_by_sender : !msg.deleted_by_recipient
            })

            setMessages(filteredMsgs)

            // Mark as read
            await supabase
                .from('messages')
                .update({ read: true })
                .eq('sender_id', userId)
                .eq('recipient_id', user.id)

            // Subscribe to recipient profile changes
            const profileChannel = supabase
                .channel(`chat-profile-${userId}-${Math.random()}`)
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `user_id=eq.${userId}`
                }, (payload) => {
                    setRecipient(payload.new)
                })
                .subscribe()

            // Subscribe to new messages
            channel = supabase
                .channel(`chat-${userId}-${Math.random()}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                }, (payload) => {
                    console.log('Real-time payload received:', payload);
                    const { sender_id, recipient_id } = payload.new;

                    // Match ONLY this specific conversation pair
                    const isRelevant =
                        (sender_id === userId && recipient_id === user.id) ||
                        (sender_id === user.id && recipient_id === userId);

                    if (isRelevant) {
                        setMessages(prev => {
                            // Check if already exists (optimistic UI check)
                            if (prev.some(m => m.id === payload.new.id)) return prev;
                            return [...prev, payload.new];
                        });
                    }
                })
                .subscribe((status) => {
                    console.log(`Real-time subscription status for chat: ${status}`);
                })

            setLoading(false)

            return () => {
                if (channel) supabase.removeChannel(channel)
                if (profileChannel) supabase.removeChannel(profileChannel)
            }
        }

        init()

        return () => {
            if (channel) supabase.removeChannel(channel)
        }
    }, [userId])

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            const newHeight = Math.min(textareaRef.current.scrollHeight, 240) // ~11 lines (20px line-height * 11 + padding)
            textareaRef.current.style.height = `${newHeight}px`
        }
    }, [input])

    const scrollToBottom = (behavior = 'smooth') => {
        // Use a timeout to ensure DOM has painted, especially on mobile
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior })
        }, 100)
    }

    const handleFileSelect = (e) => {
        const file = e.target.files[0]
        if (!file) return

        const type = file.type.startsWith('video') ? 'video' : 'image'
        setMediaFile(file)
        setMediaType(type)

        const reader = new FileReader()
        reader.onload = (e) => setMediaPreview(e.target.result)
        reader.readAsDataURL(file)
        setShowPlusMenu(false)
    }

    const clearMedia = () => {
        setMediaFile(null)
        setMediaPreview(null)
        setMediaType(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const [deleteType, setDeleteType] = useState(null) // 'me' or 'everyone'

    const handleDeleteForMe = async () => {
        // Find all messages between these users
        const { data: msgsToUpdate } = await supabase
            .from('messages')
            .select('id, sender_id')
            .or(`and(sender_id.eq.${currentUser.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${currentUser.id})`)

        if (!msgsToUpdate) return

        // Update each message setting the delete flag for me
        for (const msg of msgsToUpdate) {
            const isMeSender = msg.sender_id === currentUser.id
            const updateObj = isMeSender ? { deleted_by_sender: true } : { deleted_by_recipient: true }

            await supabase
                .from('messages')
                .update(updateObj)
                .eq('id', msg.id)
        }
        navigate('/messages')
    }

    const handleDeleteForEveryone = async () => {
        const { error } = await supabase
            .from('messages')
            .delete()
            .or(`and(sender_id.eq.${currentUser.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${currentUser.id})`)

        if (!error) {
            navigate('/messages')
        } else {
            alert('Failed to delete for everyone')
            setShowDeleteConfirm(false)
        }
    }

    // Media sent in this conversation (photos and videos from messages)
    const isVideo = (url) => {
        if (!url) return false
        const ext = url.split('?')[0].split('.').pop().toLowerCase()
        return ['mp4', 'webm', 'mov'].includes(ext)
    }

    const conversationPhotos = messages.filter(
        (msg) => (msg.media_url || msg.image_url) && !isVideo(msg.media_url || msg.image_url)
    ).map((msg) => msg.media_url || msg.image_url)
    const conversationVideos = messages
        .filter((msg) => (msg.media_url || msg.image_url) && isVideo(msg.media_url || msg.image_url))
        .map((msg) => msg.media_url || msg.image_url)

    const handleKeyDown = (e) => {
        if (e.key === 'Tab' && e.shiftKey) {
            e.preventDefault()
            const { selectionStart, selectionEnd, value } = e.target
            const newValue = value.slice(0, selectionStart) + '\n' + value.slice(selectionEnd)
            setInput(newValue)
            setTimeout(() => {
                e.target.selectionStart = e.target.selectionEnd = selectionStart + 1
            }, 0)
        } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend(e)
        }
    }

    const handleSend = async (e) => {
        if (e) e.preventDefault()
        if ((!input.trim() && !mediaFile && !mediaPreview) || sending) return

        const messageContent = input.trim()
        const attachedFile = mediaFile
        const attachedPreview = mediaPreview // Could be raw GIF URL or preview URL
        const attachedType = mediaType
        const tempId = `temp-${Date.now()}`

        setInput('')
        clearMedia()
        setSending(true)

        // Optimistic UI update
        const optimisticMsg = {
            id: tempId,
            sender_id: currentUser.id,
            recipient_id: userId,
            content: messageContent,
            image_url: attachedPreview && !attachedFile ? attachedPreview : null, // Show GIF immediately
            created_at: new Date().toISOString(),
            status: 'sending'
        }
        setMessages(prev => [...prev, optimisticMsg])

        let mediaUrl = null
        try {
            if (attachedFile) {
                const ext = attachedFile.name.split('.').pop()
                const fileName = `chat-${currentUser.id}-${Date.now()}.${ext}`
                const { error: uploadError } = await supabase.storage
                    .from('post-images')
                    .upload(fileName, attachedFile)

                if (!uploadError) {
                    const { data: publicData } = supabase.storage
                        .from('post-images')
                        .getPublicUrl(fileName)
                    mediaUrl = publicData.publicUrl
                } else {
                    console.error('Upload error:', uploadError)
                }
            } else if (attachedPreview && !attachedFile) {
                mediaUrl = attachedPreview
            }

            const payload = {
                sender_id: currentUser.id,
                recipient_id: userId,
                content: messageContent
            }
            if (mediaUrl) {
                payload.image_url = mediaUrl
            }

            console.log("Fix applied: inserting dynamically based on media presence");
            const { data, error } = await supabase
                .from('messages')
                .insert(payload)
                .select()
                .single()

            if (error) throw error

            if (data) {
                setMessages(prev => prev.map(m => m.id === tempId ? { ...data, status: 'sent' } : m))
            }
        } catch (err) {
            console.error('Send error:', err)
            // Mark as failed
            setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'error' } : m))
        } finally {
            setSending(false)
        }
    }

    return (
        <div style={styles.container}>
            {/* Global style to hide BottomNav on mobile when in chat */}
            <style>{`
                @media (max-width: 768px) {
                }
                @keyframes chat-skeleton {
                  0% { background-position: 200% 0; }
                  100% { background-position: -200% 0; }
                }
                @keyframes slide-up-sheet {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                @keyframes slide-down-sheet {
                    from { transform: translateY(0); }
                    to { transform: translateY(100%); }
                }
                .chat-textarea::-webkit-scrollbar {
                    display: none;
                }
                .chat-textarea {
                    -ms-overflow-style: none; /* IE and Edge */
                    scrollbar-width: none; /* Firefox */
                }
                @keyframes btn-shrink-pop {
                    0% { transform: scale(0.2); opacity: 0; }
                    80% { transform: scale(1.1); }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes btn-shrink-out {
                    0% { transform: scale(1); opacity: 1; }
                    100% { transform: scale(0.2); opacity: 0; }
                }
                .send-btn-animate {
                    animation: btn-shrink-pop 0.1s ease-out forwards;
                }
                .send-btn-outro {
                    animation: btn-shrink-out 0.1s ease-in forwards;
                }
                @keyframes plus-spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(45deg); }
                }
                @keyframes plus-spin-reverse {
                    from { transform: rotate(45deg); }
                    to { transform: rotate(0deg); }
                }
                @keyframes sending-spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes menu-pop-in {
                    0% { transform: scale(0.8) translateY(10px); opacity: 0; }
                    100% { transform: scale(1) translateY(0); opacity: 1; }
                }
                .plus-icon-active {
                    animation: plus-spin 0.2s ease-out forwards;
                }
                .plus-icon-inactive {
                    animation: plus-spin-reverse 0.2s ease-out forwards;
                }
                .plus-menu-animate {
                    animation: menu-pop-in 0.2s cubic-bezier(0.17, 0.67, 0.83, 0.67) forwards;
                    transform-origin: bottom left;
                }
            `}</style>
            <header style={styles.header}>
                <button style={styles.backBtn} onClick={() => navigate('/messages')}>
                    <span className="material-symbols-outlined filled">arrow_back</span>
                </button>
                <div style={styles.headerInfo} onClick={() => { setShowMediaInModal(false); setIsClosingSettings(false); setShowSettings(true); }}>
                    <div style={styles.headerAvatar}>
                        {recipient?.avatar_url ? (
                            <img src={recipient.avatar_url} style={styles.headerAvatarImg} alt="avatar" />
                        ) : (
                            (recipient?.display_name || recipient?.username)?.charAt(0).toUpperCase()
                        )}
                    </div>
                    <div style={styles.headerText}>
                        <span style={styles.displayName}>{recipient?.display_name || 'Loading...'}</span>
                        <span style={styles.username}>@{recipient?.username}</span>
                    </div>
                </div>
                <button style={styles.dotsBtn} onClick={() => { setShowMediaInModal(false); setIsClosingSettings(false); setShowSettings(true); }}>
                    <span className="material-symbols-outlined filled">more_horiz</span>
                </button>
            </header>

            <div style={styles.messageList}>
                {loading && messages.length === 0 ? (
                    <div style={styles.loadingWrapper}>
                        <div style={styles.loadingBubbleRow}>
                            <div style={styles.loadingBubbleSmall}></div>
                        </div>
                        <div style={styles.loadingBubbleRow}>
                            <div style={styles.loadingBubble}></div>
                        </div>
                        <div style={styles.loadingBubbleRowRight}>
                            <div style={styles.loadingBubbleSmallRight}></div>
                        </div>
                        <div style={styles.loadingBubbleRow}>
                            <div style={styles.loadingBubble}></div>
                        </div>
                        <div style={styles.loadingBubbleRowRight}>
                            <div style={styles.loadingBubbleRight}></div>
                        </div>
                    </div>
                ) : messages.length === 0 ? (
                    <div style={styles.emptyState}>
                        <p style={styles.emptyText}>No messages yet. Say hi!</p>
                    </div>
                ) : (
                    messages.map(msg => (
                        <div
                            key={msg.id}
                            style={{
                                ...styles.messageWrapper,
                                ...(msg.sender_id === currentUser?.id ? styles.myMessageWrapper : styles.otherMessageWrapper),
                                flexDirection: 'column',
                                alignItems: msg.sender_id === currentUser?.id ? 'flex-end' : 'flex-start'
                            }}
                            onClick={() => {
                                if (isMobile) {
                                    setSelectedMessageId(selectedMessageId === msg.id ? null : msg.id)
                                }
                            }}
                        >
                            <div
                                style={{
                                    ...styles.messageContent,
                                    ...(msg.sender_id === currentUser?.id ? styles.myMessage : styles.otherMessage)
                                }}
                            >
                                {msg.content && <div>{msg.content}</div>}
                                {(msg.media_url || msg.image_url) && (
                                    isVideo(msg.media_url || msg.image_url) ? (
                                        <video src={msg.media_url || msg.image_url} style={styles.bubbleMedia} controls muted />
                                    ) : (
                                        <img src={msg.media_url || msg.image_url} style={styles.bubbleMedia} alt="media" />
                                    )
                                )}
                                {msg.sender_id === currentUser?.id && (
                                    <div style={styles.messageStatus}>
                                        {msg.status === 'sending' ? (
                                            <span className="material-symbols-outlined filled" style={{ ...styles.loadingIcon, animation: 'sending-spin 1s linear infinite' }}>autorenew</span>
                                        ) : msg.status === 'error' ? (
                                            <span className="material-symbols-outlined filled" style={{ color: '#ff4444' }}>error</span>
                                        ) : (
                                            <span className="material-symbols-outlined filled" style={styles.checkIcon}>check</span>
                                        )}
                                    </div>
                                )}
                            </div>
                            {isMobile && selectedMessageId === msg.id && (
                                <div style={styles.messageTime}>
                                    {new Date(msg.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}, {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            )}
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <form style={styles.inputArea} onSubmit={handleSend}>
                <div style={styles.plusBtnContainer}>
                    <button
                        type="button"
                        style={styles.plusBtn}
                        onClick={() => setShowPlusMenu(!showPlusMenu)}
                    >
                        <span className="material-symbols-outlined filled"
                            style={{
                                display: 'inline-block',
                                transition: 'transform 0.2s ease-out',
                                transform: showPlusMenu ? 'rotate(45deg)' : 'rotate(0deg)'
                            }}
                        >add</span>
                    </button>

                    {showPlusMenu && (
                        <div style={styles.plusMenu} className="plus-menu-animate">
                            <div
                                style={{
                                    ...styles.plusMenuItem,
                                    ...(hoveredPlusItem === 'emoji' ? { backgroundColor: '#2a2d3a' } : {})
                                }}
                                onMouseEnter={() => setHoveredPlusItem('emoji')}
                                onMouseLeave={() => setHoveredPlusItem(null)}
                                onClick={() => { alert('Emoji clicked'); setShowPlusMenu(false); }}
                            >
                                <span className="material-symbols-outlined" style={styles.plusMenuItemIcon}>sentiment_satisfied</span>
                                Emoji
                            </div>
                            <div
                                style={{
                                    ...styles.plusMenuItem,
                                    ...(hoveredPlusItem === 'gif' ? { backgroundColor: '#2a2d3a' } : {})
                                }}
                                onMouseEnter={() => setHoveredPlusItem('gif')}
                                onMouseLeave={() => setHoveredPlusItem(null)}
                                onClick={() => { setShowGifPicker(true); setShowPlusMenu(false); }}
                            >
                                <span className="material-symbols-outlined filled" style={styles.plusMenuItemIcon}>movie</span>
                                GIF
                            </div>
                            <div
                                style={{
                                    ...styles.plusMenuItem,
                                    ...(hoveredPlusItem === 'upload' ? { backgroundColor: '#2a2d3a' } : {})
                                }}
                                onMouseEnter={() => setHoveredPlusItem('upload')}
                                onMouseLeave={() => setHoveredPlusItem(null)}
                                onClick={() => { fileInputRef.current?.click(); setShowPlusMenu(false); }}
                            >
                                <span className="material-symbols-outlined filled" style={styles.plusMenuItemIcon}>upload</span>
                                Upload
                            </div>
                        </div>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        style={{ display: 'none' }}
                        onChange={handleFileSelect}
                    />
                </div>

                <div style={styles.inputContainer}>
                    {mediaPreview && (
                        <div style={styles.mediaPreviewWrapper}>
                            {mediaType === 'video' ? (
                                <video src={mediaPreview} style={styles.mediaPreview} muted />
                            ) : (
                                <img src={mediaPreview} style={styles.mediaPreview} alt="preview" />
                            )}
                            <button style={styles.removeMediaBtn} onClick={clearMedia}>
                                <span className="material-symbols-outlined filled">close</span>
                            </button>
                        </div>
                    )}
                    <div style={styles.inputInner}>
                        <textarea
                            ref={textareaRef}
                            className="chat-textarea"
                            style={styles.input}
                            placeholder="Start a new message"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            rows={1}
                            disabled={sending}
                        />
                        {(input.trim() || mediaPreview) && (
                            <button
                                style={{
                                    ...styles.sendBtn,
                                    ...(sending ? { opacity: 0.6 } : {})
                                }}
                                className={isClosingBtn ? "send-btn-outro" : "send-btn-animate"}
                                type="submit"
                                disabled={sending}
                            >
                                <span className="material-symbols-outlined filled">arrow_upward</span>
                            </button>
                        )}
                    </div>
                </div>
            </form>

            {/* Settings Modal: Conversation info or Media */}
            {showSettings && (
                <div
                    style={{
                        ...styles.modalOverlay,
                        ...(isMobile ? styles['@media (max-width: 768px)'].modalOverlay : {}),
                        ...(isClosingSettings ? { opacity: 0, transition: 'opacity 0.3s ease' } : {})
                    }}
                    onClick={() => {
                        setIsClosingSettings(true);
                        setTimeout(() => {
                            setShowSettings(false);
                            setIsClosingSettings(false);
                        }, 300);
                    }}
                >
                    <div
                        style={{
                            ...styles.modalContent,
                            ...(isMobile ? styles['@media (max-width: 768px)'].modalContent : {}),
                            ...(isClosingSettings && isMobile ? { animation: 'slide-down-sheet 0.3s cubic-bezier(0.4, 0, 1, 1) forwards' } : {}),
                            ...(isClosingSettings && !isMobile ? { transform: 'scale(0.95)', opacity: 0, transition: 'all 0.2s ease' } : {})
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {isMobile && <div style={{ width: '40px', height: '4px', backgroundColor: 'var(--color-text-dim)', opacity: 0.45, borderRadius: '2px', margin: '12px auto 0' }} />}
                        {showMediaInModal ? (
                            <>
                                <div style={styles.mediaModalHeader}>
                                    <h3 style={styles.modalTitle}>Media</h3>
                                    <button style={styles.mediaModalBackBtn} onClick={() => { setShowMediaInModal(false); setMediaTab('photos'); }}>
                                        <span className="material-symbols-outlined filled">arrow_back</span> Back
                                    </button>
                                </div>
                                <div style={styles.mediaTabs}>
                                    <div
                                        style={{ ...styles.mediaTab, ...(mediaTab === 'photos' ? styles.activeMediaTab : {}) }}
                                        onClick={() => setMediaTab('photos')}
                                    >
                                        Photos
                                    </div>
                                    <div
                                        style={{ ...styles.mediaTab, ...(mediaTab === 'videos' ? styles.activeMediaTab : {}) }}
                                        onClick={() => setMediaTab('videos')}
                                    >
                                        Videos
                                    </div>
                                    <div style={{
                                        ...styles.mediaTabIndicator,
                                        transform: mediaTab === 'videos' ? 'translateX(100%)' : 'translateX(0)'
                                    }} />
                                </div>
                                <div style={{
                                    ...styles.mediaSliderContainer,
                                    ...(isMobile ? styles['@media (max-width: 768px)'].mediaSliderContainer : {})
                                }}>
                                    <div style={{
                                        ...styles.mediaSlider,
                                        transform: mediaTab === 'videos' ? 'translateX(-50%)' : 'translateX(0)'
                                    }}>
                                        <div style={styles.mediaPanel}>
                                            <div style={styles.mediaGrid}>
                                                {conversationPhotos.length > 0 ? conversationPhotos.map((url, i) => (
                                                    <img key={i} src={url} alt="" style={styles.mediaThumb} />
                                                )) : (
                                                    <div style={styles.mediaEmptyHint}>No photos in this conversation</div>
                                                )}
                                            </div>
                                        </div>
                                        <div style={styles.mediaPanel}>
                                            <div style={styles.mediaGrid}>
                                                {conversationVideos.length > 0 ? conversationVideos.map((url, i) => (
                                                    <video key={i} src={url} style={styles.mediaThumbVideo} muted preload="metadata" />
                                                )) : (
                                                    <div style={styles.mediaEmptyHint}>No videos in this conversation</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div style={styles.modalHeader}>
                                    <h3 style={styles.modalTitle}>Conversation info</h3>
                                    <button style={styles.closeBtn} onClick={() => {
                                        setIsClosingSettings(true);
                                        setTimeout(() => {
                                            setShowSettings(false);
                                            setIsClosingSettings(false);
                                        }, 300);
                                    }}>
                                        <span className="material-symbols-outlined filled">close</span>
                                    </button>
                                </div>

                                <div style={styles.modalProfile}>
                                    <div
                                        style={styles.modalAvatar}
                                        onClick={() => navigate(`/profile/${recipient?.username}`)}
                                    >
                                        {recipient?.avatar_url ? (
                                            <img src={recipient.avatar_url} style={styles.modalAvatarImg} alt="avatar" />
                                        ) : (
                                            (recipient?.display_name || recipient?.username)?.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <span style={styles.modalDisplayName}>{recipient?.display_name || recipient?.username}</span>
                                    <span style={styles.modalUsername}>@{recipient?.username}</span>

                                    <div style={styles.modalIconRow}>
                                        <div style={styles.iconButtonWrapper}>
                                            <div
                                                style={{
                                                    ...styles.profileIconBtn,
                                                    ...(isHoveringProfile ? { backgroundColor: 'var(--color-border-dark)' } : {})
                                                }}
                                                onMouseEnter={() => setIsHoveringProfile(true)}
                                                onMouseLeave={() => setIsHoveringProfile(false)}
                                                onClick={() => navigate(`/profile/${recipient?.username}`)}
                                            >
                                                <span className="material-symbols-outlined filled">person</span>
                                            </div>
                                            <span style={styles.iconButtonLabel}>Profile</span>
                                        </div>

                                        <div style={styles.iconButtonWrapper}>
                                            <div
                                                style={{
                                                    ...styles.mediaRow,
                                                    ...(isHoveringMedia ? { backgroundColor: 'var(--color-border-dark)' } : {})
                                                }}
                                                onMouseEnter={() => setIsHoveringMedia(true)}
                                                onMouseLeave={() => setIsHoveringMedia(false)}
                                                onClick={() => setShowMediaInModal(true)}
                                            >
                                                <span className="material-symbols-outlined filled" style={styles.mediaRowIcon}>photo_library</span>
                                            </div>
                                            <span style={styles.iconButtonLabel}>Media</span>
                                        </div>
                                    </div>
                                </div>

                                <div style={styles.modalActions}>
                                    <div style={styles.deleteBox} onClick={() => setShowDeleteConfirm(true)}>
                                        <span className="material-symbols-outlined filled">delete</span> Delete conversation
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Deletion Confirmation Modal */}
            {showDeleteConfirm && (
                <div style={styles.modalOverlay} onClick={() => setShowDeleteConfirm(false)}>
                    <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>Delete conversation?</h3>
                        </div>
                        <div style={styles.confirmContent}>
                            <p style={styles.confirmText}>
                                Choose how you want to delete this conversation.
                            </p>
                            <div style={styles.confirmActions}>
                                <button
                                    style={{ ...styles.confirmBtn, ...styles.confirmDelete }}
                                    onClick={handleDeleteForMe}
                                >
                                    Delete for me
                                </button>
                                <button
                                    style={{ ...styles.confirmBtn, ...styles.confirmDelete, backgroundColor: '#333', color: '#ff4444', border: '1px solid #ff4444' }}
                                    onClick={handleDeleteForEveryone}
                                >
                                    Delete for everyone
                                </button>
                                <button
                                    style={{ ...styles.confirmBtn, ...styles.confirmCancel }}
                                    onClick={() => setShowDeleteConfirm(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showGifPicker && (
                <GifPicker
                    onSelect={(url) => {
                        setMediaPreview(url)
                        setMediaType('image')
                        setMediaFile(null)
                        setShowGifPicker(false)
                    }}
                    onClose={() => setShowGifPicker(false)}
                />
            )}
        </div>
    )
}
