import React, { useEffect, useState } from 'react'
import { getAuditLogs, AuditLog } from '../../services/auditService'

const ACTION_COLORS: Record<string, string> = {
  LOGIN: '#3b82f6', ADD_CLAIM: '#22c55e', EDIT_CLAIM: '#f59e0b', DELETE_CLAIM: '#ef4444',
  EDIT_RCA: '#8b5cf6', RCA_SUBMITTED: '#3b82f6', RCA_APPROVED: '#22c55e',
  RCA_FINAL_APPROVED: '#22c55e', RCA_REJECTED: '#ef4444', ADD_USER: '#06b6d4',
  DELETE_USER: '#ef4444', EMAIL_SENT: '#f97316', IMPORT_CLAIMS: '#3b82f6',
  BULK_CLOSE: '#64748b', BULK_EMAIL: '#f97316'
}

const AUDIT_ACTIONS = [
  'LOGIN', 'ADD_CLAIM', 'EDIT_CLAIM', 'DELETE_CLAIM', 'EDIT_RCA',
  'RCA_SUBMITTED', 'RCA_APPROVED', 'RCA_FINAL_APPROVED', 'RCA_REJECTED', 'RCA_SCORED',
  'EDIT_CA', 'EARLY_WARNING', 'EMAIL_SENT', 'IMPORT_CLAIMS',
  'BULK_CLOSE', 'BULK_EMAIL', 'ADD_USER', 'DELETE_USER', 'UPLOAD_ATTACHMENT'
]

const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(0)

  const load = () =>
    getAuditLogs({ search: search || undefined, action: action || undefined,
      from: dateFrom || undefined, to: dateTo || undefined, page, size: 100 })
      .then((d: any) => { setLogs(d.content); setTotal(d.totalElements) })

  useEffect(() => { load() }, [search, action, dateFrom, dateTo, page])

  return (
    <div>
      <h2 style={{ color: '#1a3a5c', marginBottom: 20 }}>Audit Logs ({total})</h2>

      <div style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', marginBottom: 18,
        boxShadow: '0 2px 8px rgba(15,23,42,.08)', border: '1px solid #e2e8f0', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
          placeholder="Search logs..." style={{ flex: 1, minWidth: 180, padding: '7px 12px', borderRadius: 8,
            border: '1px solid #cbd5e1', fontSize: 13 }} />
        <select value={action} onChange={e => { setAction(e.target.value); setPage(0) }}
          style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}>
          <option value="">All Actions</option>
          {AUDIT_ACTIONS.map(a => <option key={a}>{a}</option>)}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, whiteSpace: 'nowrap' }}>From</label>
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0) }}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, whiteSpace: 'nowrap' }}>To</label>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0) }}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }} />
        </div>
        <button onClick={() => { setSearch(''); setAction(''); setDateFrom(''); setDateTo(''); setPage(0) }} style={{
          padding: '7px 14px', borderRadius: 8, border: 'none',
          background: '#64748b', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Reset</button>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(15,23,42,.08)', border: '1px solid #e2e8f0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              {['Timestamp', 'User', 'Role', 'Action', 'Details'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700,
                  color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '8px 14px', whiteSpace: 'nowrap', color: '#64748b', fontSize: 12 }}>
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td style={{ padding: '8px 14px', fontWeight: 600 }}>{log.username}</td>
                <td style={{ padding: '8px 14px', color: '#64748b', fontSize: 12 }}>{log.userRole}</td>
                <td style={{ padding: '8px 14px' }}>
                  <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700,
                    background: `${ACTION_COLORS[log.action] || '#94a3b8'}22`,
                    color: ACTION_COLORS[log.action] || '#94a3b8'
                  }}>{log.action}</span>
                </td>
                <td style={{ padding: '8px 14px', color: '#64748b', maxWidth: 400,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {log.details}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No logs found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AuditLogsPage
