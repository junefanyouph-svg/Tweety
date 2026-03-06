import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'

export default function UserMentionPicker({ onSelect, onClose, searchQuery, position = {}, currentUserId }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const containerRef = useRef(null)
  const followingIdsRef = useRef(null) // cache following list

  // Fetch the current user's following list once
  useEffect(() => {
    if (!currentUserId) return
    const fetchFollowing = async () => {
      const { data } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', currentUserId)
      followingIdsRef.current = new Set((data || []).map(f => f.following_id))
    }
    fetchFollowing()
  }, [currentUserId])

  // Fetch & filter users whenever searchQuery changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(searchQuery)
    }, 100)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const fetchUsers = async (query) => {
    setLoading(true)
    const q = query?.trim().toLowerCase() || ''

    // Ensure following list is loaded
    if ((followingIdsRef.current === null || followingIdsRef.current.size === 0) && currentUserId) {
      const { data } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', currentUserId)
      if (data) followingIdsRef.current = new Set(data.map(f => f.following_id))
    }

    const followingIds = Array.from(followingIdsRef.current || [])
    let combinedSet = new Map()

    if (q === '') {
      // 1. If NO query, show specifically the users you follow (up to 10)
      if (followingIds.length > 0) {
        const { data: followedMatch } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, avatar_url')
          .neq('user_id', currentUserId)
          .in('user_id', followingIds)
          .limit(10)

        if (followedMatch) {
          followedMatch.forEach(u => {
            combinedSet.set(u.user_id, { ...u, _isFollowing: true })
          })
        }
      }

      // If even after checking following, we have none (maybe user follows no one),
      // we could show some suggested users, but user asked for "only following".
      // Let's stick to the request: "only show 10 users" of whom you follow.
    } else {
      // 2. If there IS a query, do a GLOBAL search
      // First, find matches among followed users for prioritization
      if (followingIds.length > 0) {
        const { data: followedMatch } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, avatar_url')
          .neq('user_id', currentUserId)
          .in('user_id', followingIds)
          .ilike('username', `%${q}%`)
          .limit(10)

        if (followedMatch) {
          followedMatch.forEach(u => {
            combinedSet.set(u.user_id, { ...u, _isFollowing: true })
          })
        }
      }

      // Fill remainder with global search for anyone matching the query
      if (combinedSet.size < 10) {
        let othersQuery = supabase
          .from('profiles')
          .select('user_id, username, display_name, avatar_url')
          .neq('user_id', currentUserId)
          .limit(10 - combinedSet.size)

        const existingIds = Array.from(combinedSet.keys())
        if (existingIds.length > 0) {
          othersQuery = othersQuery.not('user_id', 'in', existingIds)
        }
        othersQuery = othersQuery.ilike('username', `%${q}%`)

        const { data: othersMatch } = await othersQuery
        if (othersMatch) {
          othersMatch.forEach(u => {
            if (!combinedSet.has(u.user_id)) {
              combinedSet.set(u.user_id, u)
            }
          })
        }
      }
    }

    setUsers(Array.from(combinedSet.values()))
    setSelectedIndex(0)
    setLoading(false)
  }

  const handleSelect = (user) => {
    onSelect(user)
    onClose()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev < users.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (users[selectedIndex]) {
        handleSelect(users[selectedIndex])
      }
    }
  }

  // Check if we need to show a divider between following and others
  const getDividerIndex = () => {
    const lastFollowingIndex = users.reduce((acc, u, i) => u._isFollowing ? i : acc, -1)
    if (lastFollowingIndex >= 0 && lastFollowingIndex < users.length - 1) {
      return lastFollowingIndex
    }
    return -1
  }

  const dividerAfterIndex = getDividerIndex()

  return (
    <div
      ref={containerRef}
      className="absolute bg-surface rounded-xl border border-border-dark w-[320px] max-w-[95vw] max-h-[350px] flex flex-col overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)] z-[100]"
      style={position}
    >
      <div className="flex justify-between items-center gap-2 p-2.5 px-3 border-b border-border-dark">
        <div className="text-text-dim text-[0.85rem] font-bold uppercase tracking-[0.5px]">Mention users</div>
        <button className="bg-none border-none cursor-pointer text-text-dim text-base p-1.5 rounded-md hover:bg-white/10 transition-all" onClick={onClose}>
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-8 text-text-dim text-[0.9rem]">Searching...</div>
      ) : users.length === 0 ? (
        <div className="flex items-center justify-center p-8 text-text-dim text-[0.9rem]">No users found</div>
      ) : (
        <div className="flex flex-col overflow-y-auto max-h-[280px]">
          {users.map((user, index) => (
            <div key={user.user_id}>
              <div
                className={`flex items-center gap-2.5 p-2.5 px-3 cursor-pointer transition-colors border-b border-border-dark/50 ${index === selectedIndex ? 'bg-white/10' : 'bg-transparent hover:bg-white/5'}`}
                onClick={() => handleSelect(user)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="shrink-0">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} className="w-9 h-9 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-[0.9rem] font-bold text-white">
                      {user.username?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <span className="text-text-main text-[0.9rem] font-bold truncate">
                      {user.display_name || user.username}
                    </span>
                    {user._isFollowing && (
                      <span className="text-[0.65rem] text-primary border border-primary rounded-md px-1 py-0 font-bold whitespace-nowrap shrink-0">Following</span>
                    )}
                  </div>
                  <span className="text-text-dim text-[0.75rem] truncate">@{user.username}</span>
                </div>
              </div>
              {/* Divider between following and non-following */}
              {index === dividerAfterIndex && (
                <div className="p-1 px-3 border-b border-border-dark bg-white/5">
                  <span className="text-[0.7rem] text-text-dim/60 font-bold uppercase tracking-[0.5px]">Others</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

