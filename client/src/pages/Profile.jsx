import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabase'

import PostCard from '../components/PostCard'
import { PostSkeleton, ProfileSkeleton } from '../components/Skeleton'
import { setCache, getCache, invalidateCache } from '../utils/cache'
import { invalidateProfile } from '../utils/profileCache'
import AvatarCropper from '../components/AvatarCropper'
import PullToRefresh from '../components/PullToRefresh'
import { API_URL } from '../utils/apiUrl'

export default function Profile() {
  const { username } = useParams()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [posts, setPosts] = useState([])
  const [followers, setFollowers] = useState([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [followsMe, setFollowsMe] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [bio, setBio] = useState('')
  const [loading, setLoading] = useState(true)
  const [postsLoading, setPostsLoading] = useState(true)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarInputRef = useRef(null)
  const [avatarHovered, setAvatarHovered] = useState(false)
  const [viewingAvatar, setViewingAvatar] = useState(false)
  const navigate = useNavigate()
  const [cropImageSrc, setCropImageSrc] = useState(null)

  useEffect(() => {
    let channel;
    const init = async () => {
      setLoading(true)
      setPostsLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/'); return }
      setUser(user)

      await Promise.all([
        fetchProfileStats(username, user),
        fetchPosts(username),
      ])

      // Real-time listener for profile changes
      channel = supabase
        .channel(`profile-page-${username}-${Math.random()}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `username=eq.${username}`
        }, (payload) => {
          setProfile(payload.new)
          setBio(payload.new.bio || '')
        })
        .subscribe()
    }
    init()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [username])

  const fetchProfileStats = async (username, currentUser) => {
    const cacheKey = `profile-${username}`
    const cached = getCache(cacheKey)

    if (cached) {
      setProfile(cached.profile)
      setBio(cached.profile.bio || '')
      setStats(cached.stats)
      setLoading(false)
      fetchFollowStatus(cached.profile.user_id, currentUser)
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single()

    if (!profileData) { setLoading(false); return }

    const [
      { count: postsCount },
      { count: followersCount },
      { count: followingCount },
    ] = await Promise.all([
      supabase.from('posts').select('id', { count: 'exact' }).eq('user_id', profileData.user_id),
      supabase.from('followers').select('id', { count: 'exact' }).eq('following_id', profileData.user_id),
      supabase.from('followers').select('id', { count: 'exact' }).eq('follower_id', profileData.user_id),
    ])

    const stats = { posts: postsCount || 0, followers: followersCount || 0, following: followingCount || 0 }

    setCache(cacheKey, { profile: profileData, stats })
    setProfile(profileData)
    setBio(profileData.bio || '')
    setStats(stats)
    setLoading(false)

    fetchFollowStatus(profileData.user_id, currentUser)
  }

  const fetchFollowStatus = async (profileUserId, currentUser) => {
    const [{ data: followersData }, { data: myFollowersData }] = await Promise.all([
      supabase.from('followers').select('*').eq('following_id', profileUserId),
      supabase.from('followers').select('*').eq('following_id', currentUser.id),
    ])
    setFollowers(followersData || [])
    setIsFollowing((followersData || []).some(f => f.follower_id === currentUser.id))
    setFollowsMe((myFollowersData || []).some(f => f.follower_id === profileUserId))
  }

  const fetchPosts = async (username) => {
    const { data } = await supabase
      .from('posts')
      .select('*, profiles(display_name, avatar_url)')
      .eq('username', username)
      .order('created_at', { ascending: false })
    setPosts(data || [])
    setPostsLoading(false)
  }

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5MB!')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => setCropImageSrc(e.target.result)
    reader.readAsDataURL(file)
  }

  const handleCropConfirm = async (croppedBlob) => {
    setCropImageSrc(null)
    setAvatarUploading(true)

    const fileName = `${profile.user_id}-${Date.now()}.jpg`
    const { error } = await supabase.storage.from('avatars').upload(fileName, croppedBlob, { upsert: true })

    if (!error) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
      const avatar_url = `${data.publicUrl}?t=${Date.now()}`
      await supabase.from('profiles').update({ avatar_url }).eq('user_id', profile.user_id)

      // Invalidate ALL caches for this user
      invalidateProfile(username)
      invalidateCache(`profile-${username}`)

      // Set profile locally
      const updatedProfile = { ...profile, avatar_url }
      setProfile(updatedProfile)

      // Update local posts to show new avatar instantly
      setPosts(prev => prev.map(p => ({
        ...p,
        profiles: { ...p.profiles, avatar_url }
      })))

      // Notify other components (Sidebar, BottomNav, etc.)
      window.dispatchEvent(new CustomEvent('tweety_profile_updated', { detail: { user_id: profile.user_id, avatar_url } }));
    }

    setAvatarUploading(false)
  }

  const handleFollow = async () => {
    if (isFollowing) {
      await fetch(`${API_URL}/followers`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ follower_id: user.id, following_id: profile.user_id })
      })
      setIsFollowing(false)
      setStats(prev => ({ ...prev, followers: prev.followers - 1 }))
    } else {
      await fetch(`${API_URL}/followers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ follower_id: user.id, following_id: profile.user_id })
      })
      await fetch(`${API_URL}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_id: profile.user_id,
          sender_id: user.id,
          sender_username: user.user_metadata.username,
          type: 'follow',
          post_id: null
        })
      })
      setIsFollowing(true)
      setStats(prev => ({ ...prev, followers: prev.followers + 1 }))
    }
  }

  const handleSaveBio = async () => {
    await fetch(`${API_URL}/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, username, bio })
    })

    // Invalidate caches
    invalidateProfile(username)
    invalidateCache(`profile-${username}`)

    setProfile(prev => ({ ...prev, bio }))
    window.dispatchEvent(new CustomEvent('tweety_profile_updated', { detail: { user_id: profile.user_id, bio } }));
    setIsEditing(false)
  }

  const handleDelete = async (id) => {
    await fetch(`${API_URL}/posts/${id}`, { method: 'DELETE' })
    setPosts(prev => prev.filter(p => p.id !== id))
    setStats(prev => ({ ...prev, posts: prev.posts - 1 }))
  }

  const isOwnProfile = user?.user_metadata?.username === username

  const handleRefresh = async () => {
    if (!profile) return
    await Promise.all([
      fetchProfileStats(username, user),
      fetchPosts(username),
    ])
  }

  if (loading) return (
    <div className="max-w-[620px] mx-auto px-3 w-full box-border">
      <ProfileSkeleton />
      <div className="mt-8 pb-8">
        <h3 className="text-[1.1rem] font-bold text-text-main mb-4 pb-3 border-b border-border-dark">Posts</h3>
        {Array(3).fill(0).map((_, i) => <PostSkeleton key={i} />)}
      </div>
    </div>
  )

  return (
    <>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="max-w-[620px] mx-auto px-3 w-full box-border pb-8">
        {/* Profile Card */}
        <div className="bg-surface rounded-2xl p-6 my-5 border border-border-dark flex gap-5 items-start max-sm:flex-col">
          <div
            className={`relative inline-block ${isOwnProfile ? 'cursor-pointer group' : 'cursor-default'}`}
            onMouseEnter={() => setAvatarHovered(true)}
            onMouseLeave={() => setAvatarHovered(false)}
            onClick={() => isOwnProfile && !avatarUploading && avatarInputRef.current.click()}
          >
            <div className="relative overflow-hidden rounded-full border-[3px] border-primary shadow-xl">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  className="w-20 h-20 object-cover"
                  alt="avatar"
                />
              ) : (
                <div className="w-20 h-20 bg-primary flex items-center justify-center text-[2rem] font-bold text-white">
                  {(profile?.display_name || username)?.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Uploading overlay */}
              {avatarUploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 transition-opacity">
                  <i className="fa-solid fa-circle-notch fa-spin text-white text-[1.6rem]"></i>
                </div>
              )}

              {/* Hover overlay */}
              {isOwnProfile && !avatarUploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <i className="fa-solid fa-camera text-white text-[1.3rem]"></i>
                </div>
              )}
            </div>

            {/* Upload input */}
            {isOwnProfile && (
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start gap-4 mb-1">
              <div className="min-w-0">
                <h2 className="text-[1.3rem] font-bold text-text-main truncate">{profile?.display_name || username}</h2>
                <p className="text-primary text-[0.85rem]">@{username}</p>
              </div>
              {isOwnProfile && (
                <button
                  className="py-1.5 px-3 bg-white/5 text-text-main border border-border-dark rounded-lg text-[0.85rem] font-bold hover:bg-white/10 transition-colors shrink-0"
                  onClick={() => setIsEditing(true)}
                >
                  Edit Profile
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="mt-3 flex flex-col gap-2">
                <textarea
                  className="w-full bg-bg-dark border border-border-dark rounded-xl p-3 text-text-main text-[0.95rem] outline-none focus:border-primary transition-all resize-none"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Write a bio..."
                  rows={3}
                />
                <div className="flex gap-2 justify-end">
                  {(() => {
                    const isBioChanged = bio !== (profile?.bio || '')
                    return (
                      <button
                        disabled={!isBioChanged}
                        className={`py-1.5 px-4 text-[0.85rem] font-bold rounded-lg transition-all ${isBioChanged ? 'bg-primary text-white hover:opacity-90' : 'bg-white/5 text-text-dim cursor-not-allowed opacity-50'}`}
                        onClick={handleSaveBio}
                      >
                        Save
                      </button>
                    )
                  })()}
                  <button
                    className="py-1.5 px-4 bg-red-500/10 text-red-500 text-[0.85rem] font-bold border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors"
                    onClick={() => {
                      setIsEditing(false)
                      setBio(profile?.bio || '')
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-text-main/80 text-[0.95rem] leading-relaxed my-3 mb-4">{profile?.bio || 'No bio yet.'}</p>
            )}

            {!isOwnProfile && (
              <div className="flex gap-2 mb-5">
                <button
                  className={`py-1.5 px-5 rounded-lg text-[0.85rem] font-bold border transition-all ${isFollowing ? 'border-primary text-primary hover:bg-primary/10' : 'bg-primary text-white border-primary hover:opacity-90 active:scale-95'}`}
                  onClick={handleFollow}
                >
                  {isFollowing ? 'Unfollow' : followsMe ? 'Follow Back' : 'Follow'}
                </button>
                <button
                  className="py-1.5 px-5 bg-white/5 text-text-main border border-border-dark rounded-lg text-[0.85rem] font-bold hover:bg-white/10 transition-colors"
                  onClick={() => navigate(`/messages/${profile.user_id}`)}
                >
                  Message
                </button>
              </div>
            )}

            <div className="flex items-center gap-4 flex-wrap text-text-dim text-[0.85rem]">
              <span className="flex items-center gap-1.5">
                Joined {new Date(profile?.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              {followsMe && !isOwnProfile && <span className="bg-white/10 px-1.5 py-0.5 rounded text-[0.7rem] uppercase tracking-wider font-bold">Follows you</span>}
            </div>

            <div className="flex gap-6 mt-5 pt-4 border-t border-border-dark/60">
              <div className="flex flex-col items-start gap-0.5">
                <span className="font-bold text-[1.1rem] text-text-main">{stats?.posts ?? '—'}</span>
                <span className="text-[0.75rem] text-text-dim uppercase tracking-wider">Posts</span>
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <span className="font-bold text-[1.1rem] text-text-main">{stats?.followers ?? '—'}</span>
                <span className="text-[0.75rem] text-text-dim uppercase tracking-wider">Followers</span>
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <span className="font-bold text-[1.1rem] text-text-main">{stats?.following ?? '—'}</span>
                <span className="text-[0.75rem] text-text-dim uppercase tracking-wider">Following</span>
              </div>
            </div>
          </div>
        </div>

        {/* Posts */}
        <div className="mt-8">
          <h3 className="text-[1.1rem] font-bold text-text-main mb-4 pb-3 border-b border-border-dark flex items-center justify-between">
            Posts
            <span className="text-text-dim text-[0.8rem] font-normal">{posts.length} items</span>
          </h3>
          <div className="flex flex-col gap-[5px]">
            {postsLoading
              ? Array(3).fill(0).map((_, i) => <PostSkeleton key={i} />)
              : posts.length === 0
                ? <p className="text-center text-text-dim mt-12 py-10 bg-white/5 rounded-2xl border border-dashed border-border-dark">No posts yet.</p>
                : posts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    user={user}
                    onDelete={handleDelete}
                    onNavigate={() => navigate(`/post/${post.id}`, { state: { from: `/profile/${username}`, fromLabel: `@${username}` } })}
                  />
                ))
            }
          </div>
        </div>

        {/* Avatar Cropper */}
        {cropImageSrc && (
          <AvatarCropper
            imageSrc={cropImageSrc}
            onConfirm={handleCropConfirm}
            onCancel={() => {
              setCropImageSrc(null)
              if (avatarInputRef.current) avatarInputRef.current.value = ''
            }}
          />
        )}

        {/* Avatar Viewer Modal */}
        {viewingAvatar && (
          <div
            className="fixed inset-0 bg-black/85 z-[99999] flex items-center justify-center p-4"
            onClick={() => setViewingAvatar(false)}
          >
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button className="absolute -top-10 right-0 text-white cursor-pointer bg-none border-none text-2xl hover:scale-110 transition-transform" onClick={() => setViewingAvatar(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
              <img src={profile.avatar_url} className="max-w-[80vw] max-h-[80vh] object-contain rounded-full border-4 border-primary shadow-2xl" alt="avatar" />
            </div>
          </div>
        )}
      </div>
    </PullToRefresh>

      {/* Floating Compose Button (FAB) */}
      <button
        className="fixed z-[150] w-[56px] h-[56px] rounded-full bg-primary text-white border-none shadow-[0_6px_24px_rgba(0,191,166,0.4)] cursor-pointer flex items-center justify-center text-[1.4rem] hover:scale-105 active:scale-95 transition-all bottom-[100px] right-5 md:bottom-10 md:right-10"
        onClick={() => window.dispatchEvent(new CustomEvent('openCompose'))}
        aria-label="Create post"
      >
        <i className="fa-solid fa-plus"></i>
      </button>
    </>
  )
}
