import { useState } from 'react'
import { supabase } from '../supabase'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { saveAccount } from '../utils/accountStore'
import { API_URL } from '../utils/apiUrl'

export default function Login() {
  const [identifier, setIdentifier] = useState('') // email or username
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isAddMode = searchParams.get('add') === '1'

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')

    const trimmed = identifier.trim()
    if (!trimmed) {
      setError('Please enter your email or username.')
      return
    }

    let loginEmail = trimmed

    // If the user entered a username (no '@'), resolve it to an email via backend
    if (!trimmed.includes('@')) {
      try {
        // 1) Get profile by username to find user_id
        const profileRes = await fetch(`${API_URL}/profiles/${trimmed}`)
        if (!profileRes.ok) {
          setError('Invalid login credentials.')
          return
        }
        const profile = await profileRes.json()

        // 2) Get email for that user_id from backend (service role)
        const emailRes = await fetch(`${API_URL}/settings/email/${profile.user_id}`)
        if (!emailRes.ok) {
          setError('Invalid login credentials.')
          return
        }
        const { email } = await emailRes.json()
        loginEmail = email
      } catch (err) {
        setError('Unable to log in right now. Please try again.')
        return
      }
    }

    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password })

    if (error) {
      setError(error.message)
    } else {
      // Save account session to local store for multi-account switching
      const { data: { session } } = await supabase.auth.getSession()
      const { data: { user } } = await supabase.auth.getUser()
      if (session && user) {
        const profileRes = await fetch(`${API_URL}/profiles/${user.user_metadata.username}`)
        const profile = await profileRes.json()
        saveAccount(session, profile)
      }
      navigate(isAddMode ? '/switch-account' : '/feed')
    }
  }

  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', marginBottom: '20px' }}>
        <img src="/Jargon_icon.svg" alt="Jargon Logo" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
        <h1 style={{ ...styles.logo, marginBottom: 0 }}>Jargon</h1>
      </div>
      <form onSubmit={handleLogin} style={styles.form}>
        <input
          style={styles.input}
          type="text"
          placeholder="Email or username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p style={styles.error}>{error}</p>}
        <button style={styles.button} type="submit">Log In</button>
        <p style={styles.link}>
          <Link to="/forgot-password">Forgot password?</Link>
        </p>
        <p style={styles.link}>Don't have an account? <Link to="/signup">Sign Up</Link></p>
      </form>
    </div>
  )
}

import { styles } from '../styles/Login.styles'
