import React, { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

interface Props {
  collapsed: boolean
  onToggle: () => void
}

const Sidebar: React.FC<Props> = ({ collapsed, onToggle }) => {
  const { canViewAuditLogs, isSuperAdmin, user } = useAuth()
  const location = useLocation()
  const [isMobile, setIsMobile] = useState(false)

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 991)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Menu items based on V8 version - 所有用户可见基础菜单
  const baseNavItems = [
    { to: '/', icon: 'speedometer2', label: 'Dashboard & AI' },
    { to: '/claims', icon: 'table', label: 'Claims List' },
    { to: '/claims/new', icon: 'plus-circle', label: 'New Claim' },
  ]
  
  // SuperAdmin/Admin 可见用户管理（与后端保持一致）
  const adminNavItems = (isSuperAdmin() || user?.role === 'ADMIN')
    ? [{ to: '/users', icon: 'people', label: 'User Management' }]
    : []
  
  // 仅 SuperAdmin 和 QC Admin 可见审计日志
  const auditNavItems = canViewAuditLogs()
    ? [{ to: '/logs', icon: 'journal-bookmark-fill', label: 'Audit Logs' }]
    : []
  
  const navItems = [...baseNavItems, ...adminNavItems, ...auditNavItems]

  const sidebarWidth = 272 // var(--sidebar-width)

  return (
    <>
      {/* Mobile Overlay (visible when sidebar is open on mobile) */}
      {!collapsed && isMobile && (
        <div
          onClick={onToggle}
          style={{
            display: 'block',
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.45)',
            backdropFilter: 'blur(2px)',
            zIndex: 999,
          }}
        />
      )}

      {/* Sidebar Reopen Tab (visible when sidebar is collapsed on desktop) - V8 Style */}
      {!isMobile && (
        <button
          onClick={onToggle}
          title="Open sidebar"
          style={{
            position: 'fixed',
            left: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 1100,
            background: 'linear-gradient(200deg, #1e4270, #0f2540)',
            color: '#fff',
            border: 'none',
            borderRadius: '0 8px 8px 0',
            padding: '16px 8px',
            cursor: 'pointer',
            fontSize: '1rem',
            boxShadow: '3px 0 12px rgba(15,23,42,.22)',
            opacity: collapsed ? 1 : 0,
            pointerEvents: collapsed ? 'auto' : 'none',
            transition: 'opacity 0.2s ease',
          }}
        >
          <i className="bi bi-layout-sidebar"></i>
        </button>
      )}

      {/* Sidebar */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          left: 0,
          width: collapsed ? 0 : sidebarWidth,
          minWidth: collapsed ? 0 : sidebarWidth,
          height: '100vh',
          background: 'linear-gradient(200deg, #1e4270 0%, #0f2540 100%)',
          color: '#fff',
          zIndex: 1000,
          boxShadow: '4px 0 24px rgba(15,23,42,.18)',
          transition: 'width 0.2s ease, min-width 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          overflow: 'hidden',
          // Mobile: fixed position
          ...(isMobile && {
            position: 'fixed',
            transform: collapsed ? 'translateX(-100%)' : 'translateX(0)',
          }),
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '22px 20px 18px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <i className="bi bi-clipboard-data-fill"></i>
                Claim Manager
              </h3>
              <p
                style={{
                  fontSize: '0.72rem',
                  opacity: 0.55,
                  marginTop: '4px',
                  letterSpacing: '0.02em',
                  marginBottom: 0,
                }}
              >
                Otto International QC System
              </p>
            </div>
            {/* Close/Collapse Button */}
            <button
              onClick={onToggle}
              title={isMobile ? 'Close sidebar' : 'Collapse sidebar'}
              style={{
                background: 'rgba(255,255,255,0.10)',
                border: '1px solid rgba(255,255,255,0.20)',
                borderRadius: '6px',
                color: 'rgba(255,255,255,0.85)',
                fontSize: '1rem',
                padding: '5px 8px',
                cursor: 'pointer',
                lineHeight: 1,
                transition: 'background 0.2s ease, color 0.2s ease',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.22)'
                e.currentTarget.style.color = '#fff'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.10)'
                e.currentTarget.style.color = 'rgba(255,255,255,0.85)'
              }}
            >
              <i className="bi bi-layout-sidebar"></i>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ padding: '12px 0', flex: 1, overflowY: 'auto' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {navItems.map((item) => {
              // Exact match for root, exact match for /claims/new, or starts with (but not exact match for parent routes)
              const isActive = location.pathname === item.to ||
                (item.to === '/claims/new' && location.pathname === '/claims/new') ||
                (item.to === '/claims' && location.pathname === '/claims') ||
                (item.to !== '/' && item.to !== '/claims' && item.to !== '/claims/new' && location.pathname.startsWith(item.to))

              return (
                <li key={item.to} style={{ margin: '1px 10px' }}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px 12px',
                      color: isActive ? '#fff' : 'rgba(255,255,255,0.72)',
                      textDecoration: 'none',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      borderRadius: '6px',
                      transition: 'background 0.2s ease, color 0.2s ease',
                      gap: '10px',
                      background: isActive ? 'rgba(255,255,255,0.14)' : 'transparent',
                      boxShadow: isActive ? 'inset 3px 0 0 #f59e0b' : 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.10)'
                        e.currentTarget.style.color = '#fff'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = 'rgba(255,255,255,0.72)'
                      }
                    }}
                  >
                    <i
                      className={`bi bi-${item.icon}`}
                      style={{
                        fontSize: '1.1rem',
                        width: '24px',
                        flexShrink: 0,
                      }}
                    ></i>
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </>
  )
}

export default Sidebar
