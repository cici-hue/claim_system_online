// 模拟数据类型定义
import type { Claim as RealClaim } from '../types/claim'

// 重新导出 Claim 类型
export type Claim = RealClaim

// 用户类型
export interface User {
  id: number
  username: string
  fullname: string
  email: string
  role: string
  team: string
  factoryAgent: string
  createdAt: string
}

// 审计日志类型
export interface AuditLog {
  id: number
  timestamp: string
  user: string
  userRole: string
  action: string
  details: string
}
