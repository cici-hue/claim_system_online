import React, { createContext, useContext, useState, useEffect } from 'react'
import { login as apiLogin, LoginResponse } from '../services/authService'

interface AuthContextType {
  user: LoginResponse | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  isAdmin: () => boolean
  isManager: () => boolean
  isSuperAdmin: () => boolean
  isSupervisor: () => boolean
  isInspector: () => boolean
  canManageClaims: () => boolean
  canManageUsers: () => boolean
  canApproveRCAFinal: () => boolean
  canApproveRCASupervisor: () => boolean
  canScoreRCA: () => boolean
  canViewAuditLogs: () => boolean
  canImportExport: () => boolean
  canSendRCAReminder: () => boolean
  canSendEarlyWarning: () => boolean
}

const AuthContext = createContext<AuthContextType>(null!)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<LoginResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('cms_user')
    if (stored) {
      setUser(JSON.parse(stored))
    } else if (import.meta.env.DEV) {
      const mockUser: LoginResponse = {
        token: 'mock-token-for-preview',
        username: 'admin',
        fullname: 'System Admin',
        role: 'SUPERADMIN',
        team: 'Management',
        factoryAgent: 'HQ'
      }
      localStorage.setItem('cms_token', mockUser.token)
      localStorage.setItem('cms_user', JSON.stringify(mockUser))
      setUser(mockUser)
    }
    setIsLoading(false)
  }, [])

  const login = async (username: string, password: string) => {
    const data = await apiLogin({ username, password })
    localStorage.setItem('cms_token', data.token)
    localStorage.setItem('cms_user', JSON.stringify(data))
    setUser(data)
  }

  const logout = () => {
    localStorage.removeItem('cms_token')
    localStorage.removeItem('cms_user')
    setUser(null)
  }

  // 权限定义
  const isSuperAdmin = () => user?.role === 'SUPERADMIN'
  const isAdmin = () => user?.role === 'ADMIN' || isSuperAdmin()
  const isManager = () => user?.role === 'MANAGER'
  const isSupervisor = () => user?.role === 'SUPERVISOR'
  const isInspector = () => user?.role === 'INSPECTOR'
  
  // 索赔创建/编辑/删除权限：仅 SuperAdmin 和 QC Admin
  const canManageClaims = () => isSuperAdmin() || user?.role === 'ADMIN'
  
  // 用户管理权限：SuperAdmin 和 QC Admin
  const canManageUsers = () => isSuperAdmin() || user?.role === 'ADMIN'
  
  // RCA Manager 审批权限
  const canApproveRCAFinal = () => isManager()
  
  // RCA Supervisor 审批权限
  const canApproveRCASupervisor = () => isSupervisor() || isManager() || isAdmin()
  
  // RCA 评分权限
  const canScoreRCA = () => isSupervisor() || isManager() || isAdmin()
  
  // 审计日志查看权限：SuperAdmin 和 QC Admin
  const canViewAuditLogs = () => isSuperAdmin() || user?.role === 'ADMIN'
  
  // Import/Export 权限
  const canImportExport = () => true
  
  // RCA Reminder 权限：SuperAdmin/Supervisor/Manager/Admin
  const canSendRCAReminder = () => isSuperAdmin() || isSupervisor() || isManager() || isAdmin()
  
  // Early Warning 权限：SuperAdmin/Supervisor/Manager/Admin
  const canSendEarlyWarning = () => isSuperAdmin() || isSupervisor() || isManager() || isAdmin()

  return (
    <AuthContext.Provider value={{ 
      user, isLoading, login, logout, 
      isAdmin, isManager, isSuperAdmin, isSupervisor, isInspector,
      canManageClaims, canManageUsers, canApproveRCAFinal, canApproveRCASupervisor, canScoreRCA,
      canViewAuditLogs, canImportExport, canSendRCAReminder, canSendEarlyWarning
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
