import { mockApi } from './mockData'
import type { Claim, ClaimRequest, PageResponse, ClaimFilters, RcaApprovalHistory } from '../types/claim'

const USE_MOCK = true  // 设置为 true 使用模拟数据，false 使用真实 API

// Helper to get current user from localStorage
const getCurrentUser = () => {
  const stored = localStorage.getItem('cms_user')
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      return null
    }
  }
  return null
}

const getCurrentUserName = () => {
  const user = getCurrentUser()
  return user?.fullname || user?.username || 'Unknown'
}

export const getClaims = async (filters: ClaimFilters & { page?: number; size?: number; sort?: string }) => {
  if (USE_MOCK) {
    const response = await mockApi.getClaims()
    const claims = response.data
    const today = new Date()
    
    // 过滤
    let filtered = claims
    
    // Global search - search across multiple fields
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(c => 
        (c.claimNo && c.claimNo.toLowerCase().includes(searchLower)) ||
        (c.vendor && c.vendor.toLowerCase().includes(searchLower)) ||
        (c.customer && c.customer.toLowerCase().includes(searchLower)) ||
        (c.inspector && c.inspector.toLowerCase().includes(searchLower)) ||
        (c.defectCategory && c.defectCategory.toLowerCase().includes(searchLower)) ||
        (c.location && c.location.toLowerCase().includes(searchLower)) ||
        (c.articleNo && c.articleNo.toLowerCase().includes(searchLower)) ||
        (c.factoryAgent && c.factoryAgent.toLowerCase().includes(searchLower))
      )
    }
    
    if (filters.status) filtered = filtered.filter(c => c.status === filters.status)
    if (filters.vendor) filtered = filtered.filter(c => c.vendor?.toLowerCase().includes(filters.vendor.toLowerCase()))
    if (filters.customer) filtered = filtered.filter(c => c.customer?.toLowerCase().includes(filters.customer.toLowerCase()))
    if (filters.location) filtered = filtered.filter(c => c.location === filters.location)
    if (filters.inspector) filtered = filtered.filter(c => c.inspector?.toLowerCase().includes(filters.inspector.toLowerCase()))
    if (filters.defectCategory) filtered = filtered.filter(c => c.defectCategory === filters.defectCategory)
    
    // Date range filter
    if (filters.dateFrom) {
      filtered = filtered.filter(c => c.claimDate && c.claimDate >= filters.dateFrom!)
    }
    if (filters.dateTo) {
      filtered = filtered.filter(c => c.claimDate && c.claimDate <= filters.dateTo!)
    }
    
    // Handle RCA status filter - V8 style: done / pending
    if (filters.rcaStatus) {
      if (filters.rcaStatus === 'done') {
        // RCA Done: has rcaReport or rcaStatus is APPROVED
        filtered = filtered.filter(c => 
          (c.rcaReport && c.rcaReport.trim() !== '') || c.rcaStatus === 'APPROVED'
        )
      } else if (filters.rcaStatus === 'pending') {
        // RCA Pending: no rcaReport and rcaStatus is not APPROVED
        filtered = filtered.filter(c => 
          (!c.rcaReport || c.rcaReport.trim() === '') && c.rcaStatus !== 'APPROVED'
        )
      }
    }
    
    // Pagination
    const totalElements = filtered.length
    const page = filters.page ?? 0
    const size = filters.size ?? 50
    const totalPages = Math.ceil(totalElements / size) || 1
    const start = page * size
    const end = start + size
    const paginatedContent = filtered.slice(start, end)
    
    return {
      content: paginatedContent,
      totalElements,
      totalPages,
      number: page,
      size: paginatedContent.length,
      totalAll: claims.length  // 返回原始总数量
    } as PageResponse<Claim> & { totalAll: number }
  }
  // 真实 API
  const api = (await import('./api')).default
  return api.get<PageResponse<Claim>>('/claims', { params: filters }).then(r => r.data)
}

export const getClaimById = async (id: number) => {
  if (USE_MOCK) {
    const response = await mockApi.getClaim(id)
    return response.data!
  }
  const api = (await import('./api')).default
  return api.get<Claim>(`/claims/${id}`).then(r => r.data)
}

export const createClaim = async (data: ClaimRequest) => {
  if (USE_MOCK) {
    const response = await mockApi.createClaim(data as Partial<Claim>)
    return response.data
  }
  const api = (await import('./api')).default
  return api.post<Claim>('/claims', data).then(r => r.data)
}

export const updateClaim = async (id: number, data: ClaimRequest) => {
  if (USE_MOCK) {
    const response = await mockApi.updateClaim(id, data as Partial<Claim>)
    return response.data
  }
  const api = (await import('./api')).default
  return api.put<Claim>(`/claims/${id}`, data).then(r => r.data)
}

export const deleteClaim = async (id: number) => {
  if (USE_MOCK) {
    await mockApi.deleteClaim(id)
    return
  }
  const api = (await import('./api')).default
  return api.delete(`/claims/${id}`)
}

export const saveRCA = async (id: number, rcaReport: string, rcaStructured?: object, rcaReasons?: object[]) => {
  if (USE_MOCK) {
    return mockApi.updateClaim(id, { rcaReport, rcaStructured, rcaReasons } as Partial<Claim>).then(r => r.data)
  }
  const api = (await import('./api')).default
  return api.put<Claim>(`/claims/${id}/rca`, { rcaReport, rcaStructured, rcaReasons }).then(r => r.data)
}

export const submitRCA = async (id: number, comment?: string) => {
  if (USE_MOCK) {
    const claim = await mockApi.getClaim(id).then(r => r.data)
    if (!claim) throw new Error('Claim not found')
    
    const newHistoryEntry: RcaApprovalHistory = {
      action: 'submitted',
      byName: getCurrentUserName(),
      at: new Date().toISOString(),
      comment: comment || ''
    }
    
    const updatedHistory = [...(claim.rcaApprovalHistory || []), newHistoryEntry]
    
    return mockApi.updateClaim(id, { 
      rcaStatus: 'SUBMITTED',
      rcaApprovalHistory: updatedHistory
    } as Partial<Claim>).then(r => r.data)
  }
  const api = (await import('./api')).default
  return api.post<Claim>(`/claims/${id}/rca/submit`, { comment }).then(r => r.data)
}

export const approveRCA = async (id: number, comment?: string, isFinal = false) => {
  if (USE_MOCK) {
    const claim = await mockApi.getClaim(id).then(r => r.data)
    if (!claim) throw new Error('Claim not found')
    
    const action = isFinal ? 'final_approved' : 'supervisor_approved'
    const newStatus = isFinal ? 'APPROVED' : 'PENDING_MANAGER'
    
    const newHistoryEntry: RcaApprovalHistory = {
      action,
      byName: getCurrentUserName(),
      at: new Date().toISOString(),
      comment: comment || ''
    }
    
    const updatedHistory = [...(claim.rcaApprovalHistory || []), newHistoryEntry]
    
    return mockApi.updateClaim(id, { 
      rcaStatus: newStatus,
      rcaApprovalHistory: updatedHistory
    } as Partial<Claim>).then(r => r.data)
  }
  const api = (await import('./api')).default
  return api.post<Claim>(`/claims/${id}/rca/approve`, { comment }, {
    params: { final_approval: isFinal }
  }).then(r => r.data)
}

export const rejectRCA = async (id: number, reason: string) => {
  if (USE_MOCK) {
    const claim = await mockApi.getClaim(id).then(r => r.data)
    if (!claim) throw new Error('Claim not found')
    
    const newHistoryEntry: RcaApprovalHistory = {
      action: 'rejected',
      byName: getCurrentUserName(),
      at: new Date().toISOString(),
      comment: reason
    }
    
    const updatedHistory = [...(claim.rcaApprovalHistory || []), newHistoryEntry]
    
    return mockApi.updateClaim(id, { 
      rcaStatus: 'REJECTED',
      rcaApprovalHistory: updatedHistory
    } as Partial<Claim>).then(r => r.data)
  }
  const api = (await import('./api')).default
  return api.post<Claim>(`/claims/${id}/rca/reject`, { reason }).then(r => r.data)
}

export const resetRCAToDraft = async (id: number) => {
  if (USE_MOCK) {
    const claim = await mockApi.getClaim(id).then(r => r.data)
    if (!claim) throw new Error('Claim not found')
    const newHistoryEntry: RcaApprovalHistory = {
      action: 'reset_to_draft',
      byName: getCurrentUserName(),
      at: new Date().toISOString(),
      comment: 'Reset to draft for re-editing'
    }
    const updatedHistory = [...(claim.rcaApprovalHistory || []), newHistoryEntry]
    return mockApi.updateClaim(id, {
      rcaStatus: 'DRAFT',
      rcaApprovalHistory: updatedHistory
    } as Partial<Claim>).then(r => r.data)
  }
  const api = (await import('./api')).default
  return api.post<Claim>(`/claims/${id}/rca/reset-draft`).then(r => r.data)
}

export const addClaimNote = async (id: number, note: string) => {
  if (USE_MOCK) {
    return Promise.resolve({ id: Date.now(), note, createdAt: new Date().toISOString() })
  }
  const api = (await import('./api')).default
  return api.post(`/claims/${id}/notes`, { note }).then(r => r.data)
}

// Alias for backward compatibility
export const addNote = addClaimNote

export const addAttachment = async (id: number, formData: FormData) => {
  if (USE_MOCK) {
    return Promise.resolve({ id: Date.now(), filename: 'mock-file.pdf', url: '#', createdAt: new Date().toISOString() })
  }
  const api = (await import('./api')).default
  return api.post(`/claims/${id}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data)
}

// Alias for backward compatibility
export const uploadAttachment = async (id: number, file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return addAttachment(id, formData)
}

export const deleteAttachment = async (claimId: number, attachmentId: number) => {
  if (USE_MOCK) {
    return Promise.resolve({ success: true })
  }
  const api = (await import('./api')).default
  return api.delete(`/claims/${claimId}/attachments/${attachmentId}`).then(r => r.data)
}

export const scoreRCA = async (id: number, completeness: number, accuracy: number, actionQuality: number) => {
  if (USE_MOCK) {
    return Promise.resolve({ 
      id: Date.now(), 
      claimId: id,
      completeness, 
      accuracy, 
      actionQuality,
      avg: (completeness + accuracy + actionQuality) / 3,
      scoredAt: new Date().toISOString()
    })
  }
  const api = (await import('./api')).default
  return api.post(`/claims/${id}/rca/score`, { completeness, accuracy, actionQuality }).then(r => r.data)
}

export const getSimilarClaims = async (id: number) => {
  if (USE_MOCK) {
    return Promise.resolve([
      { id: 101, claimNo: 'CLM-2023-045', vendor: 'Factory A', similarity: 85 },
      { id: 102, claimNo: 'CLM-2023-078', vendor: 'Factory B', similarity: 72 }
    ])
  }
  const api = (await import('./api')).default
  return api.get(`/claims/${id}/similar`).then(r => r.data)
}

export const notifySimilarClaims = async (id: number, to: string, cc: string, subject: string, body: string) => {
  if (USE_MOCK) {
    return Promise.resolve({ sent: true, timestamp: new Date().toISOString() })
  }
  const api = (await import('./api')).default
  return api.post(`/claims/${id}/notify-similar`, { to, cc, subject, body }).then(r => r.data)
}

export const sendClaimEmail = async (id: number, to: string, cc: string, subject: string, bodyHtml: string) => {
  if (USE_MOCK) {
    return Promise.resolve({ sent: true, timestamp: new Date().toISOString() })
  }
  const api = (await import('./api')).default
  return api.post(`/claims/${id}/email`, { claimId: id, to, cc, subject, bodyHtml }).then(r => r.data)
}
