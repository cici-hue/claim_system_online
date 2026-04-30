import React, { useEffect, useRef, useState, useMemo } from 'react'
import { Claim, RcaReason, RCA_ROOT_CAUSE_CATEGORIES, defaultRcaReason } from '../../types/claim'
import { saveRCA, addAttachment, deleteAttachment } from '../../services/claimService'

interface Props {
  claim: Claim
  onClose: () => void
}

function initReasons(claim: Claim): RcaReason[] {
  if (claim.rcaReasons && claim.rcaReasons.length > 0) {
    return claim.rcaReasons.map(r => ({ ...defaultRcaReason(), ...r }))
  }
  const r = defaultRcaReason(claim.defectCategory || 'Reason 1')
  if (claim.rcaStructured) {
    const s = claim.rcaStructured
    r.whatHappened = s.whatHappened || ''
    r.rootCauseCategory = s.rootCauseCategory || ''
    r.rootCauseSummary = s.rootCauseSummary || ''
    r.fb_man = s.fb_man || ''; r.fb_machine = s.fb_machine || ''
    r.fb_material = s.fb_material || ''; r.fb_method = s.fb_method || ''
    r.fb_measurement = s.fb_measurement || ''; r.fb_environment = s.fb_environment || ''
    r.fac_imm_action = s.fac_imm_action || ''; r.fac_imm_person = s.fac_imm_person || ''
    r.fac_imm_deadline = s.fac_imm_deadline || ''; r.fac_imm_followup = s.fac_imm_followup || ''
    r.fac_mid_action = s.fac_mid_action || ''; r.fac_mid_person = s.fac_mid_person || ''
    r.fac_mid_deadline = s.fac_mid_deadline || ''; r.fac_mid_followup = s.fac_mid_followup || ''
    r.fac_long_action = s.fac_long_action || ''; r.fac_long_person = s.fac_long_person || ''
    r.fac_long_deadline = s.fac_long_deadline || ''; r.fac_long_followup = s.fac_long_followup || ''
    r.oi_action = s.oi_action || ''; r.oi_person = s.oi_person || ''
    r.oi_deadline = s.oi_deadline || ''; r.oi_followup = s.oi_followup || ''
  } else {
    // 预填 defect description 到 what happened
    r.whatHappened = claim.defectDescription || ''
  }
  return [r]
}

// AI hint content per fishbone category
const FISHBONE_HINTS: Record<string, string[]> = {
  Man: [
    'Operator lacked training or SOP awareness',
    'Fatigue / shift change errors',
    'New hire with insufficient supervision',
    'Communication gap between shifts',
  ],
  Machine: [
    'Equipment not calibrated to spec',
    'Machine maintenance overdue (PM missed)',
    'Worn tooling / needle / blade',
    'Machine settings drifted during production',
  ],
  Material: [
    'Incoming fabric/component not inspected',
    'Incorrect material substituted',
    'Material storage conditions not met (humidity, light)',
    'Supplier quality deviation on this batch',
  ],
  Method: [
    'SOP outdated or not followed',
    'No first-article inspection (FAI) performed',
    'AQL sampling plan inadequate for defect type',
    'Process step sequence incorrect',
  ],
  Measurement: [
    'Inspection tools not calibrated',
    'Measurement criteria ambiguous on spec sheet',
    'Inspector/QC subjectivity on defect acceptance',
    'Gauge R&R not performed for this measurement type',
  ],
  Environment: [
    'Temperature/humidity outside acceptable range',
    'Dust/contamination in sewing or finishing area',
    'Poor lighting in inspection station',
    'Workstation layout causes handling damage',
  ],
}

const TEMPLATES_KEY = 'cms_rca_templates'

interface RcaTemplate {
  name: string
  defectCategory: string
  reason: Partial<RcaReason>
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '6px 8px', borderRadius: 6,
  border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box', minWidth: 0,
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.68rem', fontWeight: 700,
  color: '#64748b', textTransform: 'uppercase', marginBottom: 3,
}

// ── AI Hint Panel ────────────────────────────────────────────────────────────

interface AIHintPanelProps {
  category: string
  boneLabel: string
  boneKey: keyof RcaReason
  hints: string[]
  onApply: (hint: string) => void
  onClose: () => void
}

const AIHintPanel: React.FC<AIHintPanelProps> = ({ boneLabel, hints, onApply, onClose }) => {
  return (
    <div style={{ background: '#fefce8', border: '1.5px solid #fbbf24', borderRadius: 8, padding: '10px 14px', marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <i className="bi bi-lightbulb-fill" style={{ color: '#f59e0b' }}></i>
        <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#92400e' }}>AI Hints — {boneLabel}</span>
        <button onClick={onClose}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#92400e', fontSize: '1rem', lineHeight: 1 }}>×</button>
      </div>
      <div style={{ fontSize: '0.75rem', color: '#78350f', marginBottom: 8 }}>
        Click <strong>Apply →</strong> to copy a suggestion into the {boneLabel} field, or type directly in the text area above.
      </div>
      {hints.map((hint, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '5px 0', borderBottom: '1px solid #fef08a' }}>
          <span style={{ color: '#92400e', fontSize: '0.75rem', minWidth: 18, fontWeight: 700 }}>{i + 1}.</span>
          <span style={{ fontSize: '0.78rem', color: '#1c1917', flex: 1 }}>{hint}</span>
          <button onClick={() => onApply(hint)}
            style={{ padding: '2px 8px', fontSize: '0.7rem', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Apply →
          </button>
        </div>
      ))}
    </div>
  )
}

// ── Main Modal ────────────────────────────────────────────────────────────────

const RCAModal: React.FC<Props> = ({ claim, onClose }) => {
  const [reasons, setReasons] = useState<RcaReason[]>(() => initReasons(claim))
  const [activeIdx, setActiveIdx] = useState(0)
  const [saving, setSaving] = useState(false)

  // Attachments
  const [attachments, setAttachments] = useState(claim.attachments || [])
  const [uploadingFile, setUploadingFile] = useState(false)
  const attachFileRef = useRef<HTMLInputElement>(null)

  // Template management
  const [templates, setTemplates] = useState<RcaTemplate[]>(() => {
    try { return JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '[]') } catch { return [] }
  })
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [showLoadTemplate, setShowLoadTemplate] = useState(false)

  // AI Hint panel state
  const [activeHint, setActiveHint] = useState<{ key: keyof RcaReason; label: string } | null>(null)

  const r = reasons[activeIdx]

  // Calculate progress
  const progress = useMemo(() => {
    const fields = [
      r.whatHappened,
      r.fb_man, r.fb_machine, r.fb_material, r.fb_method, r.fb_measurement, r.fb_environment,
      r.rootCauseCategory, r.rootCauseSummary,
      r.fac_imm_action, r.fac_mid_action, r.fac_long_action,
      r.oi_action
    ]
    const filled = fields.filter(f => f && f.trim()).length
    return { filled, total: fields.length }
  }, [r])

  const update = (field: keyof RcaReason, value: string) => {
    setReasons(prev => prev.map((reason, i) =>
      i === activeIdx ? { ...reason, [field]: value } : reason
    ))
  }

  const updateWhy = (idx: number, value: string) => {
    setReasons(prev => prev.map((reason, i) => {
      if (i !== activeIdx) return reason
      const next = [...(reason.whys || ['', '', '', '', ''])]
      next[idx] = value
      return { ...reason, whys: next }
    }))
  }

  const addReason = () => {
    const newReasons = [...reasons, defaultRcaReason(`Reason ${reasons.length + 1}`)]
    setReasons(newReasons)
    setActiveIdx(newReasons.length - 1)
  }

  const removeReason = (i: number) => {
    if (reasons.length <= 1) return
    const next = reasons.filter((_, idx) => idx !== i)
    setReasons(next)
    setActiveIdx(Math.min(activeIdx, next.length - 1))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const r0 = reasons[0]
      const rcaStructured = {
        whatHappened: r0.whatHappened,
        whys: r0.whys || ['', '', '', '', ''],
        rootCauseCategory: r0.rootCauseCategory,
        rootCauseSummary: r0.rootCauseSummary,
        fb_man: r0.fb_man, fb_machine: r0.fb_machine,
        fb_material: r0.fb_material, fb_method: r0.fb_method,
        fb_measurement: r0.fb_measurement, fb_environment: r0.fb_environment,
        fac_imm_action: r0.fac_imm_action, fac_imm_person: r0.fac_imm_person,
        fac_imm_deadline: r0.fac_imm_deadline, fac_imm_followup: r0.fac_imm_followup,
        fac_mid_action: r0.fac_mid_action, fac_mid_person: r0.fac_mid_person,
        fac_mid_deadline: r0.fac_mid_deadline, fac_mid_followup: r0.fac_mid_followup,
        fac_long_action: r0.fac_long_action, fac_long_person: r0.fac_long_person,
        fac_long_deadline: r0.fac_long_deadline, fac_long_followup: r0.fac_long_followup,
        oi_action: r0.oi_action, oi_person: r0.oi_person,
        oi_deadline: r0.oi_deadline, oi_followup: r0.oi_followup,
        correctiveAction: r0.fac_imm_action,
        preventiveAction: r0.fac_long_action,
        targetDate: r0.fac_imm_deadline,
      }
      await saveRCA(claim.id, '', rcaStructured, reasons)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleSaveTemplate = () => {
    if (!templateName.trim()) return
    const template: RcaTemplate = {
      name: templateName.trim(),
      defectCategory: claim.defectCategory || '',
      reason: { ...r },
    }
    const next = [...templates, template]
    setTemplates(next)
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(next))
    setTemplateName('')
    setShowTemplateModal(false)
  }

  const handleLoadTemplate = (t: RcaTemplate) => {
    setReasons(prev => prev.map((reason, i) =>
      i === activeIdx ? { ...reason, ...t.reason } : reason
    ))
    setShowLoadTemplate(false)
  }

  const deleteTemplate = (i: number) => {
    const next = templates.filter((_, idx) => idx !== i)
    setTemplates(next)
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(next))
  }

  const handleAttachFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFile(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      await addAttachment(claim.id, formData)
      setAttachments(prev => [...prev, {
        id: Date.now(), fileName: file.name,
        contentType: file.type, fileSize: file.size,
        uploadedBy: '', uploadedAt: new Date().toISOString(),
      } as any])
    } finally {
      setUploadingFile(false)
      if (attachFileRef.current) attachFileRef.current.value = ''
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1048576).toFixed(1) + ' MB'
  }

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return
    try {
      await deleteAttachment(claim.id, attachmentId)
      setAttachments(prev => prev.filter(att => att.id !== attachmentId))
    } catch (err) {
      alert('Failed to delete attachment')
    }
  }

  const sectionHeader = (title: string, color: string, icon: string) => (
    <div style={{ background: color, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
      <i className={`bi ${icon}`} style={{ color: '#fff', fontSize: '0.85rem' }}></i>
      <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '.03em' }}>{title}</span>
    </div>
  )

  const BONES: { key: keyof RcaReason; label: string; border: string; bg: string; color: string; icon: string }[] = [
    { key: 'fb_man', label: 'Man', border: '#bfdbfe', bg: '#dbeafe', color: '#1e40af', icon: 'bi-person-fill' },
    { key: 'fb_machine', label: 'Machine', border: '#e9d5ff', bg: '#f3e8ff', color: '#6d28d9', icon: 'bi-gear-fill' },
    { key: 'fb_material', label: 'Material', border: '#fed7aa', bg: '#ffedd5', color: '#c2410c', icon: 'bi-box-seam-fill' },
    { key: 'fb_method', label: 'Method', border: '#fca5a5', bg: '#fee2e2', color: '#b91c1c', icon: 'bi-diagram-2-fill' },
    { key: 'fb_measurement', label: 'Measurement', border: '#a5f3fc', bg: '#cffafe', color: '#0e7490', icon: 'bi-rulers' },
    { key: 'fb_environment', label: 'Environment', border: '#bbf7d0', bg: '#dcfce7', color: '#15803d', icon: 'bi-cloud-sun-fill' },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', flexDirection: 'column', background: '#f1f5f9' }}>
      {/* Header - V8 Style */}
      <div style={{ background: 'linear-gradient(135deg,#1a3a5c,#2c5f8a)', color: '#fff',
        padding: '11px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <i className="bi bi-pencil-square" style={{ fontSize: '1rem', opacity: 0.85 }}></i>
        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Edit RCA Report</span>
        
        {/* Context Chips - V8 Style */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, marginLeft: 8, flexWrap: 'wrap' }}>
          {/* Claim No */}
          <span style={{ 
            background: 'rgba(255,255,255,0.15)', 
            color: '#e0f2fe', 
            fontSize: '0.7rem', 
            fontWeight: 600, 
            padding: '2px 8px', 
            borderRadius: 10,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px'
          }}>
            <i className="bi bi-hash" style={{ color: '#93c5fd' }}></i>
            {claim.claimNo}
          </span>
          
          {/* Vendor */}
          {claim.vendor && (
            <span style={{ 
              background: 'rgba(255,255,255,0.15)', 
              color: '#e0f2fe', 
              fontSize: '0.7rem', 
              fontWeight: 600, 
              padding: '2px 8px', 
              borderRadius: 10,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px'
            }}>
              <i className="bi bi-building" style={{ color: '#bfdbfe' }}></i>
              {claim.vendor}
            </span>
          )}
          
          {/* Defect Category */}
          {claim.defectCategory && (
            <span style={{ 
              background: 'rgba(255,255,255,0.15)', 
              color: '#e0f2fe', 
              fontSize: '0.7rem', 
              fontWeight: 600, 
              padding: '2px 8px', 
              borderRadius: 10,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px'
            }}>
              <i className="bi bi-tag" style={{ color: '#fcd34d' }}></i>
              {claim.defectCategory}
            </span>
          )}
          
          {/* RCA Status */}
          {claim.rcaStatus && (
            <span style={{ 
              background: 'rgba(255,255,255,0.15)', 
              color: '#e0f2fe', 
              fontSize: '0.7rem', 
              fontWeight: 600, 
              padding: '2px 8px', 
              borderRadius: 10,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px'
            }}>
              <i className="bi bi-circle-fill" style={{ 
                color: claim.rcaStatus === 'approved' ? '#4ade80' : 
                       claim.rcaStatus === 'rejected' ? '#f87171' : '#fbbf24',
                fontSize: '0.5rem'
              }}></i>
              {claim.rcaStatus}
            </span>
          )}
        </div>
        
        {/* Progress inline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 12 }}>
          <span style={{ color: '#bfdbfe', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{progress.filled} / {progress.total}</span>
          <div style={{ width: 100, height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(progress.filled / progress.total) * 100}%`, background: '#22c55e', transition: 'width .25s', borderRadius: 3 }}></div>
          </div>
        </div>
        
        <button onClick={onClose} style={{ marginLeft: 4, background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer', opacity: 0.7, lineHeight: 1, padding: 0 }}>
          <i className="bi bi-x-lg"></i>
        </button>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* LEFT: Reason tabs + What happened */}
        <div style={{ width: 280, minWidth: 240, flexShrink: 0, background: '#f0f7ff',
          borderRight: '1.5px solid #bfdbfe', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ background: '#1d4ed8', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <i className="bi bi-list-ol" style={{ color: '#fff', fontSize: '0.85rem' }}></i>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '.03em' }}>CLAIM REASONS</span>
          </div>
          <div style={{ overflowY: 'auto', flex: 1, padding: '10px 12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
              {reasons.map((reason, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button onClick={() => setActiveIdx(i)} style={{
                    flex: 1, textAlign: 'left', padding: '6px 12px', borderRadius: 7,
                    border: `1px solid ${i === activeIdx ? '#1d4ed8' : '#bfdbfe'}`,
                    background: i === activeIdx ? '#1d4ed8' : '#fff',
                    color: i === activeIdx ? '#fff' : '#1e40af',
                    fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}>
                    {reason.label}
                  </button>
                  {reasons.length > 1 && (
                    <button onClick={() => removeReason(i)} title="Remove reason"
                      style={{ background: 'none', border: 'none', cursor: 'pointer',
                        color: '#ef4444', fontSize: '0.85rem', padding: '2px 4px' }}>
                      <i className="bi bi-x-lg"></i>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={addReason} style={{ display: 'block', width: '100%', textAlign: 'center',
              padding: '6px 12px', borderRadius: 7, marginBottom: 10,
              border: '1.5px dashed #93c5fd', background: 'transparent',
              color: '#3b82f6', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}>
              <i className="bi bi-plus-lg me-1"></i>Add Reason
            </button>
            
            <div id="reasonFormArea" style={{ background: '#fff', borderRadius: 10, padding: 14, border: '1px solid #bfdbfe' }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ ...labelStyle, fontSize: '0.65rem', color: '#64748b', marginBottom: 4 }}>TAB NAME</label>
                <input 
                  type="text" 
                  value={r.label} 
                  onChange={e => update('label', e.target.value)}
                  style={{ ...inputStyle, fontSize: '0.85rem', padding: '8px 10px' }}
                  placeholder="Reason 2"
                />
              </div>
              <div style={{ marginBottom: 4 }}>
                <label style={{ ...labelStyle, fontSize: '0.65rem', color: '#64748b', marginBottom: 4 }}>WHAT HAPPENED?</label>
                <textarea 
                  value={r.whatHappened} 
                  onChange={e => update('whatHappened', e.target.value)} 
                  rows={5}
                  style={{ ...inputStyle, resize: 'vertical', fontSize: '0.85rem', padding: '10px', minHeight: 100 }}
                  placeholder="Describe this specific defect in detail." 
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: grid layout */}
        <div style={{ flex: 1, minWidth: 0, minHeight: 0, overflowY: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Fishbone - V8 Style */}
          <div style={{ border: '1.5px solid #1a3a5c', borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
            <div style={{ background: 'linear-gradient(135deg,#1a3a5c,#2c5f8a)', padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="bi bi-diagram-3" style={{ color: '#fff', fontSize: '0.85rem' }}></i>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '.03em' }}>FISHBONE ANALYSIS</span>
              <span style={{ color: '#bfdbfe', fontSize: '0.7rem', marginLeft: 'auto' }}>
                <i className="bi bi-lightbulb me-1"></i>click bulb for AI hints
              </span>
            </div>
            <div style={{ padding: '10px 12px', background: '#f8fafc' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 8 }}>
                {BONES.map(bone => (
                  <div key={bone.key as string} style={{ border: `1px solid ${bone.border}`, borderRadius: 7, overflow: 'hidden' }}>
                    <div style={{ background: bone.bg, padding: '5px 9px', fontSize: '0.72rem', fontWeight: 700, color: bone.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <i className={`bi ${bone.icon}`}></i>
                      <span style={{ flex: 1 }}>{bone.label}</span>
                      <button 
                        onClick={() => setActiveHint(activeHint?.key === bone.key ? null : { key: bone.key, label: bone.label })}
                        title="AI hints"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '1px 4px', fontSize: '0.85rem', color: activeHint?.key === bone.key ? '#fbbf24' : bone.color, lineHeight: 1 }}>
                        <i className={`bi ${activeHint?.key === bone.key ? 'bi-lightbulb-fill' : 'bi-lightbulb'}`}></i>
                      </button>
                    </div>
                    <textarea value={r[bone.key] as string} onChange={e => update(bone.key, e.target.value)} rows={4}
                      style={{ width: '100%', border: 'none', borderRadius: 0, padding: '6px 8px', fontSize: '0.78rem', resize: 'vertical', boxSizing: 'border-box' }}
                      placeholder={`${bone.label} factors…`} />
                  </div>
                ))}
              </div>
              
              {/* AI Hint Panel */}
              {activeHint && (
                <AIHintPanel
                  category={activeHint.label}
                  boneLabel={activeHint.label}
                  boneKey={activeHint.key}
                  hints={FISHBONE_HINTS[activeHint.label] || []}
                  onApply={(hint) => {
                    const current = (r[activeHint.key] as string) || ''
                    update(activeHint.key, current ? `${current}\n${hint}` : hint)
                  }}
                  onClose={() => setActiveHint(null)}
                />
              )}
            </div>
          </div>

          {/* Root Cause */}
          <div style={{ border: '1.5px solid #0891b2', borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
            {sectionHeader('ROOT CAUSE SUMMARY', 'linear-gradient(135deg,#0e7490,#0891b2)', 'bi-bullseye')}
            <div style={{ padding: '10px 14px', background: '#ecfeff', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ minWidth: 180, flex: '0 0 auto' }}>
                <label style={labelStyle}>Category</label>
                <select value={r.rootCauseCategory} onChange={e => update('rootCauseCategory', e.target.value)} style={{ ...inputStyle, fontSize: '0.78rem' }}>
                  <option value="">— Select —</option>
                  {RCA_ROOT_CAUSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <label style={labelStyle}>Root Cause Statement</label>
                <textarea value={r.rootCauseSummary} onChange={e => update('rootCauseSummary', e.target.value)}
                  rows={2} style={{ ...inputStyle, resize: 'vertical', width: '100%' }}
                  placeholder="e.g. Root cause is inadequate operator training on jig alignment, compounded by absence of a formal SOP." />
              </div>
            </div>
          </div>

          {/* Factory Corrective Actions */}
          <div style={{ border: '1.5px solid #3b82f6', borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
            {sectionHeader('FACTORY CORRECTIVE ACTIONS', 'linear-gradient(135deg,#1e40af,#3b82f6)', 'bi-building')}
            <div style={{ padding: '8px 12px', background: '#eff6ff' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                {/* IMM */}
                <div style={{ border: '1px solid #bfdbfe', borderRadius: 7, overflow: 'hidden' }}>
                  <div style={{ background: '#dbeafe', padding: '4px 9px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.62rem', fontWeight: 700, padding: '2px 7px', borderRadius: 4 }}>IMM.</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#1e40af' }}>Immediate</span>
                  </div>
                  <div style={{ padding: '7px 8px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <textarea value={r.fac_imm_action} onChange={e => update('fac_imm_action', e.target.value)}
                      rows={2} style={{ ...inputStyle, resize: 'none', fontSize: '0.78rem' }} placeholder="Action…" />
                    <input type="text" value={r.fac_imm_person} onChange={e => update('fac_imm_person', e.target.value)}
                      style={{ ...inputStyle, fontSize: '0.78rem' }} placeholder="Responsible" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                      <div>
                        <div style={{ fontSize: '0.62rem', color: '#64748b', marginBottom: 2 }}>Deadline</div>
                        <input type="date" value={r.fac_imm_deadline} onChange={e => update('fac_imm_deadline', e.target.value)}
                          style={{ ...inputStyle, fontSize: '0.72rem', minWidth: 0 }} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.62rem', color: '#64748b', marginBottom: 2 }}>Follow-up</div>
                        <input type="date" value={r.fac_imm_followup} onChange={e => update('fac_imm_followup', e.target.value)}
                          style={{ ...inputStyle, fontSize: '0.72rem', minWidth: 0 }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* MID */}
                <div style={{ border: '1px solid #fde68a', borderRadius: 7, overflow: 'hidden' }}>
                  <div style={{ background: '#fef3c7', padding: '4px 9px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ background: '#f59e0b', color: '#fff', fontSize: '0.62rem', fontWeight: 700, padding: '2px 7px', borderRadius: 4 }}>MID</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#92400e' }}>Mid-term</span>
                  </div>
                  <div style={{ padding: '7px 8px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <textarea value={r.fac_mid_action} onChange={e => update('fac_mid_action', e.target.value)}
                      rows={2} style={{ ...inputStyle, resize: 'none', fontSize: '0.78rem' }} placeholder="Action…" />
                    <input type="text" value={r.fac_mid_person} onChange={e => update('fac_mid_person', e.target.value)}
                      style={{ ...inputStyle, fontSize: '0.78rem' }} placeholder="Responsible" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                      <div>
                        <div style={{ fontSize: '0.62rem', color: '#64748b', marginBottom: 2 }}>Deadline</div>
                        <input type="date" value={r.fac_mid_deadline} onChange={e => update('fac_mid_deadline', e.target.value)}
                          style={{ ...inputStyle, fontSize: '0.72rem', minWidth: 0 }} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.62rem', color: '#64748b', marginBottom: 2 }}>Follow-up</div>
                        <input type="date" value={r.fac_mid_followup} onChange={e => update('fac_mid_followup', e.target.value)}
                          style={{ ...inputStyle, fontSize: '0.72rem', minWidth: 0 }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* LONG */}
                <div style={{ border: '1px solid #bbf7d0', borderRadius: 7, overflow: 'hidden' }}>
                  <div style={{ background: '#dcfce7', padding: '4px 9px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ background: '#22c55e', color: '#fff', fontSize: '0.62rem', fontWeight: 700, padding: '2px 7px', borderRadius: 4 }}>LONG</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#15803d' }}>Long-term</span>
                  </div>
                  <div style={{ padding: '7px 8px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <textarea value={r.fac_long_action} onChange={e => update('fac_long_action', e.target.value)}
                      rows={2} style={{ ...inputStyle, resize: 'none', fontSize: '0.78rem' }} placeholder="Action…" />
                    <input type="text" value={r.fac_long_person} onChange={e => update('fac_long_person', e.target.value)}
                      style={{ ...inputStyle, fontSize: '0.78rem' }} placeholder="Responsible" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                      <div>
                        <div style={{ fontSize: '0.62rem', color: '#64748b', marginBottom: 2 }}>Deadline</div>
                        <input type="date" value={r.fac_long_deadline} onChange={e => update('fac_long_deadline', e.target.value)}
                          style={{ ...inputStyle, fontSize: '0.72rem', minWidth: 0 }} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.62rem', color: '#64748b', marginBottom: 2 }}>Follow-up</div>
                        <input type="date" value={r.fac_long_followup} onChange={e => update('fac_long_followup', e.target.value)}
                          style={{ ...inputStyle, fontSize: '0.72rem', minWidth: 0 }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* OI Action */}
          <div style={{ border: '1.5px solid #8b5cf6', borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
            {sectionHeader('OI ACTION', 'linear-gradient(135deg,#5b21b6,#8b5cf6)', 'bi-briefcase')}
            <div style={{ padding: '10px 12px', background: '#f5f3ff' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 8, alignItems: 'start' }}>
                <div>
                  <label style={labelStyle}>Action</label>
                  <textarea value={r.oi_action} onChange={e => update('oi_action', e.target.value)}
                    rows={2} style={{ ...inputStyle, resize: 'none', minWidth: 0, fontSize: '0.78rem' }} placeholder="e.g. Notify customer, update AQL checklist, schedule vendor audit." />
                </div>
                <div>
                  <label style={labelStyle}>Responsible</label>
                  <input type="text" value={r.oi_person} onChange={e => update('oi_person', e.target.value)}
                    style={{ ...inputStyle, minWidth: 0, fontSize: '0.78rem' }} placeholder="Name / role" />
                </div>
                <div>
                  <label style={labelStyle}>Deadline</label>
                  <input type="date" value={r.oi_deadline} onChange={e => update('oi_deadline', e.target.value)}
                    style={{ ...inputStyle, minWidth: 0, fontSize: '0.75rem' }} />
                </div>
                <div>
                  <label style={labelStyle}>Follow-up</label>
                  <input type="date" value={r.oi_followup} onChange={e => update('oi_followup', e.target.value)}
                    style={{ ...inputStyle, minWidth: 0, fontSize: '0.75rem' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Attachments */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 8, flexShrink: 0 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Attachments</div>
            <input type="file" ref={attachFileRef} onChange={handleAttachFile} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              style={{ fontSize: '0.78rem' }} />
            {uploadingFile && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>Uploading…</div>}
            <div style={{ marginTop: 8 }}>
              {attachments.map(att => (
                <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#f8fafc', borderRadius: 6, marginBottom: 4, fontSize: '0.78rem' }}>
                  <i className="bi bi-paperclip"></i>
                  <span style={{ flex: 1 }}>{att.fileName}</span>
                  <span style={{ color: '#94a3b8' }}>{formatFileSize(att.fileSize)}</span>
                  <a href={`/api/claims/${claim.id}/attachments/${att.id}`} target="_blank" rel="noreferrer"
                    style={{ color: '#3b82f6', textDecoration: 'none' }}>
                    <i className="bi bi-download"></i>
                  </a>
                  <button
                    onClick={() => handleDeleteAttachment(att.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      padding: '2px 6px',
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Delete attachment"
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8, justifyContent: 'flex-end', flexShrink: 0, background: '#fff' }}>
        <button onClick={onClose} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #6c757d', background: '#6c757d', color: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}>
          Cancel
        </button>
        <button onClick={() => setShowTemplateModal(true)} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #0d6efd', background: '#fff', color: '#0d6efd', cursor: 'pointer', fontSize: '0.8rem', display: 'none' }}>
          <i className="bi bi-bookmark-plus me-1"></i>Save as Template
        </button>
        <button onClick={handleSave} disabled={saving} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#0d6efd', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
          <i className="bi bi-check-lg me-1"></i>{saving ? 'Saving…' : 'Save RCA Report'}
        </button>
      </div>

      {/* Save as Template modal */}
      {showTemplateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: 400,
            boxShadow: '0 20px 50px rgba(0,0,0,.25)' }}>
            <h3 style={{ color: '#1a3a5c', margin: '0 0 14px', fontWeight: 700 }}>Save as Template</h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 12px' }}>
              Save the current reason's fishbone, root cause, and corrective actions as a reusable template.
            </p>
            <input value={templateName} onChange={e => setTemplateName(e.target.value)}
              placeholder="Template name (e.g. 'Workmanship — Stitching')"
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box', marginBottom: 14 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleSaveTemplate} disabled={!templateName.trim()} style={{
                flex: 1, padding: '9px 0', background: '#1a3a5c', color: '#fff',
                border: 'none', borderRadius: 8, cursor: templateName.trim() ? 'pointer' : 'not-allowed',
                fontWeight: 600, opacity: templateName.trim() ? 1 : 0.5 }}>Save</button>
              <button onClick={() => setShowTemplateModal(false)} style={{
                flex: 1, padding: '9px 0', background: '#fff', color: '#64748b',
                border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Load template modal */}
      {showLoadTemplate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: 460,
            boxShadow: '0 20px 50px rgba(0,0,0,.25)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ color: '#1a3a5c', margin: '0 0 14px', fontWeight: 700 }}>Load Template</h3>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {templates.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: 24 }}>
                  No templates saved yet. Use "Save as Template" to create one.
                </div>
              ) : templates.map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 8,
                  background: '#f8fafc', cursor: 'pointer' }}>
                  <div style={{ flex: 1 }} onClick={() => handleLoadTemplate(t)}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</div>
                    {t.defectCategory && <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{t.defectCategory}</div>}
                  </div>
                  <button onClick={() => deleteTemplate(i)} style={{ background: 'none', border: 'none',
                    color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', padding: '2px 6px' }}>
                    <i className="bi bi-trash"></i>
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => setShowLoadTemplate(false)} style={{ marginTop: 14, padding: '8px 0',
              borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', color: '#64748b' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default RCAModal
