import React, { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'

const LoginPage: React.FC = () => {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
    } catch {
      setError('Invalid username or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(145deg, #0f2540 0%, #1a3a5c 50%, #2c5f8a 100%)'
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.97)', borderRadius: 20, padding: '36px 32px',
        width: 420, boxShadow: '0 24px 64px rgba(15,23,42,.30)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56, background: 'linear-gradient(135deg,#1a3a5c,#2c5f8a)',
            borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16, boxShadow: '0 4px 14px rgba(26,58,92,0.35)'
          }}>
            <span style={{ fontSize: '1.7rem', color: '#fff' }}>🔒</span>
          </div>
          <h3 style={{ color: '#1a3a5c', fontWeight: 700, margin: 0 }}>Claim Management System</h3>
          <p style={{ color: '#64748b', marginTop: 4 }}>Otto International Quality Control</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#0f172a' }}>
              Username
            </label>
            <input
              value={username} onChange={e => setUsername(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 }}
              placeholder="Enter username" required
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#0f172a' }}>
              Password
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 }}
              placeholder="Enter password" required
            />
          </div>
          {error && <p style={{ color: '#ef4444', marginBottom: 12, textAlign: 'center' }}>{error}</p>}
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: 10, background: 'linear-gradient(135deg,#1a3a5c,#2c5f8a)',
            color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 15,
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1
          }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default LoginPage
