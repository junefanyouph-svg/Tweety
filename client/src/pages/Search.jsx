import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { styles } from '../styles/Search.styles'
import { PostSkeleton, UserCardSkeleton } from '../components/Skeleton'
import PostCard from '../components/PostCard'
import { API_URL } from '../utils/apiUrl'
import { mergeCachedProfiles, setCachedProfile } from '../utils/profileCache'

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function highlightText(text, q) {
  if (!text) return text
  const terms = (q || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter(t => t.length >= 2)

  if (terms.length === 0) return text

  const pattern = terms.map(escapeRegExp).join('|')
  const regex = new RegExp(`(${pattern})`, 'gi')

  const parts = String(text).split(regex)
  return parts.map((part, idx) =>
    regex.test(part) ? <b key={idx}>{part}</b> : <span key={idx}>{part}</span>
  )
}

export default function Search() {
  const [query, setQuery] = useState('')
  const [posts, setPosts] = useState([])
  const [users, setUsers] = useState([])
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState('all')
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) navigate('/')
      else setUser(user)
    }
    getUser()

    const handleFocusSearch = () => {
      inputRef.current?.focus()
    }
    window.addEventListener('tweety_focus_search', handleFocusSearch)
    return () => window.removeEventListener('tweety_focus_search', handleFocusSearch)
  }, [])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch()
    }, 1000) // 1000ms = 1s
  
    return () => clearTimeout(timeoutId)
  }, [query])

  const handleSearch = async () => {
    if (!query.trim()) {
      setPosts([])
      setUsers([])
      setSearched(false)
      return
    }
  
    setLoading(true)
    setSearched(true)
  
    const [postsRes, usersRes] = await Promise.all([
      fetch(`${API_URL}/posts/search/${query}`),
      fetch(`${API_URL}/profiles/search/${query}`)
    ])
  
    const postsData = await postsRes.json()
    const usersData = await usersRes.json()
    const mergedUsers = mergeCachedProfiles(usersData || [])
    mergedUsers.forEach(profile => {
      if (profile?.username) {
        setCachedProfile(profile.username, profile)
      }
    })
  
    setPosts(postsData)
    setUsers(mergedUsers)
    setLoading(false)
  }

  useEffect(() => {
    const handleProfileUpdated = (e) => {
      const detail = e.detail
      if (!detail?.user_id) return
      setUsers(prev => prev.map(profile => {
        if (profile.user_id !== detail.user_id) return profile
        const nextProfile = { ...profile, ...detail }
        if (nextProfile.username) {
          setCachedProfile(nextProfile.username, nextProfile)
        }
        return nextProfile
      }))
    }

    window.addEventListener('tweety_profile_updated', handleProfileUpdated)
    return () => window.removeEventListener('tweety_profile_updated', handleProfileUpdated)
  }, [])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch()
      inputRef.current?.blur()
    }
  }

  const handleDelete = async (id) => {
    await fetch(`${API_URL}/posts/${id}`, { method: 'DELETE' })
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  const renderUsers = (userList) => userList.map(u => (
  <div key={u.id} style={styles.userCard} onClick={() => navigate(`/profile/${u.username}`)}>
    <div style={styles.userAvatar}>
      {u.avatar_url
        ? <img src={u.avatar_url} style={styles.userAvatarImg} alt="avatar" />
        : <div style={styles.userAvatarFallback}>{(u.display_name || u.username)?.charAt(0).toUpperCase()}</div>
      }
    </div>
    <div style={styles.userInfo}>
      <span style={styles.userName}>{highlightText(u.display_name || u.username, query)}</span>
      <span style={styles.userHandle}>@{highlightText(u.username, query)}</span>
      {u.bio && <span style={styles.userBio}>{highlightText(u.bio, query)}</span>}
    </div>
    <span className="material-symbols-outlined filled" style={{ color: '#555' }}>chevron_right</span>
  </div>
))

  const renderPosts = (postList) => postList.map(post => (
    <PostCard
      key={post.id}
      post={post}
      user={user}
      onDelete={handleDelete}
      highlightQuery={query}
      onNavigate={() => navigate(`/post/${post.id}`, { state: { from: '/search', fromLabel: 'Search' } })}
    />
  ))

  return (
    <div style={styles.container}>
      {/* Search Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>Search</h2>
        <input
          ref={inputRef}
          style={styles.searchInput}
          placeholder="Search posts or users..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      </div>

      {/* Tabs */}
      {searched && (
        <div style={styles.tabs}>
          {['all', 'posts', 'users'].map(tab => (
            <button
              key={tab}
              style={{ ...styles.tab, ...(activeTab === tab ? styles.tabActive : {}) }}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      <div style={styles.results}>
        {loading && (
  <div>
    {Array(5).fill(0).map((_, i) => <UserCardSkeleton key={`u${i}`} />)}
    {Array(10).fill(0).map((_, i) => <PostSkeleton key={`p${i}`} />)}
  </div>
)}

        {!loading && searched && activeTab === 'all' && (
          posts.length === 0 && users.length === 0
            ? <p style={styles.message}>No results found for "{query}"</p>
            : <>
                {users.length > 0 && (
                  <>
                    <p style={styles.sectionLabel}>Users</p>
                    {renderUsers(users)}
                  </>
                )}
                {posts.length > 0 && (
                  <>
                    <p style={styles.sectionLabel}>Posts</p>
                    {renderPosts(posts)}
                  </>
                )}
              </>
        )}

        {!loading && searched && activeTab === 'posts' && (
          posts.length === 0
            ? <p style={styles.message}>No posts found for "{query}"</p>
            : renderPosts(posts)
        )}

        {!loading && searched && activeTab === 'users' && (
          users.length === 0
            ? <p style={styles.message}>No users found for "{query}"</p>
            : renderUsers(users)
        )}

        {!searched && (
          <div style={styles.emptyState}>
            <span className="material-symbols-outlined filled" style={styles.emptyIcon}>search</span>
            <p style={styles.emptyText}>Search for posts or users</p>
          </div>
        )}
      </div>
    </div>
  )
}
