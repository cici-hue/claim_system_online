import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ToastProvider } from './hooks/useToast'
import Sidebar from './components/common/Sidebar'
import Header from './components/common/Header'
import AIChatWidget from './components/common/AIChatWidget'
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
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true' } catch { return false }
  })

  const toggle = () => {
    setCollapsed(c => {
      const next = !c
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
      return next
    })
  }

  // For mobile: open sidebar
  const openMobileSidebar = () => setCollapsed(false)

  if (!user) return <Navigate to="/login" replace />
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f4f8' }}>
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <main className="main-content" style={{
        flex: 1,
        minWidth: 0,
        padding: '140px 28px 24px 28px',
        minHeight: '100vh',
        boxSizing: 'border-box',
        position: 'relative',
      }}>
        <Header onMenuToggle={openMobileSidebar} collapsed={collapsed} />
        <Outlet />
      </main>
      <AIChatWidget />
    </div>
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
