import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { styles } from '../styles/Settings.styles'
import { invalidateProfile } from '../utils/profileCache'
import { API_URL } from '../utils/apiUrl'

export default function Settings() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [loading, setLoading] = useState({})
  const [success, setSuccess] = useState({})
  const [errors, setErrors] = useState({})
  const navigate = useNavigate()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/'); return }
      setUser(user)
      setUsername(user.user_metadata.username || '')
      setEmail(user.email || '')

      // Fetch profile for display name
      const res = await fetch(`${API_URL}/profiles/${user.user_metadata.username}`)
      const profile = await res.json()
      setProfile(profile)
      setDisplayName(profile?.display_name || '')
    }
    getUser()
  }, [])

  const setLoadingFor = (key, val) => setLoading(prev => ({ ...prev, [key]: val }))
  const setSuccessFor = (key, val) => {
    setSuccess(prev => ({ ...prev, [key]: val }))
    setTimeout(() => setSuccess(prev => ({ ...prev, [key]: false })), 3000)
  }
  const setErrorFor = (key, val) => setErrors(prev => ({ ...prev, [key]: val }))

  const handleUpdateUsername = async () => {
    if (!username.trim()) return setErrorFor('username', 'Username cannot be empty')
    if (username === user.user_metadata.username) return setErrorFor('username', 'This is already your username!')
    setLoadingFor('username', true)
    setErrorFor('username', '')

    const res = await fetch(`${API_URL}/settings/username`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, username })
    })

    const data = await res.json()
    setLoadingFor('username', false)

    if (data.error) return setErrorFor('username', data.error)
    setSuccessFor('username', true)
    await supabase.auth.refreshSession()
  }

  const handleUpdateDisplayName = async () => {
    if (!displayName.trim()) return setErrorFor('displayName', 'Display name cannot be empty')
    setLoadingFor('displayName', true)
    setErrorFor('displayName', '')

    const res = await fetch(`${API_URL}/settings/displayname`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, display_name: displayName })
    })

    const data = await res.json()
    setLoadingFor('displayName', false)

    if (data.error) return setErrorFor('displayName', data.error)
    invalidateProfile(user.user_metadata.username)
    window.dispatchEvent(new CustomEvent('tweety_profile_updated', { detail: { user_id: user.id, display_name: displayName } }));
    setSuccessFor('displayName', true)
  }

  const handleUpdateEmail = async () => {
    if (!email.trim()) return setErrorFor('email', 'Email cannot be empty')
    setLoadingFor('email', true)
    setErrorFor('email', '')

    const res = await fetch(`${API_URL}/settings/email`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, email })
    })

    const data = await res.json()
    setLoadingFor('email', false)

    if (data.error) return setErrorFor('email', data.error)
    setSuccessFor('email', true)
  }

  const handleUpdatePassword = async () => {
    if (!password.trim()) return setErrorFor('password', 'Password cannot be empty')
    if (password !== confirmPassword) return setErrorFor('password', 'Passwords do not match')
    if (password.length < 6) return setErrorFor('password', 'Password must be at least 6 characters')
    setLoadingFor('password', true)
    setErrorFor('password', '')

    const res = await fetch(`${API_URL}/settings/password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, password })
    })

    const data = await res.json()
    setLoadingFor('password', false)

    if (data.error) return setErrorFor('password', data.error)
    setSuccessFor('password', true)
    setPassword('')
    setConfirmPassword('')
  }

  const handleDeleteAccount = async () => {
    const res = await fetch(`${API_URL}/settings/account`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id })
    })

    const data = await res.json()
    if (data.error) return setErrorFor('delete', data.error)

    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Settings</h2>
      </div>

      {/* Display Name */}
      {/* Display Name */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          <i className="fa-solid fa-id-card"></i> Display Name
        </h3>
        <p style={styles.hint}>This is how your name appears on your profile. Can be changed anytime.</p>
        <input
          style={styles.input}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={profile?.display_name || 'Set a display name'}
        />
        {errors.displayName && <p style={styles.error}>{errors.displayName}</p>}
        {success.displayName && <p style={styles.successMsg}>✅ Display name updated!</p>}
        <button
          style={{
            ...styles.saveBtn,
            opacity: !displayName.trim() || displayName === (profile?.display_name || '') ? 0.5 : 1,
            cursor: !displayName.trim() || displayName === (profile?.display_name || '') ? 'not-allowed' : 'pointer'
          }}
          onClick={handleUpdateDisplayName}
          disabled={loading.displayName || !displayName.trim() || displayName === (profile?.display_name || '')}
        >
          {loading.displayName ? 'Saving...' : 'Change Display Name'}
        </button>
      </div>

      {/* Change Username */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          <i className="fa-solid fa-at"></i> Username
        </h3>
        <p style={styles.hint}>Your unique username. Must be available and cannot be taken by someone else.</p>
        <input
          style={styles.input}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="New username"
        />
        {errors.username && <p style={styles.error}>{errors.username}</p>}
        {success.username && <p style={styles.successMsg}>✅ Username updated!</p>}
        <button style={styles.saveBtn} onClick={handleUpdateUsername} disabled={loading.username}>
          {loading.username ? 'Saving...' : 'Save Username'}
        </button>
      </div>

      {/* Change Email */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          <i className="fa-solid fa-envelope"></i> Email
        </h3>
        <input
          style={styles.input}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="New email"
        />
        {errors.email && <p style={styles.error}>{errors.email}</p>}
        {success.email && <p style={styles.successMsg}>✅ Email updated!</p>}
        <button style={styles.saveBtn} onClick={handleUpdateEmail} disabled={loading.email}>
          {loading.email ? 'Saving...' : 'Save Email'}
        </button>
      </div>

      {/* Change Password */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          <i className="fa-solid fa-lock"></i> Password
        </h3>
        <input
          style={styles.input}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
        />
        <input
          style={{ ...styles.input, marginTop: '10px' }}
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
        />
        {errors.password && <p style={styles.error}>{errors.password}</p>}
        {success.password && <p style={styles.successMsg}>✅ Password updated!</p>}
        <button style={styles.saveBtn} onClick={handleUpdatePassword} disabled={loading.password}>
          {loading.password ? 'Saving...' : 'Save Password'}
        </button>
      </div>

      {/* Delete Account */}
      <div style={{ ...styles.section, borderColor: '#3a1a1a' }}>
        <h3 style={{ ...styles.sectionTitle, color: '#ff4444' }}>
          <i className="fa-solid fa-triangle-exclamation"></i> Danger Zone
        </h3>
        <p style={styles.dangerText}>Deleting your account is permanent and cannot be undone.</p>
        {errors.delete && <p style={styles.error}>{errors.delete}</p>}
        <button style={styles.deleteBtn} onClick={() => setShowDeleteModal(true)}>
          <i className="fa-solid fa-trash"></i> Delete Account
        </button>
      </div>

      {showDeleteModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Delete Account?</h3>
            <p style={styles.modalText}>This will permanently delete your account and all your data.</p>
            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button style={styles.confirmBtn} onClick={handleDeleteAccount}>Delete Forever</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
