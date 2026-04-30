import React, { useEffect, useRef, useState } from 'react'
import { getUsers, createUser, updateUser, deleteUser, User } from '../../services/userService'
import { useAuth } from '../../hooks/useAuth'
import api from '../../services/api'

const ROLES = ['INSPECTOR', 'SUPERVISOR', 'ADMIN', 'MANAGER', 'SUPERADMIN']

const FACTORY_AGENTS = [
  { value: '', label: '— Select Factory Agent —' },
  { value: 'Oi Shanghai IC', label: 'Oi Shanghai IC' },
  { value: 'Oi Qingdao IC', label: 'Oi Qingdao IC' },
  { value: 'Oi China HKG', label: 'Oi China HKG' },
  { value: 'Oi China SHA', label: 'Oi China SHA' },
]

const TEAMS = [
  { value: '', label: '— Select Team —' },
  { value: 'Zhejiang', label: 'Zhejiang' },
  { value: 'Jiangsu', label: 'Jiangsu' },
  { value: 'Shanghai', label: 'Shanghai' },
  { value: 'Flexible', label: 'Flexible' },
  { value: 'Management', label: 'Management' },
]

// Helper: email to username (e.g., john.smith@ottoint.com -> john.smith)
const emailToUsername = (email: string): string => {
  return email.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '')
}

// Helper: email to fullname (e.g., john.smith@ottoint.com -> John Smith)
const emailToFullname = (email: string): string => {
  const prefix = email.split('@')[0]
  return prefix.split(/[._-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

const UsersPage: React.FC = () => {
  const { user: currentUser, isSuperAdmin, user } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)

  // Add user form
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState('INSPECTOR')
  const [newUserTeam, setNewUserTeam] = useState('')
  const [newUserFactoryAgent, setNewUserFactoryAgent] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  // Edit user form
  const [editForm, setEditForm] = useState({
    fullname: '',
    email: '',
    password: '',
    role: 'INSPECTOR',
    team: '',
    factoryAgent: ''
  })

  const [exportLoading, setExportLoading] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)
  const [importStatus, setImportStatus] = useState('')

  const load = () => getUsers().then(setUsers)
  useEffect(() => { load() }, [])

  // Preview new user when email changes
  useEffect(() => {
    if (newUserEmail && newUserEmail.includes('@')) {
      setShowPreview(true)
    } else {
      setShowPreview(false)
    }
  }, [newUserEmail])

  // SuperAdmin 或 Admin 可管理用户
  const canManageUsersPage = () => isSuperAdmin() || user?.role === 'ADMIN'

  const openAdd = () => {
    if (!canManageUsersPage()) {
      alert('Super Admin or Admin permission required')
      return
    }
    setNewUserEmail('')
    setNewUserPassword('')
    setNewUserRole('INSPECTOR')
    setNewUserTeam('')
    setNewUserFactoryAgent('')
    setShowPreview(false)
    setShowAddModal(true)
  }

  const openEdit = (u: User) => {
    if (!canManageUsersPage()) {
      alert('Super Admin or Admin permission required')
      return
    }
    setEditUser(u)
    setEditForm({
      fullname: u.fullname,
      email: u.email,
      password: '',
      role: u.role,
      team: u.team || '',
      factoryAgent: u.factoryAgent || ''
    })
    setShowEditModal(true)
  }

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newUserEmail || !newUserEmail.includes('@')) {
      alert('Please enter a valid email address.')
      return
    }
    if (!newUserPassword) {
      alert('Please set an initial password.')
      return
    }
    if (!newUserFactoryAgent) {
      alert('Please select a factory agent.')
      return
    }
    const username = emailToUsername(newUserEmail)
    const fullname = emailToFullname(newUserEmail)

    // Check if username already exists
    if (users.find(u => u.username === username)) {
      alert(`Username "${username}" already exists. Please use a different email.`)
      return
    }

    await createUser({
      username,
      fullname,
      email: newUserEmail,
      password: newUserPassword,
      role: newUserRole,
      team: newUserTeam,
      factoryAgent: newUserFactoryAgent
    } as any)

    setShowAddModal(false)
    load()
    alert(`User "${fullname}" created.\n\nUsername: ${username}`)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editUser) return

    const payload: any = {
      fullname: editForm.fullname,
      email: editForm.email,
      role: editForm.role,
      team: editForm.team,
      factoryAgent: editForm.factoryAgent
    }
    if (editForm.password) payload.password = editForm.password

    await updateUser(editUser.id, payload)
    setShowEditModal(false)
    load()
    alert('User updated successfully!')
  }

  const handleDelete = async (id: number, username: string) => {
    if (!canManageUsersPage()) {
      alert('Super Admin or Admin permission required')
      return
    }
    if (users.length <= 1) {
      alert('Cannot delete the last admin user')
      return
    }
    if (!window.confirm(`Delete user ${username}?`)) return
    await deleteUser(id)
    load()
  }

  const handleExport = async () => {
    setExportLoading(true)
    try {
      const [usersData, claimsData] = await Promise.all([
        api.get('/users').then(r => r.data),
        api.get('/claims?size=10000').then(r => r.data),
      ])
      const blob = new Blob([JSON.stringify({ users: usersData, claims: claimsData, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `cms-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
    } finally {
      setExportLoading(false)
    }
  }

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        const claimCount = data.claims?.content?.length ?? data.claims?.length ?? '?'
        const userCount = data.users?.length ?? '?'
        setImportStatus(`Backup file contains ${userCount} users and ${claimCount} claims. Full restore requires backend /api/import endpoint.`)
      } catch {
        setImportStatus('Invalid backup file — could not parse JSON.')
      }
    }
    reader.readAsText(file)
    if (importRef.current) importRef.current.value = ''
  }

  const getRoleBadgeStyle = (role: string) => {
    switch (role.toLowerCase()) {
      case 'superadmin':
        return { background: '#6d28d9', color: '#fff' }
      case 'admin':
        return { background: '#dc2626', color: '#fff' }
      case 'manager':
        return { background: '#dc2626', color: '#fff' }
      case 'supervisor':
        return { background: '#f59e0b', color: '#fff' }
      default:
        return { background: '#0ea5e9', color: '#fff' }
    }
  }

  const inputStyle = { width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' as const }
  const selectStyle = { ...inputStyle, background: '#fff' }

  const previewUsername = emailToUsername(newUserEmail)
  const previewFullname = emailToFullname(newUserEmail)

  return (
    <div>
      {/* System Users Section */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '20px', marginBottom: 20,
        boxShadow: '0 2px 8px rgba(15,23,42,.08)', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h5 style={{ color: '#1a3a5c', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="bi bi-people"></i> System Users
          </h5>
          {/* 添加用户按钮 - SuperAdmin 或 Admin */}
          {canManageUsersPage() && (
            <button onClick={openAdd} style={{
              padding: '6px 14px', borderRadius: 6, border: 'none',
              background: '#0d6efd', color: '#fff', cursor: 'pointer',
              fontWeight: 500, fontSize: 13
            }}>
              Add User
            </button>
          )}
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
              {['Username', 'Full Name', 'Email', 'Role', 'Team', 'Factory Agent', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600,
                  color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 12px' }}>{u.username}</td>
                <td style={{ padding: '10px 12px' }}>{u.fullname}</td>
                <td style={{ padding: '10px 12px' }}>{u.email}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{
                    padding: '2px 10px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700,
                    letterSpacing: '0.04em', textTransform: 'uppercase',
                    ...getRoleBadgeStyle(u.role)
                  }}>{u.role === 'ADMIN' ? 'QC Admin' : u.role}</span>
                </td>
                <td style={{ padding: '10px 12px' }}>{u.team || '-'}</td>
                <td style={{ padding: '10px 12px' }}>{u.factoryAgent || '-'}</td>
                <td style={{ padding: '10px 12px' }}>
                  {/* 编辑/删除用户按钮 - SuperAdmin 或 Admin */}
                  {canManageUsersPage() ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(u)} style={{
                        padding: '4px 8px', borderRadius: 4, border: '1px solid #3b82f6',
                        color: '#3b82f6', background: 'none', cursor: 'pointer', fontSize: 12 }}>
                        <i className="bi bi-pencil"></i>
                      </button>
                      {u.username !== currentUser?.username && (
                        <button onClick={() => handleDelete(u.id, u.username)} style={{
                          padding: '4px 8px', borderRadius: 4, border: '1px solid #ef4444',
                          color: '#ef4444', background: 'none', cursor: 'pointer', fontSize: 12 }}>
                          <i className="bi bi-trash"></i>
                        </button>
                      )}
                    </div>
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Data Portability Section */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '20px',
        boxShadow: '0 2px 8px rgba(15,23,42,.08)', border: '1px solid #e2e8f0' }}>
        <h5 style={{ color: '#1a3a5c', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="bi bi-database"></i> Data Portability
        </h5>
        <p style={{ color: '#6c757d', fontSize: '0.85rem', margin: '0 0 16px' }}>
          Export all data (claims, users, audit logs) to a JSON backup file, then import it on another PC to restore everything.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input ref={importRef} type="file" accept=".json" onChange={handleImportFile} style={{ display: 'none' }} />
          <button onClick={handleExport} disabled={exportLoading} style={{
            padding: '6px 14px', borderRadius: 6, border: '1px solid #0d6efd',
            background: '#fff', color: '#0d6efd', cursor: 'pointer',
            fontWeight: 500, fontSize: 13, opacity: exportLoading ? 0.7 : 1
          }}>
            <i className="bi bi-download me-1"></i>
            {exportLoading ? 'Exporting…' : 'Export All Data'}
          </button>
          <label style={{
            padding: '6px 14px', borderRadius: 6, border: '1px solid #198754',
            background: '#fff', color: '#198754', cursor: 'pointer',
            fontWeight: 500, fontSize: 13, display: 'inline-flex', alignItems: 'center'
          }}>
            <i className="bi bi-upload me-1"></i> Import Data
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportFile} />
          </label>
        </div>
        {importStatus && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: '#f8fafc', borderRadius: 6,
            border: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#64748b' }}>
            {importStatus}
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 9000,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, width: 400,
            boxShadow: '0 24px 64px rgba(15,23,42,.30)', maxHeight: '90vh', overflowY: 'auto' }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg,#1a3a5c,#2c5f8a)', color: '#fff',
              padding: '16px 20px', borderRadius: '12px 12px 0 0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <h5 style={{ margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="bi bi-person-plus-fill"></i> Add New User
              </h5>
              <button onClick={() => setShowAddModal(false)} style={{
                background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer'
              }}>×</button>
            </div>

            {/* Body */}
            <form onSubmit={handleSaveNew} style={{ padding: 20 }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.82rem', color: '#555', marginBottom: 4 }}>
                  Email Address <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  placeholder="e.g. john.smith@ottoint.com"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.82rem', color: '#555', marginBottom: 4 }}>
                  Password <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={e => setNewUserPassword(e.target.value)}
                  placeholder="Set initial password"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.82rem', color: '#555', marginBottom: 4 }}>
                  Role <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select value={newUserRole} onChange={e => setNewUserRole(e.target.value)} style={selectStyle}>
                  <option value="INSPECTOR">Inspector</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="ADMIN">QC Admin</option>
                  <option value="MANAGER">Manager</option>
                  <option value="SUPERADMIN">Super Admin</option>
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.82rem', color: '#555', marginBottom: 4 }}>
                  Team
                </label>
                <select value={newUserTeam} onChange={e => setNewUserTeam(e.target.value)} style={selectStyle}>
                  {TEAMS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.82rem', color: '#555', marginBottom: 4 }}>
                  Factory Agent <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select value={newUserFactoryAgent} onChange={e => setNewUserFactoryAgent(e.target.value)} style={selectStyle}>
                  {FACTORY_AGENTS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Auto-preview */}
              {showPreview && (
                <div style={{
                  background: '#f0f6ff', border: '1px solid #c7ddf9', borderRadius: 8,
                  padding: '10px 14px', fontSize: '0.82rem', marginBottom: 14
                }}>
                  <div style={{ color: '#888', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>
                    Auto-generated account
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <span style={{ color: '#888' }}>Username</span><br />
                      <strong style={{ color: '#1a3a5c' }}>{previewUsername}</strong>
                    </div>
                    <div style={{ borderLeft: '1px solid #c7ddf9', margin: '0 4px' }}></div>
                    <div>
                      <span style={{ color: '#888' }}>Full Name</span><br />
                      <strong style={{ color: '#1a3a5c' }}>{previewFullname}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{
                  padding: '6px 14px', borderRadius: 6, border: '1px solid #6c757d',
                  background: '#fff', color: '#6c757d', cursor: 'pointer', fontSize: 13
                }}>
                  Cancel
                </button>
                <button type="submit" style={{
                  padding: '6px 14px', borderRadius: 6, border: 'none',
                  background: '#1a3a5c', color: '#fff', cursor: 'pointer', fontSize: 13
                }}>
                  <i className="bi bi-person-check-fill me-1"></i> Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 9000,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, width: 460,
            boxShadow: '0 24px 64px rgba(15,23,42,.30)', maxHeight: '90vh', overflowY: 'auto' }}>
            {/* Header */}
            <div style={{
              background: '#0d6efd', color: '#fff',
              padding: '16px 20px', borderRadius: '12px 12px 0 0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <h5 style={{ margin: 0, fontWeight: 600 }}>Edit User</h5>
              <button onClick={() => setShowEditModal(false)} style={{
                background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer'
              }}>×</button>
            </div>

            {/* Body */}
            <form onSubmit={handleSaveEdit} style={{ padding: 20 }}>
              <input type="hidden" value={editUser.id} />

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Username</label>
                <input type="text" value={editUser.username} readOnly style={{ ...inputStyle, background: '#f8fafc' }} />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Full Name</label>
                <input
                  type="text"
                  value={editForm.fullname}
                  onChange={e => setEditForm(f => ({ ...f, fullname: e.target.value }))}
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                  Password <span style={{ color: '#6c757d', fontWeight: 400 }}>(Leave blank to keep current)</span>
                </label>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Leave blank to keep current"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Role</label>
                <select
                  value={editForm.role}
                  onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                  style={selectStyle}
                >
                  <option value="SUPERADMIN">Super Admin</option>
                  <option value="ADMIN">QC Admin</option>
                  <option value="MANAGER">Manager</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="INSPECTOR">Inspector</option>
                </select>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Team</label>
                <select
                  value={editForm.team}
                  onChange={e => setEditForm(f => ({ ...f, team: e.target.value }))}
                  style={selectStyle}
                >
                  {TEAMS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Factory Agent</label>
                <select
                  value={editForm.factoryAgent}
                  onChange={e => setEditForm(f => ({ ...f, factoryAgent: e.target.value }))}
                  style={selectStyle}
                >
                  {FACTORY_AGENTS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowEditModal(false)} style={{
                  padding: '8px 16px', borderRadius: 6, border: '1px solid #6c757d',
                  background: '#6c757d', color: '#fff', cursor: 'pointer', fontSize: 13
                }}>
                  Cancel
                </button>
                <button type="submit" style={{
                  padding: '8px 16px', borderRadius: 6, border: 'none',
                  background: '#0d6efd', color: '#fff', cursor: 'pointer', fontSize: 13
                }}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default UsersPage
