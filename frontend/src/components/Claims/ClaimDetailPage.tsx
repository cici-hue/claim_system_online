import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../../hooks/useToast'
import {
  getClaimById, submitRCA, approveRCA, rejectRCA, scoreRCA, deleteClaim,
  addNote, uploadAttachment, deleteAttachment, getSimilarClaims, notifySimilarClaims, sendClaimEmail
} from '../../services/claimService'
import { getUsers, User } from '../../services/userService'
import { Claim, STATUS_COLORS, RCA_STATUS_COLORS } from '../../types/claim'
import { useAuth } from '../../hooks/useAuth'
import ConfirmDialog from '../common/ConfirmDialog'
import RCAModal from '../RCA/RCAModal'
import PDFPreviewModal from '../Common/PDFPreviewModal'

const ClaimDetailPage: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { 
    canManageClaims, canApproveRCASupervisor, canApproveRCAFinal, canScoreRCA,
    isSupervisor, isAdmin, isManager, user 
  } = useAuth()
  const { showToast } = useToast()
  const [claim, setClaim] = useState<Claim | null>(null)
  const [showRCAModal, setShowRCAModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [showRejectConfirm, setShowRejectConfirm] = useState(false)
  const [showPDFPreview, setShowPDFPreview] = useState(false)

  // Notes
  const [noteText, setNoteText] = useState('')
  const [addingNote, setAddingNote] = useState(false)

  // Attachments
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingFile, setUploadingFile] = useState(false)

  // RCA Score
  const [showScoreForm, setShowScoreForm] = useState(false)
  const [scoreCompleteness, setScoreCompleteness] = useState(0)
  const [scoreAccuracy, setScoreAccuracy] = useState(0)
  const [scoreActionQuality, setScoreActionQuality] = useState(0)
  const [scoringRCA, setScoringRCA] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 991)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 991)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  const [aiScoring, setAiScoring] = useState(false)
  const [aiRationale, setAiRationale] = useState<{completeness?: string, accuracy?: string, actionQuality?: string, source?: string} | null>(null)

  // Similar claims alert
  const [similarClaims, setSimilarClaims] = useState<any[]>([])
  const [showSimilarModal, setShowSimilarModal] = useState(false)
  const [sendingSimilar, setSendingSimilar] = useState(false)
  const [loadingSimilar, setLoadingSimilar] = useState(false)
  const [similarAlertSentAt, setSimilarAlertSentAt] = useState<string | null>(null)

  // Email preview modal (for claim notification)
  const [showClaimEmailPreview, setShowClaimEmailPreview] = useState(false)
  const [claimEmailTo, setClaimEmailTo] = useState('')
  const [claimEmailCc, setClaimEmailCc] = useState('')
  const [claimEmailSubject, setClaimEmailSubject] = useState('')
  const [claimEmailBody, setClaimEmailBody] = useState('')
  const [sendingClaimEmail, setSendingClaimEmail] = useState(false)

  // Risk Alert email modal
  const [showRiskAlertModal, setShowRiskAlertModal] = useState(false)
  const [riskAlertTo, setRiskAlertTo] = useState('')
  const [riskAlertCc, setRiskAlertCc] = useState('')
  const [riskAlertSubject, setRiskAlertSubject] = useState('')
  const [riskAlertBody, setRiskAlertBody] = useState('')
  const [sendingRiskAlert, setSendingRiskAlert] = useState(false)

  // Users list for email recipients
  const [users, setUsers] = useState<User[]>([])

  const load = () => getClaimById(Number(id)).then(setClaim)
  const loadUsers = () => getUsers().then(setUsers)

  useEffect(() => { load(); loadUsers() }, [id])

  if (!claim) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading...</div>

  const handleDelete = async () => {
    if (!window.confirm('Delete this claim? This cannot be undone.')) return
    await deleteClaim(claim.id)
    navigate('/claims')
  }

  // Generate Risk Alert email preview - Exact V8 Style
  const generateRiskAlertEmail = (claim: Claim) => {
    // Get claim factory agent
    const claimAgent = claim.factoryAgent

    // TO: all inspectors of the same factory agent
    const inspectors = users.filter((u: User) =>
      u.role === 'INSPECTOR' && (claimAgent ? u.factoryAgent === claimAgent : true) && u.email
    )
    const toEmails = inspectors.map((u: User) => u.email).filter(Boolean).join(', ')

    // CC: supervisors, admins, superadmins of the same factory agent
    const ccUsersList = users.filter((u: User) =>
      (u.role === 'SUPERVISOR' || u.role === 'ADMIN' || u.role === 'SUPERADMIN') &&
      (claimAgent ? u.factoryAgent === claimAgent : true) && u.email
    )
    const ccEmails = ccUsersList.map((u: User) => u.email).filter(Boolean).join(', ')

    if (!toEmails) {
      showToast('No inspector emails found for this factory agent.')
      return
    }

    // V8 Style Subject
    const subject = `⚠ Risk — Repeat Order Alert | ${claim.vendor} | Style: ${claim.styleNo || '—'} | PO: ${claim.repeatOrderNo || '—'}`

    // V8 Style Email Body
    const deliveryDate = claim.repeatOrderDeliveryDate
      ? `<span style="font-weight:700;color:#b45309;">${claim.repeatOrderDeliveryDate}</span>`
      : '<span style="color:#94a3b8;">—</span>'

    const bodyHtml = `
    <div style="font-family:'Segoe UI',system-ui,Roboto,sans-serif;color:#0f172a;max-width:620px;margin:0 auto;background:#f0f4f8;padding:20px 14px;">
        <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(15,23,42,0.10);">

            <!-- Header -->
            <div style="background:linear-gradient(135deg,#d97706,#f59e0b);padding:20px 24px;">
                <div style="font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.75);margin-bottom:5px;">Otto International · Risk Alert</div>
                <div style="color:#fff;font-size:18px;font-weight:700;line-height:1.3;">⚠ Repeat Order Risk Notice</div>
                <div style="color:rgba(255,255,255,0.85);font-size:12px;margin-top:4px;">${claim.vendor || ''} &nbsp;·&nbsp; ${claim.customer || ''} &nbsp;·&nbsp; ${new Date().toLocaleDateString()}</div>
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

            <!-- Footer -->
            <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:12px 24px;text-align:center;">
                <div style="font-size:11px;color:#94a3b8;">Automated risk alert from <strong style="color:#64748b;">Otto International QC Claim System</strong></div>
            </div>
        </div>
    </div>`

    setRiskAlertTo(toEmails)
    setRiskAlertCc(ccEmails)
    setRiskAlertSubject(subject)
    setRiskAlertBody(bodyHtml)
    setShowRiskAlertModal(true)
  }

  // Send Risk Alert email
  const sendRiskAlertEmail = async () => {
    setSendingRiskAlert(true)
    try {
      await sendClaimEmail({
        claimId: claim!.id,
        to: riskAlertTo,
        cc: riskAlertCc,
        subject: riskAlertSubject,
        body: riskAlertBody
      })
      // Mark as sent
      const now = new Date().toISOString()
      ;(claim as any).riskAlertSentAt = now
      ;(claim as any).riskAlertSentBy = user?.name || user?.username || 'System'
      setShowRiskAlertModal(false)
      showToast('Risk Alert email sent successfully!')
    } catch (err) {
      showToast('Failed to send email.')
    } finally {
      setSendingRiskAlert(false)
    }
  }

  const handleSubmitRCA = () => submitRCA(claim.id).then(load)
  const handleResetToDraft = async () => {
    const { resetRCAToDraft } = await import('../../services/claimService')
    await resetRCAToDraft(claim.id)
    load()
  }
  const handleApprove = (isFinal: boolean) => approveRCA(claim.id, '', isFinal).then(load)
  const handleReject = async () => {
    if (!rejectReason.trim()) {
      showToast('Please enter a rejection reason', 'error')
      return
    }
    setShowRejectConfirm(true)
  }
  const confirmReject = async () => {
    await rejectRCA(claim.id, rejectReason)
    setShowRejectInput(false)
    setShowRejectConfirm(false)
    setRejectReason('')
    showToast('RCA rejected successfully', 'success')
    load()
  }

  const handleAddNote = async () => {
    if (!noteText.trim()) return
    setAddingNote(true)
    try {
      await addNote(claim.id, noteText.trim())
      setNoteText('')
      await load()
    } finally {
      setAddingNote(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFile(true)
    try {
      await uploadAttachment(claim.id, file)
      await load()
    } finally {
      setUploadingFile(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleScoreRCA = async () => {
    setScoringRCA(true)
    try {
      await scoreRCA(claim.id, scoreCompleteness, scoreAccuracy, scoreActionQuality)
      setShowScoreForm(false)
      setAiRationale(null)
      await load()
    } finally {
      setScoringRCA(false)
    }
  }

  // ── AI RCA Scoring ──────────────────────────────────────────────
  // To enable real AI scoring later, set your API key here:
  const RCA_AI_API_KEY = '' // ← paste your Claude or OpenAI key here when ready
  const RCA_AI_PROVIDER = 'claude' // 'claude' or 'openai'

  const handleAIScore = async () => {
    setAiScoring(true)
    try {
      let result
      if (RCA_AI_API_KEY) {
        result = await callAIForRCAScore(claim)
      } else {
        // No API key — use rule-based engine
        result = ruleBasedRCAScore(claim)
      }
      applyAIScores(result)
    } catch (err: any) {
      showToast('AI scoring failed: ' + err.message)
    } finally {
      setAiScoring(false)
    }
  }

  // ── Rule-based scoring engine ────────────────────────────────────
  function ruleBasedRCAScore(claim: Claim) {
    const s = claim.rcaStructured || {}
    const rationale: any = {}

    // ── 1. Completeness (are all key fields filled?) ──
    const fields = [
      { key: 'whatHappened', label: 'What Happened', val: s.whatHappened },
      { key: 'rootCauseCategory', label: 'Root Cause Category', val: s.rootCauseCategory },
      { key: 'correctiveAction', label: 'Corrective Action', val: s.correctiveAction },
      { key: 'preventiveAction', label: 'Preventive Action', val: s.preventiveAction },
      { key: 'targetDate', label: 'Target Date', val: s.targetDate },
    ]
    const filledWhys = (s.whys || []).filter((w: string) => w && w.trim().length > 0).length
    const filledFields = fields.filter((f: any) => f.val && f.val.toString().trim().length > 0).length
    const missingFields = fields.filter((f: any) => !f.val || !f.val.toString().trim()).map((f: any) => f.label)
    // Score: 5 fields + 5 whys = 10 points total
    const completenessScore = Math.round(1 + ((filledFields / fields.length) * 2) + ((filledWhys / 5) * 2))
    const clampedCompleteness = Math.min(5, Math.max(1, completenessScore))
    rationale.completeness = missingFields.length === 0
      ? `All required fields are filled including ${filledWhys}/5 why-analysis entries.`
      : `Missing: ${missingFields.join(', ')}. ${filledWhys}/5 why-analysis entries filled.`

    // ── 2. Root Cause Accuracy (does category match description?) ──
    const defect = (claim.defectDescription || '').toLowerCase()
    const whatHappened = (s.whatHappened || '').toLowerCase()
    const category = (s.rootCauseCategory || '').toLowerCase()
    const combined = defect + ' ' + whatHappened
    const categoryKeywords: Record<string, string[]> = {
      material: ['material', 'fabric', 'thread', 'yarn', 'raw material', 'textile'],
      workmanship: ['sewing', 'stitch', 'seam', 'workmanship', 'assembly', 'construction', 'cutting'],
      measurement: ['measurement', 'size', 'dimension', 'spec', 'tolerance', 'fitting'],
      design: ['design', 'pattern', 'style', 'artwork', 'print', 'colour', 'color'],
      process: ['process', 'procedure', 'method', 'production', 'line'],
      supplier: ['supplier', 'vendor', 'factory', 'sourcing'],
      inspection: ['inspection', 'qc', 'quality control', 'check', 'audit'],
      packaging: ['packaging', 'packing', 'carton', 'label', 'tag'],
    }
    let categoryMatch = false
    let matchedKeywords: string[] = []
    if (category) {
      for (const [cat, keywords] of Object.entries(categoryKeywords)) {
        if (category.includes(cat)) {
          matchedKeywords = keywords.filter((k: string) => combined.includes(k))
          categoryMatch = matchedKeywords.length > 0
          break
        }
      }
    }
    const whyDepth = filledWhys
    let accuracyScore: number
    if (!category) {
      accuracyScore = 1
      rationale.accuracy = 'No root cause category selected.'
    } else if (categoryMatch) {
      accuracyScore = Math.min(5, 3 + Math.floor(whyDepth / 2))
      rationale.accuracy = `Category "${s.rootCauseCategory}" aligns with defect description (matched: ${matchedKeywords.slice(0, 3).join(', ')}). ${whyDepth} why-levels support the analysis.`
    } else {
      accuracyScore = Math.max(2, Math.floor(whyDepth / 2))
      rationale.accuracy = `Category "${s.rootCauseCategory}" could not be confirmed from the defect description. ${whyDepth} why-levels provided.`
    }

    // ── 3. Corrective Action Quality (specific, measurable, has owner/date?) ──
    const ca = (s.correctiveAction || '').trim()
    const pa = (s.preventiveAction || '').trim()
    const caActions = claim.correctiveActions || []
    let actionScore = 1
    const actionNotes: string[] = []
    if (!ca && !pa && caActions.length === 0) {
      actionNotes.push('No corrective or preventive actions defined.')
    } else {
      // Reward length (detail) of corrective action text
      const totalLength = ca.length + pa.length
      if (totalLength > 200) { actionScore += 2; actionNotes.push('Detailed corrective and preventive actions provided.') }
      else if (totalLength > 80) { actionScore += 1; actionNotes.push('Corrective/preventive actions present but could be more detailed.') }
      else { actionNotes.push('Actions are brief — consider adding more specifics.') }
      // Reward structured corrective actions with owner/due date
      const withOwner = caActions.filter((a: any) => a.owner && a.owner.trim()).length
      const withDueDate = caActions.filter((a: any) => a.dueDate).length
      if (caActions.length > 0) {
        actionScore += 1
        actionNotes.push(`${caActions.length} structured action(s): ${withOwner} with owner, ${withDueDate} with due date.`)
      }
      // Reward target date
      if (s.targetDate) { actionScore = Math.min(5, actionScore + 1); actionNotes.push('Target completion date set.') }
      actionScore = Math.min(5, Math.max(1, actionScore))
    }
    rationale.actionQuality = actionNotes.join(' ')

    return {
      completeness: clampedCompleteness,
      accuracy: Math.min(5, Math.max(1, accuracyScore)),
      actionQuality: Math.min(5, Math.max(1, actionScore)),
      rationale,
      source: 'rule-based',
    }
  }

  // ── AI API call ─────────────────────────────────────────────────
  async function callAIForRCAScore(claim: Claim) {
    const s = claim.rcaStructured || {}
    const prompt = `You are a quality management expert scoring an RCA (Root Cause Analysis) report for a garment/textile defect claim.

Claim: ${claim.claimNo}
Defect: ${claim.defectDescription || 'N/A'}
What Happened: ${s.whatHappened || 'N/A'}
5-Why Analysis: ${(s.whys || []).map((w: string, i: number) => w ? `Why ${i + 1}: ${w}` : '').filter(Boolean).join(' | ') || 'N/A'}
Root Cause Category: ${s.rootCauseCategory || 'N/A'}
Corrective Action: ${s.correctiveAction || 'N/A'}
Preventive Action: ${s.preventiveAction || 'N/A'}
Target Date: ${s.targetDate || 'N/A'}

Score each criterion from 1 (poor) to 5 (excellent). Return ONLY valid JSON in this exact format:
{
  "completeness": <1-5>,
  "accuracy": <1-5>,
  "actionQuality": <1-5>,
  "rationale": {
    "completeness": "<one sentence>",
    "accuracy": "<one sentence>",
    "actionQuality": "<one sentence>"
  }
}`

    // ── Claude (Anthropic) ──
    if (RCA_AI_PROVIDER === 'claude') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': RCA_AI_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 400,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      if (!res.ok) throw new Error(`Claude API error ${res.status}`)
      const data = await res.json()
      const text = data.content?.[0]?.text || ''
      const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}')
      return { ...json, source: 'claude' }
    }

    // ── OpenAI ──
    if (RCA_AI_PROVIDER === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RCA_AI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 400,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      if (!res.ok) throw new Error(`OpenAI API error ${res.status}`)
      const data = await res.json()
      const text = data.choices?.[0]?.message?.content || ''
      const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}')
      return { ...json, source: 'openai' }
    }

    throw new Error('Unknown AI provider: ' + RCA_AI_PROVIDER)
  }

  // ── Apply AI scores to UI ───────────────────────────────────────
  function applyAIScores(result: any) {
    const { completeness, accuracy, actionQuality, rationale, source } = result
    setScoreCompleteness(completeness)
    setScoreAccuracy(accuracy)
    setScoreActionQuality(actionQuality)
    const sourceLabel = source === 'claude' ? 'Claude AI' : source === 'openai' ? 'OpenAI' : 'Rule-based analysis'
    setAiRationale({
      ...rationale,
      source: sourceLabel
    })
  }

  const handleCheckSimilar = async () => {
    setLoadingSimilar(true)
    try {
      const results = await getSimilarClaims(claim.id)
      setSimilarClaims(results)

      setShowSimilarModal(true)
    } finally {
      setLoadingSimilar(false)
    }
  }

  const handleSendSimilarAlert = async () => {
    setSendingSimilar(true)
    try {
      // Build To list: Inspectors of same factory agent
      const toInspectors = users
        .filter(u => u.factoryAgent === claim.factoryAgent && u.role === 'INSPECTOR')
        .map(u => u.email)
        .filter(Boolean)

      // Build CC list: Admin/Supervisor/Manager of same factory agent
      const ccManagers = users
        .filter(u =>
          u.factoryAgent === claim.factoryAgent &&
          (u.role === 'ADMIN' || u.role === 'SUPERVISOR' || u.role === 'MANAGER')
        )
        .map(u => u.email)
        .filter(Boolean)

      const subject = `[CMS Alert] Repeat Defect — ${claim.vendor} / ${claim.defectCategory || 'Quality Issue'}`
      const rows = similarClaims.map(c =>
        `<tr><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0">${c.claimNo}</td>` +
        `<td style="padding:6px 10px;border-bottom:1px solid #e2e8f0">${c.vendor}</td>` +
        `<td style="padding:6px 10px;border-bottom:1px solid #e2e8f0">${c.defectCategory || '—'}</td>` +
        `<td style="padding:6px 10px;border-bottom:1px solid #e2e8f0">${c.rcaStructured?.rootCauseCategory || '—'}</td>` +
        `<td style="padding:6px 10px;border-bottom:1px solid #e2e8f0">${c.claimDate}</td></tr>`
      ).join('')

      const body = `<p>Dear Team,</p>` +
        `<p>Please be advised that <strong>${similarClaims.length}</strong> similar claim(s) have been found for vendor <strong>${claim.vendor}</strong>.</p>` +
        `<table style="border-collapse:collapse;width:100%;font-size:13px">` +
        `<thead><tr style="background:#1a3a5c;color:#fff">` +
        `<th style="padding:8px 10px;text-align:left">Claim No.</th>` +
        `<th style="padding:8px 10px;text-align:left">Vendor</th>` +
        `<th style="padding:8px 10px;text-align:left">Defect Category</th>` +
        `<th style="padding:8px 10px;text-align:left">Root Cause</th>` +
        `<th style="padding:8px 10px;text-align:left">Date</th>` +
        `</tr></thead><tbody>${rows}</tbody></table>` +
        `<p style="margin-top:16px;color:#64748b;font-size:12px">This alert was generated by the Claim Management System.</p>`

      await notifySimilarClaims(claim.id, toInspectors.join('; '), ccManagers.join('; '), subject, body)

      // Record send time and close modal
      const now = new Date()
      const timeStr = now.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
      setSimilarAlertSentAt(timeStr)
      setShowSimilarModal(false)
    } finally {
      setSendingSimilar(false)
    }
  }

  // V8 Style Send Claim Email
  const handleSendClaimEmail = () => {
    if (!claim) return
    const today = new Date()
    const dateStr = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

    // Recipients - Factory Agent Logic
    // To: Inspector of the same factory agent
    const inspectorUser = users.find(u =>
      (u.fullname === claim.inspector || u.username === claim.inspector) &&
      u.factoryAgent === claim.factoryAgent
    )
    const toEmail = inspectorUser?.email || ''

    // CC: Supervisor, Admin, Manager of the same factory agent (excluding Superadmin)
    let ccEmails = users
      .filter(u =>
        u.factoryAgent === claim.factoryAgent &&
        (u.role === 'SUPERVISOR' || u.role === 'ADMIN' || u.role === 'MANAGER')
      )
      .map(u => u.email)
      .filter(Boolean)

    // Special rule: If factory agent is Oi Shanghai IC, always CC Cici Duan
    if (claim.factoryAgent === 'Oi Shanghai IC') {
      const ciciDuan = users.find(u => u.username === 'cici.duan' || u.fullname === 'Cici Duan')
      if (ciciDuan?.email && !ccEmails.includes(ciciDuan.email)) {
        ccEmails.push(ciciDuan.email)
      }
    }

    const ccEmailsStr = ccEmails.join(', ')

    // Subject
    const subject = `Claim Notification — ${claim.customer} | ${claim.vendor} | Style: ${claim.styleNo} | PO: ${claim.orderNo} | Qty: ${claim.claimQty}`

    // System URL for claim link
    const systemUrl = typeof window !== 'undefined' ? `${window.location.origin}/claims/${claim.id}` : ''

    // Helper functions
    const row = (label: string, value: string, highlight?: boolean) =>
      `<tr>
        <td style="padding:8px 14px;width:40%;background:#f4f6f9;color:#64748b;font-size:13px;font-weight:600;border-bottom:1px solid #e8edf3;white-space:nowrap;vertical-align:top;">${label}</td>
        <td style="padding:8px 14px;color:${highlight ? '#b91c1c' : '#0f172a'};font-size:13px;font-weight:${highlight ? '700' : '400'};border-bottom:1px solid #e8edf3;">${value || '—'}</td>
      </tr>`

    const section = (icon: string, title: string) =>
      `<tr><td colspan="2" style="padding:12px 14px 6px;background:#fff;">
        <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#2c5f8a;">${icon} ${title}</span>
      </td></tr>`

    const statusColor: Record<string, string> = { 'OPEN': '#f59e0b', 'IN_PROGRESS': '#3b82f6', 'CLOSED': '#22c55e', 'CANCELLED': '#94a3b8' }
    const statusBg: Record<string, string> = { 'OPEN': '#fffbeb', 'IN_PROGRESS': '#eff6ff', 'CLOSED': '#f0fdf4', 'CANCELLED': '#f8fafc' }
    const sBadge = (s?: string) => s
      ? `<span style="display:inline-block;background:${statusBg[s] || '#f1f5f9'};color:${statusColor[s] || '#64748b'};border:1px solid ${statusColor[s] || '#cbd5e1'};padding:2px 10px;border-radius:20px;font-size:12px;font-weight:700;">${s.replace('_', ' ')}</span>`
      : '—'

    const qcResp = claim.qcResponsibility
    const qcRespBadge = qcResp === 'Yes'
      ? `<span style="display:inline-block;background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:700;">Yes</span>`
      : qcResp === 'No'
      ? `<span style="display:inline-block;background:#dcfce7;color:#15803d;border:1px solid #86efac;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:700;">No</span>`
      : '—'

    const attHtml = claim.attachments?.length
      ? claim.attachments.map((a: any) =>
          `<span style="display:inline-block;background:#f0f4f8;border:1px solid #cbd5e1;border-radius:6px;padding:4px 10px;margin:3px 4px 3px 0;font-size:12px;color:#1a3a5c;">📎 ${a.name}</span>`
        ).join('')
      : '<span style="color:#94a3b8;font-size:13px;font-style:italic;">No attachments</span>'

    const rcaBadge = claim.rcaReport
      ? `<span style="background:rgba(34,197,94,0.18);color:#fff;border:1px solid rgba(255,255,255,0.3);padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700;">✓ RCA Submitted</span>`
      : `<span style="background:rgba(245,158,11,0.22);color:#fff;border:1px solid rgba(255,255,255,0.3);padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700;">⏳ RCA Pending</span>`

    const bodyHtml = `
    <div style="font-family:'Segoe UI',system-ui,Roboto,sans-serif;color:#0f172a;max-width:660px;margin:0 auto;background:#f0f4f8;padding:24px 16px;">
      <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(15,23,42,0.10);">
        <div style="background:linear-gradient(135deg,#1a3a5c 0%,#2c5f8a 100%);padding:24px 28px 20px;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.65);margin-bottom:6px;">Otto International · Quality Claim Notification</div>
          <div style="display:table;width:100%;">
            <div style="display:table-cell;vertical-align:middle;">
              <div style="color:#fff;font-size:20px;font-weight:700;line-height:1.3;">${claim.claimNo || 'New Claim'}</div>
              <div style="color:rgba(255,255,255,0.75);font-size:13px;margin-top:3px;">${claim.vendor || ''} &nbsp;·&nbsp; ${claim.customer || ''}</div>
            </div>
            <div style="display:table-cell;vertical-align:middle;text-align:right;white-space:nowrap;">
              ${rcaBadge}
              <div style="color:rgba(255,255,255,0.55);font-size:11px;margin-top:6px;">${dateStr}</div>
            </div>
          </div>
        </div>
        <div style="padding:16px 28px 0;text-align:left;">
          <a href="${systemUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#1a3a5c,#2c5f8a);color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 28px;border-radius:8px;letter-spacing:0.02em;">
            🔍 View Claim ${claim.claimNo} in System
          </a>
        </div>
        <div style="background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:16px 28px;margin-top:16px;">
          <p style="margin:0;font-size:14px;color:#0f172a;">Dear <strong>${claim.inspector || 'Inspector'}</strong>,</p>
          <p style="margin:6px 0 0;font-size:13px;color:#64748b;line-height:1.6;">Please find below the quality claim details that require your attention. Kindly investigate the root cause with the vendor / factory and submit your RCA report within <strong>7 days</strong>.</p>
        </div>
        <div style="padding:20px 28px 8px;">
          <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
            ${section('📦', 'Order Information')}
            ${row('Claim No.', `<strong style="color:#1a3a5c;">${claim.claimNo || '—'}</strong>`)}
            ${row('Customer', claim.customer)}
            ${row('Vendor', claim.vendor)}
            ${row('Factory ID (FID)', claim.fid)}
            ${row('Style No.', claim.styleNo)}
            ${row('Order No.', claim.orderNo)}
            ${row('Article No.', claim.articleNo)}
            ${row('QC Trip Leader', claim.inspector)}
            ${section('📋', 'Claim Details')}
            ${row('Claim Date', claim.claimDate)}
            ${row('Market Inspection Date', claim.marketInspectionDate)}
            ${row('Shipped Qty', String(claim.shippedQty))}
            ${row('Status', sBadge(claim.status))}
          </table>
        </div>
        <div style="padding:8px 28px 8px;">
          <div style="border:1px solid #fde68a;border-radius:8px;overflow:hidden;">
            <div style="background:#fffbeb;padding:10px 16px;border-bottom:1px solid #fde68a;">
              <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#92400e;">⚠️ Defect Information</span>
              <span style="float:right;background:#f59e0b;color:#fff;font-size:11px;font-weight:700;padding:2px 10px;border-radius:20px;">${claim.defectCategory || '—'}</span>
            </div>
            <div style="background:#fff;padding:14px 16px;font-size:13px;color:#0f172a;line-height:1.7;white-space:pre-wrap;">${claim.defectDescription || '—'}</div>
            ${(claim.defectRateByCustomer || claim.fullCheckResult) ? `
            <div style="background:#fafafa;border-top:1px solid #fde68a;padding:10px 16px;display:table;width:100%;box-sizing:border-box;">
              ${claim.defectRateByCustomer ? `<div style="display:table-cell;font-size:12px;color:#92400e;"><span style="font-weight:600;">Defect Rate (Customer):</span> ${claim.defectRateByCustomer}</div>` : ''}
              ${claim.fullCheckResult ? `<div style="display:table-cell;font-size:12px;color:#92400e;text-align:right;"><span style="font-weight:600;">Full Check:</span> ${claim.fullCheckResult}</div>` : ''}
            </div>` : ''}
          </div>
        </div>
        ${claim.attachments?.length ? `
        <div style="padding:8px 28px 8px;">
          <div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;background:#f8fafc;">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin-bottom:8px;">📎 Attachments (${claim.attachments.length})</div>
            <div>${attHtml}</div>
          </div>
        </div>` : ''}
        <div style="padding:8px 28px 20px;">
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px 18px;">
            <div style="font-size:13px;font-weight:700;color:#1e40af;margin-bottom:8px;">📝 Action Required</div>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:4px 0;font-size:13px;color:#1e3a5f;vertical-align:top;width:20px;">1.</td><td style="padding:4px 0;font-size:13px;color:#1e3a5f;">Investigate root cause with vendor / factory</td></tr>
              <tr><td style="padding:4px 0;font-size:13px;color:#1e3a5f;vertical-align:top;">2.</td><td style="padding:4px 0;font-size:13px;color:#1e3a5f;">Submit Root Cause Analysis (RCA) report within <strong>7 days</strong></td></tr>
            </table>
          </div>
        </div>
        <div style="background:#f1f5f9;border-top:1px solid #e2e8f0;padding:14px 28px;text-align:center;">
          <div style="font-size:12px;color:#94a3b8;">This is an automated notification from the <strong style="color:#64748b;">Otto International QC Claim Management System</strong>.</div>
          <div style="font-size:11px;color:#b0bec5;margin-top:4px;">Please do not reply to this email — contact your QC supervisor for queries.</div>
        </div>
      </div>
    </div>`

    setClaimEmailTo(toEmail)
    setClaimEmailCc(ccEmailsStr)
    setClaimEmailSubject(subject)
    setClaimEmailBody(bodyHtml)
    setShowClaimEmailPreview(true)
  }

  const handleConfirmSendClaimEmail = async () => {
    setSendingClaimEmail(true)
    try {
      await sendClaimEmail(claim.id, claimEmailTo, claimEmailCc, claimEmailSubject, claimEmailBody)
      setShowClaimEmailPreview(false)
      showToast('Email sent successfully!')
    } finally {
      setSendingClaimEmail(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1048576).toFixed(1) + ' MB'
  }

  const computeRcaRationale = (c: typeof claim) => {
    if (!c) return null
    const s = c.rcaStructured
    const fields = [
      { label: 'What Happened',     val: s?.whatHappened },
      { label: 'Root Cause Category', val: s?.rootCauseCategory },
      { label: 'Corrective Action', val: s?.correctiveAction },
      { label: 'Preventive Action', val: s?.preventiveAction },
      { label: 'Target Date',       val: s?.targetDate },
    ]
    const missingFields = fields.filter(f => !f.val?.trim()).map(f => f.label)
    const filledWhys    = (s?.whys || []).filter(w => w?.trim()).length

    const completeness = missingFields.length === 0
      ? `All required fields are filled including ${filledWhys}/5 why-analysis entries.`
      : `Missing: ${missingFields.join(', ')}. ${filledWhys}/5 why-analysis entries filled.`

    const defect   = (c.defectDescription || '').toLowerCase()
    const what     = (s?.whatHappened || '').toLowerCase()
    const category = (s?.rootCauseCategory || '').toLowerCase()
    const combined = defect + ' ' + what
    const categoryKws: Record<string, string[]> = {
      man:         ['operator','worker','skill','training','fatigue','staff'],
      machine:     ['equipment','machine','calibrat','maintenance','wear','tooling'],
      material:    ['fabric','material','yarn','thread','component','supplier','batch'],
      method:      ['sop','process','procedure','inspection','sequence','step'],
      measurement: ['gauge','measure','calibrat','spec','tolerance','instrument'],
      environment: ['temperature','humidity','dust','light','contaminat','storage'],
    }
    let accuracyText = 'No root cause category selected.'
    if (category) {
      let matched: string[] = []
      for (const [cat, kws] of Object.entries(categoryKws)) {
        if (category.includes(cat)) { matched = kws.filter(k => combined.includes(k)); break }
      }
      accuracyText = matched.length > 0
        ? `Category "${s?.rootCauseCategory}" aligns with defect description (matched: ${matched.slice(0,3).join(', ')}). ${filledWhys} why-levels support the analysis.`
        : `Category "${s?.rootCauseCategory}" could not be confirmed from the defect description. ${filledWhys} why-levels provided.`
    }

    const ca = (s?.correctiveAction || '').trim()
    const pa = (s?.preventiveAction || '').trim()
    const caActions = c.correctiveActions || []
    const totalLen = ca.length + pa.length
    const actionNotes: string[] = []
    if (!ca && !pa && caActions.length === 0) {
      actionNotes.push('No corrective or preventive actions defined.')
    } else {
      if (totalLen > 200) actionNotes.push('Detailed corrective and preventive actions provided.')
      else if (totalLen > 80) actionNotes.push('Actions present but could be more detailed.')
      else actionNotes.push('Actions are brief — consider adding more specifics.')
      if (caActions.length > 0) {
        const withOwner = caActions.filter(a => a.owner?.trim()).length
        const withDue   = caActions.filter(a => a.dueDate).length
        actionNotes.push(`${caActions.length} structured action(s): ${withOwner} with owner, ${withDue} with due date.`)
      }
      if (s?.targetDate) actionNotes.push('Target completion date set.')
    }

    return { completeness, accuracy: accuracyText, actionQuality: actionNotes.join(' ') }
  }

  const Field: React.FC<{ label: string; value?: string | number | null }> = ({ label, value }) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, color: '#0f172a' }}>{value || '—'}</div>
    </div>
  )

  const ScoreBar: React.FC<{ value: number }> = ({ value }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value * 20}%`, background: value >= 4 ? '#22c55e' : value >= 3 ? '#f59e0b' : '#ef4444', borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#1a3a5c', minWidth: 16 }}>{value}</span>
    </div>
  )

  return (
    <div>
      {/* Header - V8 Style */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/claims')} style={{
          padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db',
          background: '#fff', cursor: 'pointer', fontWeight: 600, color: '#64748b',
          fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 6,
          whiteSpace: 'nowrap'
        }}>
          <i className="bi bi-arrow-left" style={{ fontSize: '0.75rem' }}></i>
          Back to Claims List
        </button>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ color: '#1a3a5c', margin: 0, fontSize: '1.25rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
            Claim: {claim.claimNo}
          </h2>
          <span style={{
            padding: '3px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700,
            background: `${STATUS_COLORS[claim.status]}22`, color: STATUS_COLORS[claim.status],
            textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap'
          }}>{claim.status.replace('_', ' ')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
          {/* V8 Style Buttons */}
          {/* Similar Claims button - only visible for Admin/Supervisor/Manager and when RCA is completed */}
          {canScoreRCA() && claim.rcaStatus === 'APPROVED' && (
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              <button onClick={handleCheckSimilar} disabled={loadingSimilar} style={{
                padding: '6px 14px', borderRadius: 6, background: '#f59e0b',
                color: '#fff', border: '1px solid #f59e0b', cursor: 'pointer', fontWeight: 600,
                fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 6,
                opacity: loadingSimilar ? 0.7 : 1, whiteSpace: 'nowrap'
              }}>
                <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '0.75rem' }}></i>
                {loadingSimilar ? 'Checking...' : 'Similar Claims'}
              </button>
              {similarAlertSentAt && (
                <span style={{
                  position: 'absolute', bottom: -16, left: 0,
                  fontSize: '0.55rem', color: '#16a34a', fontWeight: 500,
                  display: 'flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap'
                }}>
                  <i className="bi bi-check-circle-fill" style={{ fontSize: '0.5rem' }}></i>
                  Alert sent on {similarAlertSentAt}
                </span>
              )}
            </div>
          )}
          <button onClick={() => setShowRCAModal(true)} style={{
            padding: '6px 14px', borderRadius: 6, background: '#ffc107',
            color: '#212529', border: '1px solid #ffc107', cursor: 'pointer', fontWeight: 600,
            fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 6,
            whiteSpace: 'nowrap'
          }}>
            <i className="bi bi-pencil-square" style={{ fontSize: '0.75rem' }}></i>
            Edit RCA Report
          </button>
          <button onClick={handleSendClaimEmail} style={{
            padding: '6px 14px', borderRadius: 6, background: '#0dcaf0',
            color: '#fff', border: '1px solid #0dcaf0', cursor: 'pointer', fontWeight: 600,
            fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 6,
            whiteSpace: 'nowrap'
          }}>
            <i className="bi bi-envelope" style={{ fontSize: '0.75rem' }}></i>
            Send Email
          </button>
          {/* Edit button - 仅 SuperAdmin 和 QC Admin 有权限 */}
          {canManageClaims() && (
            <button onClick={() => navigate(`/claims/${claim.id}/edit`)} style={{
              padding: '6px 14px', borderRadius: 6, background: '#0d6efd',
              color: '#fff', border: '1px solid #0d6efd', cursor: 'pointer', fontWeight: 600,
              fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 6,
              whiteSpace: 'nowrap'
            }}>
              <i className="bi bi-pencil" style={{ fontSize: '0.75rem' }}></i>
              Edit
            </button>
          )}
          {/* Delete button - 仅 SuperAdmin 和 QC Admin，且状态为 Cancelled */}
          {canManageClaims() && claim.status === 'CANCELLED' && (
            <button onClick={handleDelete} style={{
              padding: '6px 14px', borderRadius: 6, background: '#dc3545',
              color: '#fff', border: '1px solid #dc3545', cursor: 'pointer', fontWeight: 600,
              fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 6,
              whiteSpace: 'nowrap'
            }}>
              <i className="bi bi-trash" style={{ fontSize: '0.75rem' }}></i>
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Vendor & Factory Information */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 24,
        boxShadow: '0 2px 8px rgba(15,23,42,.08)', border: '1px solid #e2e8f0', marginBottom: 20 }}>
        <h4 style={{ color: '#1a3a5c', margin: '0 0 20px', fontWeight: 700 }}>Vendor & Factory Information</h4>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          <Field label="Vendor" value={claim.vendor} />
          <Field label="FID" value={claim.fid} />
          <Field label="Location/Team" value={claim.location} />
        </div>
      </div>

      {/* Order Details */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 24,
        boxShadow: '0 2px 8px rgba(15,23,42,.08)', border: '1px solid #e2e8f0', marginBottom: 20 }}>
        <h4 style={{ color: '#1a3a5c', margin: '0 0 20px', fontWeight: 700 }}>Order Details</h4>
        {/* Row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
          <Field label="Customer" value={claim.customer} />
          <Field label="Style No." value={claim.styleNo} />
          <Field label="Order No." value={claim.orderNo} />
          <Field label="Article No." value={claim.articleNo} />
          <Field label="Shipped Qty" value={claim.shippedQty} />
        </div>
        {/* Row 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(140px, 200px))', gap: 16 }}>
          <Field label="Market Inspection Date" value={claim.marketInspectionDate} />
          <Field label="QC Trip Leader" value={claim.inspector} />
          <Field label="Quality Digit(Market)" value={claim.qualityDigit} />
        </div>
      </div>

      {/* Claim Information */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 24,
        boxShadow: '0 2px 8px rgba(15,23,42,.08)', border: '1px solid #e2e8f0', marginBottom: 20 }}>
        <h4 style={{ color: '#1a3a5c', margin: '0 0 20px', fontWeight: 700 }}>Claim Information</h4>
        {/* Row 1: Claim No., Claim Date, Claim Qty */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(140px, 240px))', gap: 16, marginBottom: 16 }}>
          <Field label="Claim No." value={claim.claimNo} />
          <Field label="Claim Date" value={claim.claimDate} />
          <Field label="Claim Qty" value={claim.claimQty} />
        </div>
        {/* Row 2: Defect Category */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(140px, 240px)', gap: 16, marginBottom: 16 }}>
          <Field label="Defect Category" value={claim.defectCategory} />
        </div>
        {/* Row 3: Defect Description */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Defect Description</div>
          <div style={{ fontSize: 13, color: '#0f172a', whiteSpace: 'pre-wrap' }}>{claim.defectDescription || '—'}</div>
        </div>
        {/* Row 4: Defect Rate by Customer, Full Check Result, Full Check Rejection Rate */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(140px, 1fr))', gap: 16, marginBottom: 16 }}>
          <Field label="Defect Rate by Customer" value={claim.defectRateByCustomer} />
          <Field label="Full Check Result" value={claim.fullCheckResult} />
          <Field label="Full Check Rejection Rate" value={claim.fullCheckRejectionRate} />
        </div>
        {/* Row 5: QC Responsibility, QC Informed Date, Status */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(140px, 1fr))', gap: 16 }}>
          <Field label="QC Responsibility" value={claim.qcResponsibility} />
          <Field label="QC Informed Date" value={claim.qcInformDate} />
          <Field label="Status" value={claim.status?.replace('_', ' ')} />
        </div>
      </div>

      {/* Risk / Repeat Order - Exact V8 Style */}
      {claim.repeatDefectFlag && (
        <div style={{ display: 'inline-block', marginBottom: 14, maxWidth: 520, width: 'auto' }}>
          {/* Risk badge pill + send button row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 0, flexWrap: 'wrap' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'linear-gradient(135deg,#f59e0b,#d97706)',
              borderRadius: '20px 20px 0 0',
              padding: '3px 14px',
              boxShadow: '0 1px 4px rgba(245,158,11,.3)'
            }}>
              <i className="bi bi-exclamation-triangle-fill" style={{ color: '#fff', fontSize: '0.65rem' }}></i>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.05em' }}>RISK — REPEAT ORDER</span>
            </div>
            <button
              onClick={() => generateRiskAlertEmail(claim)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 12px', borderRadius: 20, border: '1px solid #f59e0b',
                background: '#fff', color: '#b45309', fontSize: '0.7rem', fontWeight: 700,
                cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 1px 4px rgba(245,158,11,.15)'
              }}
            >
              <i className="bi bi-envelope-fill" style={{ fontSize: '0.65rem' }}></i> Send Risk Alert
            </button>
            {claim.riskAlertSentAt && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: '0.68rem', color: '#15803d', fontWeight: 600, whiteSpace: 'nowrap'
              }}>
                <i className="bi bi-check-circle-fill" style={{ fontSize: '0.7rem' }}></i>
                Sent by {claim.riskAlertSentBy || 'System'} on {new Date(claim.riskAlertSentAt).toLocaleString()}
              </span>
            )}
          </div>
          {/* Info strip */}
          <div style={{
            background: '#fffbeb', border: '1px solid #fcd34d',
            borderRadius: '0 8px 8px 8px', padding: '10px 14px',
            display: 'flex', gap: 20, flexWrap: 'wrap'
          }}>
            <div>
              <div style={{
                fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.05em', color: '#92400e', marginBottom: 2
              }}>Style No.</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a' }}>{claim.styleNo || '—'}</div>
            </div>
            <div>
              <div style={{
                fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.05em', color: '#92400e', marginBottom: 2
              }}>Repeat Order No.</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a' }}>{claim.repeatOrderNo || '—'}</div>
            </div>
            <div>
              <div style={{
                fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.05em', color: '#92400e', marginBottom: 2
              }}>Delivery Date</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a' }}>{claim.repeatOrderDeliveryDate || '—'}</div>
            </div>
            {claim.repeatOrderRemark && (
              <div>
                <div style={{
                  fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.05em', color: '#92400e', marginBottom: 2
                }}>Remark</div>
                <div style={{ fontSize: '0.82rem', color: '#0f172a' }}>{claim.repeatOrderRemark}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RCA Section */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 20,
        boxShadow: '0 2px 8px rgba(15,23,42,.08)', border: '1px solid #e2e8f0', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <h4 style={{ color: '#1a3a5c', margin: 0, fontWeight: 700 }}>Root Cause Analysis</h4>
          {claim.rcaStatus && (
            <span style={{
              padding: '3px 12px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700,
              background: `${RCA_STATUS_COLORS[claim.rcaStatus]}22`, color: RCA_STATUS_COLORS[claim.rcaStatus]
            }}>{claim.rcaStatus.replace('_', ' ')}</span>
          )}
          {/* RCA Overdue Warning */}
          {(() => {
            // Check if RCA is overdue (more than 14 days from claim date and not completed)
            const isOverdue = claim.claimDate && 
              !['APPROVED'].includes(claim.rcaStatus || '') &&
              (() => {
                const claimDate = new Date(claim.claimDate)
                const today = new Date()
                const diffDays = Math.floor((today.getTime() - claimDate.getTime()) / (1000 * 60 * 60 * 24))
                return diffDays > 14
              })()
            
            if (isOverdue) {
              const overdueDays = Math.floor((new Date().getTime() - new Date(claim.claimDate!).getTime()) / (1000 * 60 * 60 * 24)) - 14
              return (
                <span style={{
                  padding: '3px 10px',
                  borderRadius: 20,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  background: '#fee2e2',
                  color: '#dc2626',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  border: '1px solid #fecaca'
                }}>
                  <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '0.65rem' }}></i>
                  Overdue by {overdueDays}d
                </span>
              )
            }
            return null
          })()}
          {/* Export PDF Button - Show when RCA status exists */}
          {claim.rcaStatus && (
            <button 
              onClick={() => setShowPDFPreview(true)}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.75rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                marginLeft: 'auto'
              }}
            >
              <i className="bi bi-file-pdf"></i>
              PDF
            </button>
          )}
        </div>

        {/* RCA Reasons - 支持多个 */}
        {claim.rcaReasons && claim.rcaReasons.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {claim.rcaReasons.map((reason, idx) => (
              <div key={idx} style={{ 
                marginBottom: 16, 
                padding: 16, 
                background: '#f8fafc', 
                borderRadius: 8, 
                border: '1px solid #e2e8f0' 
              }}>
                <div style={{ 
                  fontSize: '0.78rem', 
                  fontWeight: 700, 
                  color: '#1a3a5c', 
                  marginBottom: 12,
                  paddingBottom: 8,
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  {reason.label || `Claim Reason ${idx + 1}`}
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>What Happened</div>
                    <div style={{ fontSize: 13 }}>{reason.whatHappened || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Root Cause Category</div>
                    <div style={{ fontSize: 13 }}>{reason.rootCauseCategory || '—'}</div>
                  </div>
                  {reason.rootCauseSummary && (
                    <div style={{ gridColumn: '1/-1' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Root Cause Summary</div>
                      <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{reason.rootCauseSummary}</div>
                    </div>
                  )}
                </div>

                {/* Corrective Actions */}
                {(reason.fac_imm_action || reason.fac_mid_action || reason.fac_long_action) && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>Factory Corrective Actions</div>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 8 }}>
                      {reason.fac_imm_action && (
                        <div style={{ background: '#fee2e2', padding: 10, borderRadius: 6, border: '1px solid #fca5a5' }}>
                          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#b91c1c', marginBottom: 4 }}>Immediate</div>
                          <div style={{ fontSize: 12, color: '#1e3a5c', marginBottom: 4 }}>{reason.fac_imm_action}</div>
                          {reason.fac_imm_person && (
                            <div style={{ fontSize: 11, color: '#64748b' }}>Responsible: {reason.fac_imm_person}</div>
                          )}
                        </div>
                      )}
                      {reason.fac_mid_action && (
                        <div style={{ background: '#fef3c7', padding: 10, borderRadius: 6, border: '1px solid #fde68a' }}>
                          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#92400e', marginBottom: 4 }}>Mid-term</div>
                          <div style={{ fontSize: 12, color: '#1e3a5c', marginBottom: 4 }}>{reason.fac_mid_action}</div>
                          {reason.fac_mid_person && (
                            <div style={{ fontSize: 11, color: '#64748b' }}>Responsible: {reason.fac_mid_person}</div>
                          )}
                        </div>
                      )}
                      {reason.fac_long_action && (
                        <div style={{ background: '#dcfce7', padding: 10, borderRadius: 6, border: '1px solid #bbf7d0' }}>
                          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#15803d', marginBottom: 4 }}>Long-term</div>
                          <div style={{ fontSize: 12, color: '#1e3a5c', marginBottom: 4 }}>{reason.fac_long_action}</div>
                          {reason.fac_long_person && (
                            <div style={{ fontSize: 11, color: '#64748b' }}>Responsible: {reason.fac_long_person}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* OI Action */}
                {reason.oi_action && (
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>OI Action</div>
                    <div style={{ background: '#f5f3ff', padding: 10, borderRadius: 6, border: '1px solid #ddd6fe' }}>
                      <div style={{ fontSize: 12, color: '#1e3a5c', marginBottom: 4 }}>{reason.oi_action}</div>
                      {reason.oi_person && (
                        <div style={{ fontSize: 11, color: '#64748b' }}>Responsible: {reason.oi_person}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 兼容旧数据 - 如果只保存了 rcaStructured */}
        {!claim.rcaReasons && claim.rcaStructured && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>What Happened</div>
                <div style={{ fontSize: 13 }}>{claim.rcaStructured.whatHappened || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Root Cause Category</div>
                <div style={{ fontSize: 13 }}>{claim.rcaStructured.rootCauseCategory || '—'}</div>
              </div>
              {claim.rcaStructured.rootCauseSummary && (
                <div style={{ gridColumn: '1/-1' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Root Cause Summary</div>
                  <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{claim.rcaStructured.rootCauseSummary}</div>
                </div>
              )}
            </div>

            {/* Corrective Actions */}
            {(claim.rcaStructured.fac_imm_action || claim.rcaStructured.fac_mid_action || claim.rcaStructured.fac_long_action) && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>Factory Corrective Actions</div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 8 }}>
                  {claim.rcaStructured.fac_imm_action && (
                    <div style={{ background: '#fee2e2', padding: 10, borderRadius: 6, border: '1px solid #fca5a5' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#b91c1c', marginBottom: 4 }}>Immediate</div>
                      <div style={{ fontSize: 12, color: '#1e3a5c', marginBottom: 4 }}>{claim.rcaStructured.fac_imm_action}</div>
                      {claim.rcaStructured.fac_imm_person && (
                        <div style={{ fontSize: 11, color: '#64748b' }}>Responsible: {claim.rcaStructured.fac_imm_person}</div>
                      )}
                    </div>
                  )}
                  {claim.rcaStructured.fac_mid_action && (
                    <div style={{ background: '#fef3c7', padding: 10, borderRadius: 6, border: '1px solid #fde68a' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#92400e', marginBottom: 4 }}>Mid-term</div>
                      <div style={{ fontSize: 12, color: '#1e3a5c', marginBottom: 4 }}>{claim.rcaStructured.fac_mid_action}</div>
                      {claim.rcaStructured.fac_mid_person && (
                        <div style={{ fontSize: 11, color: '#64748b' }}>Responsible: {claim.rcaStructured.fac_mid_person}</div>
                      )}
                    </div>
                  )}
                  {claim.rcaStructured.fac_long_action && (
                    <div style={{ background: '#dcfce7', padding: 10, borderRadius: 6, border: '1px solid #bbf7d0' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#15803d', marginBottom: 4 }}>Long-term</div>
                      <div style={{ fontSize: 12, color: '#1e3a5c', marginBottom: 4 }}>{claim.rcaStructured.fac_long_action}</div>
                      {claim.rcaStructured.fac_long_person && (
                        <div style={{ fontSize: 11, color: '#64748b' }}>Responsible: {claim.rcaStructured.fac_long_person}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* OI Action */}
            {claim.rcaStructured.oi_action && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>OI Action</div>
                <div style={{ background: '#f5f3ff', padding: 10, borderRadius: 6, border: '1px solid #ddd6fe' }}>
                  <div style={{ fontSize: 12, color: '#1e3a5c', marginBottom: 4 }}>{claim.rcaStructured.oi_action}</div>
                  {claim.rcaStructured.oi_person && (
                    <div style={{ fontSize: 11, color: '#64748b' }}>Responsible: {claim.rcaStructured.oi_person}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reminder log */}
        {claim.rcaReminderLog && claim.rcaReminderLog.length > 0 && (() => {
          const last = claim.rcaReminderLog![claim.rcaReminderLog!.length - 1]
          return (
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🔔</span>
              <span>Last reminded: {new Date(last.sentAt).toLocaleString()} by {last.sentBy} ({last.type === 'early_warning' ? 'early warning' : 'overdue'})</span>
            </div>
          )
        })()}

        {/* Supervisor comment */}
        {claim.rcaSupervisorComment && (
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', marginBottom: 4 }}>Supervisor Comment</div>
            <div style={{ fontSize: 13 }}>{claim.rcaSupervisorComment}</div>
          </div>
        )}

        {/* Manager comment */}
        {claim.rcaManagerComment && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', marginBottom: 4 }}>Manager Comment</div>
            <div style={{ fontSize: 13 }}>{claim.rcaManagerComment}</div>
          </div>
        )}

        {/* RCA Actions - V8 Style */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {/* Submit RCA - DRAFT or REJECTED */}
          {(claim.rcaStatus === 'DRAFT' || claim.rcaStatus === 'REJECTED') && (
            <>
              {claim.rcaStatus === 'REJECTED' && (
                <button onClick={handleResetToDraft} style={{
                  padding: '7px 16px', borderRadius: 8, background: '#f59e0b',
                  color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600,
                  fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 6
                }}><i className="bi bi-arrow-counterclockwise"></i>Reset to Draft</button>
              )}
              <button onClick={handleSubmitRCA} style={{
                padding: '7px 16px', borderRadius: 8, background: '#3b82f6',
                color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600,
                fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 6
              }}><i className="bi bi-send"></i>Submit RCA</button>
            </>
          )}
          
          {/* Supervisor Approval - SUBMITTED status */}
          {claim.rcaStatus === 'SUBMITTED' && canApproveRCASupervisor() && (
            <>
              <button onClick={() => handleApprove(false)} style={{
                padding: '7px 16px', borderRadius: 8, background: '#22c55e',
                color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600,
                fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 6
              }}><i className="bi bi-check2"></i>{isAdmin() ? 'Approve (Supervisor)' : 'Approve'}</button>
              <button onClick={() => setShowRejectInput(true)} style={{
                padding: '7px 16px', borderRadius: 8, background: '#ef4444',
                color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600,
                fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 6,
                marginLeft: 4
              }}><i className="bi bi-x"></i>Reject</button>
            </>
          )}
          
          {/* Final Approval - PENDING_MANAGER status */}
          {claim.rcaStatus === 'PENDING_MANAGER' && canApproveRCAFinal() && (
            <>
              <button onClick={() => handleApprove(true)} style={{
                padding: '7px 16px', borderRadius: 8, background: '#22c55e',
                color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600,
                fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 6
              }}><i className="bi bi-check2-all"></i>Final Approve</button>
              <button onClick={() => setShowRejectInput(true)} style={{
                padding: '7px 16px', borderRadius: 8, background: '#ef4444',
                color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600,
                fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 6,
                marginLeft: 4
              }}><i className="bi bi-x"></i>Reject</button>
            </>
          )}
          
          {/* Score RCA - APPROVED status */}
          {canScoreRCA() && claim.rcaStatus === 'APPROVED' && !claim.rcaQualityScore && (
            <button onClick={() => setShowScoreForm(s => !s)} style={{
              padding: '7px 16px', borderRadius: 8, border: '1px solid #f59e0b',
              color: '#f59e0b', background: '#fff', cursor: 'pointer', fontWeight: 600,
              fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 6
            }}><i className="bi bi-star"></i>Score RCA</button>
          )}
        </div>

        {showRejectInput && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..." style={{ flex: 1, padding: '8px 10px',
                borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, minHeight: 60 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button onClick={handleReject} style={{ padding: '7px 14px', borderRadius: 8,
                background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Confirm</button>
              <button onClick={() => setShowRejectInput(false)} style={{ padding: '7px 14px', borderRadius: 8,
                border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        {/* RCA Quality Score input - V8 Style */}
        {showScoreForm && (
          <div style={{ marginTop: 16, background: '#f8fafc', borderRadius: 10, padding: 16, border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 700, color: '#1a3a5c', marginBottom: 12, fontSize: 13 }}>
              <i className="bi bi-star" style={{ marginRight: 6 }}></i>Score RCA Quality
            </div>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>Rate this RCA on 3 criteria (1 = Poor, 5 = Excellent).</p>
            
            {/* Star Rating Rows */}
            {[
              { label: 'Completeness', icon: 'bi-check2-all', value: scoreCompleteness, set: setScoreCompleteness },
              { label: 'Root Cause Accuracy', icon: 'bi-bullseye', value: scoreAccuracy, set: setScoreAccuracy },
              { label: 'Corrective Action Quality', icon: 'bi-tools', value: scoreActionQuality, set: setScoreActionQuality },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 13, minWidth: 180, color: '#475569', fontWeight: 600 }}>
                  <i className={`bi ${s.icon}`} style={{ marginRight: 6 }}></i>{s.label}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => s.set(star)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1.3rem',
                        color: star <= s.value ? '#f59e0b' : '#d1d5db',
                        padding: 0,
                        lineHeight: 1,
                        transition: 'transform 0.1s'
                      }}
                      onMouseEnter={e => { if (star > s.value) e.currentTarget.style.transform = 'scale(1.2)' }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
                    >
                      {star <= s.value ? '★' : '☆'}
                    </button>
                  ))}
                </div>
                <span style={{ fontSize: 12, color: '#94a3b8', minWidth: 30 }}>
                  {s.value > 0 ? `${s.value}/5` : '—'}
                </span>
              </div>
            ))}
            
            {/* Average Score Display */}
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Average Score:</span>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: '#fef9c3',
                color: '#92400e',
                padding: '4px 12px',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 14
              }}>
                <i className="bi bi-star-fill"></i>
                {scoreCompleteness > 0 && scoreAccuracy > 0 && scoreActionQuality > 0 
                  ? ((scoreCompleteness + scoreAccuracy + scoreActionQuality) / 3).toFixed(1) 
                  : '—'}
              </span>
            </div>
            
            {/* AI Rationale Section */}
            {aiRationale && (
              <div style={{ marginTop: 12, padding: 12, background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', border: '1px solid #c4b5fd', borderRadius: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#7c3aed', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <i className="bi bi-stars"></i> {aiRationale.source} Scoring Rationale
                </div>
                {aiRationale.completeness && (
                  <div style={{ fontSize: 12, color: '#4c1d95', marginBottom: 4 }}><strong>Completeness:</strong> {aiRationale.completeness}</div>
                )}
                {aiRationale.accuracy && (
                  <div style={{ fontSize: 12, color: '#4c1d95', marginBottom: 4 }}><strong>Root Cause Accuracy:</strong> {aiRationale.accuracy}</div>
                )}
                {aiRationale.actionQuality && (
                  <div style={{ fontSize: 12, color: '#4c1d95', marginBottom: 4 }}><strong>Action Quality:</strong> {aiRationale.actionQuality}</div>
                )}
                <p style={{ fontSize: 11, color: '#64748b', marginTop: 8, marginBottom: 0 }}>
                  <i className="bi bi-info-circle" style={{ marginRight: 4 }}></i>AI-suggested scores are pre-filled above. You can adjust before saving.
                </p>
              </div>
            )}
            
            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
              <button 
                onClick={handleAIScore} 
                disabled={aiScoring}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: '#fff',
                  border: 'none',
                  cursor: aiScoring ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: 13,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  opacity: aiScoring ? 0.55 : 1
                }}
              >
                {aiScoring ? (
                  <><span className="spinner-border spinner-border-sm" style={{ width: 14, height: 14 }}></span> Analyzing…</>
                ) : (
                  <><i className="bi bi-stars"></i> Score with AI</>
                )}
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setShowScoreForm(false); setAiRationale(null); }} style={{ padding: '7px 14px', borderRadius: 8,
                  border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Cancel</button>
                <button 
                  onClick={handleScoreRCA} 
                  disabled={scoringRCA || scoreCompleteness === 0 || scoreAccuracy === 0 || scoreActionQuality === 0}
                  style={{
                    padding: '7px 16px', borderRadius: 8, background: '#3b82f6',
                    color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                    opacity: (scoringRCA || scoreCompleteness === 0 || scoreAccuracy === 0 || scoreActionQuality === 0) ? 0.5 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {scoringRCA ? 'Saving...' : <><i className="bi bi-star-fill"></i> Save Score</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RCA Quality Score display - V8 Style */}
        {claim.rcaQualityScore && (() => {
          const qs = claim.rcaQualityScore
          const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n)
          return (
            <div style={{ marginTop: 16, padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <h6 style={{ margin: 0, fontWeight: 700, color: '#1a3a5c', fontSize: 14 }}>
                  <i className="bi bi-star-fill text-warning" style={{ color: '#f59e0b', marginRight: 6 }}></i>RCA Quality Score
                </h6>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  background: '#fef9c3',
                  color: '#92400e',
                  padding: '4px 12px',
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 14,
                  marginLeft: 'auto'
                }}>
                  <i className="bi bi-star-fill"></i>{qs.avg?.toFixed(1)}/5
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 12, fontSize: 13 }}>
                <div>
                  <span style={{ color: '#64748b' }}>Completeness:</span>{' '}
                  <span style={{ color: '#f59e0b' }}>{stars(qs.completeness)}</span>{' '}
                  <span style={{ color: '#475569', fontWeight: 600 }}>{qs.completeness}/5</span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Root Cause Accuracy:</span>{' '}
                  <span style={{ color: '#f59e0b' }}>{stars(qs.accuracy)}</span>{' '}
                  <span style={{ color: '#475569', fontWeight: 600 }}>{qs.accuracy}/5</span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Action Quality:</span>{' '}
                  <span style={{ color: '#f59e0b' }}>{stars(qs.actionQuality)}</span>{' '}
                  <span style={{ color: '#475569', fontWeight: 600 }}>{qs.actionQuality}/5</span>
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 10 }}>
                <i className="bi bi-person" style={{ marginRight: 4 }}></i>
                Scored by {qs.scoredBy} · {new Date(qs.scoredAt).toLocaleString()}
              </div>
              {/* 编辑评分 - Supervisor/Manager/Admin 可编辑 */}
              {canScoreRCA() && (
                <button 
                  onClick={() => {
                    setScoreCompleteness(qs.completeness)
                    setScoreAccuracy(qs.accuracy)
                    setScoreActionQuality(qs.actionQuality)
                    setShowScoreForm(true)
                  }}
                  style={{
                    marginTop: 12,
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    color: '#64748b',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <i className="bi bi-pencil"></i> Edit Score
                </button>
              )}
            </div>
          )
        })()}

        {/* Approval History - V8 Style Timeline */}
        {claim.rcaApprovalHistory?.length > 0 && (
          <div style={{ marginTop: 16, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
            <div style={{ fontWeight: 700, color: '#1a3a5c', marginBottom: 12, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="bi bi-clock-history"></i> Approval History
            </div>
            <div style={{ borderLeft: '2px solid #e2e8f0', marginLeft: 8, paddingLeft: 16 }}>
              {claim.rcaApprovalHistory.map((h, i) => {
                const actionLabels: Record<string, string> = {
                  'submitted': 'Submitted',
                  'supervisor_approved': 'Supervisor Approved',
                  'final_approved': 'Admin Final Approved',
                  'rejected': 'Rejected',
                  'RCA Created': 'RCA Created',
                  'RCA Submitted': 'Submitted'
                }
                const isRejected = h.action === 'rejected'
                const isApproved = h.action.includes('approved') || h.action === 'supervisor_approved' || h.action === 'final_approved'
                const dotColor = isRejected ? '#ef4444' : isApproved ? '#22c55e' : '#3b82f6'
                
                return (
                  <div key={i} style={{ position: 'relative', marginBottom: 16 }}>
                    {/* Timeline dot */}
                    <div style={{
                      position: 'absolute',
                      left: -20,
                      top: 4,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: dotColor,
                      border: '2px solid #fff',
                      boxShadow: `0 0 0 2px ${dotColor}`
                    }}></div>
                    
                    {/* Content */}
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1e3a5c' }}>
                      {actionLabels[h.action] || h.action}
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                      <i className="bi bi-person" style={{ marginRight: 4 }}></i>
                      {h.byName} · {new Date(h.at).toLocaleString()}
                    </div>
                    {h.comment && (
                      <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <i className="bi bi-chat-left-text"></i>
                        {h.comment}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* RCA Attachments */}
        {claim.rcaAttachments && claim.rcaAttachments.length > 0 && (
          <div style={{ marginTop: 16, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
            <div style={{ fontWeight: 700, color: '#1a3a5c', marginBottom: 10, fontSize: 13 }}>
              <i className="bi bi-paperclip" style={{ marginRight: 6 }}></i>RCA Attachments
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {claim.rcaAttachments.map(att => (
                <div key={att.id} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 12, 
                  padding: '10px 14px', 
                  background: '#f8fafc', 
                  borderRadius: 8, 
                  border: '1px solid #e2e8f0',
                  fontSize: 13 
                }}>
                  <i className="bi bi-file-earmark" style={{ color: '#3b82f6', fontSize: 18 }}></i>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: '#1e3a5c' }}>{att.fileName}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>
                      {formatFileSize(att.fileSize)} · Uploaded {new Date(att.uploadedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <a 
                    href={`/api/claims/${claim.id}/attachments/${att.id}`} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ 
                      padding: '6px 12px', 
                      borderRadius: 6, 
                      background: '#3b82f6', 
                      color: '#fff', 
                      textDecoration: 'none',
                      fontSize: 12,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <i className="bi bi-eye"></i> Preview
                  </a>
                  <a 
                    href={`/api/claims/${claim.id}/attachments/${att.id}?download=1`} 
                    download
                    style={{ 
                      padding: '6px 12px', 
                      borderRadius: 6, 
                      background: '#fff', 
                      color: '#3b82f6', 
                      border: '1px solid #3b82f6',
                      textDecoration: 'none',
                      fontSize: 12,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <i className="bi bi-download"></i> Download
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Claim Attachments - Admin Only Operations */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 20,
        boxShadow: '0 2px 8px rgba(15,23,42,.08)', border: '1px solid #e2e8f0', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <h4 style={{ color: '#1a3a5c', margin: 0, fontWeight: 700, flex: 1 }}>Claim Attachments</h4>
          {/* 附件上传 - 仅 SuperAdmin 和 QC Admin */}
          {canManageClaims() && (
            <>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFile} style={{
                padding: '6px 14px', borderRadius: 8, background: '#3b82f6',
                color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                opacity: uploadingFile ? 0.7 : 1
              }}>{uploadingFile ? 'Uploading...' : '+ Upload'}</button>
            </>
          )}
        </div>
        {claim.attachments?.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {claim.attachments.map(att => (
              <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <i className="bi bi-file-earmark" style={{ color: '#3b82f6', fontSize: 18 }}></i>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1e3a5c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.fileName}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>{formatFileSize(att.fileSize)} · Uploaded {new Date(att.uploadedAt).toLocaleDateString()}</div>
                </div>
                <a 
                  href={`/api/claims/${claim.id}/attachments/${att.id}`} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ 
                    padding: '6px 12px', 
                    borderRadius: 6, 
                    background: '#3b82f6', 
                    color: '#fff', 
                    textDecoration: 'none',
                    fontSize: 12,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <i className="bi bi-eye"></i> Preview
                </a>
                <a 
                  href={`/api/claims/${claim.id}/attachments/${att.id}?download=1`} 
                  download
                  style={{ 
                    padding: '6px 12px', 
                    borderRadius: 6, 
                    background: '#fff', 
                    color: '#3b82f6', 
                    border: '1px solid #3b82f6',
                    textDecoration: 'none',
                    fontSize: 12,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <i className="bi bi-download"></i> Download
                </a>
                {/* 删除附件 - 仅 SuperAdmin 和 QC Admin */}
                {canManageClaims() && (
                  <button
                    onClick={async () => {
                      if (!window.confirm('Are you sure you want to delete this attachment?')) return
                      try {
                        await deleteAttachment(claim.id, att.id)
                        setClaim(prev => prev ? { ...prev, attachments: prev.attachments?.filter(a => a.id !== att.id) || [] } : null)
                      } catch (err) {
                        showToast('Failed to delete attachment')
                      }
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      background: '#fff',
                      color: '#ef4444',
                      border: '1px solid #ef4444',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <i className="bi bi-trash"></i> Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: '#94a3b8' }}>No attachments.</div>
        )}
      </div>

      {/* Notes */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 20,
        boxShadow: '0 2px 8px rgba(15,23,42,.08)', border: '1px solid #e2e8f0', marginBottom: 20 }}>
        <h4 style={{ color: '#1a3a5c', margin: '0 0 16px', fontWeight: 700 }}>Notes</h4>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
            placeholder="Add a note..." rows={2}
            style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1',
              fontSize: 13, resize: 'vertical', fontFamily: 'inherit' }} />
          <button onClick={handleAddNote} disabled={addingNote || !noteText.trim()} style={{
            padding: '8px 16px', borderRadius: 8, background: '#1a3a5c',
            color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
            alignSelf: 'flex-end', opacity: (addingNote || !noteText.trim()) ? 0.5 : 1
          }}>{addingNote ? 'Adding...' : 'Add Note'}</button>
        </div>

        {claim.notes?.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...claim.notes].reverse().map(note => (
              <div key={note.id} style={{ padding: '10px 14px', background: '#f8fafc',
                borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#1a3a5c' }}>{note.author}</span>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600,
                    background: '#e2e8f0', borderRadius: 20, padding: '1px 8px' }}>{note.authorRole}</span>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginLeft: 'auto' }}>
                    {new Date(note.createdAt).toLocaleString()}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#0f172a', whiteSpace: 'pre-wrap' }}>{note.text}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: '#94a3b8' }}>No notes yet.</div>
        )}
      </div>

      {showRCAModal && (
        <RCAModal claim={claim} onClose={() => { setShowRCAModal(false); load() }} />
      )}

      {/* PDF Preview Modal */}
      {showPDFPreview && claim && (
        <PDFPreviewModal claim={claim} onClose={() => setShowPDFPreview(false)} />
      )}

      {/* Claim Email Preview Modal (V8 Style) */}
      {showClaimEmailPreview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div style={{ background: '#fff', borderRadius: 14, width: 900, maxWidth: '96vw',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 24px 64px rgba(0,0,0,.35)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'linear-gradient(135deg,#1a3a5c,#2c5f8a)', color: '#fff' }}>
              <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1rem', flex: 1 }}>
                <i className="bi bi-envelope-paper-fill" style={{ marginRight: 8 }}></i>
                Email Preview
              </h3>
              <button onClick={() => setShowClaimEmailPreview(false)} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 18, lineHeight: 1
              }}>✕</button>
            </div>
            <div style={{ padding: 0, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ background: '#f8f9fa', padding: '14px 20px', borderBottom: '1px solid #dee2e6', fontSize: '0.85rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, color: '#6c757d', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>To</label>
                    <input value={claimEmailTo} onChange={e => setClaimEmailTo(e.target.value)}
                      placeholder="inspector@example.com"
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #dee2e6', fontSize: '0.85rem', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, color: '#6c757d', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Cc</label>
                    <input value={claimEmailCc} onChange={e => setClaimEmailCc(e.target.value)}
                      placeholder="supervisor@example.com"
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #dee2e6', fontSize: '0.85rem', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#6c757d', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Subject</label>
                  <input value={claimEmailSubject} onChange={e => setClaimEmailSubject(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #dee2e6', fontSize: '0.85rem', fontWeight: 600, color: '#1a3a5c', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ padding: '20px 24px', maxHeight: '50vh', overflowY: 'auto', background: '#f0f2f5' }}>
                <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', overflow: 'hidden' }}
                  dangerouslySetInnerHTML={{ __html: claimEmailBody }} />
              </div>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', background: '#f8f9fa',
              display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowClaimEmailPreview(false)} style={{
                padding: '7px 16px', borderRadius: 8, border: '1px solid #e2e8f0',
                background: '#fff', cursor: 'pointer', fontWeight: 600, color: '#64748b'
              }}>
                <i className="bi bi-x-lg" style={{ marginRight: 4 }}></i>
                Cancel
              </button>
              <button onClick={handleConfirmSendClaimEmail} disabled={sendingClaimEmail || !claimEmailTo.trim()} style={{
                padding: '7px 20px', borderRadius: 8, background: '#1a3a5c',
                color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600,
                opacity: (sendingClaimEmail || !claimEmailTo.trim()) ? 0.5 : 1
              }}>
                <i className="bi bi-send-fill" style={{ marginRight: 4 }}></i>
                {sendingClaimEmail ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Similar Claims Modal */}
      {showSimilarModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }} onClick={e => { if (e.target === e.currentTarget) setShowSimilarModal(false) }}>
          <div style={{ background: '#fff', borderRadius: 12, width: 720, maxWidth: '95vw',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
            <div style={{
              background: 'linear-gradient(135deg,#f59e0b,#d97706)',
              padding: '14px 20px', borderRadius: '12px 12px 0 0',
              display: 'flex', alignItems: 'center', gap: 10
            }}>
              <span style={{ fontSize: 18 }}>⚠</span>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>
                Similar Claims Alert
              </span>
              <button onClick={() => setShowSimilarModal(false)} style={{
                marginLeft: 'auto', background: 'rgba(255,255,255,0.2)', border: 'none',
                color: '#fff', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 700
              }}>✕</button>
            </div>
            <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
              {similarClaims.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>
                  No similar claims found for this vendor.
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 13, color: '#64748b', marginTop: 0 }}>
                    Found <strong>{similarClaims.length}</strong> claim(s) from the same factory with matching defect category or root cause.
                  </p>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#1a3a5c' }}>
                        {['Claim No.', 'Vendor', 'Defect Category', 'Root Cause', 'Date'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: 'left',
                            color: '#fff', fontSize: '0.72rem', fontWeight: 700 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {similarClaims.map((c: any, i) => (
                        <tr key={c.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '7px 12px', fontWeight: 600, color: '#1a3a5c' }}>{c.claimNo}</td>
                          <td style={{ padding: '7px 12px' }}>{c.vendor}</td>
                          <td style={{ padding: '7px 12px' }}>{c.defectCategory || '—'}</td>
                          <td style={{ padding: '7px 12px' }}>{c.rcaStructured?.rootCauseCategory || '—'}</td>
                          <td style={{ padding: '7px 12px' }}>{c.claimDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              <div style={{ marginTop: 16, borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 10 }}>
                  Send Email Alert — Recipients
                </div>
                {/* To Field */}
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                    To (Inspectors — {claim.factoryAgent})
                  </label>
                  <input
                    value={users
                      .filter(u => u.factoryAgent === claim.factoryAgent && u.role === 'INSPECTOR')
                      .map(u => u.email)
                      .filter(Boolean)
                      .join('; ')}
                    readOnly
                    style={{
                      width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0',
                      fontSize: 12, background: '#f8fafc', color: '#64748b', boxSizing: 'border-box'
                    }}
                  />
                </div>
                {/* CC Field */}
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                    CC (Admin/Supervisor/Manager — {claim.factoryAgent})
                  </label>
                  <input
                    value={users
                      .filter(u =>
                        u.factoryAgent === claim.factoryAgent &&
                        (u.role === 'ADMIN' || u.role === 'SUPERVISOR' || u.role === 'MANAGER')
                      )
                      .map(u => u.email)
                      .filter(Boolean)
                      .join('; ')}
                    readOnly
                    style={{
                      width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0',
                      fontSize: 12, background: '#f8fafc', color: '#64748b', boxSizing: 'border-box'
                    }}
                  />
                </div>

              </div>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0',
              display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowSimilarModal(false)} style={{
                padding: '7px 16px', borderRadius: 8, border: '1px solid #e2e8f0',
                background: '#fff', cursor: 'pointer', fontWeight: 600, color: '#64748b'
              }}>Dismiss</button>
              <button onClick={handleSendSimilarAlert} disabled={sendingSimilar || similarClaims.length === 0} style={{
                padding: '7px 16px', borderRadius: 8, background: '#f59e0b',
                color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600,
                opacity: (sendingSimilar || similarClaims.length === 0) ? 0.5 : 1
              }}>{sendingSimilar ? 'Sending...' : 'Send Email Alert'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Risk Alert Email Modal */}
      {showRiskAlertModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div style={{ background: '#fff', borderRadius: 14, width: 900, maxWidth: '96vw',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 24px 64px rgba(0,0,0,.35)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'linear-gradient(135deg,#d97706,#f59e0b)', color: '#fff' }}>
              <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1rem', flex: 1 }}>
                <i className="bi bi-envelope-exclamation-fill" style={{ marginRight: 8 }}></i>
                Risk Alert Email Preview
              </h3>
              <button onClick={() => setShowRiskAlertModal(false)} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 18, lineHeight: 1
              }}>✕</button>
            </div>
            <div style={{ padding: 0, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ background: '#fffbeb', padding: '14px 20px', borderBottom: '1px solid #fcd34d', fontSize: '0.85rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, color: '#92400e', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>To (Inspectors)</label>
                    <input value={riskAlertTo} onChange={e => setRiskAlertTo(e.target.value)}
                      placeholder="inspector@example.com"
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #fcd34d', fontSize: '0.85rem', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, color: '#92400e', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Cc (Supervisors/Admin)</label>
                    <input value={riskAlertCc} onChange={e => setRiskAlertCc(e.target.value)}
                      placeholder="supervisor@example.com"
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #fcd34d', fontSize: '0.85rem', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#92400e', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Subject</label>
                  <input value={riskAlertSubject} onChange={e => setRiskAlertSubject(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #fcd34d', fontSize: '0.85rem', fontWeight: 600, color: '#b45309', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ padding: '20px 24px', maxHeight: '50vh', overflowY: 'auto', background: '#f0f4f8' }}>
                <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', overflow: 'hidden' }}
                  dangerouslySetInnerHTML={{ __html: riskAlertBody }} />
              </div>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', background: '#f8f9fa',
              display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowRiskAlertModal(false)} style={{
                padding: '7px 16px', borderRadius: 8, border: '1px solid #e2e8f0',
                background: '#fff', cursor: 'pointer', fontWeight: 600, color: '#64748b'
              }}>
                <i className="bi bi-x-lg" style={{ marginRight: 4 }}></i>
                Cancel
              </button>
              <button onClick={sendRiskAlertEmail} disabled={sendingRiskAlert || !riskAlertTo.trim()} style={{
                padding: '7px 20px', borderRadius: 8, background: 'linear-gradient(135deg,#d97706,#f59e0b)',
                color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600,
                opacity: (sendingRiskAlert || !riskAlertTo.trim()) ? 0.5 : 1
              }}>
                <i className="bi bi-send-fill" style={{ marginRight: 4 }}></i>
                {sendingRiskAlert ? 'Sending...' : 'Send Risk Alert'}
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={showRejectConfirm}
        title="Reject RCA"
        message={`Are you sure you want to reject the RCA for claim ${claim?.claimNo}? This action cannot be undone.`}
        confirmLabel="Reject"
        variant="danger"
        onConfirm={confirmReject}
        onCancel={() => setShowRejectConfirm(false)}
      />
    </div>
  )
}

export default ClaimDetailPage
