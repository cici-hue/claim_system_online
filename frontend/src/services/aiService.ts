import { mockClaims } from './mockData'

export interface AIConfig {
  provider: 'local' | 'openai' | 'azure' | 'claude'
  apiKey?: string
  endpoint?: string
  model?: string
}

export interface AIResponse {
  text: string
  filter?: {
    type: string
    value?: string
  }
}

// Get AI configuration from environment or localStorage
export const getAIConfig = (): AIConfig => {
  const saved = localStorage.getItem('ai_config')
  if (saved) {
    return JSON.parse(saved)
  }
  return {
    provider: 'local',
    model: 'local'
  }
}

export const saveAIConfig = (config: AIConfig) => {
  localStorage.setItem('ai_config', JSON.stringify(config))
}

// Build system prompt for claims analysis
const buildSystemPrompt = () => {
  const claims = mockClaims
  const totalClaims = claims.length
  const openClaims = claims.filter(c => c.status !== 'CLOSED').length
  const closedClaims = claims.filter(c => c.status === 'CLOSED').length

  // Calculate vendor stats
  const vendorStats: Record<string, { count: number; qty: number }> = {}
  claims.forEach(c => {
    if (!vendorStats[c.vendor]) vendorStats[c.vendor] = { count: 0, qty: 0 }
    vendorStats[c.vendor].count++
    vendorStats[c.vendor].qty += c.claimQty || 0
  })

  // Calculate defect stats
  const defectStats: Record<string, number> = {}
  claims.forEach(c => {
    if (c.defectCategory) {
      defectStats[c.defectCategory] = (defectStats[c.defectCategory] || 0) + 1
    }
  })

  // Calculate inspector stats
  const inspectorStats: Record<string, number> = {}
  claims.forEach(c => {
    if (c.inspector) {
      inspectorStats[c.inspector] = (inspectorStats[c.inspector] || 0) + 1
    }
  })

  return `You are an AI assistant for a Claim Management System. You have access to the following data:

Total Claims: ${totalClaims}
Open Claims: ${openClaims}
Closed Claims: ${closedClaims}

Top Vendors by Claim Quantity:
${Object.entries(vendorStats)
  .sort((a, b) => b[1].qty - a[1].qty)
  .slice(0, 5)
  .map(([v, s], i) => `${i + 1}. ${v}: ${s.qty} pcs (${s.count} claims)`)
  .join('\n')}

Top Defect Categories:
${Object.entries(defectStats)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .map(([d, c]) => `• ${d}: ${c} claims`)
  .join('\n')}

Claims by Inspector:
${Object.entries(inspectorStats)
  .sort((a, b) => b[1] - a[1])
  .map(([i, c]) => `• ${i}: ${c} claims`)
  .join('\n')}

Instructions:
1. Answer questions about claims data based on the information above
2. Be concise and professional
3. Use emojis where appropriate (📊 📈 👤 🔍 ⏰ 📋)
4. If suggesting a filter, include it in your response
5. Format numbers with commas for readability
6. Always respond in the same language as the user's query

When users ask about:
- Vendors: Provide top vendors by claim quantity
- Defects: List top defect categories
- Inspectors: Show claims by inspector
- Overdue: Identify claims with overdue RCA (more than 7 days)
- Trends: Show monthly trends if available
- Summary: Provide overall statistics`
}

// Call OpenAI API
const callOpenAI = async (message: string, config: AIConfig): Promise<string> => {
  const response = await fetch(config.endpoint || 'https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model || 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 500
    })
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

// Call Azure OpenAI API
const callAzureOpenAI = async (message: string, config: AIConfig): Promise<string> => {
  const response = await fetch(config.endpoint || '', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': config.apiKey || ''
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 500
    })
  })

  if (!response.ok) {
    throw new Error(`Azure OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

// Call Claude API
const callClaude = async (message: string, config: AIConfig): Promise<string> => {
  const response = await fetch(config.endpoint || 'https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey || '',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: config.model || 'claude-3-haiku-20240307',
      max_tokens: 500,
      system: buildSystemPrompt(),
      messages: [
        { role: 'user', content: message }
      ]
    })
  })

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`)
  }

  const data = await response.json()
  return data.content[0].text
}

// Generate local response (fallback)
const generateLocalResponse = (query: string): AIResponse => {
  const visibleClaims = mockClaims
  const q = query.toLowerCase()
  const totalClaims = visibleClaims.length
  const openClaims = visibleClaims.filter(c => c.status !== 'CLOSED').length
  const closedClaims = visibleClaims.filter(c => c.status === 'CLOSED').length
  const today = new Date()

  // Top vendors by claim qty
  if (q.includes('vendor') || q.includes('top')) {
    const vendorStats: Record<string, number> = {}
    visibleClaims.forEach(c => { vendorStats[c.vendor] = (vendorStats[c.vendor] || 0) + (c.claimQty || 0) })
    const top = Object.entries(vendorStats).sort((a, b) => b[1] - a[1]).slice(0, 5)
    const text = `📊 <strong>Top 5 Vendors by Claim Qty:</strong><br>${top.map((v, i) => `${i + 1}. ${v[0]}: ${v[1]} pcs`).join('<br>')}`
    return { text, filter: { type: 'vendor', value: top[0]?.[0] } }
  }

  // Defect categories
  if (q.includes('defect') || q.includes('category')) {
    const defectStats: Record<string, number> = {}
    visibleClaims.forEach(c => { if (c.defectCategory) defectStats[c.defectCategory] = (defectStats[c.defectCategory] || 0) + 1 })
    const sorted = Object.entries(defectStats).sort((a, b) => b[1] - a[1])
    const text = `🔍 <strong>Top Defect Categories:</strong><br>${sorted.map(([d, c]) => `• ${d}: ${c} claims`).join('<br>')}`
    return { text, filter: { type: 'defect', value: sorted[0]?.[0] } }
  }

  // Inspector stats
  if (q.includes('inspector') || q.includes('trip leader')) {
    const inspStats: Record<string, number> = {}
    visibleClaims.forEach(c => { if (c.inspector) inspStats[c.inspector] = (inspStats[c.inspector] || 0) + 1 })
    const sorted = Object.entries(inspStats).sort((a, b) => b[1] - a[1])
    const text = `👤 <strong>Claims by Inspector:</strong><br>${sorted.map(([i, c]) => `• ${i}: ${c} claims`).join('<br>')}`
    return { text, filter: { type: 'inspector', value: sorted[0]?.[0] } }
  }

  // Overdue RCA
  if (q.includes('overdue') || q.includes('rca pending')) {
    const overdue = visibleClaims.filter(c => {
      if (c.status === 'CLOSED' || !c.qcInformDate) return false
      const d = Math.floor((today.getTime() - new Date(c.qcInformDate).getTime()) / 86400000)
      return d > 7 && (!c.rcaReport || !c.rcaReport.trim())
    })
    const text = `⏰ <strong>Overdue RCA Claims:</strong> ${overdue.length}<br>${overdue.slice(0, 5).map(c => `• ${c.claimNo} — ${c.vendor} (${c.inspector || '?'})`).join('<br>')}${overdue.length > 5 ? `<br>… and ${overdue.length - 5} more` : ''}`
    return { text, filter: { type: 'overdue' } }
  }

  // Closed claims
  if (q.includes('closed') || q.includes('close')) {
    const text = `✅ <strong>Closed Claims:</strong> ${closedClaims} of ${totalClaims} (${totalClaims ? ((closedClaims / totalClaims) * 100).toFixed(0) : 0}%)`
    return { text, filter: { type: 'closed' } }
  }

  // Open claims
  if (q.includes('open')) {
    const text = `📂 <strong>Open / In Progress:</strong> ${openClaims} claims`
    return { text, filter: { type: 'open' } }
  }

  // Monthly trends
  if (q.includes('trend') || q.includes('month')) {
    const monthly: Record<string, { count: number; qty: number }> = {}
    visibleClaims.forEach(c => {
      if (c.claimDate) {
        const month = c.claimDate.substring(0, 7)
        if (!monthly[month]) monthly[month] = { count: 0, qty: 0 }
        monthly[month].count++
        monthly[month].qty += c.claimQty || 0
      }
    })
    const sorted = Object.entries(monthly).sort((a, b) => a[0].localeCompare(b[0]))
    const text = `📈 <strong>Monthly Claim Trends:</strong><br>${sorted.map(([m, d]) => `• ${m}: ${d.count} (# of claim) / ${d.qty} (claim qty)`).join('<br>')}`
    return { text, filter: null }
  }

  // Summary report
  if (q.includes('summary') || q.includes('report')) {
    const totalQty = visibleClaims.reduce((s, c) => s + (c.claimQty || 0), 0)
    const text = `📋 <strong>Summary Report:</strong><br>• Total Claims: ${totalClaims} (# of claim) / ${totalQty} (claim qty)<br>• Open: ${openClaims} (# of claim)<br>• Closed: ${closedClaims} (# of claim)`
    return { text, filter: null }
  }

  // Repeat offenders
  if (q.includes('repeat') || q.includes('offender')) {
    const vendorCounts: Record<string, number> = {}
    visibleClaims.forEach(c => { vendorCounts[c.vendor] = (vendorCounts[c.vendor] || 0) + 1 })
    const offenders = Object.entries(vendorCounts).filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1])
    if (offenders.length === 0) {
      return { text: `✅ <strong>No repeat offenders found</strong> — no vendor has 3 or more claims.`, filter: null }
    }
    const text = `🔁 <strong>Repeat Offender Vendors</strong> (≥3 claims)<br>${offenders.map(([v, n]) => `• ${v}: ${n} claims`).join('<br>')}`
    return { text, filter: { type: 'vendor', value: offenders[0][0] } }
  }

  // SLA compliance
  if (q.includes('sla') || q.includes('compliance')) {
    const closed = visibleClaims.filter(c => c.status === 'CLOSED' && c.qcInformDate && c.updatedAt)
    if (closed.length === 0) {
      return { text: `📊 <strong>SLA Compliance:</strong> No closed claims with data.`, filter: null }
    }
    const within7 = closed.filter(c => {
      const days = Math.floor((new Date(c.updatedAt!).getTime() - new Date(c.qcInformDate!).getTime()) / 86400000)
      return days <= 7
    })
    const pct = ((within7.length / closed.length) * 100).toFixed(1)
    const text = `📏 <strong>SLA Compliance:</strong> ${pct}% (${within7.length}/${closed.length} closed within 7 days)`
    return { text, filter: null }
  }

  // Financial impact
  if (q.includes('financial') || q.includes('impact')) {
    const vendorStats: Record<string, number> = {}
    visibleClaims.forEach(c => { vendorStats[c.vendor] = (vendorStats[c.vendor] || 0) + (c.claimQty || 0) })
    const sorted = Object.entries(vendorStats).sort((a, b) => b[1] - a[1]).slice(0, 5)
    const totalQty = visibleClaims.reduce((s, c) => s + (c.claimQty || 0), 0)
    const text = `💰 <strong>Financial Impact — Claim Quantity</strong><br><strong>Total claimed:</strong> ${totalQty.toLocaleString()} pcs<br><br><strong>Top 5 by Claim Qty:</strong><br>${sorted.map(([v, q], i) => `• ${v}: ${q.toLocaleString()} pcs`).join('<br>')}`
    return { text, filter: { type: 'vendor', value: sorted[0][0] } }
  }

  // Default response
  return {
    text: `🤖 I've analyzed your request: "<em>${query}</em>"<br><br>I can help with claims analysis, trends, vendor statistics, inspector workloads, defect categories, and overdue RCA tracking.`,
    filter: null
  }
}

// Main function to get AI response
export const getAIResponse = async (message: string): Promise<AIResponse> => {
  const config = getAIConfig()

  // Use local analysis if configured
  if (config.provider === 'local' || !config.apiKey) {
    return generateLocalResponse(message)
  }

  try {
    let responseText = ''

    switch (config.provider) {
      case 'openai':
        responseText = await callOpenAI(message, config)
        break
      case 'azure':
        responseText = await callAzureOpenAI(message, config)
        break
      case 'claude':
        responseText = await callClaude(message, config)
        break
      default:
        return generateLocalResponse(message)
    }

    // Parse filter from response if present
    let filter = null
    const filterMatch = responseText.match(/\[FILTER:(\w+)(?::([^\]]+))?\]/)
    if (filterMatch) {
      filter = {
        type: filterMatch[1],
        value: filterMatch[2]
      }
      responseText = responseText.replace(/\[FILTER:[^\]]+\]/, '').trim()
    }

    return { text: responseText, filter }
  } catch (error) {
    console.error('AI API error:', error)
    // Fallback to local response
    return generateLocalResponse(message)
  }
}

export const getAIModelName = (): string => {
  const config = getAIConfig()
  if (config.provider === 'local') return 'Local Analysis'
  if (config.model) return config.model
  return config.provider.charAt(0).toUpperCase() + config.provider.slice(1)
}
