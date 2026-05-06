import React from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'info'
  onConfirm: () => void
  onCancel: () => void
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  if (!open) return null

  const variantColors = {
    danger: { bg: '#ef4444', hover: '#dc2626' },
    warning: { bg: '#f59e0b', hover: '#d97706' },
    info: { bg: '#3b82f6', hover: '#2563eb' },
  }

  const colors = variantColors[variant]

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div
        onClick={onCancel}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(2px)',
        }}
      />
      <div style={{
        position: 'relative',
        background: '#fff',
        borderRadius: '16px',
        padding: '28px',
        maxWidth: '420px',
        width: '90%',
        boxShadow: '0 20px 60px rgba(15, 23, 42, 0.25)',
        animation: 'fadeIn 0.2s ease',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px',
          marginBottom: '20px',
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: variant === 'danger' ? '#fef2f2' : variant === 'warning' ? '#fffbeb' : '#eff6ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <i className={`bi ${variant === 'danger' ? 'bi-exclamation-triangle-fill' : variant === 'warning' ? 'bi-exclamation-circle-fill' : 'bi-info-circle-fill'}`}
              style={{ color: colors.bg, fontSize: '1.2rem' }}></i>
          </div>
          <div>
            <h3 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 700, color: '#1a3a5c' }}>{title}</h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>{message}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#fff',
              color: '#475569',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              background: colors.bg,
              color: '#fff',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
