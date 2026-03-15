import { useState } from 'react'
import { supabase } from '../supabase'
import { useNavigate, Link } from 'react-router-dom'
import { saveAccount } from '../utils/accountStore'
import { API_URL } from '../utils/apiUrl'

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSignUp = async (e) => {
    e.preventDefault()
    setError('')

    const trimmedUsername = username.trim()
    const trimmedEmail = email.trim()

    if (!trimmedUsername || !trimmedEmail || !password) {
      setError('Please fill in all fields.')
      return
    }

    // Check if username is already taken via backend
    try {
      const res = await fetch(`${API_URL}/profiles/check/${encodeURIComponent(trimmedUsername)}`)
      if (!res.ok) {
        setError('Unable to validate username. Please try again.')
        return
      }
      const dataCheck = await res.json()
      if (dataCheck.taken) {
        setError('Username is already taken.')
        return
      }
    } catch {
      setError('Unable to validate username. Please try again.')
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: { data: { username: trimmedUsername } }
    })

    if (error) {
      setError(error.message)
    } else {
      // Auto create profile
      await fetch(`${API_URL}/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: data.user.id,
          username: trimmedUsername,
          bio: ''
        })
      })
      // Save to account store for multi-account switching
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        saveAccount(session, { username: trimmedUsername, display_name: '', avatar_url: null })
      }
      navigate('/feed')
    }
  }

  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', marginBottom: '20px' }}>
        <img src="/icon-192.png" alt="Jargon Logo" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
        <h1 style={{ ...styles.logo, marginBottom: 0 }}>Jargon</h1>
      </div>
      <form onSubmit={handleSignUp} style={styles.form}>
        <input
          style={styles.input}
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          style={styles.input}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p style={styles.error}>{error}</p>}
        <button style={styles.button} type="submit">Sign Up</button>
        <p style={styles.link}>Already have an account? <Link to="/">Log In</Link></p>
      </form>
    </div>
  )
}

import { styles } from '../styles/SignUp.styles'
