import React, { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getClaims } from '../../services/claimService'
import { Claim } from '../../types/claim'

interface HeaderProps {
  onMenuToggle?: () => void
  collapsed?: boolean
}

const Header: React.FC<HeaderProps> = ({ onMenuToggle, collapsed = false }) => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [overdueCount, setOverdueCount] = useState(0)
  const [overdueClaims, setOverdueClaims] = useState<Claim[]>([])
  const [newClaimCount, setNewClaimCount] = useState(0)
  const [newClaims, setNewClaims] = useState<Claim[]>([])
  const [notifOpen, setNotifOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'rca' | 'new'>('rca')
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

  // Calculate notifications based on user role
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await getClaims({ page: 0, size: 1000 })
        // Handle both mock API (direct array) and real API ({ content: [...] })
        const claims = Array.isArray(response.data) ? response.data : (response.data.content || [])
        
        const role = user?.role?.toLowerCase() || ''
        const userFactoryAgent = user?.factoryAgent || ''
        
        console.log('Header - User role:', role, 'FactoryAgent:', userFactoryAgent)
        console.log('Header - Total claims:', claims.length)
        
        // 1. RCA Notifications (existing logic)
        let rcaClaims: Claim[] = []
        
        if (role.includes('supervisor')) {
          // Supervisor: 待批复的RCA (SUBMITTED status)
          rcaClaims = claims.filter(c => c.rcaStatus === 'SUBMITTED')
        } else if (role.includes('manager')) {
          // Manager: 待批复RCA (PENDING_MANAGER status)
          rcaClaims = claims.filter(c => c.rcaStatus === 'PENDING_MANAGER')
        } else if (role.includes('inspector') || role.includes('qc')) {
          // Inspector/QC: 需重新提交的被reject的RCA
          rcaClaims = claims.filter(c => c.rcaStatus === 'REJECTED')
        } else {
          // Admin/SuperAdmin/其他: 显示overdue RCA
          console.log('Header - Checking overdue RCA for Admin/SuperAdmin')
          rcaClaims = claims.filter(c => {
            if (c.status === 'CLOSED' || !c.claimDate) {
              console.log(`  ${c.claimNo}: skipped - status=${c.status}, claimDate=${c.claimDate}`)
              return false
            }
            const daysDiff = Math.floor((Date.now() - new Date(c.claimDate).getTime()) / (1000 * 60 * 60 * 24))
            const isOverdue = daysDiff > 14 && !['COMPLETED', 'APPROVED'].includes(c.rcaStatus || '')
            console.log(`  ${c.claimNo}: daysDiff=${daysDiff}, rcaStatus=${c.rcaStatus}, isOverdue=${isOverdue}`)
            return isOverdue
          })
        }
        
        console.log('Header - RCA claims found:', rcaClaims.length, 'for role:', role)
        setOverdueCount(rcaClaims.length)
        setOverdueClaims(rcaClaims.slice(0, 5)) // Show top 5 in dropdown
        
        // 2. New Claim Notifications for Admin/Supervisor/Manager with same factory agent
        // Show new claims created within last 24 hours for same factory agent
        const shouldShowNewClaims = role.includes('admin') || role.includes('supervisor') || role.includes('manager')
        console.log('Header - Should show new claims:', shouldShowNewClaims, 'role check:', role)
        
        if (shouldShowNewClaims) {
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
          console.log('Header - Checking new claims after:', oneDayAgo, 'userFactoryAgent:', userFactoryAgent)
          
          // Debug: Show all claims and their factory agents
          console.log('Header - All claims factory agents:')
          claims.forEach(c => {
            console.log(`  ${c.claimNo}: factoryAgent=${c.factoryAgent}, createdAt=${c.createdAt}`)
          })
          
          const newClaimNotifications = claims.filter(c => {
            // Must be same factory agent
            if (!userFactoryAgent || c.factoryAgent !== userFactoryAgent) {
              return false
            }
            // Created within last 24 hours
            const claimCreatedAt = c.createdAt ? new Date(c.createdAt) : null
            if (!claimCreatedAt) return false
            return claimCreatedAt > oneDayAgo
          })
          
          console.log('Header - New claims found:', newClaimNotifications.length)
          setNewClaimCount(newClaimNotifications.length)
          setNewClaims(newClaimNotifications.slice(0, 5))
        } else {
          console.log('Header - Skipping new claims, role not match')
          setNewClaimCount(0)
          setNewClaims([])
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error)
      }
    }

    fetchNotifications()
    // Refresh every 5 minutes
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
      top: '24px',
      left: sidebarWidth + 28, // sidebar width + main content left padding
      right: '28px',
      background: '#ffffff',
      borderRadius: '12px',
      padding: '14px 24px',
      display: 'flex',
      justifyContent: 'flex-start',
      alignItems: 'center',
      boxShadow: '0 1px 3px rgba(15,23,42,0.08)',
      border: '1px solid #e2e8f0',
      zIndex: 100,
      transition: 'left 0.3s ease',
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
            marginRight: '12px',
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
        fontSize: '1.35rem',
        fontWeight: 700,
        color: '#1a3a5c',
        margin: 0,
        letterSpacing: '-0.01em',
      }}>
        {pageTitle}
      </h1>

      {/* Version Badge */}
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

      {/* User Badge - Right Side (V8 Style) */}
      <div className="user-badge" style={{
        marginLeft: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: '#f8fafc',
        padding: '7px 16px 7px 10px',
        borderRadius: '40px',
        border: '1px solid #e2e8f0',
      }}>
        {/* User Info */}
        <i className="bi bi-person-circle" style={{ fontSize: '1.5rem', color: '#2c5f8a' }}></i>
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
              width: '320px',
              maxHeight: '400px',
              background: '#fff',
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(15,23,42,0.16)',
              border: '1px solid #e2e8f0',
              zIndex: 1000,
              overflow: 'hidden',
            }}>
              {(() => {
                const role = user?.role?.toLowerCase() || ''
                const showTabs = role.includes('admin') || role.includes('supervisor') || role.includes('manager')
                
                // For Inspector/QC - simple view
                if (role.includes('inspector') || role.includes('qc')) {
                  return (
                    <>
                      <div style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}>
                        <span style={{
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: '#1a3a5c',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}>
                          <i className="bi bi-arrow-counterclockwise" style={{ color: '#f59e0b' }}></i>
                          Rejected RCA - Resubmit
                        </span>
                        {overdueCount > 0 && (
                          <span style={{
                            fontSize: '0.75rem',
                            color: '#f59e0b',
                            fontWeight: 600,
                          }}>{overdueCount} pending</span>
                        )}
                      </div>
                      <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                        {overdueCount > 0 ? (
                          <div>
                            {overdueClaims.map((claim, idx) => (
                              <div key={claim.id} style={{
                                padding: '12px 16px',
                                borderBottom: idx < overdueClaims.length - 1 ? '1px solid #e2e8f0' : 'none',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px',
                                cursor: 'pointer',
                                transition: 'background 0.15s',
                              }}
                              onClick={() => {
                                window.location.href = `/claims/${claim.id}`
                                setNotifOpen(false)
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc' }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = '#fff' }}
                              >
                                <i className="bi bi-arrow-counterclockwise" style={{ color: '#f59e0b', fontSize: '1rem', marginTop: '2px' }}></i>
                                <div style={{ flex: 1, textAlign: 'left' }}>
                                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1a3a5c', marginBottom: '2px' }}>
                                    {claim.claimNo} — {claim.vendor}
                                  </div>
                                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                    <i className="bi bi-x-circle" style={{ marginRight: '4px' }}></i>
                                    Rejected by {claim.rcaApprovalHistory?.[claim.rcaApprovalHistory.length - 1]?.approver || 'Manager'}
                                    {claim.inspector && ` • ${claim.inspector}`}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                            <i className="bi bi-check-circle-fill" style={{ color: '#22c55e', fontSize: '1.5rem', marginBottom: '8px', display: 'block' }}></i>
                            <p style={{ margin: 0 }}>No rejected RCAs to resubmit</p>
                          </div>
                        )}
                      </div>
                    </>
                  )
                }
                
                // For Admin/Supervisor/Manager - Tabbed view
                let rcaTitle = 'RCA'
                let rcaIcon = 'bi-exclamation-triangle-fill'
                let rcaColor = '#ef4444'
                
                if (role.includes('supervisor')) {
                  rcaTitle = 'Pending RCA'
                  rcaIcon = 'bi-clipboard-check'
                  rcaColor = '#3b82f6'
                } else if (role.includes('manager')) {
                  rcaTitle = 'Pending Final'
                  rcaIcon = 'bi-clipboard-check-fill'
                  rcaColor = '#8b5cf6'
                }
                
                return (
                  <>
                    {/* Tab Header */}
                    <div style={{
                      display: 'flex',
                      borderBottom: '1px solid #e2e8f0',
                    }}>
                      <button
                        onClick={() => setActiveTab('rca')}
                        style={{
                          flex: 1,
                          padding: '12px 8px',
                          background: activeTab === 'rca' ? '#fff' : '#f8fafc',
                          border: 'none',
                          borderBottom: activeTab === 'rca' ? `2px solid ${rcaColor}` : '2px solid transparent',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: activeTab === 'rca' ? rcaColor : '#64748b',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <i className={`bi ${rcaIcon}`}></i>
                        {rcaTitle}
                        {overdueCount > 0 && (
                          <span style={{
                            background: rcaColor,
                            color: '#fff',
                            borderRadius: '10px',
                            fontSize: '0.65rem',
                            padding: '1px 6px',
                            fontWeight: 700,
                          }}>{overdueCount}</span>
                        )}
                      </button>
                      <button
                        onClick={() => setActiveTab('new')}
                        style={{
                          flex: 1,
                          padding: '12px 8px',
                          background: activeTab === 'new' ? '#fff' : '#f8fafc',
                          border: 'none',
                          borderBottom: activeTab === 'new' ? '2px solid #10b981' : '2px solid transparent',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: activeTab === 'new' ? '#10b981' : '#64748b',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <i className="bi bi-plus-circle-fill"></i>
                        New Claims
                        {newClaimCount > 0 && (
                          <span style={{
                            background: '#ef4444',
                            color: '#fff',
                            borderRadius: '10px',
                            fontSize: '0.65rem',
                            padding: '1px 6px',
                            fontWeight: 700,
                          }}>{newClaimCount}</span>
                        )}
                      </button>
                    </div>
                    
                    {/* Tab Content */}
                    <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                      {activeTab === 'rca' ? (
                        // RCA Tab Content
                        overdueCount > 0 ? (
                          <div>
                            {overdueClaims.map((claim, idx) => {
                              let subtitle = ''
                              let subtitleIcon = 'bi-clock'
                              
                              if (role.includes('supervisor') || role.includes('manager')) {
                                subtitle = `Submitted by ${claim.createdBy || 'Unknown'}`
                                subtitleIcon = 'bi-person'
                              } else {
                                const overdueDays = claim.claimDate 
                                  ? Math.floor((Date.now() - new Date(claim.claimDate).getTime()) / (1000 * 60 * 60 * 24)) - 14
                                  : 0
                                subtitle = `${overdueDays} days overdue`
                              }
                              
                              return (
                                <div key={claim.id} style={{
                                  padding: '12px 16px',
                                  borderBottom: idx < overdueClaims.length - 1 ? '1px solid #e2e8f0' : 'none',
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: '10px',
                                  cursor: 'pointer',
                                  transition: 'background 0.15s',
                                }}
                                onClick={() => {
                                  window.location.href = `/claims/${claim.id}`
                                  setNotifOpen(false)
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc' }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#fff' }}
                                >
                                  <i className="bi bi-clipboard" style={{ color: rcaColor, fontSize: '1rem', marginTop: '2px' }}></i>
                                  <div style={{ flex: 1, textAlign: 'left' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1a3a5c', marginBottom: '2px' }}>
                                      {claim.claimNo} — {claim.vendor}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                      <i className={`bi ${subtitleIcon}`} style={{ marginRight: '4px' }}></i>
                                      {subtitle}
                                      {claim.inspector && ` • ${claim.inspector}`}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                            {overdueCount > 5 && (
                              <div style={{ padding: '10px 16px', textAlign: 'center', fontSize: '0.75rem', color: '#64748b', borderTop: '1px solid #e2e8f0' }}>
                                +{overdueCount - 5} more items
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                            <i className="bi bi-check-circle-fill" style={{ color: '#22c55e', fontSize: '1.5rem', marginBottom: '8px', display: 'block' }}></i>
                            <p style={{ margin: 0 }}>
                              {role.includes('supervisor') ? 'No pending RCA approvals' : 
                               role.includes('manager') ? 'No pending final approvals' : 
                               'No overdue RCA claims'}
                            </p>
                          </div>
                        )
                      ) : (
                        // New Claims Tab Content
                        newClaimCount > 0 ? (
                          <div>
                            {newClaims.map((claim, idx) => {
                              const createdTime = claim.createdAt 
                                ? new Date(claim.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                : 'Unknown'
                              
                              return (
                                <div key={claim.id} style={{
                                  padding: '12px 16px',
                                  borderBottom: idx < newClaims.length - 1 ? '1px solid #e2e8f0' : 'none',
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: '10px',
                                  cursor: 'pointer',
                                  transition: 'background 0.15s',
                                }}
                                onClick={() => {
                                  window.location.href = `/claims/${claim.id}`
                                  setNotifOpen(false)
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc' }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#fff' }}
                                >
                                  <i className="bi bi-plus-circle-fill" style={{ color: '#10b981', fontSize: '1rem', marginTop: '2px' }}></i>
                                  <div style={{ flex: 1, textAlign: 'left' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1a3a5c', marginBottom: '2px' }}>
                                      {claim.claimNo} — {claim.vendor}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                      <i className="bi bi-clock" style={{ marginRight: '4px' }}></i>
                                      Created {createdTime}
                                      {claim.createdBy && ` by ${claim.createdBy}`}
                                    </div>
                                  </div>
                                  <span style={{
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '0.65rem',
                                    fontWeight: 600,
                                    background: '#dcfce7',
                                    color: '#166534',
                                  }}>NEW</span>
                                </div>
                              )
                            })}
                            {newClaimCount > 5 && (
                              <div style={{ padding: '10px 16px', textAlign: 'center', fontSize: '0.75rem', color: '#64748b', borderTop: '1px solid #e2e8f0' }}>
                                +{newClaimCount - 5} more new claims
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                            <i className="bi bi-check-circle-fill" style={{ color: '#22c55e', fontSize: '1.5rem', marginBottom: '8px', display: 'block' }}></i>
                            <p style={{ margin: 0 }}>No new claims in last 24 hours</p>
                          </div>
                        )
                      )}
                    </div>
                  </>
                )
              })()}
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
