import { mockClaims } from './mockData'

const USE_MOCK = true

// 从 mockClaims 计算统计数据 (V8 style - using claimQty)
const calculateStats = () => {
  const claims = mockClaims
  
  // 按状态统计 (使用 count，不是 claimQty)
  const statusStats = claims.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  // 按检查员统计 (使用 count，不是 claimQty)
  const inspectorStats = claims.reduce((acc, c) => {
    acc[c.inspector] = (acc[c.inspector] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  // 按供应商统计 (V8: 使用 claimQty)
  const vendorStats = claims.reduce((acc, c) => {
    acc[c.vendor] = (acc[c.vendor] || 0) + c.claimQty
    return acc
  }, {} as Record<string, number>)
  
  // 按缺陷类别统计 (使用 count)
  const defectStats = claims.reduce((acc, c) => {
    acc[c.defectCategory] = (acc[c.defectCategory] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  return { statusStats, inspectorStats, vendorStats, defectStats }
}

export const getVendorStats = async () => {
  if (USE_MOCK) {
    const { vendorStats } = calculateStats()
    return Object.entries(vendorStats)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }
  const api = (await import('./api')).default
  return api.get('/analytics/top-vendors').then(r => r.data)
}

export const getStatusStats = async () => {
  if (USE_MOCK) {
    const { statusStats } = calculateStats()
    return Object.entries(statusStats).map(([name, count]) => ({ name, count }))
  }
  const api = (await import('./api')).default
  return api.get('/analytics/claims-by-status').then(r => r.data)
}

export const getDefectStats = async () => {
  if (USE_MOCK) {
    const { defectStats } = calculateStats()
    return Object.entries(defectStats).map(([name, count]) => ({ name, count }))
  }
  const api = (await import('./api')).default
  return api.get('/analytics/claims-by-defect').then(r => r.data)
}

export const getInspectorStats = async () => {
  if (USE_MOCK) {
    const { inspectorStats } = calculateStats()
    return Object.entries(inspectorStats).map(([name, count]) => ({ name, count }))
  }
  const api = (await import('./api')).default
  return api.get('/analytics/claims-by-inspector').then(r => r.data)
}

export const getRcaStatusStats = async () => {
  if (USE_MOCK) {
    return [
      { name: 'DRAFT', count: 2 },
      { name: 'SUBMITTED', count: 1 },
      { name: 'PENDING_MANAGER', count: 1 },
      { name: 'APPROVED', count: 1 }
    ]
  }
  const api = (await import('./api')).default
  return api.get('/analytics/claims-by-rca-status').then(r => r.data)
}

import type { Claim } from './mockTypes'

/**
 * RCA Escalation Level Calculation (Based on V8 version)
 * @returns level: 0=正常/已批准, 1=正常(剩余2+天), 2=轻度逾期(1-3天), 3=严重逾期(4+天)
 */
export const calculateRcaEscalationLevel = (claim: Claim) => {
  // 已关闭或没有 qcInformDate
  if (!claim.qcInformDate || claim.status === 'CLOSED') {
    return { level: 0, days: 0 }
  }
  
  // 已批准
  if (claim.rcaStatus === 'APPROVED') {
    return { level: 0, days: 0, approved: true }
  }
  
  const today = new Date()
  const days = Math.floor((today.getTime() - new Date(claim.qcInformDate).getTime()) / 86400000)
  
  if (days <= 0) return { level: 0, days, remaining: 7 - days }
  if (days <= 5) return { level: 1, days, remaining: 7 - days }      // 正常，剩余2+天
  if (days <= 10) return { level: 2, days, overdue: days - 7 }       // 轻度逾期 1-3天
  return { level: 3, days, overdue: days - 7 }                        // 严重逾期 4+天
}

/**
 * RCA Overdue Rules (Based on V8 version):
 * 1. Overdue: qcInformDate exists + days since > 7 + no RCA report + status !== 'CLOSED'
 * 2. Pending: rcaStatus === 'SUBMITTED' || rcaStatus === 'PENDING_MANAGER'
 * 3. Approved: rcaStatus === 'APPROVED'
 */
export const getRcaKpis = async () => {
  if (USE_MOCK) {
    const today = new Date()
    
    const overdue = mockClaims.filter(c => {
      // 状态为 CLOSED 不计入
      if (c.status === 'CLOSED') return false
      // 必须有 qcInformDate
      if (!c.qcInformDate) return false
      // 计算从 qcInformDate 到现在的天数
      const daysDiff = Math.floor((today.getTime() - new Date(c.qcInformDate).getTime()) / 86400000)
      // 超过7天且没有RCA报告
      return daysDiff > 7 && (!c.rcaReport || c.rcaReport.trim() === '')
    }).length
    
    const pending = mockClaims.filter(c => 
      c.rcaStatus === 'SUBMITTED' || c.rcaStatus === 'PENDING_MANAGER'
    ).length
    
    const approved = mockClaims.filter(c => c.rcaStatus === 'APPROVED').length
    
    return { pending, overdue, approved }
  }
  const api = (await import('./api')).default
  return api.get<{ pending: number; overdue: number; approved: number }>('/analytics/rca-kpis').then(r => r.data)
}

// Month names for formatting
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const getMonthlyTrend = async (months = 12) => {
  if (USE_MOCK) {
    // V8 style: group by YYYY-MM and sum claimQty
    const monthlyData: Record<string, number> = {}
    mockClaims.forEach(c => {
      if (c.claimDate) {
        const m = c.claimDate.substring(0, 7) // YYYY-MM
        monthlyData[m] = (monthlyData[m] || 0) + c.claimQty
      }
    })
    const sortedMonths = Object.keys(monthlyData).sort()
    return sortedMonths.map(m => {
      // Keep YYYY-MM format to match V8
      return {
        label: m,
        count: monthlyData[m]
      }
    })
  }
  const api = (await import('./api')).default
  return api.get<{ label: string; count: number }[]>(`/analytics/monthly-trend?months=${months}`).then(r => r.data)
}
