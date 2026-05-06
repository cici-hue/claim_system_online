import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ToastProvider } from './hooks/useToast'
import Sidebar from './components/common/Sidebar'
import Header from './components/common/Header'
import AIChatWidget from './components/common/AIChatWidget'
import ErrorBoundary from './components/common/ErrorBoundary'
import LoginPage from './components/common/LoginPage'
import DashboardPage from './components/Dashboard/DashboardPage'
import ClaimsListPage from './components/Claims/ClaimsListPage'
import ClaimFormPage from './components/Claims/ClaimFormPage'
import ClaimDetailPage from './components/Claims/ClaimDetailPage'
import UsersPage from './components/Users/UsersPage'
import AuditLogsPage from './components/AuditLogs/AuditLogsPage'

const SIDEBAR_COLLAPSED_KEY = 'cms_sidebar_collapsed'

const AppLayout: React.FC = () => {
  const { user } = useAuth()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true' } catch { return false }
  })
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 991)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 991)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (isMobile) setCollapsed(true)
  }, [isMobile, location.pathname])

  const toggle = () => {
    setCollapsed(c => {
      const next = !c
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
      return next
    })
  }

  const openMobileSidebar = () => setCollapsed(false)

  if (!user) return <Navigate to="/login" replace />

  const mainPadding = isMobile
    ? '120px 12px 80px 12px'
    : '140px 28px 24px 28px'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f4f8' }}>
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <main className="main-content" style={{
        flex: 1,
        minWidth: 0,
        padding: mainPadding,
        minHeight: '100vh',
        boxSizing: 'border-box',
        position: 'relative',
      }}>
        <Header onMenuToggle={openMobileSidebar} collapsed={collapsed} />
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <AIChatWidget />
      {isMobile && <MobileBottomNav />}
    </div>
  )
}

const MobileBottomNav: React.FC = () => {
  const navigate = (window as any).__routerNavigate
  const location = useLocation()

  const navItems = [
    { to: '/', icon: 'bi-speedometer2', label: 'Dashboard' },
    { to: '/claims', icon: 'bi-table', label: 'Claims' },
    { to: '/claims/new', icon: 'bi-plus-circle', label: 'New' },
  ]

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '64px',
      background: '#fff',
      borderTop: '1px solid #e2e8f0',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      zIndex: 1100,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      boxShadow: '0 -2px 12px rgba(15,23,42,0.06)',
    }}>
      {navItems.map(item => {
        const isActive = location.pathname === item.to ||
          (item.to === '/claims/new' && location.pathname === '/claims/new')
        return (
          <a
            key={item.to}
            href={item.to}
            onClick={(e) => {
              e.preventDefault()
              if (navigate) navigate(item.to)
              else window.location.href = item.to
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              padding: '6px 16px',
              minWidth: '48px',
              minHeight: '48px',
              textDecoration: 'none',
              color: isActive ? '#1a3a5c' : '#94a3b8',
              fontSize: '0.65rem',
              fontWeight: isActive ? 700 : 500,
              borderRadius: '8px',
              transition: 'color 0.15s',
            }}
          >
            <i className={`bi ${item.icon}`} style={{ fontSize: '1.2rem' }}></i>
            {item.label}
          </a>
        )
      })}
    </nav>
  )
}

const UserManagementGuard: React.FC = () => {
  const { isSuperAdmin, user } = useAuth()
  // SuperAdmin 或 Admin 可访问用户管理
  const canAccessUserManagement = isSuperAdmin() || user?.role === 'ADMIN'
  return canAccessUserManagement ? <Outlet /> : <Navigate to="/" replace />
}

const AuditLogGuard: React.FC = () => {
  const { canViewAuditLogs } = useAuth()
  return canViewAuditLogs() ? <Outlet /> : <Navigate to="/" replace />
}

const App: React.FC = () => (
  <AuthProvider>
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute />} />
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="claims" element={<ClaimsListPage />} />
            <Route path="claims/new" element={<ClaimFormPage />} />
            <Route path="claims/:id" element={<ClaimDetailPage />} />
            <Route path="claims/:id/edit" element={<ClaimFormPage />} />
            <Route element={<UserManagementGuard />}>
              <Route path="users" element={<UsersPage />} />
            </Route>
            <Route element={<AuditLogGuard />}>
              <Route path="logs" element={<AuditLogsPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  </AuthProvider>
)

const PublicRoute: React.FC = () => {
  const { user } = useAuth()
  return user ? <Navigate to="/" replace /> : <LoginPage />
}

export default App
