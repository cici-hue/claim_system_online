// 模拟数据服务 - 用于前端预览（无需后端）
import type { Claim, User, AuditLog } from './mockTypes'

// Helper function to create claim
const createClaim = (id: number, claimNo: string, vendor: string, customer: string, 
  inspector: string, claimQty: number, claimDate: string, defectCategory: string, 
  status: string, rcaStatus: string): Claim => ({
  id,
  claimNo,
  vendor,
  customer,
  fid: `FID${String(id).padStart(3, '0')}`,
  location: ['Zhejiang', 'Jiangsu', 'Flexible'][id % 3],
  styleNo: `ST${String(id).padStart(3, '0')}`,
  orderNo: `ORD${String(id).padStart(3, '0')}`,
  articleNo: `ART${String(id).padStart(3, '0')}`,
  inspector,
  factoryAgent: ['Oi Shanghai IC', 'Oi Qingdao IC', 'Oi China HKG', 'Oi China SHA'][id % 4],
  shippedQty: 1000 + (id * 500),
  claimQty,
  claimDate,
  marketInspectionDate: claimDate,
  qcInformDate: claimDate,
  defectCategory,
  qualityDigit: ['A1', 'A2', 'B1', 'B2'][id % 4],
  defectDescription: `Sample defect description for claim ${claimNo}`,
  defectRateByCustomer: `${(claimQty / 10).toFixed(1)}%`,
  fullCheckResult: 'Pass with minor issues',
  fullCheckRejectionRate: '2%',
  status: status as any,
  qcResponsibility: ['Factory', 'Logistics'][id % 2],
  rcaReport: rcaStatus === 'APPROVED' ? 'RCA Report completed' : '',
  rcaStatus: rcaStatus as any,
  repeatDefectFlag: false,
  repeatOrderNo: '',
  repeatOrderDeliveryDate: '',
  repeatOrderRemark: '',
  createdBy: inspector,
  updatedBy: inspector,
  createdAt: `${claimDate}T08:00:00Z`,
  updatedAt: `${claimDate}T10:00:00Z`,
  correctiveActions: [],
  rcaApprovalHistory: [],
  attachments: [],
  notes: [],
  rcaSupervisorComment: '',
  rcaManagerComment: ''
})

// 模拟索赔数据 - 2026年1-4月数据，更多样本
export const CUSTOMERS = ['Bonprix', 'OVH CAFS', 'HSE', 'ERF']
export const VENDORS = ['Nantong Factory', 'Suzhou Textile', 'Hangzhou Garment', 'Ningbo Apparel']
export const LOCATIONS = ['Jiangsu', 'Zhejiang', 'Flexible', 'Shanghai']
export const INSPECTORS = ['Andy Ma', 'Rain Li', 'Alan Huang', 'Tony Chen', 'Cici Duan', 'Martin Zhang', 'Jeff Li']

export const mockClaims: Claim[] = [
  // Jan 2026 - 8 claims
  // 编号 1 的索赔 - 带有完整 RCA 数据
  {
    ...createClaim(1, 'CLM-2026-001', VENDORS[0], CUSTOMERS[0], 'Andy Ma', 50, '2026-01-05', 'Color Issue', 'OPEN', 'SUBMITTED'),
    defectDescription: 'Color mismatch between production sample and approved standard. The garment shows significant color deviation in blue shade under natural light.',
    rcaStructured: {
      whatHappened: 'Color mismatch between production sample and approved standard. The garment shows significant color deviation in blue shade under natural light.',
      whys: ['Dye lot variation not properly controlled', 'Color matching light source not standardized', 'No in-line color check during production', '', ''],
      rootCauseCategory: 'Material',
      rootCauseSummary: 'The root cause is inadequate color quality control process at the fabric mill. The fabric supplier did not follow the standard procedure for dye lot approval and failed to use D65 light source for color matching.',
      fb_man: 'Operator lacked training on color matching standards',
      fb_machine: 'Light box not calibrated, using wrong light source',
      fb_material: 'Dye lot variation exceeds acceptable tolerance',
      fb_method: 'No first-piece color approval before bulk cutting',
      fb_measurement: 'No spectrophotometer used for color measurement',
      fb_environment: 'Production floor lighting affects color perception',
      fac_imm_action: 'Stop current production and quarantine affected batches',
      fac_imm_person: 'Factory QC Manager',
      fac_imm_deadline: '2026-01-10',
      fac_imm_followup: 'Daily progress report',
      fac_mid_action: 'Implement inline color checking at cutting stage',
      fac_mid_person: 'Production Supervisor',
      fac_mid_deadline: '2026-01-20',
      fac_mid_followup: 'Weekly audit',
      fac_long_action: 'Establish color management system with spectrophotometer',
      fac_long_person: 'Factory Manager',
      fac_long_deadline: '2026-02-15',
      fac_long_followup: 'Monthly review',
      oi_action: 'Update vendor quality manual with color control requirements',
      oi_person: 'QC Team Lead',
      oi_deadline: '2026-02-01',
      oi_followup: 'Quarterly assessment',
      correctiveAction: 'Stop current production and quarantine affected batches',
      preventiveAction: 'Establish color management system with spectrophotometer',
      targetDate: '2026-01-10'
    },
    rcaReasons: [
      {
        label: 'Color Issue - Primary',
        whatHappened: 'Color mismatch between production sample and approved standard. The garment shows significant color deviation in blue shade under natural light.',
        whys: ['Dye lot variation not properly controlled', 'Color matching light source not standardized', 'No in-line color check during production', '', ''],
        rootCauseCategory: 'Material',
        rootCauseSummary: 'The root cause is inadequate color quality control process at the fabric mill.',
        fb_man: 'Operator lacked training on color matching standards',
        fb_machine: 'Light box not calibrated, using wrong light source',
        fb_material: 'Dye lot variation exceeds acceptable tolerance',
        fb_method: 'No first-piece color approval before bulk cutting',
        fb_measurement: 'No spectrophotometer used for color measurement',
        fb_environment: 'Production floor lighting affects color perception',
        fac_imm_action: 'Stop current production and quarantine affected batches',
        fac_imm_person: 'Factory QC Manager',
        fac_imm_deadline: '2026-01-10',
        fac_imm_followup: 'Daily progress report',
        fac_mid_action: 'Implement inline color checking at cutting stage',
        fac_mid_person: 'Production Supervisor',
        fac_mid_deadline: '2026-01-20',
        fac_mid_followup: 'Weekly audit',
        fac_long_action: 'Establish color management system with spectrophotometer',
        fac_long_person: 'Factory Manager',
        fac_long_deadline: '2026-02-15',
        fac_long_followup: 'Monthly review',
        oi_action: 'Update vendor quality manual with color control requirements',
        oi_person: 'QC Team Lead',
        oi_deadline: '2026-02-01',
        oi_followup: 'Quarterly assessment'
      }
    ],
    rcaAttachments: [
      { id: 1, fileName: 'Color_Deviation_Photo.jpg', fileSize: 2048000, contentType: 'image/jpeg', uploadedBy: 'Andy Ma', uploadedAt: '2026-01-06T10:00:00Z' },
      { id: 2, fileName: 'RCA_Analysis_Report.pdf', fileSize: 1536000, contentType: 'application/pdf', uploadedBy: 'Andy Ma', uploadedAt: '2026-01-07T14:30:00Z' },
      { id: 3, fileName: 'Factory_Action_Plan.pptx', fileSize: 3584000, contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', uploadedBy: 'Andy Ma', uploadedAt: '2026-01-08T09:00:00Z' }
    ],
    attachments: [
      { id: 101, fileName: 'Claim_Document.pdf', fileSize: 1024000, contentType: 'application/pdf', uploadedBy: 'Andy Ma', uploadedAt: '2026-01-05T08:00:00Z' },
      { id: 102, fileName: 'Defect_Evidence.jpg', fileSize: 3072000, contentType: 'image/jpeg', uploadedBy: 'Andy Ma', uploadedAt: '2026-01-05T09:00:00Z' }
    ],
    rcaApprovalHistory: [
      { action: 'RCA Created', byName: 'Andy Ma', at: '2026-01-06T08:00:00Z', comment: '' },
      { action: 'RCA Submitted', byName: 'Andy Ma', at: '2026-01-08T16:00:00Z', comment: 'Ready for supervisor review' },
      { action: 'rejected', byName: 'Tony Chen (Supervisor)', at: '2026-01-09T10:30:00Z', comment: 'Root cause analysis not deep enough, please add 5 Whys analysis' },
      { action: 'RCA Submitted', byName: 'Andy Ma', at: '2026-01-10T14:00:00Z', comment: 'Added 5 Whys analysis and resubmitted' }
    ],
    rcaQualityScore: {
      completeness: 4,
      accuracy: 5,
      actionQuality: 4,
      avg: 4.3,
      scoredBy: 'Tony Chen',
      scoredAt: '2026-01-11T10:00:00Z'
    }
  },
  createClaim(2, 'CLM-2026-002', VENDORS[1], CUSTOMERS[1], 'Rain Li', 80, '2026-01-08', 'Delivery', 'IN_PROGRESS', 'SUBMITTED'),
  createClaim(3, 'CLM-2026-003', VENDORS[2], CUSTOMERS[2], 'Alan Huang', 30, '2026-01-12', 'Quantity', 'CLOSED', 'APPROVED'),
  createClaim(4, 'CLM-2026-004', VENDORS[3], CUSTOMERS[3], 'Tony Chen', 120, '2026-01-15', 'Packaging', 'OPEN', 'DRAFT'),
  createClaim(5, 'CLM-2026-005', VENDORS[0], CUSTOMERS[0], 'Andy Ma', 45, '2026-01-18', 'Label', 'IN_PROGRESS', 'PENDING_MANAGER'),
  createClaim(6, 'CLM-2026-006', VENDORS[1], CUSTOMERS[1], 'Rain Li', 90, '2026-01-20', 'Color Issue', 'CLOSED', 'APPROVED'),
  createClaim(7, 'CLM-2026-007', VENDORS[2], CUSTOMERS[2], 'Alan Huang', 65, '2026-01-22', 'Delivery', 'OPEN', 'DRAFT'),
  createClaim(8, 'CLM-2026-008', VENDORS[3], CUSTOMERS[3], 'Tony Chen', 110, '2026-01-25', 'Quantity', 'IN_PROGRESS', 'SUBMITTED'),

  // Feb 2026 - 8 claims
  createClaim(9, 'CLM-2026-009', VENDORS[0], CUSTOMERS[0], 'Andy Ma', 75, '2026-02-03', 'Packaging', 'OPEN', 'DRAFT'),
  createClaim(10, 'CLM-2026-010', VENDORS[1], CUSTOMERS[1], 'Rain Li', 55, '2026-02-06', 'Label', 'CLOSED', 'APPROVED'),
  createClaim(11, 'CLM-2026-011', VENDORS[2], CUSTOMERS[2], 'Alan Huang', 95, '2026-02-10', 'Color Issue', 'IN_PROGRESS', 'PENDING_MANAGER'),
  createClaim(12, 'CLM-2026-012', VENDORS[3], CUSTOMERS[3], 'Tony Chen', 40, '2026-02-14', 'Delivery', 'OPEN', 'DRAFT'),
  createClaim(13, 'CLM-2026-013', VENDORS[0], CUSTOMERS[0], 'Andy Ma', 85, '2026-02-18', 'Quantity', 'CLOSED', 'APPROVED'),
  createClaim(14, 'CLM-2026-014', VENDORS[1], CUSTOMERS[1], 'Rain Li', 60, '2026-02-20', 'Packaging', 'IN_PROGRESS', 'SUBMITTED'),
  createClaim(15, 'CLM-2026-015', VENDORS[2], CUSTOMERS[2], 'Alan Huang', 130, '2026-02-22', 'Label', 'OPEN', 'DRAFT'),
  createClaim(16, 'CLM-2026-016', VENDORS[3], CUSTOMERS[3], 'Tony Chen', 70, '2026-02-25', 'Color Issue', 'IN_PROGRESS', 'PENDING_MANAGER'),

  // Mar 2026 - 8 claims
  createClaim(17, 'CLM-2026-017', VENDORS[0], CUSTOMERS[0], 'Andy Ma', 100, '2026-03-03', 'Delivery', 'CLOSED', 'APPROVED'),
  createClaim(18, 'CLM-2026-018', VENDORS[1], CUSTOMERS[1], 'Rain Li', 45, '2026-03-06', 'Quantity', 'OPEN', 'DRAFT'),
  createClaim(19, 'CLM-2026-019', VENDORS[2], CUSTOMERS[2], 'Alan Huang', 80, '2026-03-10', 'Packaging', 'IN_PROGRESS', 'SUBMITTED'),
  createClaim(20, 'CLM-2026-020', VENDORS[3], CUSTOMERS[3], 'Tony Chen', 115, '2026-03-14', 'Label', 'OPEN', 'DRAFT'),
  createClaim(21, 'CLM-2026-021', VENDORS[0], CUSTOMERS[0], 'Andy Ma', 35, '2026-03-18', 'Color Issue', 'CLOSED', 'APPROVED'),
  createClaim(22, 'CLM-2026-022', VENDORS[1], CUSTOMERS[1], 'Rain Li', 90, '2026-03-20', 'Delivery', 'IN_PROGRESS', 'PENDING_MANAGER'),
  createClaim(23, 'CLM-2026-023', VENDORS[2], CUSTOMERS[2], 'Alan Huang', 125, '2026-03-22', 'Quantity', 'OPEN', 'DRAFT'),
  createClaim(24, 'CLM-2026-024', VENDORS[3], CUSTOMERS[3], 'Tony Chen', 50, '2026-03-25', 'Packaging', 'IN_PROGRESS', 'SUBMITTED'),

  // Apr 2026 - 8 claims
  createClaim(25, 'CLM-2026-025', VENDORS[0], CUSTOMERS[0], 'Andy Ma', 140, '2026-04-03', 'Label', 'CLOSED', 'APPROVED'),
  createClaim(26, 'CLM-2026-026', VENDORS[1], CUSTOMERS[1], 'Rain Li', 55, '2026-04-06', 'Color Issue', 'OPEN', 'DRAFT'),
  createClaim(27, 'CLM-2026-027', VENDORS[2], CUSTOMERS[2], 'Alan Huang', 75, '2026-04-10', 'Delivery', 'IN_PROGRESS', 'PENDING_MANAGER'),
  createClaim(28, 'CLM-2026-028', VENDORS[3], CUSTOMERS[3], 'Tony Chen', 105, '2026-04-14', 'Quantity', 'OPEN', 'DRAFT'),
  createClaim(29, 'CLM-2026-029', VENDORS[0], CUSTOMERS[0], 'Andy Ma', 65, '2026-04-18', 'Packaging', 'CLOSED', 'APPROVED'),
  createClaim(30, 'CLM-2026-030', VENDORS[1], CUSTOMERS[1], 'Rain Li', 95, '2026-04-20', 'Label', 'IN_PROGRESS', 'SUBMITTED'),
  createClaim(31, 'CLM-2026-031', VENDORS[2], CUSTOMERS[2], 'Alan Huang', 120, '2026-04-22', 'Color Issue', 'OPEN', 'DRAFT'),
  createClaim(32, 'CLM-2026-032', VENDORS[3], CUSTOMERS[3], 'Tony Chen', 40, '2026-04-25', 'Delivery', 'IN_PROGRESS', 'PENDING_MANAGER'),
  
  // Overdue RCA claims for testing (created > 14 days ago, not completed)
  {
    ...createClaim(33, 'CLM-2026-033', VENDORS[0], CUSTOMERS[0], 'Andy Ma', 75, '2026-04-01', 'Color Issue', 'OPEN', 'DRAFT'),
    createdAt: '2026-04-01T08:00:00Z',
    updatedAt: '2026-04-01T08:00:00Z',
    factoryAgent: 'Oi Shanghai IC',
  },
  {
    ...createClaim(34, 'CLM-2026-034', VENDORS[1], CUSTOMERS[1], 'Rain Li', 120, '2026-03-28', 'Label', 'IN_PROGRESS', 'SUBMITTED'),
    createdAt: '2026-03-28T10:30:00Z',
    updatedAt: '2026-03-28T10:30:00Z',
    factoryAgent: 'Oi Shanghai IC',
    rcaApprovalHistory: [
      { action: 'RCA Created', byName: 'Rain Li', at: '2026-03-29T09:00:00Z', comment: '' },
      { action: 'RCA Submitted', byName: 'Rain Li', at: '2026-03-30T14:00:00Z', comment: 'Ready for review' }
    ]
  },
  {
    ...createClaim(35, 'CLM-2026-035', VENDORS[2], CUSTOMERS[2], 'Alan Huang', 90, '2026-03-25', 'Packaging', 'IN_PROGRESS', 'PENDING_MANAGER'),
    createdAt: '2026-03-25T11:00:00Z',
    updatedAt: '2026-03-25T11:00:00Z',
    factoryAgent: 'Oi Shanghai IC',
    rcaApprovalHistory: [
      { action: 'RCA Created', byName: 'Alan Huang', at: '2026-03-26T08:00:00Z', comment: '' },
      { action: 'RCA Submitted', byName: 'Alan Huang', at: '2026-03-27T10:00:00Z', comment: '' },
      { action: 'approved', byName: 'Martin Zhang (Supervisor)', at: '2026-03-28T16:00:00Z', comment: 'Good analysis' }
    ]
  },
  
  // New claims for testing (created within last 24 hours)
  {
    ...createClaim(36, 'CLM-2026-036', VENDORS[0], CUSTOMERS[1], 'Jeff Li', 45, '2026-04-28', 'Quantity', 'OPEN', 'DRAFT'),
    createdAt: '2026-04-28T14:30:00Z',
    updatedAt: '2026-04-28T14:30:00Z',
    factoryAgent: 'Oi Shanghai IC',
    createdBy: 'Jeff Li'
  },
  {
    ...createClaim(37, 'CLM-2026-037', VENDORS[1], CUSTOMERS[2], 'Andy Ma', 60, '2026-04-28', 'Delivery', 'OPEN', 'DRAFT'),
    createdAt: '2026-04-28T16:45:00Z',
    updatedAt: '2026-04-28T16:45:00Z',
    factoryAgent: 'Oi Shanghai IC',
    createdBy: 'Andy Ma'
  },
  {
    ...createClaim(38, 'CLM-2026-038', VENDORS[2], CUSTOMERS[3], 'Rain Li', 85, '2026-04-29', 'Color Issue', 'OPEN', 'DRAFT'),
    createdAt: '2026-04-29T09:15:00Z',
    updatedAt: '2026-04-29T09:15:00Z',
    factoryAgent: 'Oi Shanghai IC',
    createdBy: 'Rain Li'
  },
  
  // Rejected RCA for Inspector testing
  {
    ...createClaim(39, 'CLM-2026-039', VENDORS[3], CUSTOMERS[0], 'Andy Ma', 55, '2026-04-20', 'Label', 'IN_PROGRESS', 'REJECTED'),
    createdAt: '2026-04-20T08:00:00Z',
    updatedAt: '2026-04-27T10:00:00Z',
    factoryAgent: 'Oi Shanghai IC',
    rcaApprovalHistory: [
      { action: 'RCA Created', byName: 'Andy Ma', at: '2026-04-21T09:00:00Z', comment: '' },
      { action: 'RCA Submitted', byName: 'Andy Ma', at: '2026-04-22T14:00:00Z', comment: 'Please review' },
      { action: 'rejected', byName: 'Martin Zhang (Supervisor)', at: '2026-04-27T10:00:00Z', comment: 'Root cause not clear, please add more details' }
    ]
  },
  {
    ...createClaim(40, 'CLM-2026-040', VENDORS[0], CUSTOMERS[1], 'Rain Li', 70, '2026-04-18', 'Packaging', 'IN_PROGRESS', 'REJECTED'),
    createdAt: '2026-04-18T11:00:00Z',
    updatedAt: '2026-04-26T15:30:00Z',
    factoryAgent: 'Oi Shanghai IC',
    rcaApprovalHistory: [
      { action: 'RCA Created', byName: 'Rain Li', at: '2026-04-19T10:00:00Z', comment: '' },
      { action: 'RCA Submitted', byName: 'Rain Li', at: '2026-04-20T16:00:00Z', comment: '' },
      { action: 'rejected', byName: 'Tony Chen (Supervisor)', at: '2026-04-26T15:30:00Z', comment: 'Need to improve corrective actions' }
    ]
  },
]

// 模拟用户数据
export const mockUsers: User[] = [
  { id: 1, username: 'admin', fullname: 'System Admin', email: 'admin@otto.com', role: 'SUPERADMIN', team: 'Management', factoryAgent: 'Oi Shanghai IC', createdAt: '2024-01-01T00:00:00Z' },
  { id: 2, username: 'cici.duan', fullname: 'Cici Duan', email: 'cici.duan@otto.com', role: 'SUPERADMIN', team: '', factoryAgent: 'Oi Shanghai IC', createdAt: '2024-01-01T00:00:00Z' },
  { id: 3, username: 'martin.zhang', fullname: 'Martin Zhang', email: 'martin.zhang@otto.com', role: 'SUPERVISOR', team: 'Zhejiang', factoryAgent: 'Oi Shanghai IC', createdAt: '2024-01-02T00:00:00Z' },
  { id: 4, username: 'andy.ma', fullname: 'Andy Ma', email: 'andy.ma@otto.com', role: 'INSPECTOR', team: 'Zhejiang', factoryAgent: 'Oi Shanghai IC', createdAt: '2024-01-03T00:00:00Z' },
  { id: 5, username: 'rain.li', fullname: 'Rain Li', email: 'rain.li@otto.com', role: 'INSPECTOR', team: 'Flexible', factoryAgent: 'Oi Shanghai IC', createdAt: '2024-01-04T00:00:00Z' },
  { id: 6, username: 'alan.huang', fullname: 'Alan Huang', email: 'alan.huang@otto.com', role: 'INSPECTOR', team: 'Zhejiang', factoryAgent: 'Oi Shanghai IC', createdAt: '2024-01-05T00:00:00Z' },
  { id: 7, username: 'tony.chen', fullname: 'Tony Chen', email: 'tony.chen@otto.com', role: 'ADMIN', team: '', factoryAgent: 'Oi Shanghai IC', createdAt: '2024-01-06T00:00:00Z' },
  { id: 8, username: 'john.manager', fullname: 'John Manager', email: 'john.manager@otto.com', role: 'MANAGER', team: 'Management', factoryAgent: 'Oi Shanghai IC', createdAt: '2024-01-07T00:00:00Z' },
  { id: 18, username: 'jeff.li', fullname: 'Jeff Li', email: 'jeff.li@otto.com', role: 'INSPECTOR', team: 'Jiangsu', factoryAgent: 'Oi Shanghai IC', createdAt: '2024-01-17T00:00:00Z' },
  // Oi Qingdao IC users
  { id: 9, username: 'lucy.wang', fullname: 'Lucy Wang', email: 'lucy.wang@otto.com', role: 'SUPERVISOR', team: '', factoryAgent: 'Oi Qingdao IC', createdAt: '2024-01-08T00:00:00Z' },
  { id: 10, username: 'david.liu', fullname: 'David Liu', email: 'david.liu@otto.com', role: 'INSPECTOR', team: '', factoryAgent: 'Oi Qingdao IC', createdAt: '2024-01-09T00:00:00Z' },
  { id: 11, username: 'emma.zhao', fullname: 'Emma Zhao', email: 'emma.zhao@otto.com', role: 'INSPECTOR', team: '', factoryAgent: 'Oi Qingdao IC', createdAt: '2024-01-10T00:00:00Z' },
  // Oi China HKG users
  { id: 12, username: 'michael.chen', fullname: 'Michael Chen', email: 'michael.chen@otto.com', role: 'ADMIN', team: '', factoryAgent: 'Oi China HKG', createdAt: '2024-01-11T00:00:00Z' },
  { id: 13, username: 'sarah.wu', fullname: 'Sarah Wu', email: 'sarah.wu@otto.com', role: 'SUPERVISOR', team: '', factoryAgent: 'Oi China HKG', createdAt: '2024-01-12T00:00:00Z' },
  { id: 14, username: 'kevin.li', fullname: 'Kevin Li', email: 'kevin.li@otto.com', role: 'INSPECTOR', team: '', factoryAgent: 'Oi China HKG', createdAt: '2024-01-13T00:00:00Z' },
  // Oi China SHA users
  { id: 15, username: 'linda.zhang', fullname: 'Linda Zhang', email: 'linda.zhang@otto.com', role: 'MANAGER', team: '', factoryAgent: 'Oi China SHA', createdAt: '2024-01-14T00:00:00Z' },
  { id: 16, username: 'tom.wang', fullname: 'Tom Wang', email: 'tom.wang@otto.com', role: 'SUPERVISOR', team: '', factoryAgent: 'Oi China SHA', createdAt: '2024-01-15T00:00:00Z' },
  { id: 17, username: 'jerry.chen', fullname: 'Jerry Chen', email: 'jerry.chen@otto.com', role: 'INSPECTOR', team: '', factoryAgent: 'Oi China SHA', createdAt: '2024-01-16T00:00:00Z' }
]

// 模拟审计日志
export const mockAuditLogs: AuditLog[] = [
  { id: 1, timestamp: '2024-01-19T16:00:00Z', user: 'andy.ma', userRole: 'INSPECTOR', action: 'CREATE_CLAIM', details: 'Created claim CLM-2024-005' },
  { id: 2, timestamp: '2024-01-18T14:00:00Z', user: 'tony.chen', userRole: 'INSPECTOR', action: 'CREATE_CLAIM', details: 'Created claim CLM-2024-004' },
  { id: 3, timestamp: '2024-01-17T15:00:00Z', user: 'rain.li', userRole: 'INSPECTOR', action: 'UPDATE_CLAIM', details: 'Updated claim CLM-2024-002 status to In Progress' },
  { id: 4, timestamp: '2024-01-16T10:00:00Z', user: 'rain.li', userRole: 'INSPECTOR', action: 'CREATE_CLAIM', details: 'Created claim CLM-2024-002' },
  { id: 5, timestamp: '2024-01-15T11:00:00Z', user: 'andy.ma', userRole: 'INSPECTOR', action: 'CREATE_CLAIM', details: 'Created claim CLM-2024-001' },
  { id: 6, timestamp: '2024-01-14T17:00:00Z', user: 'alan.huang', userRole: 'INSPECTOR', action: 'RESOLVE_CLAIM', details: 'Resolved claim CLM-2024-003' },
  { id: 7, timestamp: '2024-01-10T12:00:00Z', user: 'alan.huang', userRole: 'INSPECTOR', action: 'CREATE_CLAIM', details: 'Created claim CLM-2024-003' },
  { id: 8, timestamp: '2024-01-09T09:00:00Z', user: 'admin', userRole: 'SUPERADMIN', action: 'LOGIN', details: 'User logged in: admin' },
  { id: 9, timestamp: '2024-01-08T14:30:00Z', user: 'cici.duan', userRole: 'SUPERADMIN', action: 'ADD_USER', details: 'Added user: tony.chen' },
  { id: 10, timestamp: '2024-01-08T10:00:00Z', user: 'cici.duan', userRole: 'SUPERADMIN', action: 'LOGIN', details: 'User logged in: cici.duan' }
]

// 模拟 API 响应
export const mockApi = {
  getClaims: () => Promise.resolve({ data: mockClaims }),
  getClaim: (id: number) => Promise.resolve({ data: mockClaims.find(c => c.id === id) }),
  createClaim: (data: Partial<Claim>) => {
    const newClaim: Claim = { 
      ...data, 
      id: Date.now(), 
      claimNo: `CLM-2024-${String(mockClaims.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString(), 
      updatedAt: new Date().toISOString(),
      correctiveActions: data.correctiveActions || [],
      rcaApprovalHistory: data.rcaApprovalHistory || [],
      attachments: data.attachments || [],
      notes: data.notes || [],
      rcaSupervisorComment: data.rcaSupervisorComment || '',
      rcaManagerComment: data.rcaManagerComment || ''
    } as Claim
    mockClaims.unshift(newClaim)
    return Promise.resolve({ data: newClaim })
  },
  updateClaim: (id: number, data: Partial<Claim>) => {
    const index = mockClaims.findIndex(c => c.id === id)
    if (index >= 0) {
      mockClaims[index] = { ...mockClaims[index], ...data, updatedAt: new Date().toISOString() }
      return Promise.resolve({ data: mockClaims[index] })
    }
    return Promise.reject(new Error('Claim not found'))
  },
  deleteClaim: (id: number) => {
    const index = mockClaims.findIndex(c => c.id === id)
    if (index >= 0) {
      mockClaims.splice(index, 1)
      return Promise.resolve({ data: null })
    }
    return Promise.reject(new Error('Claim not found'))
  },
  
  getUsers: () => Promise.resolve({ data: mockUsers }),
  createUser: (data: Partial<User>) => {
    const newUser = { ...data, id: Date.now(), createdAt: new Date().toISOString() } as User
    mockUsers.push(newUser)
    return Promise.resolve({ data: newUser })
  },
  updateUser: (id: number, data: Partial<User>) => {
    const index = mockUsers.findIndex(u => u.id === id)
    if (index >= 0) {
      mockUsers[index] = { ...mockUsers[index], ...data }
      return Promise.resolve({ data: mockUsers[index] })
    }
    return Promise.reject(new Error('User not found'))
  },
  deleteUser: (id: number) => {
    const index = mockUsers.findIndex(u => u.id === id)
    if (index >= 0) {
      mockUsers.splice(index, 1)
      return Promise.resolve({ data: null })
    }
    return Promise.reject(new Error('User not found'))
  },
  
  getAuditLogs: () => Promise.resolve({ data: mockAuditLogs }),
  
  login: (username: string) => {
    const user = mockUsers.find(u => u.username === username)
    if (user) {
      return Promise.resolve({
        data: {
          token: 'mock-token',
          username: user.username,
          fullname: user.fullname,
          role: user.role,
          team: user.team,
          factoryAgent: user.factoryAgent
        }
      })
    }
    return Promise.reject(new Error('Invalid credentials'))
  }
}
