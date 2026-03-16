import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { styles as loginStyles } from '../styles/Login.styles'
import MobilePasswordInput from '../components/MobilePasswordInput'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // The recovery link logs the user in temporarily (recovery session).
    // We only want to show this page if there is a session.
    const init = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        setError(error.message)
        setReady(true)
        return
      }

      if (!data.session) {
        setError('Invalid or expired reset link. Please request a new one.')
      }

      setReady(true)
    }

    init()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!password || !confirmPassword) {
      setError('Please enter and confirm your new password.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setMessage('Password updated. Please log in again.')
    await supabase.auth.signOut()
    setLoading(false)
    setTimeout(() => navigate('/'), 800)
  }

  return (
    <div style={loginStyles.container}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', marginBottom: '20px' }}>
        <div 
          style={{ 
            width: '60px', 
            height: '60px', 
            backgroundColor: '#00BFA6',
            maskImage: "url('/Jargon_icon.svg')", 
            WebkitMaskImage: "url('/Jargon_icon.svg')",
            maskSize: 'contain',
            WebkitMaskSize: 'contain',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat'
          }} 
        />
        <h1 style={{ ...loginStyles.logo, marginBottom: 0 }}>Jargon</h1>
      </div>
      <form onSubmit={handleSubmit} style={loginStyles.form}>
        {!ready ? (
          <p style={{ ...loginStyles.link, color: '#00BFA6' }}>Loading…</p>
        ) : (
          <>
            <MobilePasswordInput
              style={loginStyles.input}
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <MobilePasswordInput
              style={loginStyles.input}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {error && <p style={loginStyles.error}>{error}</p>}
            {message && (
              <p style={{ ...loginStyles.error, color: '#00BFA6' }}>{message}</p>
            )}
            <button 
              style={{...loginStyles.button, opacity: (loading || !ready) ? 0.7 : 1, cursor: (loading || !ready) ? 'not-allowed' : 'pointer'}} 
              type="submit" 
              disabled={loading || !ready}
            >
              Update password
            </button>
            <p style={loginStyles.link}>
              <Link to="/">Back to login</Link>
            </p>
          </>
        )}
      </form>
    </div>
  )
}

