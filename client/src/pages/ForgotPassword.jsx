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

    const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${siteUrl}/reset-password`
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

