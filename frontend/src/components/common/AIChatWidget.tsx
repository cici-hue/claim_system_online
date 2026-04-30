import React, { useEffect, useRef, useState } from 'react'
import { getAIResponse, getAIModelName, AIConfig, saveAIConfig } from '../../services/aiService'

interface Message { id: number; type: 'user' | 'ai'; content: string; filter?: any }

// Format AI response (convert newlines to <br>)
const formatAIResponse = (text: string): string => {
  return text.replace(/\n/g, '<br>')
}

const AIChatWidget: React.FC = () => {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
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
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem('ai_config')
    if (saved) {
      setAIConfig(JSON.parse(saved))
    }
  }, [])

  const toggleChat = () => {
    setOpen(o => !o)
  }

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current
      container.scrollTop = container.scrollHeight
    }
  }, [messages, typing])

  const sendMessage = async (overrideText?: string) => {
    const text = (overrideText || input).trim()
    if (!text || typing) return
    setInput('')
    setMessages(m => [...m, { id: Date.now(), type: 'user', content: text }])
    setTyping(true)

    try {
      const response = await getAIResponse(text)
      setTyping(false)
      setModelName(getAIModelName())

      let filterBtnText = '🔍 View Claims'
      if (response.filter) {
        switch (response.filter.type) {
          case 'vendor':
            filterBtnText = `→ Filter: ${response.filter.value}`
            break
          case 'defect':
            filterBtnText = `→ Filter: ${response.filter.value}`
            break
          case 'inspector':
            filterBtnText = `→ Filter: ${response.filter.value}`
            break
          case 'overdue':
            filterBtnText = '→ View Overdue RCA'
            break
          case 'closed':
            filterBtnText = '→ View Closed Claims'
            break
          case 'open':
            filterBtnText = '→ View Open Claims'
            break
        }
      }
      const filterBtn = response.filter
        ? `<div style="margin-top:8px;"><button class="ai-filter-btn" data-filter='${JSON.stringify(response.filter)}' style="font-size:0.75rem;padding:6px 12px;background:#1a3a5c;border:none;color:#fff;border-radius:20px;cursor:pointer;font-weight:500;">${filterBtnText}</button></div>`
        : ''
      setMessages(m => [...m, { id: Date.now() + 1, type: 'ai', content: formatAIResponse(response.text) + filterBtn, filter: response.filter }])
    } catch (error) {
      setTyping(false)
      setMessages(m => [...m, { id: Date.now() + 1, type: 'ai', content: '❌ Sorry, there was an error processing your request. Please try again.' }])
    }
  }

  const suggest = (query: string) => {
    setInput(query)
    setTimeout(() => {
      if (inputRef.current) inputRef.current.value = query
    }, 0)
    setTimeout(() => sendMessage(query), 50)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      sendMessage()
    }
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

  const handleSaveConfig = () => {
    saveAIConfig(aiConfig)
    setModelName(getAIModelName())
    setShowSettings(false)
  }

  return (
    <div id="floatChatWidget" style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 8000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      pointerEvents: 'none',
    }}>
      {/* Chat panel */}
      <div id="floatChatPanel" style={{
        width: 360,
        maxHeight: 520,
        background: 'var(--bg-card, #fff)',
        border: '1px solid var(--border, #e2e8f0)',
        borderRadius: 'var(--radius-lg, 12px)',
        boxShadow: 'var(--shadow-lg, 0 10px 32px rgba(15,23,42,.12))',
        display: 'flex',
        flexDirection: 'column',
        marginBottom: 10,
        transition: 'opacity .2s, transform .2s',
        opacity: open ? 1 : 0,
        transform: open ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.97)',
        pointerEvents: open ? 'auto' : 'none',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div className="chat-header" style={{
          background: 'linear-gradient(135deg, #1e4270, #2c5f8a)',
          padding: '11px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderRadius: 'var(--radius-lg, 12px) var(--radius-lg, 12px) 0 0',
          flexShrink: 0,
        }}>
          <span style={{
            width: 7,
            height: 7,
            background: '#4ade80',
            borderRadius: '50%',
            display: 'inline-block',
            animation: 'pulse-dot 2s infinite',
          }} />
          <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.875rem' }}>AI Assistant</span>
          <span style={{ marginLeft: 'auto', fontWeight: 400, opacity: 0.75, fontSize: '0.78rem', color: '#fff' }}>{modelName}</span>
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
            borderBottom: '1px solid #e2e8f0',
            fontSize: '0.8rem'
          }}>
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>AI Provider</label>
              <select
                value={aiConfig.provider}
                onChange={(e) => setAIConfig({ ...aiConfig, provider: e.target.value as any })}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: 6,
                  border: '1px solid #e2e8f0',
                  fontSize: '0.8rem'
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
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>API Key</label>
                  <input
                    type="password"
                    value={aiConfig.apiKey || ''}
                    onChange={(e) => setAIConfig({ ...aiConfig, apiKey: e.target.value })}
                    placeholder="Enter your API key"
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: 6,
                      border: '1px solid #e2e8f0',
                      fontSize: '0.8rem'
                    }}
                  />
                </div>

                <div style={{ marginBottom: 8 }}>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
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
                      border: '1px solid #e2e8f0',
                      fontSize: '0.8rem'
                    }}
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
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
                      border: '1px solid #e2e8f0',
                      fontSize: '0.8rem'
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
                  background: '#e2e8f0',
                  color: '#475569',
                  border: 'none',
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
        <div
          ref={messagesContainerRef}
          className="chat-messages"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '12px 14px',
            background: 'var(--bg-subtle, #f8fafc)',
          }}
        >
          {/* Welcome message - always visible */}
          <div className="chat-message ai" style={{
            marginBottom: 10,
            display: 'flex',
            justifyContent: 'flex-start',
          }}>
            <div className="chat-bubble" style={{
              maxWidth: '82%',
              padding: '9px 13px',
              borderRadius: '16px 16px 16px 2px',
              fontSize: '0.85rem',
              lineHeight: 1.55,
              background: 'var(--bg-card, #fff)',
              color: 'var(--text-primary, #0f172a)',
              boxShadow: 'var(--shadow-xs, 0 1px 3px rgba(0,0,0,0.06))',
              border: '1px solid var(--border, #e2e8f0)',
            }}>
              👋 <strong>AI Assistant Ready!</strong><br /><br />
              I can help you with:<br />
              • <a className="ai-suggest-link" onClick={() => suggest('Show top 5 vendors with most claims')} style={{ color: 'var(--accent, #3b82f6)', fontWeight: 500, textDecoration: 'none', cursor: 'pointer', borderBottom: '1px dashed transparent', transition: 'color .15s, border-color .15s' }} onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--primary, #1a3a5c)'; e.currentTarget.style.borderBottomColor = 'var(--accent, #3b82f6)' }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--accent, #3b82f6)'; e.currentTarget.style.borderBottomColor = 'transparent' }}>📊 Top vendors by claim qty</a><br />
              • <a className="ai-suggest-link" onClick={() => suggest('Show monthly claim trends')} style={{ color: 'var(--accent, #3b82f6)', fontWeight: 500, textDecoration: 'none', cursor: 'pointer', borderBottom: '1px dashed transparent', transition: 'color .15s, border-color .15s' }} onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--primary, #1a3a5c)'; e.currentTarget.style.borderBottomColor = 'var(--accent, #3b82f6)' }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--accent, #3b82f6)'; e.currentTarget.style.borderBottomColor = 'transparent' }}>📈 Monthly claim trends</a><br />
              • <a className="ai-suggest-link" onClick={() => suggest('Which inspector has the most claims?')} style={{ color: 'var(--accent, #3b82f6)', fontWeight: 500, textDecoration: 'none', cursor: 'pointer', borderBottom: '1px dashed transparent', transition: 'color .15s, border-color .15s' }} onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--primary, #1a3a5c)'; e.currentTarget.style.borderBottomColor = 'var(--accent, #3b82f6)' }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--accent, #3b82f6)'; e.currentTarget.style.borderBottomColor = 'transparent' }}>👤 Claims by inspector</a><br />
              • <a className="ai-suggest-link" onClick={() => suggest('Show overdue RCA claims')} style={{ color: 'var(--accent, #3b82f6)', fontWeight: 500, textDecoration: 'none', cursor: 'pointer', borderBottom: '1px dashed transparent', transition: 'color .15s, border-color .15s' }} onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--primary, #1a3a5c)'; e.currentTarget.style.borderBottomColor = 'var(--accent, #3b82f6)' }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--accent, #3b82f6)'; e.currentTarget.style.borderBottomColor = 'transparent' }}>⏰ Overdue RCA claims</a><br />
              • <a className="ai-suggest-link" onClick={() => suggest('Generate summary report')} style={{ color: 'var(--accent, #3b82f6)', fontWeight: 500, textDecoration: 'none', cursor: 'pointer', borderBottom: '1px dashed transparent', transition: 'color .15s, border-color .15s' }} onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--primary, #1a3a5c)'; e.currentTarget.style.borderBottomColor = 'var(--accent, #3b82f6)' }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--accent, #3b82f6)'; e.currentTarget.style.borderBottomColor = 'transparent' }}>📋 Summary report</a><br />
              • <a className="ai-suggest-link" onClick={() => suggest('Top defect categories')} style={{ color: 'var(--accent, #3b82f6)', fontWeight: 500, textDecoration: 'none', cursor: 'pointer', borderBottom: '1px dashed transparent', transition: 'color .15s, border-color .15s' }} onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--primary, #1a3a5c)'; e.currentTarget.style.borderBottomColor = 'var(--accent, #3b82f6)' }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--accent, #3b82f6)'; e.currentTarget.style.borderBottomColor = 'transparent' }}>🔍 Top defect categories</a><br />
              • <a className="ai-suggest-link" onClick={() => suggest('Show repeat offender vendors')} style={{ color: 'var(--accent, #3b82f6)', fontWeight: 500, textDecoration: 'none', cursor: 'pointer', borderBottom: '1px dashed transparent', transition: 'color .15s, border-color .15s' }} onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--primary, #1a3a5c)'; e.currentTarget.style.borderBottomColor = 'var(--accent, #3b82f6)' }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--accent, #3b82f6)'; e.currentTarget.style.borderBottomColor = 'transparent' }}>🔁 Repeat offender vendors</a><br />
              • <a className="ai-suggest-link" onClick={() => suggest('SLA compliance report')} style={{ color: 'var(--accent, #3b82f6)', fontWeight: 500, textDecoration: 'none', cursor: 'pointer', borderBottom: '1px dashed transparent', transition: 'color .15s, border-color .15s' }} onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--primary, #1a3a5c)'; e.currentTarget.style.borderBottomColor = 'var(--accent, #3b82f6)' }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--accent, #3b82f6)'; e.currentTarget.style.borderBottomColor = 'transparent' }}>📏 SLA compliance report</a><br />
              • <a className="ai-suggest-link" onClick={() => suggest('Show financial impact by vendor')} style={{ color: 'var(--accent, #3b82f6)', fontWeight: 500, textDecoration: 'none', cursor: 'pointer', borderBottom: '1px dashed transparent', transition: 'color .15s, border-color .15s' }} onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--primary, #1a3a5c)'; e.currentTarget.style.borderBottomColor = 'var(--accent, #3b82f6)' }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--accent, #3b82f6)'; e.currentTarget.style.borderBottomColor = 'transparent' }}>💰 Financial impact by vendor</a>
            </div>
          </div>

          {/* Chat messages */}
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`chat-message ${msg.type}`}
              style={{
                marginBottom: 10,
                display: 'flex',
                justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div className="chat-bubble" style={{
                maxWidth: '82%',
                padding: '9px 13px',
                borderRadius: msg.type === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                fontSize: '0.85rem',
                lineHeight: 1.55,
                background: msg.type === 'user' ? 'var(--primary, #1a3a5c)' : 'var(--bg-card, #fff)',
                color: msg.type === 'user' ? '#fff' : 'var(--text-primary, #0f172a)',
                boxShadow: msg.type === 'user' ? '0 2px 8px rgba(26,58,92,0.22)' : 'var(--shadow-xs, 0 1px 3px rgba(0,0,0,0.06))',
                border: msg.type === 'user' ? 'none' : '1px solid var(--border, #e2e8f0)',
              }}
                dangerouslySetInnerHTML={{ __html: msg.content }}
                onClick={handleMessageClick}
              />
            </div>
          ))}

          {/* Typing indicator */}
          {typing && (
            <div className="chat-message ai" style={{
              marginBottom: 10,
              display: 'flex',
              justifyContent: 'flex-start',
            }}>
              <div className="chat-bubble" style={{
                maxWidth: '82%',
                padding: '9px 13px',
                borderRadius: '16px 16px 16px 2px',
                fontSize: '0.85rem',
                lineHeight: 1.55,
                background: 'var(--bg-card, #fff)',
                color: 'var(--text-primary, #0f172a)',
                boxShadow: 'var(--shadow-xs, 0 1px 3px rgba(0,0,0,0.06))',
                border: '1px solid var(--border, #e2e8f0)',
              }}>
                <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                  <span style={{ width: 6, height: 6, background: 'var(--text-muted, #64748b)', borderRadius: '50%', animation: 'typingBounce 1.4s infinite 0s' }} />
                  <span style={{ width: 6, height: 6, background: 'var(--text-muted, #64748b)', borderRadius: '50%', animation: 'typingBounce 1.4s infinite 0.2s' }} />
                  <span style={{ width: 6, height: 6, background: 'var(--text-muted, #64748b)', borderRadius: '50%', animation: 'typingBounce 1.4s infinite 0.4s' }} />
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        <div className="fc-suggestions" style={{
          padding: '10px 12px',
          borderTop: '1px solid var(--border, #e2e8f0)',
          background: 'var(--bg-card, #fff)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button className="btn btn-sm" onClick={() => suggest('Show top 5 vendors with most claims')} style={{ padding: '5px 10px', fontSize: '0.75rem', borderRadius: 16, border: '1px solid var(--border, #e2e8f0)', background: 'var(--bg-subtle, #f8fafc)', color: 'var(--text-secondary, #475569)', cursor: 'pointer', fontWeight: 500, transition: 'all .15s' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--primary, #1a3a5c)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'var(--primary, #1a3a5c)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-subtle, #f8fafc)'; e.currentTarget.style.color = 'var(--text-secondary, #475569)'; e.currentTarget.style.borderColor = 'var(--border, #e2e8f0)' }}>📊 Top Vendors</button>
            <button className="btn btn-sm" onClick={() => suggest('Show monthly claim trends')} style={{ padding: '5px 10px', fontSize: '0.75rem', borderRadius: 16, border: '1px solid var(--border, #e2e8f0)', background: 'var(--bg-subtle, #f8fafc)', color: 'var(--text-secondary, #475569)', cursor: 'pointer', fontWeight: 500, transition: 'all .15s' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--primary, #1a3a5c)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'var(--primary, #1a3a5c)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-subtle, #f8fafc)'; e.currentTarget.style.color = 'var(--text-secondary, #475569)'; e.currentTarget.style.borderColor = 'var(--border, #e2e8f0)' }}>📈 Trends</button>
            <button className="btn btn-sm" onClick={() => suggest('Show overdue RCA claims')} style={{ padding: '5px 10px', fontSize: '0.75rem', borderRadius: 16, border: '1px solid var(--border, #e2e8f0)', background: 'var(--bg-subtle, #f8fafc)', color: 'var(--text-secondary, #475569)', cursor: 'pointer', fontWeight: 500, transition: 'all .15s' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--primary, #1a3a5c)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'var(--primary, #1a3a5c)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-subtle, #f8fafc)'; e.currentTarget.style.color = 'var(--text-secondary, #475569)'; e.currentTarget.style.borderColor = 'var(--border, #e2e8f0)' }}>⏰ Overdue</button>
            <button className="btn btn-sm" onClick={() => suggest('Generate summary report')} style={{ padding: '5px 10px', fontSize: '0.75rem', borderRadius: 16, border: '1px solid var(--border, #e2e8f0)', background: 'var(--bg-subtle, #f8fafc)', color: 'var(--text-secondary, #475569)', cursor: 'pointer', fontWeight: 500, transition: 'all .15s' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--primary, #1a3a5c)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'var(--primary, #1a3a5c)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-subtle, #f8fafc)'; e.currentTarget.style.color = 'var(--text-secondary, #475569)'; e.currentTarget.style.borderColor = 'var(--border, #e2e8f0)' }}>📋 Summary</button>
            <button className="btn btn-sm" onClick={() => suggest('Show repeat offender vendors')} style={{ padding: '5px 10px', fontSize: '0.75rem', borderRadius: 16, border: '1px solid var(--border, #e2e8f0)', background: 'var(--bg-subtle, #f8fafc)', color: 'var(--text-secondary, #475569)', cursor: 'pointer', fontWeight: 500, transition: 'all .15s' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--primary, #1a3a5c)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'var(--primary, #1a3a5c)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-subtle, #f8fafc)'; e.currentTarget.style.color = 'var(--text-secondary, #475569)'; e.currentTarget.style.borderColor = 'var(--border, #e2e8f0)' }}>🔁 Repeats</button>
            <button className="btn btn-sm" onClick={() => suggest('SLA compliance report')} style={{ padding: '5px 10px', fontSize: '0.75rem', borderRadius: 16, border: '1px solid var(--border, #e2e8f0)', background: 'var(--bg-subtle, #f8fafc)', color: 'var(--text-secondary, #475569)', cursor: 'pointer', fontWeight: 500, transition: 'all .15s' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--primary, #1a3a5c)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'var(--primary, #1a3a5c)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-subtle, #f8fafc)'; e.currentTarget.style.color = 'var(--text-secondary, #475569)'; e.currentTarget.style.borderColor = 'var(--border, #e2e8f0)' }}>📏 SLA</button>
          </div>
        </div>

        {/* Input area */}
        <div className="chat-input-area" style={{
          padding: '10px 12px',
          borderTop: '1px solid var(--border, #e2e8f0)',
          background: 'var(--bg-card, #fff)',
          display: 'flex',
          gap: 8,
          flexShrink: 0,
        }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about claims..."
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 20,
              border: '1px solid var(--border, #e2e8f0)',
              fontSize: '0.875rem',
              outline: 'none',
              background: 'var(--bg-subtle, #f8fafc)',
            }}
          />
          <button
            onClick={() => sendMessage()}
            style={{
              padding: '8px 14px',
              borderRadius: 20,
              border: 'none',
              background: 'var(--primary, #1a3a5c)',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM6.636 10.07l2.761 4.338L14.13 2.576 6.636 10.07Zm6.787-8.201L1.591 6.602l4.339 2.76 7.494-7.493Z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Toggle button */}
      <button
        id="floatChatToggleBtn"
        onClick={toggleChat}
        title="AI Assistant"
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #1e4270, #2c5f8a)',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-md, 0 4px 16px rgba(15,23,42,.1))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform .2s, box-shadow .2s',
          pointerEvents: 'auto',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)'
          e.currentTarget.style.boxShadow = 'var(--shadow-lg, 0 8px 24px rgba(15,23,42,.15))'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = 'var(--shadow-md, 0 4px 16px rgba(15,23,42,.1))'
        }}
      >
        <span id="floatChatIcon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {open ? (
            // bi-x-lg icon (close)
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
            </svg>
          ) : (
            // Bootstrap Icons bi-robot
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5M3 8.062C3 6.76 4.235 5.765 5.53 5.886a26.6 26.6 0 0 0 4.94 0C11.765 5.765 13 6.76 13 8.062v1.157a.93.93 0 0 1-.765.935c-.845.147-2.34.346-4.235.346s-3.39-.2-4.235-.346A.93.93 0 0 1 3 9.219zm4.542-.827a.25.25 0 0 0-.217.068l-.92.9a25 25 0 0 1-1.871-.183.25.25 0 0 0-.068.495c.55.076 1.232.149 2.02.193a.25.25 0 0 0 .189-.071l.754-.736.847 1.71a.25.25 0 0 0 .404.062l.932-.97a25 25 0 0 0 1.922-.188.25.25 0 0 0-.068-.495c-.538.074-1.207.145-1.98.189a.25.25 0 0 0-.166.076l-.754.785-.842-1.7a.25.25 0 0 0-.182-.135"/>
              <path d="M8.5 1.866a1 1 0 1 0-1 0V3h-2A4.5 4.5 0 0 0 1 7.5V8a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1v-.5A4.5 4.5 0 0 0 10.5 3h-2zM14 7.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.5A3.5 3.5 0 0 1 5.5 4h5A3.5 3.5 0 0 1 14 7.5"/>
            </svg>
          )}
        </span>
      </button>

      {/* CSS Animations */}
      <style>{`
        @keyframes typingBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
      `}</style>
    </div>
  )
}

export default AIChatWidget
