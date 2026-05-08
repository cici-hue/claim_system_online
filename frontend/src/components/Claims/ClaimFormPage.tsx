import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../../hooks/useToast'
import { createClaim, updateClaim, getClaimById, getClaims, sendClaimEmail } from '../../services/claimService'
import { getUsers } from '../../services/userService'
import { ClaimRequest, DEFECT_CATEGORIES, LOCATIONS, CUSTOMERS, Claim } from '../../types/claim'
import { VENDORS, INSPECTORS } from '../../services/mockData'
import { useAuth } from '../../hooks/useAuth'

const DEFECT_TEMPLATES: Record<string, string[]> = {
  'Formal': [
    'Garment shape deviates from approved sample — neckline / hemline',
    'Collar / lapel not sitting flat; attachment points uneven',
    'Pockets misaligned or asymmetric',
    'Zipper guard / placket misaligned',
  ],
  'Material': [
    'Fabric colour shade variation vs. PP sample',
    'Hand-feel / weight outside approved range',
    'Pilling / snag visible after light abrasion test',
    'Fabric defects: slubs, holes, contamination in weave',
  ],
  'Workmanship': [
    'Stitch density below spec (SPI count)',
    'Seam puckering / seam slippage observed',
    'Raw edge / open seam not overlocked',
    'Label sewing: crooked / loose attachment',
  ],
  'Safety & Function': [
    'Button attachment pull-force fails EN 71-1 / ASTM F963',
    'Drawstring exceeds maximum length in hood / waist',
    'Sharp edge / point on metal component',
    'Zip slider sharp edge catches fabric',
  ],
  'Measurement': [
    'Chest / bust girth out of tolerance (±2 cm)',
    'Sleeve length short / long vs. size spec',
    'Shoulder seam position offset',
    'Inseam / outseam measurement variance',
  ],
}

const initialForm: ClaimRequest = {
  claimNo: '', vendor: '', customer: '', fid: '', location: '',
  styleNo: '', styleNo3D: false, orderNo: '', articleNo: '', inspector: '', factoryAgent: '',
  shippedQty: 0, claimQty: 0, qcInformedQty: 0, claimDate: '', marketInspectionDate: '',
  qcInformDate: '', defectCategory: '', qualityDigit: '', defectDescription: '',
  defectRateByCustomer: '', fullCheckResult: '', fullCheckRejectionRate: '',
  status: 'OPEN', qcResponsibility: '', claimResponsibility: '', claimSample: false,
  rcaReport: '', repeatDefectFlag: false,
  repeatOrderNo: '', repeatOrderDeliveryDate: '', repeatOrderRemark: '',
  rcaStatus: undefined as any, rcaSupervisorComment: '', rcaManagerComment: '',
  createdBy: '', updatedBy: ''
}

// Field error type
interface FieldErrors {
  [key: string]: string
}

const Field: React.FC<{ 
  label: string; 
  required?: boolean; 
  children: React.ReactNode;
  error?: string;
}> = ({ label, required, children, error }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: 'block', fontWeight: 600, marginBottom: 5, fontSize: 13, color: '#0f172a' }}>
      {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
    </label>
    {children}
    {error && (
      <div style={{ color: '#dc2626', fontSize: 12, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
        <span>⚠</span> {error}
      </div>
    )}
  </div>
)

const inputStyle = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' as const
}

const inputErrorStyle = {
  ...inputStyle,
  border: '1px solid #dc2626',
  backgroundColor: '#fef2f2'
}

const inputValidStyle = {
  ...inputStyle,
  border: '1px solid #22c55e'
}

// Date Input Component with click-to-show-calendar
const DateInput: React.FC<{
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  hasError?: boolean
  fieldName?: string
  customStyle?: React.CSSProperties
}> = ({ value, onChange, hasError, fieldName, customStyle }) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const isDark = user?.theme === 'dark'

  const handleClick = () => {
    if (inputRef.current) {
      inputRef.current.showPicker?.()
    }
  }

  const getStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      width: '100%',
      padding: '8px 10px',
      borderRadius: 8,
      border: hasError ? '1px solid #dc2626' : '1px solid #cbd5e1',
      backgroundColor: hasError ? '#fef2f2' : isDark ? '#1e293b' : '#fff',
      color: isDark ? '#e2e8f0' : '#0f172a',
      fontSize: 13,
      boxSizing: 'border-box',
      cursor: 'pointer',
      ...customStyle
    }
    return baseStyle
  }

  return (
    <input
      ref={inputRef}
      type="date"
      value={value}
      onChange={onChange}
      onClick={handleClick}
      style={getStyle()}
      data-error={hasError}
      data-field={fieldName}
    />
  )
}

const ClaimFormPage: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, canManageClaims } = useAuth()
  const { showToast } = useToast()
  const isEdit = !!id
  
  // 检查权限：编辑/创建索赔需要 SuperAdmin 或 QC Admin 权限
  useEffect(() => {
    if (!canManageClaims()) {
      showToast('You do not have permission to manage claims.')
      navigate('/claims')
    }
  }, [canManageClaims, navigate])
  const [form, setForm] = useState<ClaimRequest>({ ...initialForm, factoryAgent: user?.factoryAgent || '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [touched, setTouched] = useState<Set<string>>(new Set())
  
  // Duplicate claim check (V8 feature)
  const [duplicateClaim, setDuplicateClaim] = useState<{ id: number; claimNo: string } | null>(null)

  // F4 template picker
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const descRef = useRef<HTMLTextAreaElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // Risk Alert modal state
  const [showRiskAlertModal, setShowRiskAlertModal] = useState(false)
  const [riskAlertData, setRiskAlertData] = useState<{
    to: string
    cc: string
    subject: string
    bodyHtml: string
  } | null>(null)
  const [sendingRiskAlert, setSendingRiskAlert] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 991)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 991)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Load saved form data from localStorage on mount (for New Claim only)
  useEffect(() => {
    if (!isEdit) {
      const savedForm = localStorage.getItem('newClaimFormData')
      if (savedForm) {
        try {
          const parsed = JSON.parse(savedForm)
          setForm({ ...initialForm, ...parsed, factoryAgent: user?.factoryAgent || '' })
        } catch {
          // Invalid JSON, ignore
        }
      }
    } else {
      // Edit mode: load from API
      getClaimById(Number(id)).then(data => {
        setForm(data as any)
      })
    }
  }, [id, isEdit])

  // Save form data to localStorage whenever it changes (for New Claim only)
  useEffect(() => {
    if (!isEdit && form.claimNo !== '') {
      localStorage.setItem('newClaimFormData', JSON.stringify(form))
    }
  }, [form, isEdit])

  // Clear saved form data
  const clearSavedForm = () => {
    localStorage.removeItem('newClaimFormData')
  }

  // Ctrl+S / Cmd+S save shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        formRef.current?.requestSubmit()
      }
      if (e.key === 'F4' && document.activeElement === descRef.current) {
        e.preventDefault()
        setShowTemplatePicker(true)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const set = (key: keyof ClaimRequest) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.value
    setForm(f => ({ ...f, [key]: value }))
    setTouched(t => new Set(t).add(key))
    
    // Live validation: clear error and set valid state when user types (V8 rule)
    if (fieldErrors[key]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[key]
        return newErrors
      })
    }
    
    // Cross-field validation: when shippedQty changes, re-validate claimQty
    if (key === 'shippedQty' && form.claimQty) {
      const sq = Number(value) || 0
      const cq = Number(form.claimQty) || 0
      if (sq > 0 && cq > 0 && cq > sq) {
        setFieldErrors(prev => ({
          ...prev,
          claimQty: `Claim Qty (${cq}) cannot exceed Shipped Qty (${sq}).`
        }))
      } else if (fieldErrors.claimQty?.includes('cannot exceed')) {
        setFieldErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors.claimQty
          return newErrors
        })
      }
    }
    
    // Cross-field validation: when claimQty changes, check against shippedQty
    if (key === 'claimQty') {
      const sq = Number(form.shippedQty) || 0
      const cq = Number(value) || 0
      if (sq > 0 && cq > 0 && cq > sq) {
        setFieldErrors(prev => ({
          ...prev,
          claimQty: `Claim Qty (${cq}) cannot exceed Shipped Qty (${sq}).`
        }))
      } else if (fieldErrors.claimQty?.includes('cannot exceed')) {
        setFieldErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors.claimQty
          return newErrors
        })
      }
    }
  }
  
  // Auto-calculate Full Check Rejection Rate when fullCheckResult changes (V8 logic)
  useEffect(() => {
    const fullCheckResult = (form.fullCheckResult || '').trim()
    
    if (!fullCheckResult) {
      setForm(f => ({ ...f, fullCheckRejectionRate: '' }))
      return
    }
    
    // V8: Parse as fraction "rejected/total" (e.g., "3/10" = 30%)
    const parts = fullCheckResult.split('/')
    if (parts.length === 2) {
      const rejected = parseFloat(parts[0])
      const total = parseFloat(parts[1])
      if (!isNaN(rejected) && !isNaN(total) && total > 0) {
        const rate = (rejected / total * 100).toFixed(1) + '%'
        setForm(f => ({ ...f, fullCheckRejectionRate: rate }))
        return
      }
    }
    
    // If cannot parse as fraction, clear the rate
    setForm(f => ({ ...f, fullCheckRejectionRate: '' }))
  }, [form.fullCheckResult])

  // Date field change handler with live validation (V8 rule)
  const handleDateChange = (field: 'claimDate' | 'marketInspectionDate' | 'qcInformDate') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setForm(f => {
      const newForm = { ...f, [field]: value }
      // V8: if qcInformDate is filled and status is OPEN, auto change to IN_PROGRESS
      if (field === 'qcInformDate' && value && f.status === 'OPEN') {
        newForm.status = 'IN_PROGRESS'
      }
      // If qcInformDate is cleared, reset status to OPEN
      if (field === 'qcInformDate' && !value) {
        newForm.status = 'OPEN'
      }
      return newForm
    })
    setTouched(t => new Set(t).add(field))
    
    // Live validation for date fields (V8 rule)
    if (!value) {
      // Clear both invalid and valid states when empty
      setFieldErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      setFieldErrors(prev => ({ ...prev, [field]: 'Date must be YYYY-MM-DD format.' }))
    } else if (isNaN(new Date(value).getTime())) {
      setFieldErrors(prev => ({ ...prev, [field]: 'Invalid date.' }))
    } else {
      // Valid date - clear error
      setFieldErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  // Validate a single field (V8 rules)
  const validateField = (key: string, value: any): string => {
    switch (key) {
      case 'claimNo':
        if (!value || !value.trim()) return 'Claim No. is required.'
        if (value.length > 50) return 'Claim No. must be ≤ 50 characters.'
        return ''
      case 'vendor':
        if (!value || !value.trim()) return 'Vendor is required.'
        return ''
      case 'claimDate':
      case 'marketInspectionDate':
      case 'qcInformDate':
        // V8: Date format checks (must be valid dates if provided)
        if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Date must be YYYY-MM-DD format.'
        if (value && isNaN(new Date(value).getTime())) return 'Invalid date.'
        return ''
      case 'shippedQty':
      case 'claimQty':
        // V8: Qty must be non-negative integers if provided
        if (value !== '' && value !== undefined && value !== null) {
          const n = Number(value)
          if (isNaN(n) || n < 0) return 'Must be a non-negative number.'
          if (!Number.isInteger(n)) return 'Must be a whole number.'
        }
        return ''
      default:
        return ''
    }
  }

  // Validate all fields
  const validateForm = (): boolean => {
    const errors: FieldErrors = {}
    
    // Required fields
    const claimNoError = validateField('claimNo', form.claimNo)
    if (claimNoError) errors.claimNo = claimNoError
    
    const vendorError = validateField('vendor', form.vendor)
    if (vendorError) errors.vendor = vendorError
    
    // Date validations
    const dateFields = ['claimDate', 'marketInspectionDate', 'qcInformDate'] as const
    dateFields.forEach(field => {
      const error = validateField(field, form[field])
      if (error) errors[field] = error
    })
    
    // Quantity validations
    const qtyFields = ['shippedQty', 'claimQty'] as const
    qtyFields.forEach(field => {
      const error = validateField(field, form[field])
      if (error) errors[field] = error
    })
    
    // claimQty ≤ shippedQty validation (V8 rule)
    const sq = Number(form.shippedQty) || 0
    const cq = Number(form.claimQty) || 0
    if (sq > 0 && cq > 0 && cq > sq) {
      errors.claimQty = `Claim Qty (${cq}) cannot exceed Shipped Qty (${sq}).`
    }
    
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Check for duplicate claim number
  const checkDuplicateClaimNo = async (claimNo: string): Promise<boolean> => {
    try {
      const response = await getClaims({})
      const claims = response.content
      const duplicate = claims.find((c: any) => c.claimNo === claimNo && c.id !== Number(id))
      return !!duplicate
    } catch {
      return false
    }
  }
  
  // Real-time duplicate check on blur (V8 feature)
  const handleClaimNoBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim()
    if (!value) {
      setDuplicateClaim(null)
      return
    }
    try {
      const response = await getClaims({})
      const claims = response.content
      const dup = claims.find((c: any) => c.claimNo === value && c.id !== Number(id))
      if (dup) {
        setDuplicateClaim({ id: dup.id, claimNo: dup.claimNo })
      } else {
        setDuplicateClaim(null)
      }
    } catch {
      setDuplicateClaim(null)
    }
  }
  
  // Clear duplicate warning when typing (V8 feature)
  const handleClaimNoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setForm(f => ({ ...f, claimNo: value }))
    setTouched(t => new Set(t).add('claimNo'))
    
    // Clear duplicate warning when typing
    if (duplicateClaim) {
      setDuplicateClaim(null)
    }
    
    // Live validation: clear error and set valid state when user types (V8 rule)
    if (fieldErrors.claimNo) {
      setFieldErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.claimNo
        return newErrors
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    // Mark all fields as touched
    setTouched(new Set(['claimNo', 'vendor', 'claimDate', 'marketInspectionDate', 'qcInformDate', 'shippedQty', 'claimQty']))
    
    // Validate form
    if (!validateForm()) {
      setError('Please fix the highlighted errors before saving.')
      // Scroll to first error
      const firstErrorField = document.querySelector('[data-error="true"]')
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }
    
    // Check for duplicate claim number (V8 rule)
    const claimNoVal = form.claimNo.trim()
    const isDuplicate = await checkDuplicateClaimNo(claimNoVal)
    if (isDuplicate) {
      const proceed = window.confirm(`Claim No. "${claimNoVal}" already exists. Save anyway?`)
      if (!proceed) return
    }
    
    setLoading(true)
    try {
      let savedClaim: Claim | null = null
      if (isEdit) {
        savedClaim = await updateClaim(Number(id), form)
      } else {
        savedClaim = await createClaim(form)
      }
      
      // Auto-send Risk Alert email if repeat order info is filled
      if (form.repeatDefectFlag && form.repeatOrderNo && savedClaim) {
        try {
          await autoSendRiskAlert(savedClaim)
        } catch (emailErr) {
          console.error('Failed to auto-send risk alert:', emailErr)
        }
      }
      
      if (isEdit) {
        // After saving edit, navigate to claim detail page
        navigate(`/claims/${id}`)
      } else {
        // V8 behavior: after saving new claim, reset form and stay on page
        resetForm()
        setError('')
        // Show success message as a temporary error (green style would be better but using existing)
        showToast('Claim saved successfully.')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save claim')
    } finally {
      setLoading(false)
    }
  }
  
  // Auto-send Risk Alert email after saving repeat order info
  const autoSendRiskAlert = async (claim: Claim) => {
    const users = await getUsers()
    const claimAgent = claim.factoryAgent
    
    // TO: all inspectors of the same factory agent
    const inspectors = users.filter((u: any) =>
      u.role === 'INSPECTOR' && (claimAgent ? u.factoryAgent === claimAgent : true) && u.email
    )
    const toEmails = inspectors.map((u: any) => u.email).filter(Boolean).join(', ')
    
    // CC: supervisors, admins, superadmins of the same factory agent
    const ccUsers = users.filter((u: any) =>
      (u.role === 'SUPERVISOR' || u.role === 'ADMIN' || u.role === 'SUPERADMIN') &&
      (claimAgent ? u.factoryAgent === claimAgent : true) && u.email
    )
    const ccEmails = ccUsers.map((u: any) => u.email).filter(Boolean).join(', ')
    
    if (!toEmails) return
    
    // V8 Style Subject
    const subject = `⚠ Risk — Repeat Order Alert | ${claim.vendor} | Style: ${claim.styleNo || '—'} | PO: ${claim.repeatOrderNo || '—'}`
    
    // V8 Style Email Body
    const deliveryDate = claim.repeatOrderDeliveryDate
      ? `<span style="font-weight:700;color:#b45309;">${claim.repeatOrderDeliveryDate}</span>`
      : '<span style="color:#94a3b8;">—</span>'
    
    const bodyHtml = `
    <div style="font-family:'Segoe UI',system-ui,Roboto,sans-serif;color:#0f172a;max-width:620px;margin:0 auto;background:#f0f4f8;padding:20px 14px;">
        <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(15,23,42,0.10);">
            <div style="background:linear-gradient(135deg,#d97706,#f59e0b);padding:20px 24px;">
                <div style="font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.75);margin-bottom:5px;">Otto International · Risk Alert</div>
                <div style="color:#fff;font-size:18px;font-weight:700;line-height:1.3;">⚠ Repeat Order Risk Notice</div>
                <div style="color:rgba(255,255,255,0.85);font-size:12px;margin-top:4px;">${claim.vendor || ''} &nbsp;·&nbsp; ${claim.customer || ''} &nbsp;·&nbsp; ${new Date().toLocaleDateString()}</div>
            </div>
            <div style="padding:18px 24px;">
                <p style="margin:0 0 14px;font-size:13.5px;line-height:1.6;color:#334155;">
                    Dear Team,<br><br>
                    Please be advised that the following style has been flagged as a <strong style="color:#b45309;">Repeat Order Risk</strong>.
                    A defect was previously raised on this style and a repeat order is now in progress.
                    Heightened QC attention is required during inspection.
                </p>
                <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;overflow:hidden;margin-bottom:14px;">
                    <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:5px 14px;">
                        <span style="color:#fff;font-weight:700;font-size:0.72rem;letter-spacing:0.05em;">CLAIM REFERENCE</span>
                    </div>
                    <table style="width:100%;border-collapse:collapse;font-size:13px;">
                        <tr>
                            <td style="padding:7px 14px;width:38%;color:#92400e;font-weight:700;font-size:0.7rem;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #fde68a;">Claim No.</td>
                            <td style="padding:7px 14px;font-weight:600;color:#0f172a;border-bottom:1px solid #fde68a;">${claim.claimNo}</td>
                        </tr>
                        <tr>
                            <td style="padding:7px 14px;color:#92400e;font-weight:700;font-size:0.7rem;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #fde68a;">Vendor</td>
                            <td style="padding:7px 14px;color:#0f172a;border-bottom:1px solid #fde68a;">${claim.vendor || '—'}</td>
                        </tr>
                        <tr>
                            <td style="padding:7px 14px;color:#92400e;font-weight:700;font-size:0.7rem;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #fde68a;">Style No.</td>
                            <td style="padding:7px 14px;font-weight:700;color:#1a3a5c;border-bottom:1px solid #fde68a;">${claim.styleNo || '—'}</td>
                        </tr>
                        <tr>
                            <td style="padding:7px 14px;color:#92400e;font-weight:700;font-size:0.7rem;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #fde68a;">Repeat Order No.</td>
                            <td style="padding:7px 14px;font-weight:700;color:#1a3a5c;border-bottom:1px solid #fde68a;">${claim.repeatOrderNo || '—'}</td>
                        </tr>
                        <tr>
                            <td style="padding:7px 14px;color:#92400e;font-weight:700;font-size:0.7rem;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #fde68a;">Delivery Date</td>
                            <td style="padding:7px 14px;border-bottom:1px solid #fde68a;">${deliveryDate}</td>
                        </tr>
                        <tr>
                            <td style="padding:7px 14px;color:#92400e;font-weight:700;font-size:0.7rem;text-transform:uppercase;letter-spacing:.04em;">Claim Reason</td>
                            <td style="padding:7px 14px;color:#64748b;">${claim.defectCategory || '—'}${claim.defectDescription ? ' — ' + claim.defectDescription.substring(0,80) + (claim.defectDescription.length>80?'…':'') : ''}</td>
                        </tr>
                    </table>
                </div>
                ${claim.repeatOrderRemark ? `
                <div style="background:#fef3c7;border-left:3px solid #f59e0b;border-radius:4px;padding:10px 14px;margin-bottom:14px;font-size:13px;color:#78350f;">
                    <strong>Remark:</strong> ${claim.repeatOrderRemark}
                </div>` : ''}
            </div>
            <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:12px 24px;text-align:center;">
                <div style="font-size:11px;color:#94a3b8;">Automated risk alert from <strong style="color:#64748b;">Otto International QC Claim System</strong></div>
            </div>
        </div>
    </div>`
    
    await sendClaimEmail(claim.id, toEmails, ccEmails, subject, bodyHtml)
  }

  // Get input style based on field state
  const getInputStyle = (fieldName: string, value: string | number) => {
    if (fieldErrors[fieldName]) return inputErrorStyle
    if (touched.has(fieldName) && value !== '' && value !== 0) return inputValidStyle
    return inputStyle
  }

  const templateOptions = DEFECT_TEMPLATES[form.defectCategory] || Object.values(DEFECT_TEMPLATES).flat()

  // Reset form to initial state (V8 behavior)
  const resetForm = () => {
    setForm({ ...initialForm, factoryAgent: user?.factoryAgent || '' })
    setFieldErrors({})
    setTouched(new Set())
    setError('')
    setDuplicateClaim(null)
    clearSavedForm() // Clear localStorage when resetting form
  }

  // Handle cancel button (V8 behavior - navigate back)
  const handleCancel = () => {
    if (isEdit) {
      // For edit mode, go back to claim detail
      navigate(`/claims/${id}`)
    } else {
      // For new claim, navigate back to claims list (V8 behavior)
      navigate('/claims')
    }
  }

  // Generate Risk Alert email preview - Exact V8 Style
  const generateRiskAlertEmail = async () => {
    try {
      const users = await getUsers()
      
      // Get claim factory agent
      const claimAgent = form.factoryAgent
      
      // TO: all inspectors of the same factory agent
      const inspectors = users.filter((u: any) =>
        u.role === 'INSPECTOR' && (claimAgent ? u.factoryAgent === claimAgent : true) && u.email
      )
      const toEmails = inspectors.map((u: any) => u.email).filter(Boolean).join(', ')
      
      // CC: supervisors, admins, superadmins of the same factory agent
      const ccUsers = users.filter((u: any) =>
        (u.role === 'SUPERVISOR' || u.role === 'ADMIN' || u.role === 'SUPERADMIN') &&
        (claimAgent ? u.factoryAgent === claimAgent : true) && u.email
      )
      const ccEmails = ccUsers.map((u: any) => u.email).filter(Boolean).join(', ')
      
      if (!toEmails) {
        showToast('No inspector emails found for this factory agent.')
        return
      }
      
      // V8 Style Subject
      const subject = `⚠ Risk — Repeat Order Alert | ${form.vendor} | Style: ${form.styleNo || '—'} | PO: ${form.repeatOrderNo || form.orderNo || '—'}`
      
      // V8 Style Email Body
      const deliveryDate = form.repeatOrderDeliveryDate
        ? `<span style="font-weight:700;color:#b45309;">${form.repeatOrderDeliveryDate}</span>`
        : '<span style="color:#94a3b8;">—</span>'
      
      const bodyHtml = `
    <div style="font-family:'Segoe UI',system-ui,Roboto,sans-serif;color:#0f172a;max-width:620px;margin:0 auto;background:#f0f4f8;padding:20px 14px;">
        <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(15,23,42,0.10);">

            <!-- Header -->
            <div style="background:linear-gradient(135deg,#d97706,#f59e0b);padding:20px 24px;">
                <div style="font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.75);margin-bottom:5px;">Otto International · Risk Alert</div>
                <div style="color:#fff;font-size:18px;font-weight:700;line-height:1.3;">⚠ Repeat Order Risk Notice</div>
                <div style="color:rgba(255,255,255,0.85);font-size:12px;margin-top:4px;">${form.vendor || ''} &nbsp;·&nbsp; ${form.customer || ''} &nbsp;·&nbsp; ${new Date().toLocaleDateString()}</div>
            </div>

            <!-- Body -->
            <div style="padding:18px 24px;">
                <p style="margin:0 0 14px;font-size:13.5px;line-height:1.6;color:#334155;">
                    Dear Team,<br><br>
                    Please be advised that the following style has been flagged as a <strong style="color:#b45309;">Repeat Order Risk</strong>.
                    A defect was previously raised on this style and a repeat order is now in progress.
                    Heightened QC attention is required during inspection.
                </p>

                <!-- Info card -->
                <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;overflow:hidden;margin-bottom:14px;">
                    <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:5px 14px;">
                        <span style="color:#fff;font-weight:700;font-size:0.72rem;letter-spacing:0.05em;">CLAIM REFERENCE</span>
                    </div>
                    <table style="width:100%;border-collapse:collapse;font-size:13px;">
                        <tr>
                            <td style="padding:7px 14px;width:38%;color:#92400e;font-weight:700;font-size:0.7rem;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #fde68a;">Claim No.</td>
                            <td style="padding:7px 14px;font-weight:600;color:#0f172a;border-bottom:1px solid #fde68a;">${form.claimNo}</td>
                        </tr>
                        <tr>
                            <td style="padding:7px 14px;color:#92400e;font-weight:700;font-size:0.7rem;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #fde68a;">Vendor</td>
                            <td style="padding:7px 14px;color:#0f172a;border-bottom:1px solid #fde68a;">${form.vendor || '—'}</td>
                        </tr>
                        <tr>
                            <td style="padding:7px 14px;color:#92400e;font-weight:700;font-size:0.7rem;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #fde68a;">Style No.</td>
                            <td style="padding:7px 14px;font-weight:700;color:#1a3a5c;border-bottom:1px solid #fde68a;">${form.styleNo || '—'}</td>
                        </tr>
                        <tr>
                            <td style="padding:7px 14px;color:#92400e;font-weight:700;font-size:0.7rem;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #fde68a;">Repeat Order No.</td>
                            <td style="padding:7px 14px;font-weight:700;color:#1a3a5c;border-bottom:1px solid #fde68a;">${form.repeatOrderNo || '—'}</td>
                        </tr>
                        <tr>
                            <td style="padding:7px 14px;color:#92400e;font-weight:700;font-size:0.7rem;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #fde68a;">Delivery Date</td>
                            <td style="padding:7px 14px;border-bottom:1px solid #fde68a;">${deliveryDate}</td>
                        </tr>
                        <tr>
                            <td style="padding:7px 14px;color:#92400e;font-weight:700;font-size:0.7rem;text-transform:uppercase;letter-spacing:.04em;">Claim Reason</td>
                            <td style="padding:7px 14px;color:#64748b;">${form.defectCategory || '—'}${form.defectDescription ? ' — ' + form.defectDescription.substring(0,80) + (form.defectDescription.length>80?'…':'') : ''}</td>
                        </tr>
                    </table>
                </div>

                ${form.repeatOrderRemark ? `
                <div style="background:#fef3c7;border-left:3px solid #f59e0b;border-radius:4px;padding:10px 14px;margin-bottom:14px;font-size:13px;color:#78350f;">
                    <strong>Remark:</strong> ${form.repeatOrderRemark}
                </div>` : ''}
            </div>

            <!-- Footer -->
            <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:12px 24px;text-align:center;">
                <div style="font-size:11px;color:#94a3b8;">Automated risk alert from <strong style="color:#64748b;">Otto International QC Claim System</strong></div>
            </div>
        </div>
    </div>`

      setRiskAlertData({
        to: toEmails,
        cc: ccEmails,
        subject,
        bodyHtml
      })
      setShowRiskAlertModal(true)
    } catch (err) {
      showToast('Failed to generate risk alert email.')
    }
  }

  // Send Risk Alert email
  const sendRiskAlertEmail = async () => {
    if (!riskAlertData) return
    setSendingRiskAlert(true)
    try {
      // Call API to send email
      await fetch(`/api/claims/${id}/risk-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimId: id,
          to: riskAlertData.to,
          cc: riskAlertData.cc,
          subject: riskAlertData.subject,
          body: riskAlertData.bodyHtml
        })
      })
      showToast('Risk Alert email sent successfully!')
      setShowRiskAlertModal(false)
      setRiskAlertData(null)
    } catch (err) {
      showToast('Failed to send email.')
    } finally {
      setSendingRiskAlert(false)
    }
  }

  return (
    <div>
      {/* Save/Cancel Buttons at top - V8 Style */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, justifyContent: 'flex-end', alignItems: 'center' }}>
        <button 
          type="submit" 
          form="claimForm"
          disabled={loading} 
          className="btn btn-sm btn-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            fontWeight: 600,
            fontSize: '0.875rem'
          }}
        >
          <i className="bi bi-check-lg"></i>
          {loading ? 'Saving...' : 'Save'}
          <span className="d-none d-md-inline" style={{ opacity: 0.65, fontSize: '0.7rem', fontWeight: 400, marginLeft: 2 }}>Ctrl+S</span>
        </button>
        <button 
          type="button" 
          onClick={handleCancel}
          className="btn btn-sm btn-outline-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.875rem'
          }}
        >
          <i className="bi bi-x-lg"></i>
          Cancel
        </button>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} id="claimForm">
        <div style={{ background: '#fff', borderRadius: 12, padding: 24,
          boxShadow: '0 2px 8px rgba(15,23,42,.08)', border: '1px solid #e2e8f0', marginBottom: 20 }}>
          <h4 style={{ color: '#1a3a5c', margin: '0 0 20px', fontWeight: 700 }}>Vendor & Factory Information</h4>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            <Field label="Vendor" required error={fieldErrors.vendor}>
              <input 
                style={getInputStyle('vendor', form.vendor)} 
                value={form.vendor} 
                onChange={set('vendor')} 
                data-error={!!fieldErrors.vendor}
                placeholder="Type or select..."
                list="vendorList"
              />
              <datalist id="vendorList">
                {VENDORS.map(v => <option key={v} value={v} />)}
              </datalist>
            </Field>
            <Field label="FID">
              <input style={inputStyle} value={form.fid} onChange={set('fid')} placeholder="Type or select..." list="fidList" />
              <datalist id="fidList">
                <option>FID001</option>
                <option>FID002</option>
                <option>FID003</option>
                <option>FID004</option>
                <option>FID005</option>
                <option>FID006</option>
                <option>FID007</option>
                <option>FID008</option>
                <option>FID009</option>
                <option>FID010</option>
              </datalist>
            </Field>
            <Field label="Location/Team">
              <input style={inputStyle} value={form.location} onChange={set('location')} placeholder="Type or select..." list="locationList" />
              <datalist id="locationList">
                {LOCATIONS.map(l => <option key={l} value={l} />)}
              </datalist>
            </Field>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: 24,
          boxShadow: '0 2px 8px rgba(15,23,42,.08)', border: '1px solid #e2e8f0', marginBottom: 20 }}>
          <h4 style={{ color: '#1a3a5c', margin: '0 0 20px', fontWeight: 700 }}>Order Details</h4>
          {/* Row 1 */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
            <Field label="Customer">
              <input style={inputStyle} value={form.customer} onChange={set('customer')} placeholder="Type or select..." list="customerList" />
              <datalist id="customerList">
                {CUSTOMERS.map(c => <option key={c} value={c} />)}
              </datalist>
            </Field>
            <Field label="Style No.">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input style={{ ...inputStyle, flex: 1 }} value={form.styleNo} onChange={set('styleNo')} placeholder="Enter style number" />
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', fontSize: 13, cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={!!form.styleNo3D}
                    onChange={e => setForm(f => ({ ...f, styleNo3D: e.target.checked }))}
                    style={{ width: 13, height: 13, accentColor: '#1a3a5c', cursor: 'pointer' }} 
                  />
                  <span style={{ fontWeight: 600, color: '#64748b' }}>3D</span>
                </label>
              </div>
            </Field>
            <Field label="Order No.">
              <input style={inputStyle} value={form.orderNo} onChange={set('orderNo')} placeholder="Enter order number" />
            </Field>
            <Field label="Article No.">
              <input style={inputStyle} value={form.articleNo} onChange={set('articleNo')} placeholder="Enter article number" />
            </Field>
            <Field label="Shipped Qty" error={fieldErrors.shippedQty}>
              <input 
                type="number" 
                style={getInputStyle('shippedQty', form.shippedQty)} 
                value={form.shippedQty} 
                onChange={set('shippedQty')} 
                data-error={!!fieldErrors.shippedQty}
                placeholder="Enter shipped quantity"
                min="0"
              />
            </Field>
          </div>
          {/* Row 2 */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(140px, 200px))', gap: 16 }}>
            <Field label="Market Inspection Date" error={fieldErrors.marketInspectionDate}>
              <DateInput 
                value={form.marketInspectionDate} 
                onChange={handleDateChange('marketInspectionDate')} 
                hasError={!!fieldErrors.marketInspectionDate}
                fieldName="marketInspectionDate"
              />
            </Field>
            <Field label="QC Trip Leader">
              <input style={inputStyle} value={form.inspector} onChange={set('inspector')} placeholder="Type or select..." list="inspectorList" />
              <datalist id="inspectorList">
                {INSPECTORS.map(i => <option key={i} value={i} />)}
              </datalist>
            </Field>
            <Field label="Quality Digit(Market)">
              <input style={inputStyle} value={form.qualityDigit} onChange={set('qualityDigit')} placeholder="75X or 45X" />
            </Field>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: 24,
          boxShadow: '0 2px 8px rgba(15,23,42,.08)', border: '1px solid #e2e8f0', marginBottom: 20 }}>
          <h4 style={{ color: '#1a3a5c', margin: '0 0 20px', fontWeight: 700 }}>Claim Information</h4>
          {/* Row 1: Claim No., Claim Date, Claim Qty */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(140px, 240px))', gap: 16, marginBottom: 16 }}>
            <Field label="Claim No." required error={fieldErrors.claimNo}>
              <input
                style={getInputStyle('claimNo', form.claimNo)}
                value={form.claimNo}
                onChange={handleClaimNoChange}
                onBlur={handleClaimNoBlur}
                data-error={!!fieldErrors.claimNo || !!duplicateClaim}
                placeholder="Enter claim number"
              />
              {duplicateClaim && (
                <div style={{ color: '#b91c1c', fontSize: '0.65rem', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                  <span>⚠</span>
                  <span>Claim No. already exists (<a href="#" onClick={(e) => { e.preventDefault(); navigate(`/claims/${duplicateClaim.id}`) }} style={{ color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}>{duplicateClaim.claimNo}</a>)</span>
                </div>
              )}
            </Field>
            <Field label="Claim Date" error={fieldErrors.claimDate}>
              <DateInput 
                value={form.claimDate} 
                onChange={handleDateChange('claimDate')} 
                hasError={!!fieldErrors.claimDate}
                fieldName="claimDate"
              />
            </Field>
            <Field label="Claim Qty" error={fieldErrors.claimQty}>
              <input 
                type="number" 
                style={getInputStyle('claimQty', form.claimQty)} 
                value={form.claimQty} 
                onChange={set('claimQty')} 
                data-error={!!fieldErrors.claimQty}
                placeholder="Enter claim quantity"
                min="0"
              />
            </Field>
          </div>
          {/* Row 2: Defect Category */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(140px, 240px)', gap: 16, marginBottom: 16 }}>
            <Field label="Defect Category">
              <select style={inputStyle} value={form.defectCategory} onChange={set('defectCategory')}>
                <option value="">Select...</option>
                {DEFECT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          {/* Row 3: Defect Description */}
          <div style={{ marginBottom: 16 }}>
            <Field label="Defect Description">
              <div style={{ position: 'relative' }}>
                <textarea ref={descRef} style={{ ...inputStyle, height: 80, resize: 'vertical', paddingRight: 90 }}
                  value={form.defectDescription} onChange={set('defectDescription')} placeholder="Describe the defect, or press F4 for templates..." />
                <button type="button" onClick={() => setShowTemplatePicker(true)}
                  title="Pick a template (F4)"
                  style={{ position: 'absolute', top: 6, right: 8, padding: '3px 10px', borderRadius: 6,
                    background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#64748b',
                    cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>
                  F4 Template
                </button>
              </div>
            </Field>
          </div>
          {/* Row 4: Defect Rate by Customer, Full Check Result, Full Check Rejection Rate */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(140px, 1fr))', gap: 16, marginBottom: 16 }}>
            <Field label="Defect Rate by Customer">
              <input style={inputStyle} value={form.defectRateByCustomer} onChange={set('defectRateByCustomer')} placeholder="e.g. 3/10" />
            </Field>
            <Field label="Full Check Result">
              <input style={inputStyle} value={form.fullCheckResult} onChange={set('fullCheckResult')} placeholder="e.g. 3/10" />
            </Field>
            <Field label="Full Check Rejection Rate">
              <input 
                style={{...inputStyle, backgroundColor: '#f1f5f9', cursor: 'not-allowed'}} 
                value={form.fullCheckRejectionRate} 
                readOnly 
                placeholder="Auto-calculated"
                title="Calculated from Full Check Result (rejected/total)"
              />
            </Field>
          </div>
          {/* Row 5: QC Responsibility, Claim Responsibility, Claim Sample, QC Informed Date, Status */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(5, minmax(140px, 1fr))', gap: 16, marginBottom: 16 }}>
            <Field label="QC Responsibility">
              <select style={inputStyle} value={form.qcResponsibility} onChange={set('qcResponsibility')}>
                <option value="">-</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </Field>
            <Field label="Claim Responsibility">
              <select style={inputStyle} value={form.claimResponsibility} onChange={set('claimResponsibility')}>
                <option value="">-</option>
                <option value="Merch Dept.">Merch Dept.</option>
                <option value="Fabric Dept.">Fabric Dept.</option>
              </select>
            </Field>
            <Field label="Claim Sample">
              <div style={{ display: 'flex', alignItems: 'center', height: 36 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={!!form.claimSample}
                    onChange={e => setForm(f => ({ ...f, claimSample: e.target.checked }))}
                    style={{ width: 13, height: 13, accentColor: '#1a3a5c', cursor: 'pointer' }} 
                  />
                  <span style={{ fontSize: 13, color: '#64748b' }}>Yes</span>
                </label>
              </div>
            </Field>
            <Field label="QC Informed Date">
              <DateInput 
                value={form.qcInformDate} 
                onChange={handleDateChange('qcInformDate')}
                hasError={!!fieldErrors.qcInformDate}
                fieldName="qcInformDate"
              />
            </Field>
            <Field label="Status">
              {form.qcInformDate ? (
                <select style={inputStyle} value={form.status} onChange={set('status')}>
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="CLOSED">Closed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              ) : (
                <input 
                  style={{...inputStyle, backgroundColor: '#f1f5f9', cursor: 'not-allowed'}} 
                  value="Open" 
                  readOnly 
                  title="Status is 'Open' by default. Fill QC Informed Date to change status."
                />
              )}
            </Field>
          </div>
        </div>

        {/* Risk / Repeat Order - Exact V8 Style */}
        <div style={{ marginBottom: 20 }}>
          {/* V8 Style: Single pill with orange left + white right */}
          <div style={{ 
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0,
            borderRadius: 20,
            overflow: 'hidden',
            border: '1px solid #f59e0b',
            boxShadow: '0 1px 4px rgba(245,158,11,.2)'
          }}>
            {/* Orange left part */}
            <div style={{ 
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              padding: '4px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 5
            }}>
              <i className="bi bi-exclamation-triangle-fill" style={{ color: '#fff', fontSize: '0.65rem' }}></i>
              <span style={{ 
                color: '#fff', 
                fontWeight: 700, 
                fontSize: '0.7rem', 
                letterSpacing: '0.05em',
                whiteSpace: 'nowrap'
              }}>
                RISK — REPEAT ORDER
              </span>
            </div>
            
            {/* White right part with checkbox */}
            <label style={{ 
              background: '#fffbeb',
              padding: '4px 12px',
              display: 'flex', 
              alignItems: 'center', 
              gap: 6,
              cursor: 'pointer',
              margin: 0
            }}>
              <input 
                type="checkbox" 
                checked={!!form.repeatDefectFlag}
                onChange={e => setForm(f => ({ ...f, repeatDefectFlag: e.target.checked }))}
                style={{ 
                  width: 13, 
                  height: 13, 
                  margin: 0, 
                  accentColor: '#d97706',
                  cursor: 'pointer'
                }} 
              />
              <span style={{ 
                fontSize: '0.7rem', 
                fontWeight: 600, 
                color: '#92400e',
                whiteSpace: 'nowrap'
              }}>
                Mark as risk
              </span>
            </label>
          </div>
          
          {/* Collapsible fields - V8 Style */}
          {form.repeatDefectFlag && (
            <div style={{ 
              marginTop: 8,
              background: '#fffbeb', 
              border: '1px solid #fcd34d',
              borderRadius: 8,
              padding: '12px 14px'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 12 }}>
                <div>
                  <label style={{ 
                    fontSize: '0.7rem', 
                    fontWeight: 700, 
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#92400e',
                    display: 'block',
                    marginBottom: 4
                  }}>
                    Repeat Order No.
                  </label>
                  <input 
                    type="text"
                    style={{ 
                      ...inputStyle,
                      padding: '6px 10px',
                      fontSize: '0.85rem',
                      borderColor: '#fcd34d'
                    }} 
                    value={form.repeatOrderNo || ''} 
                    onChange={set('repeatOrderNo')} 
                    placeholder="e.g. PO-2024-9988"
                  />
                </div>
                <div>
                  <label style={{ 
                    fontSize: '0.7rem', 
                    fontWeight: 700, 
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#92400e',
                    display: 'block',
                    marginBottom: 4
                  }}>
                    Delivery Date
                  </label>
                  <DateInput 
                    value={form.repeatOrderDeliveryDate || ''} 
                    onChange={set('repeatOrderDeliveryDate')}
                    customStyle={{ 
                      borderColor: '#fcd34d'
                    }}
                    fieldName="repeatOrderDeliveryDate"
                  />
                </div>
                <div>
                  <label style={{ 
                    fontSize: '0.7rem', 
                    fontWeight: 700, 
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#92400e',
                    display: 'block',
                    marginBottom: 4
                  }}>
                    Remark
                  </label>
                  <input 
                    type="text"
                    style={{ 
                      ...inputStyle,
                      padding: '6px 10px',
                      fontSize: '0.85rem',
                      borderColor: '#fcd34d'
                    }} 
                    value={form.repeatOrderRemark || ''} 
                    onChange={set('repeatOrderRemark')} 
                    placeholder="Optional notes"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {error && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px 16px',
          borderRadius: 8, marginBottom: 16 }}>{error}</div>}
      </form>

      {/* F4 Template picker modal */}
      {showTemplatePicker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 9000,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: 540,
            maxHeight: '80vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 24px 64px rgba(15,23,42,.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <h3 style={{ color: '#1a3a5c', margin: 0, fontWeight: 700 }}>Defect Description Templates</h3>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginLeft: 'auto' }}>
                {form.defectCategory ? `Category: ${form.defectCategory}` : 'All categories'}
              </span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {templateOptions.map((tmpl, i) => (
                <div key={i} onClick={() => {
                  setForm(f => ({ ...f, defectDescription: tmpl }))
                  setShowTemplatePicker(false)
                }} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0',
                  cursor: 'pointer', fontSize: 13, background: '#f8fafc', lineHeight: 1.5,
                  transition: 'background .1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#eff6ff')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#f8fafc')}>
                  {tmpl}
                </div>
              ))}
            </div>
            <button onClick={() => setShowTemplatePicker(false)} style={{ marginTop: 14, padding: '8px 0',
              borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', color: '#64748b' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Risk Alert Email Preview Modal */}
      {showRiskAlertModal && riskAlertData && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          background: 'rgba(15,23,42,.5)', 
          zIndex: 9000,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: 20
        }}>
          <div style={{ 
            background: '#fff', 
            borderRadius: 8, 
            width: 800,
            maxWidth: '95vw',
            maxHeight: '90vh', 
            display: 'flex', 
            flexDirection: 'column',
            boxShadow: '0 24px 64px rgba(15,23,42,.3)'
          }}>
            {/* Header */}
            <div style={{ 
              background: '#1e3a5f', 
              padding: '14px 20px',
              borderRadius: '8px 8px 0 0',
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}>
              <i className="bi bi-envelope" style={{ color: '#fff', fontSize: 18 }}></i>
              <h3 style={{ color: '#fff', margin: 0, fontWeight: 600, fontSize: '1rem' }}>Email Preview</h3>
              <button 
                onClick={() => setShowRiskAlertModal(false)}
                style={{
                  marginLeft: 'auto',
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  fontSize: 20,
                  cursor: 'pointer',
                  padding: 0,
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >×</button>
            </div>

            {/* Email fields */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>TO</label>
                <input 
                  type="text"
                  value={riskAlertData.to}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: 4,
                    fontSize: '0.85rem',
                    background: '#f8fafc',
                    marginTop: 4
                  }}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>CC</label>
                <input 
                  type="text"
                  value={riskAlertData.cc}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: 4,
                    fontSize: '0.85rem',
                    background: '#f8fafc',
                    marginTop: 4
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>SUBJECT</label>
                <input 
                  type="text"
                  value={riskAlertData.subject}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: 4,
                    fontSize: '0.85rem',
                    background: '#f8fafc',
                    marginTop: 4
                  }}
                />
              </div>
            </div>

            {/* Email body preview */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              padding: 20,
              background: '#f8fafc'
            }}>
              <div 
                dangerouslySetInnerHTML={{ __html: riskAlertData.bodyHtml }}
                style={{
                  background: '#fff',
                  borderRadius: 8,
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              />
            </div>

            {/* Footer buttons */}
            <div style={{ 
              padding: '14px 20px', 
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              background: '#fff',
              borderRadius: '0 0 8px 8px'
            }}>
              <button 
                onClick={() => setShowRiskAlertModal(false)}
                disabled={sendingRiskAlert}
                style={{
                  padding: '8px 20px',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  background: '#fff',
                  color: '#374151',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <i className="bi bi-x-lg" style={{ fontSize: 12 }}></i>
                Cancel
              </button>
              <button 
                onClick={sendRiskAlertEmail}
                disabled={sendingRiskAlert}
                style={{
                  padding: '8px 20px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#1e3a5f',
                  color: '#fff',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  opacity: sendingRiskAlert ? 0.7 : 1
                }}
              >
                {sendingRiskAlert ? (
                  <>
                    <span className="spinner-border spinner-border-sm" style={{ width: 14, height: 14 }}></span>
                    Sending...
                  </>
                ) : (
                  <>
                    <i className="bi bi-send-fill" style={{ fontSize: 12 }}></i>
                    Send Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default ClaimFormPage
