export type ClaimStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'CANCELLED'
export type RcaStatus = 'DRAFT' | 'SUBMITTED' | 'PENDING_MANAGER' | 'APPROVED' | 'REJECTED'

// Per-reason RCA data (v8 model — each reason owns its own fishbone + CA + OI)
export interface RcaReason {
  label: string
  whatHappened: string
  whys: string[]
  // Fishbone 6M
  fb_man: string
  fb_machine: string
  fb_material: string
  fb_method: string
  fb_measurement: string
  fb_environment: string
  // Root cause
  rootCauseCategory: string
  rootCauseSummary: string
  // Factory corrective actions
  fac_imm_action: string
  fac_imm_person: string
  fac_imm_deadline: string
  fac_imm_followup: string
  fac_mid_action: string
  fac_mid_person: string
  fac_mid_deadline: string
  fac_mid_followup: string
  fac_long_action: string
  fac_long_person: string
  fac_long_deadline: string
  fac_long_followup: string
  // OI action
  oi_action: string
  oi_person: string
  oi_deadline: string
  oi_followup: string
}

// Backward-compat flat structured (first reason, used by approval/display)
export interface RcaStructured {
  whatHappened: string
  whys: string[]
  rootCauseCategory: string
  rootCauseSummary: string
  // Fishbone
  fb_man: string
  fb_machine: string
  fb_material: string
  fb_method: string
  fb_measurement: string
  fb_environment: string
  // Factory CA
  fac_imm_action: string; fac_imm_person: string; fac_imm_deadline: string; fac_imm_followup: string
  fac_mid_action: string; fac_mid_person: string; fac_mid_deadline: string; fac_mid_followup: string
  fac_long_action: string; fac_long_person: string; fac_long_deadline: string; fac_long_followup: string
  // OI action
  oi_action: string; oi_person: string; oi_deadline: string; oi_followup: string
  // Legacy
  correctiveAction: string
  preventiveAction: string
  targetDate: string
}

export interface CorrectiveAction {
  id: number
  description: string
  owner: string
  dueDate: string
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE'
}

export interface ClaimAttachment {
  id: number
  fileName: string
  contentType: string
  fileSize: number
  uploadedBy: string
  uploadedAt: string
}

export interface ClaimNote {
  id: number
  author: string
  authorRole: string
  text: string
  createdAt: string
}

export interface RcaApprovalHistory {
  action: string
  byName: string
  at: string
  comment: string
}

export interface RcaQualityScore {
  completeness: number
  accuracy: number
  actionQuality: number
  avg: number
  scoredBy: string
  scoredAt: string
}

export interface Claim {
  id: number
  claimNo: string
  vendor: string
  customer: string
  fid: string
  location: string
  styleNo: string
  orderNo: string
  articleNo: string
  inspector: string
  factoryAgent: string
  shippedQty: number
  claimQty: number
  qcInformedQty: number
  claimDate: string
  marketInspectionDate: string
  qcInformDate: string
  defectCategory: string
  qualityDigit: string
  defectDescription: string
  defectRateByCustomer: string
  fullCheckResult: string
  fullCheckRejectionRate: string
  status: ClaimStatus
  qcResponsibility: string
  rcaReport: string
  rcaStatus: RcaStatus
  repeatDefectFlag: boolean
  repeatOrderNo: string
  repeatOrderDeliveryDate: string
  repeatOrderRemark: string
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
  rcaStructured?: RcaStructured
  rcaReasons?: RcaReason[]
  rcaQualityScore?: RcaQualityScore
  correctiveActions: CorrectiveAction[]
  rcaApprovalHistory: RcaApprovalHistory[]
  attachments: ClaimAttachment[]  // Claim attachments (general)
  rcaAttachments?: ClaimAttachment[]  // RCA specific attachments
  notes: ClaimNote[]
  rcaSupervisorComment: string
  rcaManagerComment: string
  rcaReminderLog?: Array<{ sentAt: string; sentBy: string; type: 'early_warning' | 'overdue' }>
  riskAlertSentAt?: string
  riskAlertSentBy?: string
}

export type ClaimRequest = Omit<Claim, 'id' | 'createdAt' | 'updatedAt' | 'correctiveActions' |
  'rcaApprovalHistory' | 'attachments' | 'notes' | 'rcaQualityScore'>

export interface ClaimFilters {
  search?: string
  vendor?: string
  customer?: string
  status?: string
  location?: string
  defectCategory?: string
  inspector?: string
  rcaStatus?: string
  dateFrom?: string
  dateTo?: string
  factoryAgent?: string
  fid?: string
  styleNo?: string
  orderNo?: string
  articleNo?: string
  shippedQty?: string
  claimQty?: string
  marketInspectionDate?: string
  qcInformDate?: string
  qualityDigit?: string
  qcResponsibility?: string
  attachments?: string
  rca?: string
}

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export interface SimilarClaimResult {
  id: number
  claimNo: string
  vendor: string
  defectCategory: string
  rootCauseCategory: string
  claimDate: string
  matchReasons: string[]
}

export const DEFECT_CATEGORIES = [
  'Formal', 'Material', 'Workmanship', 'Safety & Function',
  'Styling', 'Measurement', 'Color', 'Other'
]

export const LOCATIONS = ['Jiangsu', 'Zhejiang', 'Flexible', 'Shanghai']

export const CUSTOMERS = ['Bonprix', 'OVH CAFS', 'HSE', 'ERF']

export const VENDORS = ['Nantong Factory', 'Suzhou Textile', 'Hangzhou Garment', 'Ningbo Apparel']

export const INSPECTORS = ['Andy Ma', 'Rain Li', 'Alan Huang', 'Tony Chen']

export const RCA_ROOT_CAUSE_CATEGORIES = [
  'Man', 'Machine', 'Material', 'Method', 'Measurement', 'Environment'
]

export const STATUS_COLORS: Record<ClaimStatus, string> = {
  OPEN: '#f59e0b',
  IN_PROGRESS: '#3b82f6',
  CLOSED: '#22c55e',
  CANCELLED: '#94a3b8'
}

export const RCA_STATUS_COLORS: Record<string, string> = {
  DRAFT: '#94a3b8',
  SUBMITTED: '#3b82f6',
  PENDING_MANAGER: '#f59e0b',
  APPROVED: '#22c55e',
  REJECTED: '#ef4444'
}

export function defaultRcaReason(label?: string): RcaReason {
  return {
    label: label || 'Reason 1',
    whatHappened: '',
    whys: ['', '', '', '', ''],
    fb_man: '', fb_machine: '', fb_material: '', fb_method: '', fb_measurement: '', fb_environment: '',
    rootCauseCategory: '', rootCauseSummary: '',
    fac_imm_action: '', fac_imm_person: '', fac_imm_deadline: '', fac_imm_followup: '',
    fac_mid_action: '', fac_mid_person: '', fac_mid_deadline: '', fac_mid_followup: '',
    fac_long_action: '', fac_long_person: '', fac_long_deadline: '', fac_long_followup: '',
    oi_action: '', oi_person: '', oi_deadline: '', oi_followup: '',
  }
}
