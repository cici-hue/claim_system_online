import { mockApi } from './mockData'

export interface AuditLog {
  id: number; timestamp: string; username: string
  userRole: string; action: string; details: string
}

export interface AuditLogFilters {
  search?: string; action?: string; user?: string
  from?: string; to?: string; page?: number; size?: number
}

const USE_MOCK = true

export const getAuditLogs = async (filters: AuditLogFilters) => {
  if (USE_MOCK) {
    const response = await mockApi.getAuditLogs()
    let logs = response.data
    
    // 过滤
    if (filters.action) logs = logs.filter(l => l.action === filters.action)
    if (filters.user) logs = logs.filter(l => l.user === filters.user)
    if (filters.search) {
      const search = filters.search.toLowerCase()
      logs = logs.filter(l => 
        l.user.toLowerCase().includes(search) ||
        l.action.toLowerCase().includes(search) ||
        l.details.toLowerCase().includes(search)
      )
    }
    
    return {
      content: logs,
      totalElements: logs.length,
      totalPages: 1,
      number: 0,
      size: logs.length
    }
  }
  const api = (await import('./api')).default
  return api.get('/audit-logs', { params: filters }).then(r => r.data)
}
