import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getVendorStats, getStatusStats, getDefectStats, getInspectorStats,
  getRcaStatusStats, getRcaKpis, getMonthlyTrend
} from '../../services/analyticsService'
import { AIConfig, getAIModelName, saveAIConfig, getAIConfig } from '../../services/aiService'
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend
} from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, ChartDataLabels)

// V8 Chart Colors PALETTE
const PALETTE = ['#2563eb','#10b981','#f59e0b','#ef4444','#8b5cf6',
                 '#06b6d4','#ec4899','#f97316','#14b8a6','#6366f1']
const BLUE = '#2563eb'

// Status colors matching V8
const STATUS_CFG: Record<string, { color: string; bg: string }> = {
  'OPEN': { color: '#f59e0b', bg: '#fffbeb' },
  'IN_PROGRESS': { color: '#3b82f6', bg: '#eff6ff' },
  'CLOSED': { color: '#10b981', bg: '#f0fdf4' },
}

// ═══════════════════════════════════════════════════════════════════════════════
// CSS Variables (matching V8)
// ═══════════════════════════════════════════════════════════════════════════════
const CSS_VARS = {
  '--primary': '#1a3a5c',
  '--secondary': '#2c5f8a',
  '--accent': '#3b82f6',
  '--bg-card': '#ffffff',
  '--bg-page': '#f0f4f8',
  '--bg-subtle': '#f8fafc',
  '--border': '#e2e8f0',
  '--border-strong': '#cbd5e1',
  '--text-primary': '#0f172a',
  '--text-secondary': '#475569',
  '--text-muted': '#64748b',
  '--radius-lg': '12px',
  '--radius-md': '8px',
  '--radius-xl': '16px',
  '--shadow-sm': '0 1px 3px rgba(15,23,42,0.08)',
  '--shadow-md': '0 4px 12px rgba(15,23,42,0.12)',
  '--shadow-lg': '0 8px 24px rgba(15,23,42,0.16)',
  '--shadow-xs': '0 1px 2px rgba(15,23,42,0.05)',
  '--transition': '0.2s ease',
} as React.CSSProperties

// ═══════════════════════════════════════════════════════════════════════════════
// Stat Card Component (V8 Style)
// ═══════════════════════════════════════════════════════════════════════════════

interface StatCardProps {
  value: number | string
  label: string
  icon: string
  variant: 'total' | 'open' | 'inProgress' | 'overdue' | 'pending' | 'approved'
  clickable?: boolean
  onClick?: () => void
  id?: string
  ragThresholds?: { g: number; a: number }
}

// RAG status helper: returns color based on value against green/amber thresholds
const getRagColor = (val: number, g: number, a: number): string => {
  if (val <= g) return '#22c55e' // green
  if (val <= a) return '#f59e0b' // amber
  return '#ef4444' // red
}

const StatCard: React.FC<StatCardProps> = ({ value, label, icon, variant, clickable, onClick, id, ragThresholds }) => {
  const variantStyles: Record<string, { accent: string; iconBg: string; gradient: string; border: string }> = {
    total: { accent: '#3b82f6', iconBg: 'rgba(59,130,246,0.10)', gradient: 'var(--bg-card)', border: 'var(--border)' },
    open: { accent: '#f59e0b', iconBg: 'rgba(245,158,11,0.10)', gradient: 'var(--bg-card)', border: 'var(--border)' },
    inProgress: { accent: '#0284c7', iconBg: 'rgba(14,165,233,0.15)', gradient: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)', border: '#bae6fd' },
    overdue: { accent: '#ef4444', iconBg: 'rgba(239,68,68,0.15)', gradient: 'linear-gradient(135deg,#fef2f2,#fee2e2)', border: '#fecaca' },
    pending: { accent: '#2563eb', iconBg: 'rgba(59,130,246,0.15)', gradient: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: '#bfdbfe' },
    approved: { accent: '#16a34a', iconBg: 'rgba(34,197,94,0.15)', gradient: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '#bbf7d0' },
  }

  const vs = variantStyles[variant]

  // Calculate RAG border color if thresholds provided
  const numericValue = typeof value === 'number' ? value : parseInt(String(value), 10) || 0
  const ragColor = ragThresholds ? getRagColor(numericValue, ragThresholds.g, ragThresholds.a) : null

  return (
    <div
      id={id}
      onClick={onClick}
      className={`stat-card stat-card-clickable stat-card-${variant}`}
      style={{
        background: vs.gradient,
        borderRadius: 'var(--radius-lg)',
        padding: '14px 16px',
        boxShadow: 'var(--shadow-sm)',
        border: `1px solid ${vs.border}`,
        borderLeft: ragColor ? `4px solid ${ragColor}` : `1px solid ${vs.border}`,
        transition: 'transform var(--transition), box-shadow var(--transition)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        cursor: clickable ? 'pointer' : 'default',
        height: '100%',
        ...CSS_VARS,
      }}
      onMouseEnter={e => {
        if (clickable) {
          e.currentTarget.style.transform = 'translateY(-4px)'
          e.currentTarget.style.boxShadow = 'var(--shadow-md)'
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
      }}
    >
      {/* Top accent line */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: '3px',
        background: vs.accent,
        borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
      }} />

      {/* Icon */}
      <div className="stat-icon-wrap" style={{
        width: '38px',
        height: '38px',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        background: vs.iconBg,
      }}>
        <i className={`bi bi-${icon}`} style={{ fontSize: '1.1rem', color: vs.accent }} />
      </div>

      {/* Content */}
      <div className="stat-body" style={{ flex: 1, minWidth: 0 }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: 800,
          margin: '0 0 1px',
          lineHeight: 1,
          color: variant === 'total' || variant === 'open' ? 'var(--text-primary)' : vs.accent,
          letterSpacing: '-0.03em',
        }}>{value}</h2>
        <p style={{
          margin: 0,
          fontSize: '0.78rem',
          color: 'var(--text-secondary)',
          fontWeight: 500,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          {label}
          {clickable && (
            <i className="bi bi-arrow-right-circle-fill stat-arrow" style={{
              fontSize: '0.78rem',
              color: vs.accent,
              opacity: 0,
              transition: 'opacity 0.18s',
            }} />
          )}
        </p>
      </div>

      <style>{`
        .stat-card-clickable:hover .stat-arrow { opacity: 1 !important; }
      `}</style>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI Chat Component - exactly matching V8 version
// ═══════════════════════════════════════════════════════════════════════════════

interface ChatMessage {
  id: number
  type: 'ai' | 'user'
  content: string
  filter?: any
}

// Generate AI response with filter info
const generateAIResponseWithFilter = (input: string): { text: string; filter?: any } => {
  const query = input.toLowerCase()
  if (query.includes('vendor') || query.includes('top')) {
    return {
      text: '📊 <strong>Top Vendors Analysis</strong><br><br>Based on current data:<br>• Factory D: 8 (# of claim) / 815 (claim qty)<br>• Factory C: 8 (# of claim) / 720 (claim qty)<br>• Factory A: 8 (# of claim) / 595 (claim qty)<br>• Factory B: 8 (# of claim) / 570 (claim qty)<br><br>Factory D has the highest claim quantity.',
      filter: { type: 'vendor', value: 'Factory D' }
    }
  } else if (query.includes('trend') || query.includes('month')) {
    return {
      text: '📈 <strong>Monthly Trends</strong><br><br>Claim volume by month:<br>• Jan 2026: 8 (# of claim) / 595 (claim qty)<br>• Feb 2026: 8 (# of claim) / 670 (claim qty)<br>• Mar 2026: 8 (# of claim) / 670 (claim qty)<br>• Apr 2026: 8 (# of claim) / 695 (claim qty)<br><br>Claim quantity has been increasing.',
      filter: null
    }
  } else if (query.includes('inspector')) {
    return {
      text: '👤 <strong>Claims by Inspector</strong><br><br>Current distribution:<br>• Andy Ma: 8 (# of claim) / 595 (claim qty)<br>• Rain Li: 8 (# of claim) / 570 (claim qty)<br>• Alan Huang: 8 (# of claim) / 720 (claim qty)<br>• Tony Chen: 8 (# of claim) / 815 (claim qty)<br><br>Tony Chen has the highest claim quantity.',
      filter: { type: 'inspector', value: 'Tony Chen' }
    }
  } else if (query.includes('defect')) {
    return {
      text: '🔍 <strong>Top Defect Categories</strong><br><br>Most common issues:<br>• Color Issue: 5 claims<br>• Delivery: 5 claims<br>• Quantity: 4 claims<br>• Packaging: 4 claims<br>• Label: 4 claims',
      filter: { type: 'defect', value: 'Color Issue' }
    }
  } else if (query.includes('overdue')) {
    return {
      text: '⏰ <strong>Overdue RCA Claims</strong><br><br>There are 12 claims with overdue RCA reports:<br>• CLM-2026-001 (Factory A)<br>• CLM-2026-004 (Factory D)<br>• CLM-2026-007 (Factory C)<br>• And 9 more...',
      filter: { type: 'overdue' }
    }
  } else if (query.includes('summary')) {
    return {
      text: '📋 <strong>Summary Report</strong><br><br>Current Status:<br>• Total Claims: 32 (# of claim) / 2,630 (claim qty)<br>• Open: 12 (# of claim) / 1,095 (claim qty)<br>• In Progress: 8 (# of claim) / 640 (claim qty)<br>• Closed: 12 (# of claim) / 895 (claim qty)',
      filter: null
    }
  } else if (query.includes('repeat') || query.includes('offender')) {
    return {
      text: '🔁 <strong>Repeat Offender Vendors</strong> (≥3 claims)<br>• Factory A: 5 claims<br>• Factory B: 5 claims<br>• Factory C: 5 claims<br>• Factory D: 5 claims',
      filter: { type: 'vendor', value: 'Factory A' }
    }
  } else if (query.includes('sla') || query.includes('compliance')) {
    return {
      text: '📏 <strong>SLA Compliance:</strong> 75.0% (9/12 closed within 7 days)',
      filter: null
    }
  } else if (query.includes('financial') || query.includes('impact')) {
    return {
      text: '💰 <strong>Financial Impact — Claim Quantity</strong><br><strong>Total claimed:</strong> 2,630 pcs<br><br><strong>Top 5 by Claim Qty:</strong><br>• Factory D: 815 pcs<br>• Factory C: 720 pcs<br>• Factory A: 595 pcs<br>• Factory B: 570 pcs',
      filter: { type: 'vendor', value: 'Factory D' }
    }
  }
  return {
    text: `🤖 I've analyzed your request: "<em>${input}</em>"<br><br>I can help with claims analysis, trends, vendor statistics, inspector workloads, defect categories, and overdue RCA tracking.`,
    filter: null
  }
}

// Build filter button HTML
const buildFilterButton = (filter: any): string => {
  if (!filter) return ''
  let btnText = '🔍 View Claims'
  switch (filter.type) {
    case 'vendor':
      btnText = `→ Filter: ${filter.value}`
      break
    case 'defect':
      btnText = `→ Filter: ${filter.value}`
      break
    case 'inspector':
      btnText = `→ Filter: ${filter.value}`
      break
    case 'overdue':
      btnText = '→ View Overdue RCA'
      break
    case 'closed':
      btnText = '→ View Closed Claims'
      break
    case 'open':
      btnText = '→ View Open Claims'
      break
  }
  return `<div style="margin-top:8px;"><button class="ai-filter-btn" data-filter='${JSON.stringify(filter)}' style="font-size:0.75rem;padding:6px 12px;background:#1a3a5c;border:none;color:#fff;border-radius:20px;cursor:pointer;font-weight:500;">${btnText}</button></div>`
}

const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [modelName, setModelName] = useState(getAIModelName())
  const [showSettings, setShowSettings] = useState(false)
  const [aiConfig, setAIConfig] = useState<AIConfig>({
    provider: 'local',
    apiKey: '',
    endpoint: '',
    model: ''
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem('ai_config')
    if (saved) {
      setAIConfig(JSON.parse(saved))
    }
  }, [])

  const handleSaveConfig = () => {
    saveAIConfig(aiConfig)
    setModelName(getAIModelName())
    setShowSettings(false)
  }

  // V8-style welcome links (exactly matching V8 dashboard)
  const welcomeLinks = [
    { icon: '📊', text: 'Show top 5 vendors with most claims', query: 'Show top 5 vendors with most claims' },
    { icon: '📈', text: 'Display monthly claim trends', query: 'Display monthly claim trends' },
    { icon: '👤', text: 'Claims by inspector analysis', query: 'Which inspector has the most claims?' },
    { icon: '📋', text: 'Generate summary report', query: 'Generate summary report' },
    { icon: '🔍', text: 'Top defect categories analysis', query: 'Top defect categories' },
    { icon: '⏰', text: 'Show overdue RCA claims', query: 'Show overdue RCA claims' },
  ]

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current && messagesEndRef.current) {
      const container = messagesContainerRef.current
      container.scrollTop = container.scrollHeight
    }
  }, [messages])

  const handleSend = () => {
    if (!input.trim()) return
    const userMsg: ChatMessage = { id: Date.now(), type: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')

    setTimeout(() => {
      const { text: responseText, filter } = generateAIResponseWithFilter(input)
      const filterBtn = buildFilterButton(filter)
      setMessages(prev => [...prev, { id: Date.now() + 1, type: 'ai', content: responseText + filterBtn, filter }])
    }, 800)
  }

  // V8-style suggestion buttons (exactly matching V8 dashboard - 6 buttons)
  const suggestions = [
    { icon: '📊', text: 'Top Vendors', query: 'Show top 5 vendors with most claims' },
    { icon: '📈', text: 'Trends', query: 'Show monthly claim trends' },
    { icon: '👤', text: 'Inspectors', query: 'Which inspector has the most claims?' },
    { icon: '📋', text: 'Summary', query: 'Generate summary report' },
    { icon: '🔍', text: 'Defects', query: 'Top defect categories' },
    { icon: '⏰', text: 'Overdue', query: 'Show overdue RCA claims' },
  ]

  // V8-style suggest: set query and auto-send
  const suggest = (query: string) => {
    const userMsg: ChatMessage = { id: Date.now(), type: 'user', content: query }
    setMessages(prev => [...prev, userMsg])

    setTimeout(() => {
      const { text: responseText, filter } = generateAIResponseWithFilter(query)
      const filterBtn = buildFilterButton(filter)
      setMessages(prev => [...prev, { id: Date.now() + 1, type: 'ai', content: responseText + filterBtn, filter }])
    }, 800)
  }

  // Handle filter button clicks
  const handleMessageClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.classList.contains('ai-filter-btn')) {
      const filterData = target.getAttribute('data-filter')
      if (filterData) {
        const filter = JSON.parse(filterData)
        applyAIFilter(filter)
      }
    }
  }

  const applyAIFilter = (filter: any) => {
    if (!filter || !filter.type) return
    window.dispatchEvent(new CustomEvent('ai-filter', { detail: filter }))
  }

  return (
    <div className="ai-chat-container" style={{
      background: 'var(--bg-card)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
      border: '1px solid var(--border)',
      minHeight: '380px',
      display: 'flex',
      flexDirection: 'column',
      ...CSS_VARS,
    }}>
      {/* Header */}
      <div className="chat-header" style={{
        padding: '11px 18px',
        background: 'linear-gradient(135deg, #1e4270, #2c5f8a)',
        color: 'white',
        fontSize: '0.875rem',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span className="ai-dot" style={{
          width: '7px',
          height: '7px',
          background: '#4ade80',
          borderRadius: '50%',
          display: 'inline-block',
          animation: 'pulse-dot 2s infinite',
        }} />
        <span>AI Assistant</span>
        <span style={{ marginLeft: 'auto', fontWeight: 400, opacity: 0.75, fontSize: '0.78rem' }}>
          {modelName}
        </span>
        <button
          onClick={() => setShowSettings(!showSettings)}
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            opacity: 0.7,
            padding: '2px 6px',
            fontSize: '0.85rem'
          }}
          title="AI Settings"
        >
          ⚙️
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div style={{
          padding: '12px 16px',
          background: '#f8fafc',
          borderBottom: '1px solid var(--border)',
          fontSize: '0.8rem'
        }}>
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, color: 'var(--text-primary)' }}>AI Provider</label>
            <select
              value={aiConfig.provider}
              onChange={(e) => setAIConfig({ ...aiConfig, provider: e.target.value as any })}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                fontSize: '0.8rem',
                background: 'var(--bg-card)'
              }}
            >
              <option value="local">🖥️ Local Analysis (No API Key)</option>
              <option value="openai">🤖 OpenAI (GPT)</option>
              <option value="azure">☁️ Azure OpenAI</option>
              <option value="claude">🧠 Claude (Anthropic)</option>
            </select>
          </div>

          {aiConfig.provider !== 'local' && (
            <>
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, color: 'var(--text-primary)' }}>API Key</label>
                <input
                  type="password"
                  value={aiConfig.apiKey || ''}
                  onChange={(e) => setAIConfig({ ...aiConfig, apiKey: e.target.value })}
                  placeholder="Enter your API key"
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    fontSize: '0.8rem',
                    background: 'var(--bg-card)'
                  }}
                />
              </div>

              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, color: 'var(--text-primary)' }}>
                  Endpoint URL {aiConfig.provider === 'openai' && '(Optional)'}
                </label>
                <input
                  type="text"
                  value={aiConfig.endpoint || ''}
                  onChange={(e) => setAIConfig({ ...aiConfig, endpoint: e.target.value })}
                  placeholder={aiConfig.provider === 'openai' ? 'https://api.openai.com/v1/chat/completions' : 'Enter endpoint URL'}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    fontSize: '0.8rem',
                    background: 'var(--bg-card)'
                  }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, color: 'var(--text-primary)' }}>
                  Model {aiConfig.provider === 'local' && '(N/A)'}
                </label>
                <input
                  type="text"
                  value={aiConfig.model || ''}
                  onChange={(e) => setAIConfig({ ...aiConfig, model: e.target.value })}
                  placeholder={
                    aiConfig.provider === 'openai' ? 'gpt-3.5-turbo' :
                    aiConfig.provider === 'claude' ? 'claude-3-haiku-20240307' : 'Enter model name'
                  }
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    fontSize: '0.8rem',
                    background: 'var(--bg-card)'
                  }}
                />
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSaveConfig}
              style={{
                flex: 1,
                padding: '6px 12px',
                background: '#1a3a5c',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 500
              }}
            >
              Save
            </button>
            <button
              onClick={() => setShowSettings(false)}
              style={{
                flex: 1,
                padding: '6px 12px',
                background: 'var(--bg-subtle)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={messagesContainerRef} className="chat-messages" style={{
        flex: 1,
        overflowY: 'auto',
        padding: '14px 16px',
        background: 'var(--bg-subtle)',
      }}>
        {/* Welcome message with clickable links - always visible */}
        <div className="chat-message ai" style={{
          marginBottom: '10px',
          display: 'flex',
          justifyContent: 'flex-start',
        }}>
          <div className="chat-bubble" style={{
            maxWidth: '74%',
            padding: '9px 13px',
            borderRadius: '16px 16px 16px 2px',
            fontSize: '0.85rem',
            lineHeight: 1.55,
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            boxShadow: 'var(--shadow-xs)',
            border: '1px solid var(--border)',
          }}>
            <div>🤖 <strong>AI Assistant Ready!</strong></div>
            <div style={{ marginTop: '8px' }}>I can help you with:</div>
            <div style={{ marginTop: '6px' }}>
              {welcomeLinks.map((link, idx) => (
                <div key={idx} style={{ margin: '3px 0' }}>
                  •{' '}
                  <a
                    onClick={() => suggest(link.query)}
                    style={{
                      color: 'var(--accent, #3b82f6)',
                      fontWeight: 500,
                      textDecoration: 'none',
                      cursor: 'pointer',
                      borderBottom: '1px dashed transparent',
                      transition: 'color .15s, border-color .15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--primary, #1a3a5c)'
                      e.currentTarget.style.borderBottomColor = 'var(--accent, #3b82f6)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--accent, #3b82f6)'
                      e.currentTarget.style.borderBottomColor = 'transparent'
                    }}
                  >
                    {link.icon} {link.text}
                  </a>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '10px' }}>
              <strong>Try asking me something!</strong>
            </div>
          </div>
        </div>
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`chat-message ${msg.type}`}
            style={{
              marginBottom: '10px',
              display: 'flex',
              justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start',
            }}
            onClick={msg.type === 'ai' ? handleMessageClick : undefined}
          >
            <div className="chat-bubble" style={{
              maxWidth: '74%',
              padding: '9px 13px',
              borderRadius: msg.type === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
              fontSize: '0.85rem',
              lineHeight: 1.55,
              background: msg.type === 'user' ? 'var(--primary)' : 'var(--bg-card)',
              color: msg.type === 'user' ? 'white' : 'var(--text-primary)',
              boxShadow: msg.type === 'user' ? '0 2px 8px rgba(26,58,92,0.22)' : 'var(--shadow-xs)',
              border: msg.type === 'user' ? 'none' : '1px solid var(--border)',
            }}
              dangerouslySetInnerHTML={{ __html: msg.content }}
            />
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      <div style={{
        padding: '8px 14px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-card)',
      }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
        }}>
          {suggestions.map(s => (
            <button
              key={s.text}
              className="btn btn-sm btn-outline-secondary btn-suggestion"
              onClick={() => suggest(s.query)}
              style={{
                padding: '5px 10px',
                fontSize: '0.75rem',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                background: 'var(--bg-card)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#eff6ff'
                e.currentTarget.style.borderColor = 'var(--accent)'
                e.currentTarget.style.color = 'var(--accent)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--bg-card)'
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.color = 'var(--text-secondary)'
              }}
            >
              {s.icon} {s.text}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="chat-input-area" style={{
        padding: '10px 14px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        gap: '8px',
        background: 'var(--bg-card)',
      }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Ask me about claims data..."
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.9rem',
            outline: 'none',
            background: 'var(--bg-card)',
          }}
        />
        <button
          onClick={handleSend}
          style={{
            padding: '8px 16px',
            background: 'var(--accent)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <i className="bi bi-send"></i> Send
        </button>
      </div>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
      `}</style>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Chart Card Component (V8 Style)
// ═══════════════════════════════════════════════════════════════════════════════

type ChartType = 'bar' | 'line' | 'doughnut' | 'pie' | 'bar-v' | 'bar-h'

interface ChartCardProps {
  id: string
  title: string
  icon: string
  data: any
  defaultType: ChartType
  allowedTypes: ChartType[]
  horizontal?: boolean
  hint?: string
  onNavigate?: (label?: string) => void
  onGripMouseDown?: () => void
  onGripMouseUp?: () => void
  isDragging?: boolean
  initialHeight?: number
  onHeightChange?: (height: number) => void
  initialWidth?: number
  onWidthChange?: (cols: number) => void
}

// Bootstrap column width options (like V8)
const COL_SNAPS = [
  { cols: 4, label: '1/3', cls: 'col-md-4' },
  { cols: 6, label: '1/2', cls: 'col-md-6' },
  { cols: 8, label: '2/3', cls: 'col-md-8' },
  { cols: 12, label: 'Full', cls: 'col-md-12' },
]

const CHART_HEIGHT_KEY = 'cms_chart_heights'

const ChartCard: React.FC<ChartCardProps> = ({
  id, title, icon, data, defaultType, allowedTypes, horizontal, hint,
  onNavigate, onGripMouseDown, onGripMouseUp, isDragging,
  initialHeight = 320, onHeightChange, initialWidth = 6, onWidthChange
}) => {
  const [type, setType] = useState<ChartType>(defaultType)
  const [showLabels, setShowLabels] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const [showTypeMenu, setShowTypeMenu] = useState(false)
  const [panelHeight, setPanelHeight] = useState(initialHeight)
  const [isResizingH, setIsResizingH] = useState(false)
  const [isResizingW, setIsResizingW] = useState(false)
  const [isResizingCorner, setIsResizingCorner] = useState(false)
  const [snapLabel, setSnapLabel] = useState<string>(() => {
    const snap = COL_SNAPS.find(s => s.cols === initialWidth)
    return snap?.label || '1/2'
  })
  const chartRef = useRef<any>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowTypeMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleDownload = () => {
    // Get canvas from chartRef (react-chartjs-2 stores chart instance)
    const chart = chartRef.current
    if (!chart) return
    
    // Try to get canvas from different possible locations
    const canvas = chart.canvas || chart.ctx?.canvas
    if (!canvas) return
    
    const link = document.createElement('a')
    link.download = `${title.replace(/\s+/g, '-').toLowerCase()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  // Height resize handler (bottom handle)
  const handleResizeHStart = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizingH(true)
    const startY = e.clientY
    const startH = panelHeight

    const handleMove = (ev: MouseEvent) => {
      const newH = Math.max(220, startH + ev.clientY - startY)
      setPanelHeight(newH)
    }

    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
      setIsResizingH(false)
      if (onHeightChange) {
        onHeightChange(panelHeight)
      }
      // Trigger chart resize
      if (chartRef.current) {
        chartRef.current.resize()
      }
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
  }

  // Width resize handler (right handle - snap to Bootstrap cols)
  const handleResizeWStart = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!onWidthChange) return
    setIsResizingW(true)
    const startX = e.clientX
    const gridEl = document.getElementById('chartsGrid')
    const gridW = gridEl?.offsetWidth || window.innerWidth
    const startCols = initialWidth
    let lastSnap = startCols

    const handleMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX
      const rawCols = startCols + Math.round((dx / gridW) * 12)
      // Find nearest snap
      const nearest = COL_SNAPS.reduce((prev, cur) =>
        Math.abs(cur.cols - rawCols) < Math.abs(prev.cols - rawCols) ? cur : prev
      )
      if (nearest.cols !== lastSnap) {
        lastSnap = nearest.cols
        setSnapLabel(nearest.label)
        onWidthChange(nearest.cols)
        // Trigger chart resize after width change
        setTimeout(() => chartRef.current?.resize(), 50)
      }
    }

    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
      setIsResizingW(false)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
  }

  // Corner resize handler (both width and height)
  const handleResizeCornerStart = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!onWidthChange || !onHeightChange) return
    setIsResizingCorner(true)
    const startX = e.clientX
    const startY = e.clientY
    const startH = panelHeight
    const gridEl = document.getElementById('chartsGrid')
    const gridW = gridEl?.offsetWidth || window.innerWidth
    const startCols = initialWidth
    let lastSnap = startCols

    const handleMove = (ev: MouseEvent) => {
      // Handle height change
      const dy = ev.clientY - startY
      const newH = Math.max(220, startH + dy)
      setPanelHeight(newH)

      // Handle width change
      const dx = ev.clientX - startX
      const rawCols = startCols + Math.round((dx / gridW) * 12)
      const nearest = COL_SNAPS.reduce((prev, cur) =>
        Math.abs(cur.cols - rawCols) < Math.abs(prev.cols - rawCols) ? cur : prev
      )
      if (nearest.cols !== lastSnap) {
        lastSnap = nearest.cols
        setSnapLabel(nearest.label)
        onWidthChange(nearest.cols)
      }
    }

    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
      setIsResizingCorner(false)
      // Save final values
      onHeightChange(panelHeight)
      setTimeout(() => chartRef.current?.resize(), 50)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
  }

  const isHorizontal = type === 'bar-h' || (type === 'bar' && horizontal)
  const isDoughnut = type === 'doughnut'
  const isPie = type === 'pie'
  const isLine = type === 'line'

  // V8 Chart Options
  const FONT = "'Segoe UI', Roboto, sans-serif"
  const axisStyle = {
    grid: { color: 'rgba(0,0,0,0.04)', lineWidth: 1 },
    ticks: { font: { family: FONT, size: 10 }, color: '#94a3b8' },
    border: { display: false }
  }

  // Datalabels base config (V8 style)
  const dlBase = {
    display: showLabels,
    font: { family: FONT, size: 10, weight: '700' },
    padding: { top: 2, bottom: 2, left: 4, right: 4 },
    borderRadius: 3,
  }

  // Calculate max value for conditional display
  const dataValues = data.datasets[0]?.data || []
  const maxValue = Math.max(...dataValues, 1)
  const minValue = Math.min(...dataValues)

  // V8-style tooltip formatters
  const getTooltipLabel = (ctx: any) => {
    if (id === 'monthly') return ` Qty: ${ctx.parsed.y}  ↗ click to filter`
    if (id === 'status') {
      const total = dataValues.reduce((a: number, b: number) => a + b, 0)
      const val = ctx.parsed !== undefined ? ctx.parsed : ctx.raw
      const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0
      return ` ${ctx.label}: ${val} (${pct}%)  ↗ click to filter`
    }
    if (id === 'vendor') return ` Qty: ${ctx.parsed.y !== undefined ? ctx.parsed.y : ctx.parsed}  ↗ click to filter`
    return ` Claims: ${ctx.parsed.y !== undefined ? ctx.parsed.y : ctx.parsed.x !== undefined ? ctx.parsed.x : ctx.raw}  ↗ click to filter`
  }

  const opts: any = {
    maintainAspectRatio: false,
    indexAxis: isHorizontal ? ('y' as const) : ('x' as const),
    plugins: {
      legend: {
        display: isDoughnut || isPie,
        position: 'bottom' as const,
        labels: { padding: 16, usePointStyle: true, pointStyleWidth: 9, font: { family: FONT, size: 11 } }
      },
      tooltip: {
        backgroundColor: 'rgba(15,23,42,0.88)',
        titleFont: { family: FONT, size: 12, weight: '700' },
        bodyFont: { family: FONT, size: 12 },
        padding: 11,
        cornerRadius: 8,
        displayColors: true,
        boxPadding: 4,
        callbacks: {
          title: (ctx: any[]) => ctx[0]?.label || '',
          label: getTooltipLabel
        }
      },
      datalabels: isDoughnut || isPie ? {
        display: (ctx: any) => showLabels && ctx.dataset.data[ctx.dataIndex] > 0,
        anchor: 'center',
        align: 'center',
        color: '#fff',
        font: { family: FONT, size: isDoughnut ? 14 : 12, weight: '700' },
        textShadowBlur: 4,
        textShadowColor: 'rgba(0,0,0,0.4)',
        formatter: (v: number, ctx: any) => {
          if (!v) return ''
          // Both doughnut and pie: show value only
          return v
        }
      } : isLine ? {
        ...dlBase,
        anchor: 'end',
        align: 'top',
        offset: 2,
        color: BLUE,
        backgroundColor: 'rgba(37,99,235,0.08)',
        borderRadius: 3,
        formatter: (v: number) => v
      } : {
        ...dlBase,
        anchor: isHorizontal ? 'end' : 'end',
        align: isHorizontal ? 'right' : 'end',
        offset: isHorizontal ? 2 : 1,
        color: (ctx: any) => itemColors[ctx.dataIndex],
        backgroundColor: (ctx: any) => itemColors[ctx.dataIndex] + '18',
        formatter: (v: number) => v
      },
    },
    scales: isDoughnut || isPie ? { x: { display: false }, y: { display: false } } : {
      x: { ...axisStyle, grid: { display: false }, ticks: { ...axisStyle.ticks, maxRotation: isLine ? 40 : (isHorizontal ? 0 : 40) } },
      y: { ...axisStyle, beginAtZero: true, ticks: { ...axisStyle.ticks, precision: 0 } }
    },
    onClick: (_: any, elements: any[]) => {
      if (onNavigate && elements.length > 0) {
        const index = elements[0].index
        const label = data.labels?.[index]
        onNavigate(label)
      }
    },
    layout: { padding: isLine ? { top: 22, right: 8 } : { top: isDoughnut || isPie ? 0 : 22, right: isHorizontal ? 36 : 8, bottom: 4 } },
    cutout: isDoughnut ? '65%' : (isPie ? 0 : undefined),
    rotation: isDoughnut || isPie ? -90 : undefined,
    circumference: isDoughnut || isPie ? 360 : undefined,
    onHover: (e: any, els: any[]) => {
      if (e?.native?.target) {
        e.native.target.style.cursor = els.length ? 'pointer' : 'default'
      }
    }
  }

  // Generate colors based on V8 PALETTE
  const dataLength = data.labels?.length || 0
  const itemColors = data.labels?.map((_: any, i: number) => PALETTE[i % PALETTE.length]) || []

  const chartData = {
    ...data,
    datasets: data.datasets.map((ds: any, idx: number) => {
      // Status doughnut/pie uses STATUS_CFG colors (labels are display names like 'Open', 'In Progress', 'Closed')
      if (id === 'status' && (isDoughnut || isPie)) {
        const statusColorMap: Record<string, string> = {
          'Open': '#f59e0b',
          'In Progress': '#3b82f6',
          'Closed': '#10b981'
        }
        return {
          ...ds,
          backgroundColor: data.labels?.map((l: string) => statusColorMap[l] + 'cc' || PALETTE[0] + 'cc'),
          borderColor: data.labels?.map((l: string) => statusColorMap[l] || PALETTE[0]),
          borderWidth: 2.5,
          hoverOffset: 10,
          hoverBorderWidth: 3,
        }
      }
      // Line chart (monthly trend) uses gradient fill (V8 style with hex alpha)
      if (isLine) {
        return {
          ...ds,
          borderColor: BLUE,
          borderWidth: 2.5,
          pointBackgroundColor: '#fff',
          pointBorderColor: BLUE,
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: BLUE,
          tension: 0.42,
          fill: true,
          backgroundColor: (context: any) => {
            const chart = context.chart
            const { ctx, chartArea } = chart
            if (!chartArea) return 'rgba(37,99,235,0.08)'
            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
            // V8 style: hex color with alpha (0.28 = 47, 0.01 = 03)
            gradient.addColorStop(0, '#2563eb47')
            gradient.addColorStop(1, '#2563eb03')
            return gradient
          },
        }
      }
      // Bar charts use item-specific colors
      return {
        ...ds,
        backgroundColor: itemColors.map((c: string) => c + 'cc'),
        hoverBackgroundColor: itemColors,
        borderRadius: 6,
        borderSkipped: false,
        borderWidth: 0,
        barPercentage: 0.72,
      }
    }),
  }

  // Center text plugin for status doughnut only (not pie)
  const centerTextPlugin = id === 'status' && isDoughnut ? {
    id: 'centerText',
    afterDraw(chart: any) {
      const { ctx, chartArea } = chart
      if (!chartArea) return
      const { top, bottom, left, right } = chartArea
      // Get data directly from chart instance to ensure it's up to date
      const chartData = chart.data?.datasets?.[0]?.data || []
      const total = chartData.reduce((a: number, b: number) => a + b, 0)
      const cx = (left + right) / 2
      const cy = (top + bottom) / 2 - 8
      ctx.save()
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = `800 1.8rem ${FONT}`
      ctx.fillStyle = '#0f172a'
      ctx.fillText(total.toString(), cx, cy)
      ctx.font = `500 0.65rem ${FONT}`
      ctx.fillStyle = '#94a3b8'
      ctx.letterSpacing = '0.06em'
      ctx.fillText('TOTAL CLAIMS', cx, cy + 24)
      ctx.restore()
    }
  } : null

  const renderChart = () => {
    // Use key to force re-render when data changes to ensure plugins work correctly
    const chartKey = `${id}-${type}-${data.datasets[0]?.data?.join(',') || ''}`
    const chartProps: any = { ref: chartRef, data: chartData, options: opts }
    if (centerTextPlugin) {
      chartProps.plugins = [centerTextPlugin]
    }
    if (type === 'doughnut') return <Doughnut key={chartKey} {...chartProps} />
    if (type === 'pie') return <Pie key={chartKey} {...chartProps} />
    if (type === 'line') return <Line key={chartKey} {...chartProps} />
    return <Bar key={chartKey} {...chartProps} />
  }

  const getTypeIcon = (t: ChartType) => {
    switch (t) {
      case 'line': return 'graph-up'
      case 'bar':
      case 'bar-v': return 'bar-chart'
      case 'bar-h': return 'bar-chart-steps'
      case 'doughnut': return 'pie-chart'
      case 'pie': return 'pie-chart-fill'
      default: return 'bar-chart'
    }
  }

  const getTypeLabel = (t: ChartType) => {
    switch (t) {
      case 'line': return 'Line'
      case 'bar': return horizontal ? 'H-Bar' : 'Bar'
      case 'bar-v': return 'V-Bar'
      case 'bar-h': return 'H-Bar'
      case 'doughnut': return 'Doughnut'
      case 'pie': return 'Pie'
      default: return 'Bar'
    }
  }

  const chartPanelContent = (
    <div
      ref={panelRef}
      className={`chart-panel ${isDragging ? 'dragging' : ''} ${isResizingH || isResizingW ? 'resizing' : ''}`}
      style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: isDragging ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
        border: '1px solid var(--border)',
        marginBottom: '20px',
        position: 'relative',
        overflow: 'hidden',
        transition: 'box-shadow var(--transition), opacity 0.2s ease',
        opacity: isDragging ? 0.45 : 1,
        height: fullscreen ? 'auto' : panelHeight,
        minHeight: '220px',
        ...CSS_VARS,
      }}
    >
      <div className="chart-panel-inner" style={{
        padding: '18px 18px 12px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Title Bar */}
        <div className="chart-title" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          fontSize: '0.875rem',
          fontWeight: 700,
          color: 'var(--primary)',
          marginBottom: '14px',
          paddingBottom: '10px',
          borderBottom: '1px solid var(--bg-page)',
          letterSpacing: '-0.01em',
        }}>
          {!fullscreen && (
            <i
              className="bi bi-grip-vertical chart-drag-handle"
              onMouseDown={onGripMouseDown}
              onMouseUp={onGripMouseUp}
              onMouseLeave={onGripMouseUp}
              style={{ cursor: 'grab', color: 'var(--border-strong)', fontSize: '0.9rem', padding: '0 4px', flexShrink: 0 }}
              title="Drag to reorder"
            />
          )}
          <i className={`bi bi-${icon}`} style={{ color: 'var(--accent)', fontSize: '0.95rem' }} />
          <span style={{ flex: 1 }}>{title}</span>
          {hint && !fullscreen && (
            <span className="chart-nav-hint" style={{
              marginLeft: 'auto',
              fontSize: '0.67rem',
              fontWeight: 500,
              color: 'var(--text-muted)',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border)',
              borderRadius: '20px',
              padding: '2px 8px',
              whiteSpace: 'nowrap',
            }}>{hint}</span>
          )}

          {/* Toolbar */}
          <div className="chart-panel-toolbar" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginLeft: 'auto',
            flexShrink: 0,
          }}>
            {/* Type Selector */}
            <div className="chart-type-wrap" style={{ position: 'relative' }} ref={menuRef}>
              <button
                className="chart-tool-btn"
                onClick={() => setShowTypeMenu(!showTypeMenu)}
                title="Switch chart type"
                style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--text-secondary)',
                  width: '26px',
                  height: '26px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  transition: 'background var(--transition), color var(--transition), border-color var(--transition)',
                  flexShrink: 0,
                }}
              >
                <i className="bi bi-bar-chart-line" />
              </button>
              {showTypeMenu && (
                <div className="chart-type-dropdown" style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  right: 0,
                  zIndex: 9200,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-md)',
                  minWidth: '130px',
                  overflow: 'hidden',
                }}>
                  {allowedTypes.map(t => (
                    <div
                      key={t}
                      className={`chart-type-opt ${type === t ? 'selected' : ''}`}
                      onClick={() => { setType(t); setShowTypeMenu(false) }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '7px 12px',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        transition: 'background .1s',
                        color: 'var(--text-primary)',
                        background: type === t ? '#eff6ff' : 'transparent',
                        fontWeight: type === t ? 600 : 400,
                      }}
                    >
                      <i className={`bi bi-${getTypeIcon(t)}`} />
                      {getTypeLabel(t)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Toggle Labels */}
            <button
              className={`chart-tool-btn ${showLabels ? 'active' : ''}`}
              onClick={() => setShowLabels(!showLabels)}
              title="Toggle data labels"
              style={{
                background: showLabels ? 'var(--bg-subtle)' : '#cbd5e1',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: showLabels ? 'var(--primary)' : 'var(--text-secondary)',
                width: '26px',
                height: '26px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '0.78rem',
              }}
            >
              <i className="bi bi-tag" />
            </button>

            {/* Fullscreen */}
            <button
              className="chart-tool-btn"
              onClick={() => setFullscreen(!fullscreen)}
              title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--text-secondary)',
                width: '26px',
                height: '26px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '0.78rem',
              }}
            >
              <i className={`bi bi-${fullscreen ? 'fullscreen-exit' : 'fullscreen'}`} />
            </button>

            {/* Download */}
            <button
              className="chart-tool-btn"
              onClick={handleDownload}
              title="Download PNG"
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--text-secondary)',
                width: '26px',
                height: '26px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '0.78rem',
              }}
            >
              <i className="bi bi-download" />
            </button>
          </div>
        </div>

        {/* Chart */}
        <div style={{ flex: 1, minHeight: '200px', position: 'relative' }}>
          {renderChart()}
        </div>
      </div>

      {/* Resize handles */}
      {!fullscreen && (
        <>
          {/* Height resize handle (bottom) */}
          <div
            className="chart-resize-handle"
            onMouseDown={handleResizeHStart}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: '14px',
              height: '12px',
              cursor: 'ns-resize',
              zIndex: 5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div className="resize-handle-bar-h" style={{
              width: '36px',
              height: '3px',
              background: 'var(--border-strong)',
              borderRadius: '2px',
              opacity: 0,
              transition: 'opacity .18s',
            }} />
          </div>
          {/* Width resize handle (right) */}
          <div
            className="chart-resize-handle-e"
            onMouseDown={handleResizeWStart}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: '14px',
              width: '12px',
              cursor: 'ew-resize',
              zIndex: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div className="resize-handle-bar" style={{
              width: '3px',
              height: '36px',
              background: 'var(--border-strong)',
              borderRadius: '2px',
              opacity: 0,
              transition: 'opacity .18s',
            }} />
          </div>
          {/* Corner resize handle (bottom-right) - both width and height */}
          <div
            className="chart-resize-handle-corner"
            onMouseDown={handleResizeCornerStart}
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: '14px',
              height: '14px',
              cursor: 'nwse-resize',
              zIndex: 7,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Resize both"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" style={{ opacity: isResizingCorner ? 1 : 0, transition: 'opacity .18s' }}>
              <path d="M1 9L9 1M5 9L9 5M9 9L9 9" stroke="var(--border-strong)" strokeWidth="1.5" fill="none"/>
            </svg>
          </div>
          {/* Resize label */}
          {(isResizingW || isResizingCorner) && (
            <div style={{
              position: 'absolute',
              top: '8px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '10px',
              zIndex: 20,
              pointerEvents: 'none',
            }}>
              {snapLabel}
            </div>
          )}
        </>
      )}
    </div>
  )

  if (fullscreen) {
    return (
      <>
        {chartPanelContent}
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10,20,40,0.72)',
            backdropFilter: 'blur(4px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
          }}
          onClick={() => setFullscreen(false)}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-lg)',
              width: '90vw',
              maxWidth: '980px',
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '14px 20px 10px',
              borderBottom: '1px solid var(--border)',
              flexShrink: 0,
            }}>
              <i className={`bi bi-${icon}`} style={{ color: 'var(--accent)', fontSize: '1rem' }} />
              <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', flex: 1 }}>{title}</span>
              <button onClick={() => setFullscreen(false)} style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.2rem',
                color: 'var(--text-muted)',
              }}>
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <div style={{ flex: 1, padding: '20px', overflow: 'hidden', position: 'relative' }}>
              <div style={{ height: '100%' }}>
                {renderChart()}
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  return chartPanelContent
}

// ═══════════════════════════════════════════════════════════════════════════════
// Date Filter Component (V8 Style)
// ═══════════════════════════════════════════════════════════════════════════════

type PeriodType = 'all' | 'year' | 'fy' | 'month' | 'custom'

const DateFilter: React.FC<{
  onChange: (period: PeriodType, from?: string, to?: string, fy?: string[], months?: string[]) => void
}> = ({ onChange }) => {
  const [active, setActive] = useState<PeriodType>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [showFY, setShowFY] = useState(false)
  const [showMonth, setShowMonth] = useState(false)
  const [selectedFY, setSelectedFY] = useState<string[]>([])
  const [selectedMonths, setSelectedMonths] = useState<string[]>([])
  const [monthYear, setMonthYear] = useState('')
  const fyRef = useRef<HTMLDivElement>(null)
  const monthRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    if (!showFY && !showMonth) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (showFY && fyRef.current && !fyRef.current.contains(target)) {
        setShowFY(false)
      }
      if (showMonth && monthRef.current && !monthRef.current.contains(target)) {
        setShowMonth(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showFY, showMonth])

  const fyOptions = [
    { value: 'fy2425', label: 'FY24/25', sub: 'Mar 2024 – Feb 2025' },
    { value: 'fy2526', label: 'FY25/26', sub: 'Mar 2025 – Feb 2026' },
    { value: 'fy2627', label: 'FY26/27', sub: 'Mar 2026 – Feb 2027' },
    { value: 'fy2728', label: 'FY27/28', sub: 'Mar 2027 – Feb 2028' },
    { value: 'fy2829', label: 'FY28/29', sub: 'Mar 2028 – Feb 2029' },
    { value: 'fy2930', label: 'FY29/30', sub: 'Mar 2029 – Feb 2030' },
    { value: 'fy3031', label: 'FY30/31', sub: 'Mar 2030 – Feb 2031' },
    { value: 'fy3132', label: 'FY31/32', sub: 'Mar 2031 – Feb 2032' },
    { value: 'fy3233', label: 'FY32/33', sub: 'Mar 2032 – Feb 2033' },
    { value: 'fy3334', label: 'FY33/34', sub: 'Mar 2033 – Feb 2034' },
    { value: 'fy3435', label: 'FY34/35', sub: 'Mar 2034 – Feb 2035' },
  ]

  // Generate month options from Jan 2024 to Dec 2035
  const generateMonthOptions = () => {
    const options: { value: string; label: string; year: number }[] = []
    const start = new Date(2024, 0, 1) // January 2024
    const end = new Date(2035, 11, 1)  // December 2035
    for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const label = d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
      options.push({ value: `${y}-${m}`, label, year: y })
    }
    return options
  }

  const monthOptions = generateMonthOptions()

  // Filter month options by year
  const filteredMonthOptions = monthYear && monthYear.length >= 4
    ? monthOptions.filter(m => m.year.toString() === monthYear.trim())
    : monthOptions

  const handlePeriod = (p: PeriodType) => {
    setActive(p)
    onChange(p, from, to, selectedFY, selectedMonths)
  }

  return (
    <div className="filter-section mb-3" style={{
      background: 'var(--bg-card)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border)',
      padding: '10px 18px',
      marginBottom: '18px',
      boxShadow: 'var(--shadow-sm)',
      ...CSS_VARS,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <span className="filter-section-title" style={{
          fontSize: '0.72rem',
          fontWeight: 700,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          whiteSpace: 'nowrap',
          marginBottom: 0,
        }}>
          <i className="bi bi-calendar3"></i> Chart Period
        </span>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <PeriodButton active={active === 'all'} onClick={() => handlePeriod('all')}>All Time</PeriodButton>
          <PeriodButton active={active === 'year'} onClick={() => handlePeriod('year')}>This Year</PeriodButton>

          {/* FY Dropdown */}
          <div ref={fyRef} style={{ position: 'relative' }}>
            <PickerButton active={active === 'fy'} onClick={() => setShowFY(!showFY)} icon="calendar2-range">
              Fiscal Year
            </PickerButton>
            {showFY && (
              <PickerPanel>
                <PickerHeader>Fiscal Year</PickerHeader>
                {fyOptions.map(fy => (
                  <PickerItem key={fy.value} checked={selectedFY.includes(fy.value)} onChange={checked => {
                    const next = checked ? [...selectedFY, fy.value] : selectedFY.filter(v => v !== fy.value)
                    setSelectedFY(next)
                    setActive('fy')
                    onChange('fy', from, to, next, selectedMonths)
                  }}>
                    <span style={{ whiteSpace: 'nowrap' }}>{fy.label}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 400, whiteSpace: 'nowrap' }}>{fy.sub}</span>
                  </PickerItem>
                ))}
                {selectedFY.length > 0 && (
                  <PickerFooter onClear={() => { setSelectedFY([]); setShowFY(false) }} />
                )}
              </PickerPanel>
            )}
          </div>

          {/* Month Dropdown */}
          <div ref={monthRef} style={{ position: 'relative' }}>
            <PickerButton active={active === 'month'} onClick={() => setShowMonth(!showMonth)} icon="calendar3">
              Month
            </PickerButton>
            {showMonth && (
              <PickerPanel>
                <PickerHeader>Month</PickerHeader>
                <div style={{ padding: '6px 10px 4px', borderBottom: '1px solid var(--border)' }}>
                  <input
                    type="text"
                    placeholder="Year e.g. 2025"
                    maxLength={4}
                    value={monthYear}
                    onChange={e => setMonthYear(e.target.value)}
                    style={{
                      width: '100%',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1.5px solid var(--border-strong)',
                      background: 'var(--bg-subtle)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      transition: 'border-color 0.15s',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent)'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-strong)'
                    }}
                  />
                </div>
                <div style={{ maxHeight: '220px', overflowY: 'auto', padding: '4px 0' }}>
                  {filteredMonthOptions.map(m => (
                    <PickerItem key={m.value} checked={selectedMonths.includes(m.value)} onChange={checked => {
                      const next = checked ? [...selectedMonths, m.value] : selectedMonths.filter(v => v !== m.value)
                      setSelectedMonths(next)
                      setActive('month')
                      onChange('month', from, to, selectedFY, next)
                    }}>
                      {m.label}
                    </PickerItem>
                  ))}
                </div>
                {selectedMonths.length > 0 && (
                  <PickerFooter onClear={() => { setSelectedMonths([]); setShowMonth(false) }} />
                )}
              </PickerPanel>
            )}
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Custom:</label>
          <DateInput value={from} onChange={v => { setFrom(v); setActive('custom'); onChange('custom', v, to) }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>–</span>
          <DateInput value={to} onChange={v => { setTo(v); setActive('custom'); onChange('custom', from, v) }} />
        </div>
      </div>
    </div>
  )
}

// V8 Style Period Button
const PeriodButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      padding: '4px 12px',
      fontSize: '0.75rem',
      fontWeight: 600,
      borderRadius: '20px',
      border: `1px solid ${active ? 'var(--primary)' : 'var(--border-strong)'}`,
      background: active ? 'var(--primary)' : 'var(--bg-subtle)',
      color: active ? '#fff' : 'var(--text-secondary)',
      cursor: 'pointer',
      transition: 'all 0.22s ease',
    }}
    onMouseEnter={(e) => {
      if (!active) {
        e.currentTarget.style.background = '#eff6ff'
        e.currentTarget.style.borderColor = 'var(--accent)'
        e.currentTarget.style.color = 'var(--accent)'
      }
    }}
    onMouseLeave={(e) => {
      if (!active) {
        e.currentTarget.style.background = 'var(--bg-subtle)'
        e.currentTarget.style.borderColor = 'var(--border-strong)'
        e.currentTarget.style.color = 'var(--text-secondary)'
      }
    }}
  >{children}</button>
)

// V8 Style Picker Button - Exact match to V8 CSS
const PickerButton: React.FC<{ active: boolean; onClick: () => void; icon: string; children: React.ReactNode }> = ({ active, onClick, icon, children }) => (
  <button
    onClick={onClick}
    style={{
      padding: '4px 10px',
      fontSize: '0.75rem',
      fontWeight: 600,
      borderRadius: '8px',
      border: '1.5px solid var(--border-strong)',
      background: active ? 'var(--primary)' : 'var(--bg-subtle)',
      color: active ? '#fff' : 'var(--text-secondary)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
      whiteSpace: 'nowrap',
      transition: 'all 0.22s ease',
    }}
    onMouseEnter={(e) => {
      if (!active) {
        e.currentTarget.style.background = '#eff6ff'
        e.currentTarget.style.borderColor = 'var(--accent)'
        e.currentTarget.style.color = 'var(--accent)'
      }
    }}
    onMouseLeave={(e) => {
      if (!active) {
        e.currentTarget.style.background = 'var(--bg-subtle)'
        e.currentTarget.style.borderColor = 'var(--border-strong)'
        e.currentTarget.style.color = 'var(--text-secondary)'
      }
    }}
  >
    <i className={`bi bi-${icon}`}></i>
    {children}
    <i className="bi bi-chevron-down" style={{ fontSize: '0.6rem', transition: 'transform 0.18s' }}></i>
  </button>
)

// V8 Style Picker Panel
const PickerPanel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    position: 'absolute',
    top: 'calc(100% + 5px)',
    left: 0,
    zIndex: 9100,
    background: 'var(--bg-card)',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-md)',
    minWidth: '200px',
    maxWidth: '240px',
  }}>{children}</div>
)

// V8 Style Picker Header
const PickerHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    padding: '8px 12px 6px',
    fontSize: '0.72rem',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid var(--border)',
  }}>{children}</div>
)

// V8 Style Picker Item
const PickerItem: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; children: React.ReactNode }> = ({ checked, onChange, children }) => (
  <label style={{
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    fontSize: '0.8rem',
    fontWeight: 500,
    color: 'var(--text-primary)',
    cursor: 'pointer',
    transition: 'background 0.12s',
    userSelect: 'none',
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.background = 'var(--bg-subtle)'
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.background = 'transparent'
  }}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={e => onChange(e.target.checked)}
      style={{ width: '14px', height: '14px', accentColor: 'var(--primary)', flexShrink: 0, cursor: 'pointer' }}
    />
    <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>{children}</div>
  </label>
)

// V8 Style Picker Footer
const PickerFooter: React.FC<{ onClear: () => void }> = ({ onClear }) => (
  <div style={{ padding: '6px 10px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
    <button
      onClick={onClear}
      style={{
        fontSize: '0.72rem',
        fontWeight: 600,
        color: 'var(--danger)',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '2px 6px',
        borderRadius: '4px',
        transition: 'background 0.12s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(239,68,68,0.08)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'none'
      }}
    >Clear</button>
  </div>
)

// V8 Style Date Input - Click to show calendar picker
const DateInput: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  const inputRef = React.useRef<HTMLInputElement>(null)
  
  const handleClick = () => {
    // Show calendar picker on click
    if (inputRef.current) {
      inputRef.current.showPicker?.()
    }
  }
  
  return (
    <input
      ref={inputRef}
      type="date"
      value={value}
      onChange={e => onChange(e.target.value)}
      onClick={handleClick}
      className="form-control form-control-sm"
      style={{
        padding: '4px 8px',
        fontSize: '0.75rem',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        width: '136px',
        cursor: 'pointer'
      }}
    />
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Dashboard Page
// ═══════════════════════════════════════════════════════════════════════════════

const CHART_ORDER_KEY = 'cms_dashboard_chart_order'
const DEFAULT_ORDER = ['monthly', 'status', 'vendor', 'inspector', 'defect']

const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const [vendorStats, setVendorStats] = useState<any[]>([])
  const [statusStats, setStatusStats] = useState<any[]>([])
  const [defectStats, setDefectStats] = useState<any[]>([])
  const [inspectorStats, setInspectorStats] = useState<any[]>([])
  const [, setRcaStatusStats] = useState<any[]>([])
  const [rcaKpis, setRcaKpis] = useState<{ pending: number; overdue: number; approved: number } | null>(null)
  const [monthlyData, setMonthlyData] = useState<{ label: string; count: number }[]>([])
  const [chartOrder, setChartOrder] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(CHART_ORDER_KEY) || 'null') || DEFAULT_ORDER }
    catch { return DEFAULT_ORDER }
  })

  useEffect(() => {
    Promise.all([
      getVendorStats(), getStatusStats(), getDefectStats(),
      getInspectorStats(), getRcaStatusStats(), getRcaKpis(), getMonthlyTrend()
    ]).then(([v, s, d, i, rs, kpis, monthly]) => {
      setVendorStats(v); setStatusStats(s); setDefectStats(d)
      setInspectorStats(i); setRcaStatusStats(rs); setRcaKpis(kpis)
      setMonthlyData(monthly)
    })
  }, [])

  const totalClaims = statusStats.reduce((sum, s) => sum + s.count, 0)
  const openClaims = statusStats.find(s => s.name === 'OPEN')?.count ?? 0
  const inProgress = statusStats.find(s => s.name === 'IN_PROGRESS')?.count ?? 0

  const navigateToClaims = (filters?: { status?: string; rcaStatus?: string; vendor?: string; inspector?: string; defect?: string; month?: string }) => {
    const params = new URLSearchParams()
    if (filters?.status) params.set('status', filters.status)
    if (filters?.rcaStatus) params.set('rcaStatus', filters.rcaStatus)
    if (filters?.vendor) params.set('vendor', filters.vendor)
    if (filters?.inspector) params.set('inspector', filters.inspector)
    if (filters?.defect) params.set('defectCategory', filters.defect)
    if (filters?.month) {
      // Label format is "YYYY-MM" (V8 style)
      const yearMonth = filters.month // e.g., "2026-01"
      if (yearMonth && yearMonth.length === 7) {
        params.set('dateFrom', `${yearMonth}-01`)
        params.set('dateTo', `${yearMonth}-31`)
      }
    }
    navigate(`/claims?${params.toString()}`)
  }

  // Load saved heights and widths
  const [chartHeights, setChartHeights] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem(CHART_HEIGHT_KEY) || '{}') }
    catch { return {} }
  })
  const [chartWidths, setChartWidths] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem('cms_chart_widths') || '{}') }
    catch { return {} }
  })

  const handleHeightChange = (chartId: string, height: number) => {
    const newHeights = { ...chartHeights, [chartId]: height }
    setChartHeights(newHeights)
    localStorage.setItem(CHART_HEIGHT_KEY, JSON.stringify(newHeights))
  }

  const handleWidthChange = (chartId: string, cols: number) => {
    const newWidths = { ...chartWidths, [chartId]: cols }
    setChartWidths(newWidths)
    localStorage.setItem('cms_chart_widths', JSON.stringify(newWidths))
  }

  // Drag state - which chart is being gripped (to enable draggable on the col)
  const [grippedChartId, setGrippedChartId] = useState<string | null>(null)
  const [draggingChartId, setDraggingChartId] = useState<string | null>(null)
  const dragOverChartId = useRef<string | null>(null)

  const handleDragStart = (e: React.DragEvent, chartId: string) => {
    setDraggingChartId(chartId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', chartId)
  }

  const handleDragEnd = () => {
    setDraggingChartId(null)
    dragOverChartId.current = null
    setGrippedChartId(null)
    // Clear all drag-over styles
    document.querySelectorAll('.chart-panel').forEach(p => p.classList.remove('drag-over'))
  }

  const handleDragOver = (e: React.DragEvent, chartId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (chartId === draggingChartId) return
    
    // Direct DOM manipulation like V8 - more reliable than React state
    if (dragOverChartId.current !== chartId) {
      dragOverChartId.current = chartId
      // Clear all drag-over styles first
      document.querySelectorAll('.chart-panel').forEach(p => p.classList.remove('drag-over'))
      // Add to current target - use closest to find chart-col like V8
      const col = (e.target as HTMLElement).closest('.chart-col') as HTMLElement
      if (col) {
        const panel = col.querySelector('.chart-panel')
        if (panel) {
          panel.classList.add('drag-over')
        }
      }
    }
  }

  const handleDragLeave = (e: React.DragEvent, chartId: string) => {
    // Check if we're actually leaving the chart-col
    const relatedTarget = e.relatedTarget as HTMLElement
    const currentTarget = e.currentTarget as HTMLElement
    if (!currentTarget.contains(relatedTarget)) {
      if (dragOverChartId.current === chartId) {
        dragOverChartId.current = null
        const panel = currentTarget.querySelector('.chart-panel')
        if (panel) {
          panel.classList.remove('drag-over')
        }
      }
    }
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    const sourceId = e.dataTransfer.getData('text/plain')
    if (!sourceId || sourceId === targetId) return

    const from = chartOrder.indexOf(sourceId)
    const to = chartOrder.indexOf(targetId)
    if (from < 0 || to < 0) return

    const next = [...chartOrder]
    next.splice(from, 1)
    next.splice(to, 0, sourceId)
    setChartOrder(next)
    localStorage.setItem(CHART_ORDER_KEY, JSON.stringify(next))
    
    // Clear drag states
    dragOverChartId.current = null
    setDraggingChartId(null)
    setGrippedChartId(null)
    document.querySelectorAll('.chart-panel').forEach(p => p.classList.remove('drag-over'))
  }

  // Get Bootstrap col class based on saved width
  const getColClass = (chartId: string) => {
    // Default widths: defect=12 (full width), others=6 (half width)
    const defaultCols = chartId === 'defect' ? 12 : 6
    const cols = chartWidths[chartId] || defaultCols
    return `col-md-${cols}`
  }

  return (
    <div id="dashboardPage" style={CSS_VARS}>
      {/* Chart drag and resize styles */}
      <style>{`
        .chart-panel {
          transition: box-shadow 0.2s ease, opacity 0.2s ease;
        }
        .chart-col.dragging .chart-panel {
          opacity: 0.45;
          box-shadow: 0 8px 24px rgba(15,23,42,0.16);
        }
        .chart-panel.drag-over {
          box-shadow: 0 0 0 3px #3b82f6 !important;
        }
        .chart-panel:hover .chart-resize-handle .resize-handle-bar-h,
        .chart-panel:hover .chart-resize-handle-e .resize-handle-bar,
        .chart-panel:hover .chart-resize-handle-corner svg {
          opacity: 1;
        }
        .chart-resize-handle:hover .resize-handle-bar-h,
        .chart-resize-handle-e:hover .resize-handle-bar {
          background: var(--accent) !important;
          opacity: 1 !important;
        }
        .chart-resize-handle-corner:hover svg {
          opacity: 1;
        }
        .chart-resize-handle .resize-handle-bar-h,
        .chart-resize-handle-e .resize-handle-bar {
          opacity: 0;
          transition: opacity .18s;
        }
        .chart-drag-handle:hover {
          color: var(--text-muted) !important;
        }
        .chart-drag-handle:active {
          cursor: grabbing;
        }
        .chart-panel.resizing {
          user-select: none;
        }
      `}</style>
      {/* Stat row 1: Claims volume */}
      <div className="row mb-2">
        <div className="col-md-4 mb-2">
          <StatCard
            value={totalClaims}
            label="Total Claims"
            icon="file-earmark-text"
            variant="total"
            clickable
            onClick={() => navigateToClaims()}
          />
        </div>
        <div className="col-md-4 mb-2">
          <StatCard
            id="statCardOpen"
            value={openClaims}
            label="Open Claims"
            icon="folder2-open"
            variant="open"
            clickable
            onClick={() => navigateToClaims({ status: 'OPEN' })}
            ragThresholds={{ g: 10, a: 25 }}
          />
        </div>
        <div className="col-md-4 mb-2">
          <StatCard
            id="statCardInProgress"
            value={inProgress}
            label="In Progress"
            icon="arrow-repeat"
            variant="inProgress"
            clickable
            onClick={() => navigateToClaims({ status: 'IN_PROGRESS' })}
            ragThresholds={{ g: 5, a: 15 }}
          />
        </div>
      </div>

      {/* Stat row 2: RCA status */}
      <div className="row mb-3">
        <div className="col-md-4 mb-2">
          <StatCard
            id="statCardOverdue"
            value={rcaKpis?.overdue ?? 0}
            label="RCA Overdue"
            icon="exclamation-triangle"
            variant="overdue"
            clickable
            onClick={() => navigateToClaims({ rcaStatus: 'OVERDUE' })}
            ragThresholds={{ g: 0, a: 3 }}
          />
        </div>
        <div className="col-md-4 mb-2" id="statPendingRCACard">
          <StatCard
            value={rcaKpis?.pending ?? 0}
            label="RCA Pending"
            icon="hourglass-split"
            variant="pending"
            clickable
            onClick={() => navigateToClaims({ rcaStatus: 'SUBMITTED' })}
          />
        </div>
        <div className="col-md-4 mb-2">
          <StatCard
            value={rcaKpis?.approved ?? 0}
            label="RCA Approved"
            icon="check2-circle"
            variant="approved"
          />
        </div>
      </div>

      {/* Chart section */}
      <div id="dashboardCharts">
        <DateFilter onChange={(period, from, to) => {
          console.log('Filter changed:', { period, from, to })
        }} />

        {/* Charts Grid - Draggable & Resizable */}
        <div id="chartsGrid" className="row">
          {chartOrder.map((chartId) => {
            const isDragging = draggingChartId === chartId
            const isGripped = grippedChartId === chartId
            
            if (chartId === 'monthly') {
              return (
                <div 
                  key={chartId}
                  className={`${getColClass(chartId)} mb-3 chart-col ${isDragging ? 'dragging' : ''}`}
                  data-chart-id={chartId}
                  draggable={isGripped}
                  onDragStart={(e) => handleDragStart(e, chartId)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, chartId)}
                  onDragLeave={(e) => handleDragLeave(e, chartId)}
                  onDrop={(e) => handleDrop(e, chartId)}
                >
                  <ChartCard
                    id={chartId}
                    title="Monthly Claim Trend"
                    icon="graph-up"
                    defaultType="line"
                    allowedTypes={['line', 'bar']}
                    hint="click point → filter list"
                    data={{
                      labels: monthlyData.map(d => d.label),
                      datasets: [{
                        label: 'Claim Qty',
                        data: monthlyData.map(d => d.count)
                      }]
                    }}
                    onNavigate={(label) => label && navigateToClaims({ month: label })}
                    onGripMouseDown={() => setGrippedChartId(chartId)}
                    onGripMouseUp={() => setGrippedChartId(null)}
                    isDragging={isDragging}
                    initialHeight={chartHeights[chartId] || 320}
                    onHeightChange={(h) => handleHeightChange(chartId, h)}
                    initialWidth={chartWidths[chartId] || 6}
                    onWidthChange={(cols) => handleWidthChange(chartId, cols)}
                  />
                </div>
              )
            }
            
            if (chartId === 'status') {
              return (
                <div 
                  key={chartId}
                  className={`${getColClass(chartId)} mb-3 chart-col ${isDragging ? 'dragging' : ''}`}
                  data-chart-id={chartId}
                  draggable={isGripped}
                  onDragStart={(e) => handleDragStart(e, chartId)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, chartId)}
                  onDragLeave={(e) => handleDragLeave(e, chartId)}
                  onDrop={(e) => handleDrop(e, chartId)}
                >
                  <ChartCard
                    id={chartId}
                    title="Claims by Status"
                    icon="pie-chart"
                    defaultType="doughnut"
                    allowedTypes={['doughnut', 'pie', 'bar']}
                    hint="click segment → filter list"
                    data={{
                      labels: statusStats.map(s => {
                        const map: Record<string, string> = { 'OPEN': 'Open', 'IN_PROGRESS': 'In Progress', 'CLOSED': 'Closed' }
                        return map[s.name] || s.name
                      }),
                      datasets: [{
                        data: statusStats.map(s => s.count)
                      }]
                    }}
                    onNavigate={(label) => {
                      const reverseMap: Record<string, string> = { 'Open': 'OPEN', 'In Progress': 'IN_PROGRESS', 'Closed': 'CLOSED' }
                      const statusKey = reverseMap[label as string] || label
                      statusKey && navigateToClaims({ status: statusKey })
                    }}
                    onGripMouseDown={() => setGrippedChartId(chartId)}
                    onGripMouseUp={() => setGrippedChartId(null)}
                    isDragging={isDragging}
                    initialHeight={chartHeights[chartId] || 320}
                    onHeightChange={(h) => handleHeightChange(chartId, h)}
                    initialWidth={chartWidths[chartId] || 6}
                    onWidthChange={(cols) => handleWidthChange(chartId, cols)}
                  />
                </div>
              )
            }
            
            if (chartId === 'vendor') {
              return (
                <div 
                  key={chartId}
                  className={`${getColClass(chartId)} mb-3 chart-col ${isDragging ? 'dragging' : ''}`}
                  data-chart-id={chartId}
                  draggable={isGripped}
                  onDragStart={(e) => handleDragStart(e, chartId)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, chartId)}
                  onDragLeave={(e) => handleDragLeave(e, chartId)}
                  onDrop={(e) => handleDrop(e, chartId)}
                >
                  <ChartCard
                    id={chartId}
                    title="Top 10 Vendors by Claim Qty."
                    icon="building"
                    defaultType="bar"
                    allowedTypes={['bar', 'line', 'doughnut']}
                    horizontal
                    hint="click bar → filter list"
                    data={{
                      labels: vendorStats.slice(0, 10).map((v: any) => v.name),
                      datasets: [{
                        label: '# Claims',
                        data: vendorStats.slice(0, 10).map((v: any) => v.count)
                      }]
                    }}
                    onNavigate={(label) => label && navigateToClaims({ vendor: label })}
                    onGripMouseDown={() => setGrippedChartId(chartId)}
                    onGripMouseUp={() => setGrippedChartId(null)}
                    isDragging={isDragging}
                    initialHeight={chartHeights[chartId] || 320}
                    onHeightChange={(h) => handleHeightChange(chartId, h)}
                    initialWidth={chartWidths[chartId] || 6}
                    onWidthChange={(cols) => handleWidthChange(chartId, cols)}
                  />
                </div>
              )
            }
            
            if (chartId === 'inspector') {
              return (
                <div 
                  key={chartId}
                  className={`${getColClass(chartId)} mb-3 chart-col ${isDragging ? 'dragging' : ''}`}
                  data-chart-id={chartId}
                  draggable={isGripped}
                  onDragStart={(e) => handleDragStart(e, chartId)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, chartId)}
                  onDragLeave={(e) => handleDragLeave(e, chartId)}
                  onDrop={(e) => handleDrop(e, chartId)}
                >
                  <ChartCard
                    id={chartId}
                    title="Claims by Inspector"
                    icon="person-badge"
                    defaultType="bar"
                    allowedTypes={['bar', 'line', 'doughnut']}
                    hint="click bar → filter list"
                    data={{
                      labels: inspectorStats.map((i: any) => i.name),
                      datasets: [{
                        label: '# Claims',
                        data: inspectorStats.map((i: any) => i.count)
                      }]
                    }}
                    onNavigate={(label) => label && navigateToClaims({ inspector: label })}
                    onGripMouseDown={() => setGrippedChartId(chartId)}
                    onGripMouseUp={() => setGrippedChartId(null)}
                    isDragging={isDragging}
                    initialHeight={chartHeights[chartId] || 320}
                    onHeightChange={(h) => handleHeightChange(chartId, h)}
                    initialWidth={chartWidths[chartId] || 6}
                    onWidthChange={(cols) => handleWidthChange(chartId, cols)}
                  />
                </div>
              )
            }
            
            if (chartId === 'defect') {
              return (
                <div 
                  key={chartId}
                  className={`${getColClass(chartId)} mb-3 chart-col ${isDragging ? 'dragging' : ''}`}
                  data-chart-id={chartId}
                  draggable={isGripped}
                  onDragStart={(e) => handleDragStart(e, chartId)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, chartId)}
                  onDragLeave={(e) => handleDragLeave(e, chartId)}
                  onDrop={(e) => handleDrop(e, chartId)}
                >
                  <ChartCard
                    id={chartId}
                    title="Claims by Defect Category"
                    icon="tags"
                    defaultType="bar-h"
                    allowedTypes={['bar-h', 'bar-v', 'doughnut']}
                    horizontal
                    hint="click bar → filter list"
                    data={{
                      labels: defectStats.map((d: any) => d.name),
                      datasets: [{
                        label: '# Claims',
                        data: defectStats.map((d: any) => d.count)
                      }]
                    }}
                    onNavigate={(label) => label && navigateToClaims({ defect: label })}
                    onGripMouseDown={() => setGrippedChartId(chartId)}
                    onGripMouseUp={() => setGrippedChartId(null)}
                    isDragging={isDragging}
                    initialHeight={chartHeights[chartId] || 320}
                    onHeightChange={(h) => handleHeightChange(chartId, h)}
                    initialWidth={chartWidths[chartId] || 12}
                    onWidthChange={(cols) => handleWidthChange(chartId, cols)}
                  />
                </div>
              )
            }
            return null
          })}
        </div>
      </div>

      {/* AI Chat */}
      <div className="row">
        <div className="col-md-12 mb-3">
          <AIChat />
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
