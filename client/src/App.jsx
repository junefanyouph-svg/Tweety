import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Feed from './pages/Feed'
import Profile from './pages/Profile'
import Search from './pages/Search'
import Notifications from './pages/Notifications'
import Settings from './pages/Settings'
import PostPage from './pages/PostPage'
import SwitchAccount from './pages/SwitchAccount'
import DirectMessages from './pages/DirectMessages'
import ChatPage from './pages/ChatPage'
import Layout from './components/Layout'
import { interactionsChannel } from './utils/interactionsChannel'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)

      // When the user clicks the password recovery link, Supabase creates a temporary session.
      // Route them to the reset-password form instead of the feed.
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session?.user?.id) return;

    // Global realtime channel:
    // - Uses Postgres changes when available
    // - Also listens to broadcast events as a reliable fallback for likes/comments
    const globalChannel = interactionsChannel
      .on('broadcast', { event: 'like' }, ({ payload }) => {
        if (payload?.sender_id && payload.sender_id === session.user.id) return
        window.dispatchEvent(new CustomEvent('tweety_global_like', { detail: payload }))
      })
      .on('broadcast', { event: 'comment' }, ({ payload }) => {
        if (payload?.sender_id && payload.sender_id === session.user.id) return
        window.dispatchEvent(new CustomEvent('tweety_global_comment', { detail: payload }))
      })
      .on('broadcast', { event: 'comment_like' }, ({ payload }) => {
        if (payload?.sender_id && payload.sender_id === session.user.id) return
        window.dispatchEvent(new CustomEvent('tweety_global_comment_like', { detail: payload }))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, (payload) => {
        window.dispatchEvent(new CustomEvent('tweety_global_like', { detail: payload }))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, (payload) => {
        window.dispatchEvent(new CustomEvent('tweety_global_comment', { detail: payload }))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comment_likes' }, (payload) => {
        window.dispatchEvent(new CustomEvent('tweety_global_comment_like', { detail: payload }))
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
        window.dispatchEvent(new CustomEvent('tweety_profile_updated', { detail: payload.new }))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(globalChannel)
    }
  }, [session?.user?.id])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', backgroundColor: '#0f1117', color: '#00BFA6', fontSize: '1.2rem' }}>
      Loading...
    </div>
  )

  return (
    <>
      <Routes>
        <Route path="/" element={session ? <Navigate to="/feed" /> : <Login />} />
        <Route path="/signup" element={session ? <Navigate to="/feed" /> : <SignUp />} />
        <Route path="/forgot-password" element={session ? <Navigate to="/feed" /> : <ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/feed" element={session ? <Layout><Feed /></Layout> : <Navigate to="/" />} />
        <Route path="/home" element={session ? <Navigate to="/feed" /> : <Navigate to="/" />} />
        <Route path="/profile/:username" element={session ? <Layout><Profile /></Layout> : <Navigate to="/" />} />
        <Route path="/search" element={session ? <Layout><Search /></Layout> : <Navigate to="/" />} />
        <Route path="/notifications" element={session ? <Layout><Notifications /></Layout> : <Navigate to="/" />} />
        <Route path="/messages" element={session ? <Layout><DirectMessages /></Layout> : <Navigate to="/" />} />
        <Route path="/messages/:userId" element={session ? <Layout><ChatPage /></Layout> : <Navigate to="/" />} />
        <Route path="/settings" element={session ? <Layout><Settings /></Layout> : <Navigate to="/" />} />
        <Route path="/post/:id" element={session ? <Layout><PostPage /></Layout> : <Navigate to="/" />} />
        <Route path="/switch-account" element={<SwitchAccount />} />
      </Routes>
    </>
  )
}

export default App