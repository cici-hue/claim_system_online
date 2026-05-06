import React, { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getNotifications, Notifications } from '../../services/notificationService'

interface HeaderProps {
  onMenuToggle?: () => void
  collapsed?: boolean
}

const Header: React.FC<HeaderProps> = ({ onMenuToggle, collapsed = false }) => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [overdueCount, setOverdueCount] = useState(0)
  const [newClaimCount, setNewClaimCount] = useState(0)
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [pageTitle, setPageTitle] = useState('Dashboard & AI Assistant')

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 991)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fetch notifications from backend
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data: Notifications = await getNotifications()
        setOverdueCount(data.rcaCount)
        setNewClaimCount(data.newClaimCount)
      } catch (error) {
        console.error('Failed to fetch notifications:', error)
      }
    }

    fetchNotifications()
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [user])

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    if (notifOpen) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [notifOpen])

  // Update page title when location changes
  useEffect(() => {
    const path = location.pathname
    if (path === '/' || path === '/dashboard') setPageTitle('Dashboard & AI Assistant')
    else if (path === '/claims') setPageTitle('Claims List')
    else if (path === '/claims/new') setPageTitle('New Claim')
    else if (path.includes('/edit')) setPageTitle('Edit Claim')
    else if (path.startsWith('/claims/')) setPageTitle('Claim Details')
    else if (path === '/users') setPageTitle('User Management')
    else if (path === '/logs') setPageTitle('Audit Logs')
    else setPageTitle('Dashboard & AI Assistant')
  }, [location])

  // Sidebar width: 272px (expanded), 0px (collapsed)
  // Main content padding: 28px on both sides
  const sidebarWidth = collapsed ? 0 : 272
  
  return (
    <div className="top-bar" style={{
      position: 'fixed',
      top: isMobile ? '12px' : '24px',
      left: isMobile ? '12px' : sidebarWidth + 28,
      right: isMobile ? '12px' : '28px',
      background: '#ffffff',
      borderRadius: '12px',
      padding: isMobile ? '10px 14px' : '14px 24px',
      display: 'flex',
      justifyContent: 'flex-start',
      alignItems: 'center',
      boxShadow: '0 1px 3px rgba(15,23,42,0.08)',
      border: '1px solid #e2e8f0',
      zIndex: 100,
      transition: 'left 0.3s ease, top 0.2s ease, right 0.2s ease',
    }}>
      {/* Hamburger button - shown only on mobile */}
      {isMobile && onMenuToggle && (
        <button
          onClick={onMenuToggle}
          className="sidebar-hamburger"
          title="Open menu"
          aria-label="Open navigation"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            background: '#f8fafc',
            color: '#1a3a5c',
            cursor: 'pointer',
            fontSize: '1.1rem',
            marginRight: '10px',
            flexShrink: 0,
            transition: 'background 0.2s ease, color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#ffffff'
            e.currentTarget.style.color = '#2c5f8a'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f8fafc'
            e.currentTarget.style.color = '#1a3a5c'
          }}
        >
          <i className="bi bi-list"></i>
        </button>
      )}

      {/* Page Title */}
      <h1 className="page-title" style={{
        fontSize: isMobile ? '1rem' : '1.35rem',
        fontWeight: 700,
        color: '#1a3a5c',
        margin: 0,
        letterSpacing: '-0.01em',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {pageTitle}
      </h1>

      {/* Version Badge - hide on mobile */}
      {!isMobile && (
        <span style={{
          fontSize: '0.68rem',
          background: '#1e4270',
          color: '#fff',
          padding: '2px 8px',
          borderRadius: '10px',
          fontWeight: 700,
          marginLeft: '8px',
          flexShrink: 0,
        }}>
          v8
        </span>
      )}

      {/* User Badge - Right Side (V8 Style) */}
      <div className="user-badge" style={{
        marginLeft: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? '6px' : '12px',
        background: '#f8fafc',
        padding: isMobile ? '5px 10px 5px 6px' : '7px 16px 7px 10px',
        borderRadius: '40px',
        border: '1px solid #e2e8f0',
      }}>
        {/* User Info */}
        <i className="bi bi-person-circle" style={{ fontSize: isMobile ? '1.2rem' : '1.5rem', color: '#2c5f8a' }}></i>
        {!isMobile && (
          <div>
            <div style={{
              fontSize: '0.82rem',
              fontWeight: 600,
              color: '#0f172a',
            }}>
              {user?.fullname || user?.username || 'Loading...'}
            </div>
            <span className="user-role" style={{
              padding: '2px 10px',
              borderRadius: '20px',
              fontSize: '0.68rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              display: 'inline-block',
              marginTop: '2px',
              background: user?.role?.toLowerCase().includes('superadmin') ? '#ede9fe' : user?.role?.toLowerCase().includes('admin') ? '#fee2e2' : '#ffedd5',
              color: user?.role?.toLowerCase().includes('superadmin') ? '#6d28d9' : user?.role?.toLowerCase().includes('admin') ? '#b91c1c' : '#c2410c',
            }}>
              {user?.role || 'Admin'}
            </span>
          </div>
        )}

        {/* Notification Bell (V8 Style) */}
        <div className="notif-bell-wrap" style={{ position: 'relative' }} ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="notif-bell-btn"
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '6px 10px',
              cursor: 'pointer',
              color: '#1a3a5c',
              position: 'relative',
              transition: 'background 0.2s ease, color 0.2s ease',
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title={(() => {
              const role = user?.role?.toLowerCase() || ''
              if (role.includes('supervisor')) return 'Notifications'
              if (role.includes('manager')) return 'Notifications'
              if (role.includes('inspector') || role.includes('qc')) return 'Rejected RCA - Resubmit'
              return 'Overdue RCA Alerts'
            })()}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#eff6ff'
              e.currentTarget.style.color = '#3b82f6'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f8fafc'
              e.currentTarget.style.color = '#1a3a5c'
            }}
          >
            <i className="bi bi-bell" style={{ fontSize: '1rem' }}></i>
            {/* Total notification badge */}
            {(overdueCount + newClaimCount) > 0 && (
              <span className="notif-badge" style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                background: newClaimCount > 0 ? '#ef4444' : '#3b82f6',
                color: '#fff',
                borderRadius: '10px',
                fontSize: '0.58rem',
                fontWeight: 700,
                padding: '1px 5px',
                minWidth: '16px',
                textAlign: 'center',
                lineHeight: 1.5,
                border: '1.5px solid #ffffff',
              }}>{overdueCount + newClaimCount}</span>
            )}
            {/* Secondary badge for new claims (small red dot) */}
            {newClaimCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-2px',
                right: overdueCount > 0 ? '12px' : '-5px',
                background: '#ef4444',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                border: '1.5px solid #ffffff',
              }}></span>
            )}
          </button>

          {/* Notification Dropdown */}
          {notifOpen && (
            <div className="notif-dropdown" style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: '280px',
              background: '#fff',
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(15,23,42,0.16)',
              border: '1px solid #e2e8f0',
              zIndex: 1000,
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1a3a5c' }}>
                  Notifications
                </span>
              </div>
              <div style={{ padding: '12px 16px' }}>
                {overdueCount > 0 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 0', borderBottom: newClaimCount > 0 ? '1px solid #e2e8f0' : 'none',
                    cursor: 'pointer',
                  }} onClick={() => { window.location.href = '/claims'; setNotifOpen(false) }}>
                    <i className="bi bi-clipboard-check" style={{ color: '#3b82f6', fontSize: '1.1rem' }}></i>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1a3a5c' }}>RCA Pending</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{overdueCount} claim(s) need attention</div>
                    </div>
                  </div>
                )}
                {newClaimCount > 0 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 0', cursor: 'pointer',
                  }} onClick={() => { window.location.href = '/claims'; setNotifOpen(false) }}>
                    <i className="bi bi-plus-circle-fill" style={{ color: '#10b981', fontSize: '1.1rem' }}></i>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1a3a5c' }}>New Claims</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{newClaimCount} new in last 24h</div>
                    </div>
                  </div>
                )}
                {overdueCount === 0 && newClaimCount === 0 && (
                  <div style={{ padding: '16px 0', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                    <i className="bi bi-check-circle-fill" style={{ color: '#22c55e', fontSize: '1.3rem', marginBottom: '6px', display: 'block' }}></i>
                    All caught up!
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Logout Button (V8 Style) */}
        <button
          onClick={logout}
          className="btn btn-sm btn-outline-secondary"
          style={{
            borderRadius: '8px',
            fontSize: '0.78rem',
            fontWeight: 600,
            padding: '5px 12px',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            color: '#475569',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f1f5f9'
            e.currentTarget.style.borderColor = '#94a3b8'
            e.currentTarget.style.color = '#1e293b'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#ffffff'
            e.currentTarget.style.borderColor = '#cbd5e1'
            e.currentTarget.style.color = '#475569'
          }}
        >
          <i className="bi bi-box-arrow-right" style={{ marginRight: '2px' }}></i>
          Logout
        </button>
      </div>
    </div>
  )
}

export default Header
