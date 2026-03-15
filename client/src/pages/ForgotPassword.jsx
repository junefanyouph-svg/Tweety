import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { styles as loginStyles } from '../styles/Login.styles'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

    const trimmed = email.trim()
    if (!trimmed) {
      setError('Please enter your email.')
      return
    }

    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${window.location.origin}/reset-password`
    })

    if (error) {
      setError(error.message)
    } else {
      setMessage('A reset link has been sent to your email.')
    }
  }

  return (
    <div style={loginStyles.container}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', marginBottom: '20px' }}>
        <img src="/Jargon(Logo).png" alt="Jargon Logo" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
        <h1 style={{ ...loginStyles.logo, marginBottom: 0 }}>Jargon</h1>
      </div>
      <form onSubmit={handleSubmit} style={loginStyles.form}>
        <input
          style={loginStyles.input}
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {error && <p style={loginStyles.error}>{error}</p>}
        {message && (
          <p style={{ ...loginStyles.error, color: '#00BFA6' }}>{message}</p>
        )}
        <button style={loginStyles.button} type="submit">
          Send reset link
        </button>
        <p style={loginStyles.link}>
          Remembered your password? <Link to="/">Back to login</Link>
        </p>
      </form>
    </div>
  )
}

