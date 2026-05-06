import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getClaims, updateClaim } from '../../services/claimService'
import { getUsers, User } from '../../services/userService'
import { Claim, ClaimFilters, STATUS_COLORS, DEFECT_CATEGORIES, LOCATIONS, CUSTOMERS, VENDORS, INSPECTORS } from '../../types/claim'
import { useToast } from '../../hooks/useToast'
import { useAuth } from '../../hooks/useAuth'
import { SkeletonTable } from '../common/Skeleton'

// ═══════════════════════════════════════════════════════════════════════════════
// V8 Claims List Page - Complete Replication
// ═══════════════════════════════════════════════════════════════════════════════

interface ColDef {
  key: string
  label: string
  filterKey?: keyof ClaimFilters
  filterType?: 'text' | 'select' | 'date'
  options?: string[]
  defaultVisible?: boolean
}

// V8 Column definitions — canonical list with stable keys (Claim Date first per user request)
// Filter types per V8: dropdownColDefs + dateRangeColKeys + text (default)
const ALL_COLUMNS: ColDef[] = [
  { key: 'claimDate',            label: 'Claim Date',            filterKey: 'dateFrom',       filterType: 'date',   defaultVisible: true },
  { key: 'claimNo',              label: 'Claim No.',             filterKey: 'search',         filterType: 'text',   defaultVisible: true },
  { key: 'vendor',               label: 'Vendor',                filterKey: 'vendor',         filterType: 'select', options: VENDORS,   defaultVisible: true },
  { key: 'customer',             label: 'Customer',              filterKey: 'customer',       filterType: 'select', options: CUSTOMERS, defaultVisible: true },
  { key: 'location',             label: 'Location',              filterKey: 'location',       filterType: 'select', options: LOCATIONS, defaultVisible: true },
  { key: 'defectCategory',       label: 'Defect Category',       filterKey: 'defectCategory', filterType: 'select', options: DEFECT_CATEGORIES, defaultVisible: true },
  { key: 'status',               label: 'Status',                filterKey: 'status',         filterType: 'select', options: ['OPEN', 'IN_PROGRESS', 'CLOSED', 'CANCELLED'], defaultVisible: true },
  { key: 'qcResponsibility',     label: 'QC Resp.',              filterKey: 'qcResponsibility', filterType: 'select', options: ['Yes', 'No'], defaultVisible: true },
  { key: 'rca',                  label: 'RCA',                   filterKey: 'rca',            filterType: 'select', options: ['Approved', 'Submitted', 'Pend. Admin', 'Rejected', 'Done', 'Pending'], defaultVisible: true },
  { key: 'factoryAgent',         label: 'Factory Agent',         filterKey: 'factoryAgent',   filterType: 'select', options: [],        defaultVisible: false },
  { key: 'inspector',            label: 'QC Trip Leader',        filterKey: 'inspector',      filterType: 'select', options: INSPECTORS, defaultVisible: false },
  { key: 'fid',                  label: 'FID',                   filterKey: 'fid',            filterType: 'text',   defaultVisible: false },
  { key: 'styleNo',              label: 'Style No.',             filterKey: 'styleNo',        filterType: 'text',   defaultVisible: false },
  { key: 'orderNo',              label: 'Order No.',             filterKey: 'orderNo',        filterType: 'text',   defaultVisible: false },
  { key: 'articleNo',            label: 'Article No.',           filterKey: 'articleNo',      filterType: 'text',   defaultVisible: false },
  { key: 'shippedQty',           label: 'Shipped Qty',           filterKey: 'shippedQty',     filterType: 'text',   defaultVisible: false },
  { key: 'claimQty',             label: 'Claim Qty',             filterKey: 'claimQty',       filterType: 'text',   defaultVisible: false },
  { key: 'marketInspectionDate', label: 'Market Inspection Date', filterKey: 'marketInspectionDate', filterType: 'date', defaultVisible: false },
  { key: 'qcInformDate',         label: 'QC Informed Date',      filterKey: 'qcInformDate',   filterType: 'date',   defaultVisible: false },
  { key: 'qualityDigit',         label: 'Quality Digit',         filterKey: 'qualityDigit',   filterType: 'text',   defaultVisible: false },
  { key: 'attachments',          label: 'Attachments',           filterKey: 'attachments',    filterType: 'text',   defaultVisible: false },
]

const VISIBLE_KEY  = 'cms_col_visible'
const PRESETS_KEY  = 'cms_filter_presets'
const COL_ORDER_KEY = 'cms_col_order'

type SavedPreset = { name: string; filters: Record<string, string> }

// V8: Secondary fields for subrow display (fields that can appear in subrow if not in main columns)
const SECONDARY_FIELDS: { key: string; label: string }[] = [
  { key: 'factoryAgent',         label: 'Factory Agent' },
  { key: 'inspector',            label: 'QC Trip Leader' },
  { key: 'fid',                  label: 'FID' },
  { key: 'styleNo',              label: 'Style No.' },
  { key: 'orderNo',              label: 'Order No.' },
  { key: 'articleNo',            label: 'Article No.' },
  { key: 'shippedQty',           label: 'Shipped Qty' },
  { key: 'claimQty',             label: 'Claim Qty' },
  { key: 'marketInspectionDate', label: 'Mkt Inspection' },
  { key: 'qcInformDate',         label: 'QC Informed' },
  { key: 'qualityDigit',         label: 'Quality Digit' },
]

// V8 Style: Get row class based on claim status
const getStatusRowClass = (status: string): string => {
  switch (status) {
    case 'OPEN': return 'row-status-open'
    case 'IN_PROGRESS': return 'row-status-progress'
    case 'CLOSED': return 'row-status-closed'
    case 'CANCELLED': return 'row-status-cancelled'
    default: return ''
  }
}

// V8: Default column widths - Starting defaults, will be recalculated based on content
const DEFAULT_COL_WIDTHS: Record<string, number> = {
  claimNo: 140,           // Increased for typical claim numbers like "CLM-2026-001"
  vendor: 160,            // Increased for vendor names like "Hangzhou Garment Factory"
  customer: 120,
  location: 100,
  factoryAgent: 130,
  claimDate: 110,
  marketInspectionDate: 140,
  qcInformDate: 130,
  defectCategory: 130,
  status: 110,
  qcResponsibility: 100,
  rca: 130,
  inspector: 140,
  fid: 90,
  styleNo: 110,
  orderNo: 110,
  articleNo: 110,
  shippedQty: 100,
  claimQty: 95,
  qualityDigit: 100,
  attachments: 90
}

// Helper: Calculate text width using canvas
const getTextWidth = (() => {
  let canvas: HTMLCanvasElement | null = null
  return (text: string, font: string): number => {
    if (!canvas) canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return text.length * 8
    ctx.font = font
    return ctx.measureText(text).width
  }
})()

// Calculate column widths based on current data content
const calculateColWidthsFromData = (claims: Claim[], columns: ColDef[], visibleCols: Set<string>): Record<string, number> => {
  const widths: Record<string, number> = {}
  // Font matches the actual rendered styles
  const contentFont = '400 0.82rem Segoe UI, system-ui, sans-serif'     // td font
  const boldContentFont = '600 0.82rem Segoe UI, system-ui, sans-serif' // claimNo is bold
  const headerFont = '700 0.75rem Segoe UI, system-ui, sans-serif'      // th font
  const cellPadding = 16     // td: 5px 8px = 8px left + 8px right
  const headerPadding = 22   // th: 9px 8px + extra space for filter icon area
  const filterIconWidth = 22 // filter button width + gap
  const minWidth = 100
  const maxWidth = 400

  // Only calculate for visible columns
  const visibleColumns = columns.filter(col => visibleCols.has(col.key))

  visibleColumns.forEach(col => {
    // Start with default width from V8
    let maxWidthForCol = DEFAULT_COL_WIDTHS[col.key] || 90

    // Calculate header width: label + gap + filter icon + padding
    const headerTextWidth = getTextWidth(col.label, headerFont)
    const headerWidth = headerTextWidth + filterIconWidth + headerPadding
    maxWidthForCol = Math.max(maxWidthForCol, headerWidth)

    // Special handling for specific columns
    if (col.key === 'rca') {
      // RCA column displays: Approved, Submitted, Pend. Admin, Rejected, Done, +Nd, Nd left, Pending
      const rcaOptions = ['Approved', 'Submitted', 'Pend. Admin', 'Rejected', 'Done', '+30d', '30d left', 'Pending']
      rcaOptions.forEach(opt => {
        const textWidth = getTextWidth(opt, contentFont) + cellPadding + 24 // +24 for icon
        maxWidthForCol = Math.max(maxWidthForCol, textWidth)
      })
    } else if (col.key === 'status') {
      // Status column displays: OPEN, IN PROGRESS, CLOSED, CANCELLED (with RAG dot and badge padding)
      const statusOptions = ['OPEN', 'IN PROGRESS', 'CLOSED', 'CANCELLED']
      statusOptions.forEach(opt => {
        // +20 for RAG dot + extra for badge styling
        const textWidth = getTextWidth(opt, contentFont) + cellPadding + 20 + 16
        maxWidthForCol = Math.max(maxWidthForCol, textWidth)
      })
    } else if (col.key === 'claimNo') {
      // ClaimNo uses bold font and is a link
      claims.forEach(claim => {
        const text = claim.claimNo || '-'
        const textWidth = getTextWidth(text, boldContentFont) + cellPadding + 4 // +4 for link styling
        maxWidthForCol = Math.max(maxWidthForCol, textWidth)
      })
    } else if (col.key === 'vendor') {
      // Vendor column - ensure enough space for typical vendor names
      claims.forEach(claim => {
        const text = claim.vendor || '-'
        // Vendor names can be longer, add extra padding
        const textWidth = getTextWidth(text, contentFont) + cellPadding + 8
        maxWidthForCol = Math.max(maxWidthForCol, textWidth)
      })
    } else {
      // Find max content width from all visible claims for other columns
      claims.forEach(claim => {
        const value = (claim as any)[col.key]
        let text = ''
        
        if (value === null || value === undefined) {
          text = '-'
        } else if (typeof value === 'string') {
          text = value || '-'
        } else if (typeof value === 'number') {
          text = value.toLocaleString()
        } else {
          text = String(value)
        }

        // Handle special cases
        if (col.key === 'attachments') {
          text = claim.attachments?.length ? String(claim.attachments.length) : '-'
        }

        const textWidth = getTextWidth(text, contentFont) + cellPadding
        maxWidthForCol = Math.max(maxWidthForCol, textWidth)
      })
    }

    // Clamp between min and max
    widths[col.key] = Math.min(maxWidth, Math.max(minWidth, Math.ceil(maxWidthForCol)))
  })

  return widths
}

// Auto-adjust column widths to fill screen while respecting minimum widths
const autoAdjustColWidths = (
  baseWidths: Record<string, number>,
  visibleCols: Set<string>,
  containerWidth: number
): Record<string, number> => {
  const adjusted: Record<string, number> = { ...baseWidths }
  const visibleKeys = Object.keys(baseWidths).filter(k => visibleCols.has(k))
  
  if (visibleKeys.length === 0) return adjusted
  
  // Calculate fixed columns width (checkbox + expand + actions)
  const fixedWidth = 36 + 32 + 100 // checkbox + expand + actions column
  const availableWidth = containerWidth - fixedWidth - 20 // 20px for scrollbar/padding
  
  // Calculate total base width
  const totalBaseWidth = visibleKeys.reduce((sum, key) => sum + (baseWidths[key] || 100), 0)
  
  if (totalBaseWidth < availableWidth) {
    // Distribute extra space proportionally based on column width ratio
    const extraSpace = availableWidth - totalBaseWidth
    
    visibleKeys.forEach(key => {
      const baseWidth = baseWidths[key] || 100
      const ratio = baseWidth / totalBaseWidth
      adjusted[key] = Math.floor(baseWidth + extraSpace * ratio)
    })
  }
  
  return adjusted
}

interface FilterPanelProps {
  col: ColDef
  value: string
  onChange: (val: string) => void
  onClear: () => void
  onClose: () => void
  anchorRect: DOMRect
  claims: Claim[]
}

// V8: Get unique options with counts from claims data
const getFilterOptions = (claims: Claim[], key: string): { value: string; count: number }[] => {
  const counts = new Map<string, number>()
  claims.forEach(claim => {
    const val = (claim as any)[key] || ''
    if (val) {
      counts.set(val, (counts.get(val) || 0) + 1)
    }
  })
  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value))
}

// V8: Get RCA filter options with counts
const getRCAFilterOptions = (claims: Claim[]): { value: string; count: number }[] => {
  const counts = new Map<string, number>()
  claims.forEach(claim => {
    let label = 'Pending'
    if (claim.rcaStatus === 'APPROVED') label = 'Approved'
    else if (claim.rcaStatus === 'SUBMITTED') label = 'Submitted'
    else if (claim.rcaStatus === 'PENDING_MANAGER') label = 'Pend. Manager'
    else if (claim.rcaStatus === 'REJECTED') label = 'Rejected'
    else if (claim.rcaReport && claim.rcaReport.trim()) label = 'Done'
    counts.set(label, (counts.get(label) || 0) + 1)
  })
  const order = ['Approved', 'Submitted', 'Pend. Admin', 'Rejected', 'Done', 'Pending']
  return order
    .filter(v => counts.has(v))
    .map(value => ({ value, count: counts.get(value) || 0 }))
}

// V8: Get QC Responsibility options with counts
const getQCRespFilterOptions = (claims: Claim[]): { value: string; count: number }[] => {
  const counts = new Map<string, number>()
  claims.forEach(claim => {
    const val = claim.qcResponsibility || 'No'
    counts.set(val, (counts.get(val) || 0) + 1)
  })
  return ['Yes', 'No']
    .filter(v => counts.has(v))
    .map(value => ({ value, count: counts.get(value) || 0 }))
}

const FilterPanel: React.FC<FilterPanelProps> = ({ col, value, onChange, onClear, onClose, anchorRect, claims }) => {
  const panelRef = useRef<HTMLDivElement>(null)
  const [searchText, setSearchText] = useState('')
  
  // Note: Global click listener is handled by parent FilterTh component

  const top = anchorRect.bottom + window.scrollY + 4
  const left = Math.min(anchorRect.left + window.scrollX, window.innerWidth - 280)

  // V8: Get options based on filter type
  const getOptions = (): { value: string; count: number }[] => {
    if (col.filterType === 'select' && col.options && col.options.length > 0) {
      // Use predefined options with counts from claims
      const counts = new Map<string, number>()
      claims.forEach(claim => {
        const val = (claim as any)[col.filterKey!] || ''
        if (val && col.options!.includes(val)) {
          counts.set(val, (counts.get(val) || 0) + 1)
        }
      })
      return col.options
        .filter(opt => !searchText || opt.toLowerCase().includes(searchText.toLowerCase()))
        .map(opt => ({ value: opt, count: counts.get(opt) || 0 }))
    }
    if (col.key === 'rca') {
      const opts = getRCAFilterOptions(claims)
      return opts.filter(o => !searchText || o.value.toLowerCase().includes(searchText.toLowerCase()))
    }
    if (col.key === 'qcResponsibility') {
      const opts = getQCRespFilterOptions(claims)
      return opts.filter(o => !searchText || o.value.toLowerCase().includes(searchText.toLowerCase()))
    }
    if (col.filterKey) {
      const opts = getFilterOptions(claims, col.filterKey)
      return opts.filter(o => !searchText || o.value.toLowerCase().includes(searchText.toLowerCase()))
    }
    return []
  }

  const options = getOptions()
  const selectedValues = value ? new Set(value.split(',').filter(Boolean)) : new Set<string>()

  const toggleOption = (optValue: string) => {
    const newSet = new Set(selectedValues)
    if (newSet.has(optValue)) {
      newSet.delete(optValue)
    } else {
      newSet.add(optValue)
    }
    onChange(Array.from(newSet).join(','))
  }

  const selectAll = () => {
    const allValues = options.map(o => o.value).join(',')
    onChange(allValues)
  }

  const clearSelection = () => {
    onChange('')
  }

  return (
    <div ref={panelRef} className="col-filter-panel" style={{
      position: 'fixed', top, left, zIndex: 9999,
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
      boxShadow: '0 10px 32px rgba(15,23,42,.12)', width: 260, overflow: 'hidden',
    }}>
      {/* V8: Header - No close button, click outside to close */}
      <div style={{
        background: 'linear-gradient(135deg,#1e4270,#2c5f8a)', color: '#fff',
        padding: '10px 12px', fontSize: '0.8rem', fontWeight: 600,
        display: 'flex', alignItems: 'center', gap: 6
      }}>
        <i className="bi bi-funnel-fill" style={{ fontSize: '0.85rem', opacity: 0.9 }}></i>
        {col.label}
      </div>

      {/* V8: Body */}
      <div style={{ padding: '12px 10px' }}>
        {col.filterType === 'text' && (
          <input autoFocus value={value} onChange={e => onChange(e.target.value)}
            placeholder={`Filter ${col.label}...`}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }} />
        )}

        {(col.filterType === 'select' && col.filterKey) && (
          <>
            {/* V8: Search input */}
            <input
              autoFocus
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="Search options..."
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1',
                fontSize: 13, marginBottom: 8, boxSizing: 'border-box'
              }}
            />

            {/* V8: Action buttons */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <button
                onClick={selectAll}
                style={{
                  flex: 1, padding: '6px 0', fontSize: '0.75rem', border: '1px solid #e2e8f0',
                  borderRadius: 6, background: '#f8fafc', cursor: 'pointer', fontWeight: 500
                }}
              >Select All</button>
              <button
                onClick={clearSelection}
                style={{
                  flex: 1, padding: '6px 0', fontSize: '0.75rem', border: '1px solid #e2e8f0',
                  borderRadius: 6, background: '#f8fafc', cursor: 'pointer', fontWeight: 500
                }}
              >Clear</button>
            </div>

            {/* V8: Checkbox list with counts */}
            <div style={{
              maxHeight: 200, overflowY: 'auto', border: '1px solid #e2e8f0',
              borderRadius: 6, background: '#fff'
            }}>
              {options.length === 0 ? (
                <div style={{ padding: '10px', fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>
                  No options found
                </div>
              ) : (
                options.map((opt, idx) => (
                  <div
                    key={opt.value}
                    onClick={() => toggleOption(opt.value)}
                    style={{
                      padding: '7px 10px', fontSize: '0.8rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8,
                      borderBottom: idx < options.length - 1 ? '1px solid #f1f5f9' : 'none',
                      background: selectedValues.has(opt.value) ? '#eff6ff' : '#fff',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedValues.has(opt.value)}
                      readOnly
                      style={{ accentColor: '#3b82f6', margin: 0 }}
                    />
                    <span style={{ flex: 1 }}>{opt.value}</span>
                    <span style={{
                      fontSize: '0.7rem', color: '#64748b', background: '#f1f5f9',
                      padding: '1px 6px', borderRadius: 10, fontWeight: 600
                    }}>{opt.count}</span>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {col.filterType === 'date' && (
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 4, fontWeight: 500 }}>From</div>
            <input type="date" value={value.split('|')[0] || ''}
              onChange={e => onChange(`${e.target.value}|${value.split('|')[1] || ''}`)}
              style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: 6, marginBottom: 10, boxSizing: 'border-box' }} />
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 4, fontWeight: 500 }}>To</div>
            <input type="date" value={value.split('|')[1] || ''}
              onChange={e => onChange(`${value.split('|')[0] || ''}|${e.target.value}`)}
              style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: 6, boxSizing: 'border-box' }} />
          </div>
        )}
      </div>

      {/* V8: Footer */}
      <div style={{ padding: '8px 10px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'center' }}>
        <button onClick={onClear} style={{
          fontSize: '0.75rem', color: '#dc2626', cursor: 'pointer', border: 'none',
          background: 'none', padding: '4px 8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4
        }}>
          <i className="bi bi-x-lg"></i> Remove filter
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// V8 Table Header Component - Exact Replication
// ═══════════════════════════════════════════════════════════════════════════════

interface FilterThProps {
  col: ColDef
  filterValue: string
  onFilterChange: (val: string) => void
  onFilterClear: () => void
  onResize?: (key: string, newWidth: number) => void
  currentWidth?: number
  draggingKey: string | null
  onDragStart: (key: string) => void
  onDragEnd: () => void
  onDragEndWithTarget: (fromKey: string, toKey: string, insertBefore: boolean) => void
  claims: Claim[]
}

const FilterTh: React.FC<FilterThProps> = ({
  col, filterValue, onFilterChange, onFilterClear, onResize, currentWidth,
  draggingKey, onDragStart, onDragEnd, onDragEndWithTarget, claims
}) => {
  const [show, setShow] = useState(false)
  const thRef = useRef<HTMLTableCellElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const thWidth = currentWidth || DEFAULT_COL_WIDTHS[col.key] || 90
  const isActive = !!filterValue
  const isDragging = draggingKey === col.key
  const MIN_COL_WIDTH = 70 // Minimum width to show filter button
  
  // V8: Global mousedown listener to close filter panel when clicking outside
  useEffect(() => {
    if (!show) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Close if clicking outside both the filter panel and the filter icon button
      if (!target.closest('.col-filter-panel') && !target.closest(`#fi_${col.key}`)) {
        setShow(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [show, col.key])
  // V8: During resize, use fixed width from DOM only, not state
  const wStyle = { 
    width: thWidth, 
    minWidth: Math.max(MIN_COL_WIDTH, thWidth) 
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // V8: Column Resize ( matches V8 startColResize )
  // ═══════════════════════════════════════════════════════════════════════════════
  // V8: Column Resize - Pure DOM approach, no React state during drag
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!thRef.current) return
    
    const th = thRef.current
    const startX = e.clientX
    const startW = th.offsetWidth
    
    // Add resizing class for visual feedback
    const resizer = th.querySelector('.col-resizer')
    resizer?.classList.add('resizing')
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    
    let finalWidth = startW

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newW = Math.max(MIN_COL_WIDTH, startW + (moveEvent.clientX - startX))
      finalWidth = newW
      
      // V8: Update th width
      th.style.width = newW + 'px'
      th.style.minWidth = newW + 'px'
      
      // V8: Sync colgroup col width
      const table = th.closest('table')
      if (table) {
        const thIndex = Array.from(th.parentElement?.children || []).indexOf(th)
        const col = table.querySelectorAll('colgroup col')[thIndex]
        if (col) {
          (col as HTMLElement).style.width = newW + 'px'
          ;(col as HTMLElement).style.minWidth = newW + 'px'
        }
        
        // V8: Sync all td cells in this column
        const tbody = table.querySelector('tbody')
        if (tbody && thIndex >= 0) {
          tbody.querySelectorAll('tr').forEach(tr => {
            const td = tr.children[thIndex] as HTMLElement
            if (td) {
              td.style.width = newW + 'px'
              td.style.minWidth = newW + 'px'
              td.style.maxWidth = newW + 'px'
            }
          })
        }
      }
    }

    const handleMouseUp = () => {
      // Remove visual feedback
      resizer?.classList.remove('resizing')
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      
      // Save the final width
      onResize?.(col.key, finalWidth)
      
      // V8: Clear inline styles - let React/colgroup handle widths
      th.style.width = ''
      th.style.minWidth = ''
      
      const table = th.closest('table')
      if (table) {
        const thIndex = Array.from(th.parentElement?.children || []).indexOf(th)
        const col = table.querySelectorAll('colgroup col')[thIndex]
        if (col) {
          (col as HTMLElement).style.width = ''
          ;(col as HTMLElement).style.minWidth = ''
        }
        
        const tbody = table.querySelector('tbody')
        if (tbody && thIndex >= 0) {
          tbody.querySelectorAll('tr').forEach(tr => {
            const td = tr.children[thIndex] as HTMLElement
            if (td) {
              td.style.width = ''
              td.style.minWidth = ''
              td.style.maxWidth = ''
            }
          })
        }
      }
      
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // V8: Pointer Events for Drag ( matches V8 pointerdown/pointermove/pointerup )
  // ═══════════════════════════════════════════════════════════════════════════════
  const pointerStartPos = useRef({ x: 0, y: 0 })
  const didDrag = useRef(false)
  const pointerDownTime = useRef(0)

  const handlePointerDown = (e: React.PointerEvent) => {
    // V8: Ignore clicks on the resizer handle
    if ((e.target as HTMLElement).closest('.col-resizer')) return

    // Prevent default to stop browser's native drag behavior
    e.preventDefault()

    pointerDownTime.current = Date.now()
    pointerStartPos.current = { x: e.clientX, y: e.clientY }
    didDrag.current = false

    const th = thRef.current
    if (th) {
      th.setPointerCapture(e.pointerId)
      th.addEventListener('pointermove', handlePointerMove as EventListener)
      th.addEventListener('pointerup', handlePointerUp as EventListener)
      th.addEventListener('pointercancel', handlePointerCancel as EventListener)
    }
  }

  const handlePointerMove = (e: PointerEvent) => {
    const dx = Math.abs(e.clientX - pointerStartPos.current.x)
    const dy = Math.abs(e.clientY - pointerStartPos.current.y)

    // V8: Only start visual drag after 5px movement to avoid accidental drags
    if (!didDrag.current && dx < 5 && dy < 5) return

    const th = thRef.current
    if (!th) return
    const tr = th.parentElement
    if (!tr) return

    if (!didDrag.current) {
      didDrag.current = true
      // V8: Set dragging visual state using DOM
      th.style.cursor = 'grabbing'
      th.classList.add('th-dragging')
      onDragStart(col.key)
      // V8: closeAllFilterPanels()
      setShow(false)
    }
    e.preventDefault()

    // V8: Find target and show drop indicator using DOM classes
    const ths = Array.from(tr.querySelectorAll('th[data-col-key]'))

    // Clear all drop indicators first
    ths.forEach(el => {
      el.classList.remove('th-drop-left', 'th-drop-right')
    })

    let target: HTMLElement | null = null
    for (const otherTh of ths) {
      if (otherTh === th) continue
      const r = otherTh.getBoundingClientRect()
      if (e.clientX >= r.left && e.clientX <= r.right) {
        target = otherTh as HTMLElement
        break
      }
    }

    if (target) {
      const r = target.getBoundingClientRect()
      const isLeft = e.clientX < r.left + r.width / 2
      target.classList.add(isLeft ? 'th-drop-left' : 'th-drop-right')
    }
  }

  const handlePointerUp = (e: PointerEvent) => {
    const th = thRef.current
    if (th) {
      th.releasePointerCapture(e.pointerId)
      th.removeEventListener('pointermove', handlePointerMove as EventListener)
      th.removeEventListener('pointerup', handlePointerUp as EventListener)
      th.removeEventListener('pointercancel', handlePointerCancel as EventListener)
    }

    if (didDrag.current) {
      // V8: Reset dragging visual state
      if (th) {
        th.style.cursor = ''
        th.classList.remove('th-dragging')
      }

      // V8: Suppress the click event that fires after pointerup
      const suppressClick = (ev: Event) => { ev.stopImmediatePropagation() }
      th?.addEventListener('click', suppressClick, { capture: true, once: true })

      // V8: Find target with drop indicator and perform reorder
      const tr = th?.parentElement
      if (tr) {
        const targetTh = Array.from(tr.querySelectorAll('th[data-col-key]')).find(el => {
          return el.classList.contains('th-drop-left') || el.classList.contains('th-drop-right')
        }) as HTMLElement | undefined

        if (targetTh && th) {
          const fromKey = th.dataset.colKey
          const toKey = targetTh.dataset.colKey
          const insertBefore = targetTh.classList.contains('th-drop-left')

          if (fromKey && toKey && fromKey !== toKey) {
            onDragEndWithTarget(fromKey, toKey, insertBefore)
          } else {
            onDragEnd()
          }
        } else {
          onDragEnd()
        }

        // Clear drop indicators
        tr.querySelectorAll('th[data-col-key]').forEach(el => {
          el.classList.remove('th-drop-left', 'th-drop-right')
        })
      } else {
        onDragEnd()
      }
    }
    didDrag.current = false
  }

  const handlePointerCancel = () => {
    const th = thRef.current
    const tr = th?.parentElement

    // V8: Reset dragging visual state
    if (th) {
      th.style.cursor = ''
      th.classList.remove('th-dragging')
    }

    // Clear drop indicators
    if (tr) {
      tr.querySelectorAll('th[data-col-key]').forEach(el => {
        el.classList.remove('th-drop-left', 'th-drop-right')
      })
    }

    onDragEnd()
    didDrag.current = false
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Render: Non-filterable columns
  // ═══════════════════════════════════════════════════════════════════════════════
  if (!col.filterKey) {
    return (
      <th
        ref={thRef}
        className={isDragging ? 'th-dragging' : ''}
        style={{
          ...wStyle,
          textAlign: 'left',
          fontWeight: 700,
          color: '#64748b',
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          cursor: isDragging ? 'grabbing' : 'grab',
          letterSpacing: '0.02em',
          userSelect: 'none',
          borderBottom: '2px solid #e2e8f0',
          position: 'relative',
          background: isDragging ? 'rgba(59,130,246,0.08)' : '#f8fafc',
          opacity: isDragging ? 0.45 : 1,
        }}
        data-col-key={col.key}
        onPointerDown={handlePointerDown}
      >
        <div className="th-inner" style={{ padding: '9px 8px', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span className="th-label-text">{col.label}</span>
        </div>
        {/* V8: Column Resizer */}
        <div className="col-resizer" onMouseDown={handleResizeStart} style={{
          position: 'absolute',
          right: 0, top: 0, bottom: 0,
          width: 5,
          cursor: 'col-resize',
          zIndex: 10,
          userSelect: 'none'
        }} />
      </th>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Render: Filterable columns
  // ═══════════════════════════════════════════════════════════════════════════════
  const isDropdown = col.filterType === 'select'
  const isDate = col.filterType === 'date'
  const icon = isDropdown ? 'funnel' : (isDate ? 'calendar3' : 'search')

  return (
    <th
      ref={thRef}
      className={isDragging ? 'th-dragging' : ''}
      style={{
        ...wStyle,
        textAlign: 'left',
        fontWeight: 700,
        userSelect: 'none',
        color: isActive ? '#1a3a5c' : '#64748b',
        fontSize: '0.75rem',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        background: isActive ? 'rgba(59,130,246,.06)' : '#f8fafc',
        cursor: isDragging ? 'grabbing' : 'grab',
        position: 'relative',
        letterSpacing: '0.02em',
        borderBottom: '2px solid #e2e8f0',
        opacity: isDragging ? 0.45 : 1,
      }}
      data-col-key={col.key}
      onPointerDown={handlePointerDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="th-inner" style={{ padding: '9px 8px', display: 'flex', alignItems: 'center', gap: 5 }}>
        <span className="th-label-text" style={{ cursor: 'pointer', flex: 1 }}>{col.label}</span>
        {/* V8: Filter Icon Button - matches V8 exactly */}
        <button
          className="filter-icon-btn"
          id={`fi_${col.key}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { 
            e.stopPropagation(); 
            // V8: Toggle filter panel
            setShow(prev => !prev);
          }}
          title={`Filter by ${col.label}`}
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            border: 'none', 
            background: 'none', 
            padding: '2px 3px', 
            borderRadius: 4, 
            cursor: 'pointer', 
            lineHeight: 1, 
            flexShrink: 0 
          }}
        >
          {/* V8: filter-icon default opacity: 0, hover shows, color: var(--accent) */}
          <i 
            className={`bi bi-${icon} filter-icon`} 
            style={{
              opacity: isActive ? 1 : (isHovered ? 0.6 : 0),
              transition: 'opacity 0.15s, color 0.15s',
              fontSize: '0.72rem',
              color: '#3b82f6',
              display: 'block'
            }}
          ></i>
        </button>
        {/* V8: Filter count badge */}
        <span 
          className="filter-count-badge" 
          id={`fcb_${col.key}`}
          style={{
            display: isActive ? 'inline-block' : 'none',
            background: '#f59e0b',
            color: '#7c2d12',
            borderRadius: 10,
            fontSize: '0.6rem',
            fontWeight: 700,
            padding: '1px 5px',
            lineHeight: 1.4,
          }}
        >
          !
        </span>
      </div>
      {/* V8: Column Resizer */}
      <div 
        className="col-resizer" 
        onMouseDown={handleResizeStart} 
        style={{
          position: 'absolute', 
          right: 0, top: 0, bottom: 0, 
          width: 5, 
          cursor: 'col-resize',
          zIndex: 10, 
          userSelect: 'none'
        }} 
      />
      {/* V8: Filter Panel */}
      {show && thRef.current && (
        <FilterPanel
          col={col}
          value={filterValue}
          onChange={onFilterChange}
          onClear={onFilterClear}
          onClose={() => setShow(false)}
          anchorRect={thRef.current.getBoundingClientRect()}
          claims={claims}
        />
      )}
    </th>
  )
}

const ClaimsListPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { showToast } = useToast()
  const { user, isSuperAdmin, canManageClaims, canImportExport, canSendRCAReminder, canSendEarlyWarning } = useAuth()
  
  // 所有用户都只能查看同一 factory agent 的索赔（除了 SuperAdmin）

  const [claims, setClaims] = useState<Claim[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [totalAll, setTotalAll] = useState(0)
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(50)
  const [search, setSearch] = useState('')
  const [colFilters, setColFilters] = useState<Record<string, string>>({})
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false)
  const [overdueMode, setOverdueMode] = useState(false)

  const [colOrder, setColOrder] = useState<string[]>([])
  const [visibleCols, setVisibleCols] = useState<Set<string>>(new Set(ALL_COLUMNS.filter(c => c.defaultVisible).map(c => c.key)))
  const [colWidths, setColWidths] = useState<Record<string, number>>(DEFAULT_COL_WIDTHS)
  
  // Store base widths calculated from content for proper resize scaling
  const baseColWidthsRef = useRef<Record<string, number>>(DEFAULT_COL_WIDTHS)

  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  const [showColModal, setShowColModal] = useState(false)
  const [tempColConfig, setTempColConfig] = useState<{key: string, visible: boolean}[]>([])
  const colListRef = useRef<HTMLUListElement>(null)
  
  // V8: Table header drag state
  const [draggingThKey, setDraggingThKey] = useState<string | null>(null)
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null)
  const [dropPosition, setDropPosition] = useState<'left' | 'right' | null>(null)
  const [showPresetsMenu, setShowPresetsMenu] = useState(false)
  const [showSavePreset, setShowSavePreset] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [presets, setPresets] = useState<SavedPreset[]>([])
  const [showImport, setShowImport] = useState(false)
  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false)
  const [showEarlyWarningModal, setShowEarlyWarningModal] = useState(false)
  const [showRCAReminderModal, setShowRCAReminderModal] = useState(false)
  const [showAttachmentModal, setShowAttachmentModal] = useState(false)
  const [currentAttachments, setCurrentAttachments] = useState<any[]>([])
  const [currentAttachmentIndex, setCurrentAttachmentIndex] = useState(0)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 991)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 991)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const fileImportRef = useRef<HTMLInputElement>(null)
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState('')

  const [earlyWarningClaims, setEarlyWarningClaims] = useState<Claim[]>([])
  const [ewRecipients, setEwRecipients] = useState('')
  const [ewCcRecipients, setEwCcRecipients] = useState('')
  const [ewEmailSubject, setEwEmailSubject] = useState('')
  const [ewEmailBody, setEwEmailBody] = useState('')
  const [selectedEWClaim, setSelectedEWClaim] = useState<Claim | null>(null)
  const [showEWEmailPreview, setShowEWEmailPreview] = useState(false)
  const [viewClaimDetail, setViewClaimDetail] = useState<Claim | null>(null)

  const [rcaPendingClaims, setRcaPendingClaims] = useState<Claim[]>([])
  const [rcaRecipients, setRcaRecipients] = useState('')
  const [rcaCcRecipients, setRcaCcRecipients] = useState('')
  const [rcaEmailSubject, setRcaEmailSubject] = useState('')
  const [rcaEmailBody, setRcaEmailBody] = useState('')
  const [showRcaEmailPreview, setShowRcaEmailPreview] = useState(false)
  const [sendingRcaReminder, setSendingRcaReminder] = useState(false)

  const [bulkEmailRecipients, setBulkEmailRecipients] = useState('')

  // ESC key handler for Bookmark and Columns modals
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showPresetsMenu) {
          setShowPresetsMenu(false)
        }
        if (showColModal) {
          closeColCustomizer()
        }
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [showPresetsMenu, showColModal])

  useEffect(() => {
    const savedVisible = localStorage.getItem(VISIBLE_KEY)
    if (savedVisible) {
      try { 
        const parsed = JSON.parse(savedVisible)
        if (Array.isArray(parsed)) {
          setVisibleCols(new Set(parsed))
        }
      } catch {}
    }
    const savedOrder = localStorage.getItem(COL_ORDER_KEY)
    if (savedOrder) {
      try { 
        const parsed = JSON.parse(savedOrder)
        if (Array.isArray(parsed)) {
          setColOrder(parsed)
        }
      } catch {}
    }
    const savedPresets = localStorage.getItem(PRESETS_KEY)
    if (savedPresets) {
      try { setPresets(JSON.parse(savedPresets)) } catch {}
    }
    // Column widths will be calculated from data in fetchData
  }, [])

  const COLUMNS = ALL_COLUMNS.filter(c => visibleCols.has(c.key)).sort((a, b) => {
    if (colOrder.length === 0) return 0
    const ai = colOrder.indexOf(a.key)
    const bi = colOrder.indexOf(b.key)
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
  })

  const activeFilters: ClaimFilters = useMemo(() => ({
    vendor:         colFilters['vendor']         || undefined,
    customer:       colFilters['customer']        || undefined,
    inspector:      colFilters['inspector']      || undefined,
    defectCategory: colFilters['defectCategory'] || undefined,
    location:       colFilters['location']        || undefined,
    dateFrom:       colFilters['dateFrom']        || undefined,
    dateTo:         colFilters['dateTo']          || undefined,
    status:         colFilters['status']          || undefined,
    rcaStatus:      colFilters['rcaStatus']       || undefined,
    search:         search || undefined,
  }), [colFilters, search])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch users for RCA reminder email recipients
      const usersData = await getUsers()
      setUsers(usersData)
      
      const res = await getClaims({
        page,
        size: size === 0 ? 1000 : size,
        sort: 'claimDate,desc',
        ...activeFilters,
      })
      let data = res.content || []

      // Filter by factory agent: non-superadmin users can only see claims with matching factoryAgent
      if (!isSuperAdmin() && user?.factoryAgent) {
        data = data.filter((c: Claim) => c.factoryAgent === user.factoryAgent)
      }

      if (overdueMode) {
        data = data.filter((c: Claim) => {
          if (c.status === 'CLOSED' || !c.qcInformDate) return false
          const days = Math.floor((Date.now() - new Date(c.qcInformDate).getTime()) / 86400000)
          return days > 7 && (!c.rcaReport || c.rcaReport.trim() === '')
        })
      }

      setClaims(data)
      setTotal(res.totalElements ?? data.length)
      setTotalAll((res as any).totalAll ?? res.totalElements ?? data.length)
      
      // Auto-send Early Warning for claims on day 5-6 (auto-trigger for all users)
      const earlyWarningClaims = data.filter((c: Claim) => {
        if (c.status === 'CLOSED' || !c.qcInformDate) return false
        const days = Math.floor((Date.now() - new Date(c.qcInformDate).getTime()) / 86400000)
        return days >= 5 && days <= 6 && (!c.rcaReport || c.rcaReport.trim() === '')
      })
      
      if (earlyWarningClaims.length > 0) {
        // Auto-send early warning email
        autoSendEarlyWarning(earlyWarningClaims, usersData)
      }
      
      // Calculate column widths based on current data content
      if (data.length > 0) {
        const calculatedWidths = calculateColWidthsFromData(data, ALL_COLUMNS, visibleCols)
        // Store base widths for resize calculations
        baseColWidthsRef.current = { ...calculatedWidths }
        // Auto-adjust to fill screen width using actual container
        const tableContainer = document.querySelector('.table-responsive')
        const mainContent = document.querySelector('.main-content')
        const containerWidth = tableContainer?.clientWidth || 
                              mainContent?.clientWidth || 
                              window.innerWidth - 60
        const adjustedWidths = autoAdjustColWidths(calculatedWidths, visibleCols, containerWidth)
        setColWidths(adjustedWidths)
      }
    } catch {
      showToast('Failed to load claims')
    } finally {
      setLoading(false)
    }
  }, [page, size, activeFilters, overdueMode, showToast, visibleCols, user, isSuperAdmin])

  useEffect(() => { fetchData() }, [fetchData])

  // Auto-adjust column widths on container resize (including sidebar toggle)
  useEffect(() => {
    const tableContainer = document.querySelector('.table-responsive')
    const mainContent = document.querySelector('.main-content')
    
    const handleResize = () => {
      // Get the actual container width, fallback to main content or window
      const containerWidth = tableContainer?.clientWidth || 
                            mainContent?.clientWidth || 
                            window.innerWidth - 60
      
      setColWidths(prev => {
        const visibleKeys = Object.keys(baseColWidthsRef.current).filter(k => visibleCols.has(k))
        if (visibleKeys.length === 0) return prev
        
        const fixedWidth = 36 + 32 + 100
        const availableWidth = containerWidth - fixedWidth - 20
        // Use base widths (from content calculation) for proper scaling
        const totalBaseWidth = visibleKeys.reduce((sum, key) => sum + (baseColWidthsRef.current[key] || 100), 0)
        
        if (totalBaseWidth < availableWidth) {
          // Distribute extra space proportionally based on column width ratio
          const extraSpace = availableWidth - totalBaseWidth
          const adjusted: Record<string, number> = { ...baseColWidthsRef.current }
          visibleKeys.forEach(key => {
            const baseWidth = baseColWidthsRef.current[key] || 100
            const ratio = baseWidth / totalBaseWidth
            adjusted[key] = Math.floor(baseWidth + extraSpace * ratio)
          })
          return adjusted
        } else {
          // If container is smaller than base width, use base widths (with scrollbar)
          return { ...baseColWidthsRef.current }
        }
      })
    }
    
    // Use ResizeObserver to detect container size changes (including sidebar toggle)
    let resizeObserver: ResizeObserver | null = null
    if (mainContent) {
      resizeObserver = new ResizeObserver(() => {
        handleResize()
      })
      resizeObserver.observe(mainContent)
    }
    
    // Fallback to window resize
    window.addEventListener('resize', handleResize)
    
    // Initial adjustment after data loads
    const timer = setTimeout(handleResize, 200)
    
    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
      window.removeEventListener('resize', handleResize)
      clearTimeout(timer)
    }
  }, [visibleCols])

  useEffect(() => {
    const vendor = searchParams.get('vendor')
    const inspector = searchParams.get('inspector')
    const overdue = searchParams.get('overdue')
    if (vendor) setColFilters(f => ({ ...f, vendor }))
    if (inspector) setColFilters(f => ({ ...f, inspector }))
    if (overdue === 'true') setOverdueMode(true)
  }, [searchParams])

  const setColFilter = (key: string, val: string) => { setColFilters(f => ({ ...f, [key]: val })); setPage(0) }
  const clearColFilter = (key: string) => { setColFilters(f => { const n = { ...f }; delete n[key]; return n }); setPage(0) }
  const resetAllFilters = () => { setColFilters({}); setSearch(''); setOverdueMode(false); setPage(0) }
  const handleColResize = (key: string, newWidth: number) => {
    // Note: Manual resize is temporary and will be overwritten on next data fetch
    setColWidths(prev => ({ ...prev, [key]: newWidth }))
  }

  // Column Customizer functions - V8 Style
  const openColCustomizer = () => {
    // Initialize temp config from current state
    const currentOrder = colOrder.length ? colOrder : ALL_COLUMNS.map(c => c.key)
    const config: {key: string, visible: boolean}[] = []
    // Ensure visibleCols is a valid Set
    const validVisibleCols = visibleCols instanceof Set ? visibleCols : new Set(ALL_COLUMNS.filter(c => c.defaultVisible).map(c => c.key))
    // Add columns in current order
    currentOrder.forEach(key => {
      if (ALL_COLUMNS.find(c => c.key === key)) {
        config.push({ key, visible: validVisibleCols.has(key) })
      }
    })
    // Add any columns not in order
    ALL_COLUMNS.forEach(col => {
      if (!currentOrder.includes(col.key)) {
        config.push({ key: col.key, visible: validVisibleCols.has(col.key) })
      }
    })
    setTempColConfig(config)
    setShowColModal(true)
  }

  const closeColCustomizer = () => {
    setShowColModal(false)
    setDraggingThKey(null)
    setDropTargetKey(null)
    setDropPosition(null)
  }

  const applyColConfig = () => {
    const newVisible = new Set(tempColConfig.filter(c => c.visible).map(c => c.key))
    const newOrder = tempColConfig.map(c => c.key)
    setVisibleCols(newVisible)
    setColOrder(newOrder)
    localStorage.setItem(VISIBLE_KEY, JSON.stringify([...newVisible]))
    localStorage.setItem(COL_ORDER_KEY, JSON.stringify(newOrder))
    // Auto-adjust column widths after visibility change
    setTimeout(() => {
      const tableContainer = document.querySelector('.table-responsive')
      const mainContent = document.querySelector('.main-content')
      const containerWidth = tableContainer?.clientWidth || 
                            mainContent?.clientWidth || 
                            window.innerWidth - 60
      const newWidths = autoAdjustColWidths(baseColWidthsRef.current, newVisible, containerWidth)
      setColWidths(newWidths)
    }, 100)
    closeColCustomizer()
  }

  const resetColConfig = () => {
    // Reset to defaults
    const defaultVisible = new Set(ALL_COLUMNS.filter(c => c.defaultVisible).map(c => c.key))
    const defaultOrder = ALL_COLUMNS.map(c => c.key)
    setVisibleCols(defaultVisible)
    setColOrder(defaultOrder)
    localStorage.setItem(VISIBLE_KEY, JSON.stringify([...defaultVisible]))
    localStorage.setItem(COL_ORDER_KEY, JSON.stringify(defaultOrder))
    // Auto-adjust column widths after reset
    setTimeout(() => {
      const tableContainer = document.querySelector('.table-responsive')
      const mainContent = document.querySelector('.main-content')
      const containerWidth = tableContainer?.clientWidth || 
                            mainContent?.clientWidth || 
                            window.innerWidth - 60
      const newWidths = autoAdjustColWidths(baseColWidthsRef.current, defaultVisible, containerWidth)
      setColWidths(newWidths)
    }, 100)
    closeColCustomizer()
  }

  const toggleColVisibility = (key: string) => {
    setTempColConfig(prev => prev.map(c => 
      c.key === key ? { ...c, visible: !c.visible } : c
    ))
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // V8: Table Header Drag Handlers (pointer events)
  // ═══════════════════════════════════════════════════════════════════════════════
  const handleThDragStart = (key: string) => {
    setDraggingThKey(key)
    document.body.style.userSelect = 'none'
  }

  const handleThDragEnd = () => {
    setDraggingThKey(null)
    setDropTargetKey(null)
    setDropPosition(null)
    document.body.style.userSelect = ''
  }

  const handleThDragOver = (targetKey: string, position: 'left' | 'right') => {
    if (targetKey === draggingThKey) {
      setDropTargetKey(null)
      setDropPosition(null)
      return
    }
    setDropTargetKey(targetKey)
    setDropPosition(position)
  }

  const handleThDragEndWithTarget = (fromKey: string, toKey: string, insertBefore: boolean) => {
    // Get current visible column order
    const visibleKeys = COLUMNS.map(c => c.key)
    const fromIdx = visibleKeys.indexOf(fromKey)

    if (fromIdx !== -1) {
      // Create new order by reordering visible columns
      const newVisibleOrder = [...visibleKeys]
      const [moved] = newVisibleOrder.splice(fromIdx, 1)

      // Find new position after removal
      const newToIdx = newVisibleOrder.indexOf(toKey)

      // Insert at correct position
      const insertIdx = insertBefore ? newToIdx : newToIdx + 1
      newVisibleOrder.splice(insertIdx, 0, moved)

      // Build full column order: visible columns in new order + hidden columns at end
      const hiddenKeys = ALL_COLUMNS.map(c => c.key).filter(k => !visibleCols.has(k))
      const newOrder = [...newVisibleOrder, ...hiddenKeys]

      setColOrder(newOrder)
      localStorage.setItem(COL_ORDER_KEY, JSON.stringify(newOrder))
    }

    setDraggingThKey(null)
    document.body.style.userSelect = ''
  }

  const toggleSelect = (id: number) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }
  const toggleAll = () => {
    if (selected.size === claims.length && claims.length > 0) setSelected(new Set())
    else setSelected(new Set(claims.map(c => c.id)))
  }
  const toggleRow = (id: number) => {
    const next = new Set(expandedRows)
    next.has(id) ? next.delete(id) : next.add(id)
    setExpandedRows(next)
  }

  const handleBulkClose = async () => {
    if (!window.confirm(`Mark ${selected.size} claims as CLOSED?`)) return
    setBulkLoading(true)
    try {
      for (const id of selected) await updateClaim(id, { status: 'CLOSED' } as any)
      showToast('Claims marked as closed')
      setSelected(new Set())
      fetchData()
    } catch {
      showToast('Failed to update claims')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result || '')
      setImportText(text)
      setImportError('')
    }
    reader.readAsText(file)
  }

  const handleImportSubmit = async () => {
    if (!importText.trim()) return
    try {
      const lines = importText.split('\n').filter(l => l.trim())
      showToast(`Imported ${lines.length - 1} claims successfully`)
      setShowImport(false)
      setImportText('')
      fetchData()
    } catch {
      setImportError('Failed to parse CSV file')
    }
  }

  const handleExportSelected = () => {
    const data = claims.filter(c => selected.size === 0 || selected.has(c.id))
    const headers = COLUMNS.map(c => c.label).join(',')
    const rows = data.map(c => COLUMNS.map(col => {
      const val = (c as any)[col.key] ?? ''
      return String(val).includes(',') ? `"${val}"` : val
    }).join(','))
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `claims_export_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast(`Exported ${data.length} claims`)
  }

  const handleCheckEarlyWarning = () => {
    const overdue = claims.filter(c => {
      if (c.status === 'CLOSED' || !c.qcInformDate) return false
      const days = Math.floor((Date.now() - new Date(c.qcInformDate).getTime()) / 86400000)
      return days >= 5 && days <= 6 && (!c.rcaReport || c.rcaReport.trim() === '')
    })
    
    if (overdue.length === 0) {
      showToast('No early warning claims found')
      return
    }
    
    setEarlyWarningClaims(overdue)
    setSelectedEWClaim(null)
    setShowEWEmailPreview(false)
    setEwRecipients('')
    setEwCcRecipients('')
    setEwEmailSubject('')
    setEwEmailBody('')
    
    setShowEarlyWarningModal(true)
  }

  // Handle preview email for a single claim
  const handlePreviewEWEmail = (claim: Claim) => {
    setSelectedEWClaim(claim)
    
    // Generate email content for single claim
    const { subject, bodyHtml } = generateRCAReminderEmail([claim], 'early_warning')
    setEwEmailSubject(subject)
    setEwEmailBody(bodyHtml)
    
    // Auto-populate recipients based on factory agent
    const userFactoryAgent = user?.factoryAgent
    
    // To: The claim's QC Trip Leader (inspector) - try multiple matching strategies
    let toEmail = ''
    if (claim.inspector) {
      // Try exact match first
      const matchedUser = users.find(u => 
        u.username?.toLowerCase() === claim.inspector?.toLowerCase() || 
        u.fullName?.toLowerCase() === claim.inspector?.toLowerCase() ||
        u.email?.toLowerCase().startsWith(claim.inspector?.toLowerCase().replace(' ', '.') + '@')
      )
      toEmail = matchedUser?.email || ''
      
      // Debug log
      console.log('Looking for inspector:', claim.inspector, 'Found:', matchedUser?.email)
    }
    
    // Cc: Supervisor, QC Admin, Manager with same factory agent
    const ccUsers = users.filter(u => {
      const isTargetRole = u.role === 'SUPERVISOR' || u.role === 'QC_ADMIN' || u.role === 'MANAGER'
      const factoryMatch = !userFactoryAgent || !u.factoryAgent || u.factoryAgent === userFactoryAgent
      return isTargetRole && factoryMatch
    })
    
    const ccEmails = ccUsers
      .map(u => u.email)
      .filter(Boolean)
      .join(', ')
    
    // Debug log
    console.log('CC Users found:', ccUsers.length, 'Emails:', ccEmails)
    console.log('Current user factoryAgent:', userFactoryAgent)
    console.log('All users roles:', users.map(u => ({ role: u.role, factoryAgent: u.factoryAgent, email: u.email })))
    
    setEwRecipients(toEmail)
    setEwCcRecipients(ccEmails)
    setShowEWEmailPreview(true)
  }

  // Handle send email for all early warning claims - send individually
  const handleSendEWBulkEmail = async () => {
    if (earlyWarningClaims.length === 0) return
    
    const userFactoryAgent = user?.factoryAgent
    let sentCount = 0
    
    // Send email for each claim individually
    for (const claim of earlyWarningClaims) {
      // Generate email content for single claim
      const { subject, bodyHtml } = generateRCAReminderEmail([claim], 'early_warning')
      
      // To: The claim's QC Trip Leader (inspector)
      const toEmail = claim.inspectorEmail || 
        users.find(u => u.username === claim.inspector || u.fullName === claim.inspector)?.email || ''
      
      // Cc: Supervisor, QC Admin, Manager with same factory agent
      const ccEmails = users
        .filter(u => (u.role === 'SUPERVISOR' || u.role === 'QC_ADMIN' || u.role === 'MANAGER') && 
          (!userFactoryAgent || u.factoryAgent === userFactoryAgent))
        .map(u => u.email)
        .filter(Boolean)
        .join(', ')
      
      if (toEmail) {
        // In real app, call API to send email
        console.log('Sending Early Warning Email:', {
          to: toEmail,
          cc: ccEmails,
          subject,
          claimNo: claim.claimNo
        })
        sentCount++
      }
    }
    
    showToast(`Early warning emails sent: ${sentCount}/${earlyWarningClaims.length}`)
    setShowEarlyWarningModal(false)
    setSelectedEWClaim(null)
  }

  const handleSendEarlyWarning = () => {
    showToast(`Early warning sent to ${ewRecipients}`)
    setShowEarlyWarningModal(false)
    setEwRecipients('')
  }

  // Auto-send Early Warning email
  const autoSendEarlyWarning = (targetClaims: Claim[], usersList: User[]) => {
    if (targetClaims.length === 0) return
    
    const userFactoryAgent = user?.factoryAgent
    
    // Filter claims by factory agent
    const filteredClaims = userFactoryAgent 
      ? targetClaims.filter(c => c.factoryAgent === userFactoryAgent)
      : targetClaims
    
    if (filteredClaims.length === 0) return
    
    // Generate email content
    const { subject, bodyHtml } = generateRCAReminderEmail(filteredClaims, 'early_warning')
    
    // Get recipients - To: Inspectors with same factory agent
    const toEmails = usersList
      .filter(u => u.role === 'INSPECTOR' && (!userFactoryAgent || u.factoryAgent === userFactoryAgent))
      .map(u => u.email)
      .filter(Boolean)
      .join(', ')
    
    // Cc: Supervisor, QC Admin, Manager with same factory agent
    const ccEmails = usersList
      .filter(u => (u.role === 'SUPERVISOR' || u.role === 'QC_ADMIN' || u.role === 'MANAGER') && (!userFactoryAgent || u.factoryAgent === userFactoryAgent))
      .map(u => u.email)
      .filter(Boolean)
      .join(', ')
    
    // Log the auto-sent early warning (in real app, this would call an API to send email)
    console.log('Auto Early Warning Sent:', {
      to: toEmails,
      cc: ccEmails,
      subject,
      claimsCount: filteredClaims.length
    })
    
    // Show toast notification
    showToast(`Early warning auto-sent for ${filteredClaims.length} claim(s) approaching overdue`)
  }

  // Generate RCA reminder email content (V8 style)
  const generateRCAReminderEmail = (targetClaims: Claim[], type: 'overdue' | 'early_warning' = 'overdue') => {
    const today = new Date()
    const dateStr = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    const isEarly = type === 'early_warning'

    // Group by location/team
    const grouped: Record<string, Claim[]> = {}
    targetClaims.forEach(c => {
      const team = c.location || 'Unknown'
      if (!grouped[team]) grouped[team] = []
      grouped[team].push(c)
    })

    // Generate group HTML
    let groupHtml = ''
    for (const [team, items] of Object.entries(grouped)) {
      const rows = items.map((c, idx) => {
        const days = Math.floor((today.getTime() - new Date(c.qcInformDate!).getTime()) / 86400000)
        const remaining = 7 - days
        const color = isEarly ? '#f59e0b' : (days > 14 ? '#dc3545' : '#fd7e14')
        const label = isEarly ? `${remaining}d left` : `+${days - 7}d`
        return `<tr style="background:${idx % 2 === 0 ? '#fff' : '#f9fafb'}">
          <td style="padding:7px 10px;border-bottom:1px solid #e8ecf0;text-align:center;color:#888;font-size:0.82rem;">${idx + 1}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #e8ecf0;font-weight:600;">${c.claimNo || '-'}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #e8ecf0;">${c.vendor || '-'}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #e8ecf0;">${c.defectCategory || '-'}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #e8ecf0;">${c.inspector || '-'}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #e8ecf0;">${c.qcInformDate || '-'}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #e8ecf0;text-align:center;">
            <span style="background:${color};color:#fff;padding:2px 8px;border-radius:12px;font-size:0.78rem;font-weight:600;">${label}</span>
          </td>
        </tr>`
      }).join('')

      groupHtml += `<div style="margin-bottom:24px;">
        <div style="background:linear-gradient(135deg,#1a3a5c,#2c5f8a);color:white;padding:10px 16px;border-radius:8px 8px 0 0;display:flex;align-items:center;justify-content:space-between;">
          <span style="font-weight:700;font-size:0.95rem;">📍 ${team}</span>
          <span style="background:rgba(255,255,255,0.2);padding:2px 10px;border-radius:12px;font-size:0.8rem;">${items.length} item${items.length > 1 ? 's' : ''}</span>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:0.85rem;font-family:'Segoe UI',sans-serif;">
          <thead><tr style="background:#f0f4f8;">
            <th style="padding:8px 10px;text-align:center;color:#6c757d;font-weight:600;border-bottom:2px solid #dee2e6;">#</th>
            <th style="padding:8px 10px;color:#1a3a5c;font-weight:600;border-bottom:2px solid #dee2e6;">Claim No.</th>
            <th style="padding:8px 10px;color:#1a3a5c;font-weight:600;border-bottom:2px solid #dee2e6;">Vendor</th>
            <th style="padding:8px 10px;color:#1a3a5c;font-weight:600;border-bottom:2px solid #dee2e6;">Defect</th>
            <th style="padding:8px 10px;color:#1a3a5c;font-weight:600;border-bottom:2px solid #dee2e6;">QC Trip Leader</th>
            <th style="padding:8px 10px;color:#1a3a5c;font-weight:600;border-bottom:2px solid #dee2e6;">QC Inform Date</th>
            <th style="padding:8px 10px;text-align:center;color:#1a3a5c;font-weight:600;border-bottom:2px solid #dee2e6;">${isEarly ? 'Remaining' : 'Overdue'}</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`
    }

    const subject = isEarly
      ? `⚠️ RCA Early Warning ${dateStr} — ${targetClaims.length} Item${targetClaims.length > 1 ? 's' : ''} Due Soon`
      : `🚨 RCA Reminder ${dateStr} — ${targetClaims.length} Item${targetClaims.length > 1 ? 's' : ''} Overdue`

    const bannerColor = isEarly ? '#fff8e1' : '#fff3cd'
    const bannerBorder = isEarly ? '#ffc107' : '#ffc107'
    const bannerText = isEarly
      ? '⚡ These claims are approaching their 7-day RCA deadline. Please submit before the deadline.'
      : '🔔 Please submit your RCA report as soon as possible. Items marked in red are critically overdue (>14 days).'

    const bodyHtml = `<div style="font-family:'Segoe UI',Roboto,sans-serif;color:#333;max-width:860px;">
      <div style="background:linear-gradient(135deg,#1a3a5c,#2c5f8a);padding:20px 28px;border-radius:12px 12px 0 0;">
        <h2 style="color:white;margin:0;font-size:1.2rem;">${isEarly ? '⚠️ RCA Early Warning' : '🚨 RCA Reminder'} — ${dateStr}</h2>
        <p style="color:rgba(255,255,255,0.75);margin:4px 0 0;font-size:0.85rem;">${targetClaims.length} item${targetClaims.length > 1 ? 's' : ''} ${isEarly ? 'approaching deadline' : 'require immediate attention'}</p>
      </div>
      <div style="background:${bannerColor};border:1px solid ${bannerBorder};padding:12px 20px;font-size:0.88rem;color:#856404;">${bannerText}</div>
      <div style="padding:20px 0;">${groupHtml}</div>
      <div style="background:#f8f9fa;border-top:2px solid #dee2e6;padding:14px 20px;font-size:0.82rem;color:#6c757d;border-radius:0 0 12px 12px;">
        This is an automated reminder from the <strong>Otto International QC Claim Management System</strong>.
      </div>
    </div>`

    return { subject, bodyHtml }
  }

  const handleSendRCAReminder = () => {
    // Get current user's factory agent
    const userFactoryAgent = user?.factoryAgent
    
    // Filter claims: same factory agent as user, overdue, and no RCA report
    const pending = claims.filter(c => {
      if (c.status === 'CLOSED' || !c.qcInformDate) return false
      // Only show claims with same factory agent as current user
      if (c.factoryAgent !== userFactoryAgent) return false
      const days = Math.floor((Date.now() - new Date(c.qcInformDate).getTime()) / 86400000)
      return days > 7 && (!c.rcaReport || c.rcaReport.trim() === '')
    })
    
    if (pending.length === 0) {
      showToast('No overdue RCA items found for your factory agent.')
      return
    }
    
    setRcaPendingClaims(pending)
    
    // Auto-generate email content
    const { subject, bodyHtml } = generateRCAReminderEmail(pending, 'overdue')
    setRcaEmailSubject(subject)
    setRcaEmailBody(bodyHtml)
    
    // To: Inspectors with same factory agent as current user
    const toEmails = users
      .filter(u => u.role === 'INSPECTOR' && u.factoryAgent === userFactoryAgent)
      .map(u => u.email)
      .filter(Boolean)
      .join(', ')
    
    // Cc: Supervisor, QC Admin, Manager with same factory agent
    const ccEmails = users
      .filter(u => (u.role === 'SUPERVISOR' || u.role === 'QC_ADMIN' || u.role === 'MANAGER') && u.factoryAgent === userFactoryAgent)
      .map(u => u.email)
      .filter(Boolean)
      .join(', ')
    
    setRcaRecipients(toEmails)
    setRcaCcRecipients(ccEmails)
    
    setShowRCAReminderModal(true)
  }

  const handleSendRCAReminderSubmit = async () => {
    setSendingRcaReminder(true)
    try {
      // Log reminder on each claim
      const sentBy = user?.fullname || user?.username || 'System'
      const sentAt = new Date().toISOString()
      
      for (const claim of rcaPendingClaims) {
        const updatedLog = [...(claim.rcaReminderLog || []), { sentAt, sentBy, type: 'overdue' as const }]
        await updateClaim(claim.id, { ...claim, rcaReminderLog: updatedLog })
      }
      
      showToast(`RCA reminder sent to ${rcaRecipients}`)
      setShowRCAReminderModal(false)
      setRcaRecipients('')
      setRcaCcRecipients('')
      setRcaEmailSubject('')
      setRcaEmailBody('')
      setRcaPendingClaims([])
      
      // Refresh claims data to show updated reminder logs
      fetchData()
    } catch (err) {
      showToast('Failed to send RCA reminder')
    } finally {
      setSendingRcaReminder(false)
    }
  }

  const handleBulkEmail = () => {
    showToast(`Email alert sent to ${bulkEmailRecipients}`)
    setShowBulkEmailModal(false)
    setBulkEmailRecipients('')
  }

  // Handle attachment click to show modal
  const handleAttachmentClick = (attachments: any[]) => {
    setCurrentAttachments(attachments)
    setCurrentAttachmentIndex(0)
    setShowAttachmentModal(true)
  }

  const savePreset = () => {
    if (!presetName.trim()) return
    const newPreset: SavedPreset = { name: presetName.trim(), filters: { ...colFilters } }
    const next = [...presets, newPreset]
    setPresets(next)
    localStorage.setItem(PRESETS_KEY, JSON.stringify(next))
    setPresetName('')
    setShowSavePreset(false)
    showToast('Preset saved')
  }

  const loadPreset = (p: SavedPreset) => {
    setColFilters(p.filters)
    setShowPresetsMenu(false)
    setPage(0)
  }

  const deletePreset = (idx: number) => {
    const next = presets.filter((_, i) => i !== idx)
    setPresets(next)
    localStorage.setItem(PRESETS_KEY, JSON.stringify(next))
  }

  // V8 Style RCA cell rendering
  // V8: Get escalation level for RCA
  const getRCAEscalationLevel = (claim: Claim) => {
    // If no QC informed date or claim is closed/cancelled, no escalation needed
    if (!claim.qcInformDate || claim.status === 'CLOSED' || claim.status === 'CANCELLED') {
      return { level: -1, remaining: 0, overdue: 0, approved: false }
    }
    // If RCA is approved, show as approved
    if (claim.rcaStatus === 'APPROVED') {
      return { level: -1, remaining: 0, overdue: 0, approved: true }
    }
    // If has RCA report, consider done
    if (claim.rcaReport && claim.rcaReport.trim()) {
      return { level: -1, remaining: 0, overdue: 0, approved: false }
    }
    const qcDate = new Date(claim.qcInformDate)
    const now = new Date()
    const daysSince = Math.floor((now.getTime() - qcDate.getTime()) / (1000 * 60 * 60 * 24))
    const daysRemaining = 7 - daysSince
    
    if (daysRemaining > 3) return { level: 0, remaining: daysRemaining, overdue: 0, approved: false }
    if (daysRemaining > 0) return { level: 1, remaining: daysRemaining, overdue: 0, approved: false }
    if (daysSince <= 10) return { level: 2, remaining: 0, overdue: daysSince - 7, approved: false }
    return { level: 3, remaining: 0, overdue: daysSince - 7, approved: false }
  }

  const renderRCACell = (claim: Claim) => {
    // Approval status overrides escalation display
    if (claim.rcaStatus === 'APPROVED') {
      return <span className="escalation-badge lvl-approved"><i className="bi bi-check2-circle"></i> Approved</span>
    }
    if (claim.rcaStatus === 'SUBMITTED') {
      return <span className="escalation-badge lvl-warn"><i className="bi bi-send-check"></i> Submitted</span>
    }
    if (claim.rcaStatus === 'PENDING_MANAGER') {
      return <span className="escalation-badge lvl-warn"><i className="bi bi-hourglass-split"></i> Pend. Manager</span>
    }
    if (claim.rcaStatus === 'REJECTED') {
      return <span className="escalation-badge lvl-mgr"><i className="bi bi-x-circle"></i> Rejected</span>
    }
    // Has RCA report but not approved
    if (claim.rcaReport && claim.rcaReport.trim()) {
      return <span className="escalation-badge lvl-ok"><i className="bi bi-check-circle"></i> Done</span>
    }
    // No RCA needed (closed or no qcInformDate)
    if (claim.status === 'CLOSED' || claim.status === 'CANCELLED' || !claim.qcInformDate) {
      return <span style={{ color: '#94a3b8' }}>—</span>
    }
    
    const esc = getRCAEscalationLevel(claim)
    if (esc.level === 0) return <span className="escalation-badge lvl-ok"><i className="bi bi-hourglass"></i> {esc.remaining}d left</span>
    if (esc.level === 1) return <span className="escalation-badge lvl-warn"><i className="bi bi-clock"></i> {esc.remaining}d left</span>
    if (esc.level === 2) return <span className="escalation-badge lvl-super"><i className="bi bi-exclamation-triangle"></i> +{esc.overdue}d</span>
    return <span className="escalation-badge lvl-mgr"><i className="bi bi-exclamation-circle-fill"></i> +{esc.overdue}d</span>
  }

  // V8: Get RAG dot class based on status and escalation
  const getRAGDotClass = (claim: Claim) => {
    if (claim.status === 'CLOSED' || claim.status === 'CANCELLED') return 'rag-dot-green'
    const esc = getRCAEscalationLevel(claim)
    if (esc.level >= 3) return 'rag-dot-red'
    if (esc.level >= 2) return 'rag-dot-amber'
    return 'rag-dot-green'
  }

  // V8: Get Bootstrap badge class for status
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'CLOSED': return 'bg-success'
      case 'IN_PROGRESS': return 'bg-warning'
      case 'OPEN': return 'bg-secondary'
      case 'CANCELLED': return 'bg-dark'
      default: return 'bg-secondary'
    }
  }

  const getCellValue = (claim: Claim, key: string) => {
    switch (key) {
      case 'factoryAgent':         return claim.factoryAgent || '-'
      case 'claimNo':              return <a href="#" onClick={(e) => { e.preventDefault(); navigate(`/claims/${claim.id}`) }} style={{ fontWeight: 600, color: '#1a3a5c', textDecoration: 'none' }}>{claim.claimNo}</a>
      case 'vendor':               return claim.vendor || '-'
      case 'customer':             return claim.customer || '-'
      case 'fid':                  return claim.fid || '-'
      case 'location':             return claim.location || '-'
      case 'styleNo':              return claim.styleNo || '-'
      case 'orderNo':              return claim.orderNo || '-'
      case 'articleNo':            return claim.articleNo || '-'
      case 'inspector':            return claim.inspector || '-'
      case 'shippedQty':           return claim.shippedQty ?? '-'
      case 'claimQty':             return claim.claimQty ?? '-'
      case 'claimDate':            return claim.claimDate || '-'
      case 'marketInspectionDate': return claim.marketInspectionDate || '-'
      case 'qcInformDate':         return claim.qcInformDate || '-'
      case 'defectCategory':       return <span className="badge bg-secondary">{claim.defectCategory || '-'}</span>
      case 'qualityDigit':         return claim.qualityDigit || '-'
      case 'status': {
        const badgeClass = getStatusBadgeClass(claim.status)
        const ragClass = getRAGDotClass(claim)
        return <><span className={`rag-dot ${ragClass}`}></span><span className={`badge ${badgeClass}`}>{claim.status.replace(/_/g, ' ')}</span></>
      }
      case 'qcResponsibility': {
        if (!claim.qcResponsibility) return '-'
        return claim.qcResponsibility === 'Yes' 
          ? <span className="qc-resp-yes">Yes</span>
          : <span className="qc-resp-no">No</span>
      }
      case 'attachments': {
        if (!claim.attachments || claim.attachments.length === 0) return '-'
        return (
          <button 
            onClick={() => handleAttachmentClick(claim.attachments)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: 0
            }}
            title={`View ${claim.attachments.length} attachment${claim.attachments.length !== 1 ? 's' : ''}`}
          >
            <i className="bi bi-paperclip"></i> {claim.attachments.length}
          </button>
        )
      }
      case 'rca':                  return renderRCACell(claim)
      default:                     return (claim as any)[key] ?? '-'
    }
  }

  const totalPages = Math.ceil(total / (size === 0 ? total : size))

  return (
    <div>
      {loading ? (
        <SkeletonTable rows={8} cols={7} />
      ) : (
      <>
      {/* Overdue RCA Banner */}
      {overdueMode && (
        <div style={{
          background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10,
          padding: '10px 16px', marginBottom: 14, fontSize: '0.85rem',
          color: '#92400e', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500,
        }}>
          <i className="bi bi-exclamation-triangle-fill"></i>
          Showing <strong>Overdue RCA</strong> claims only (open, no RCA report, QC informed &gt;7 days ago)
          <button onClick={() => setOverdueMode(false)} style={{
            marginLeft: 'auto', background: 'none', border: '1px solid #f59e0b',
            borderRadius: 6, color: '#92400e', fontSize: '0.78rem', padding: '3px 12px',
            cursor: 'pointer', fontWeight: 600,
          }}>✕ Clear filter</button>
        </div>
      )}

      {/* Filter Section */}
      <div style={{
        background: '#fff', borderRadius: 12, padding: '14px 18px', marginBottom: 18,
        boxShadow: '0 1px 3px rgba(15,23,42,0.08)', border: '1px solid #e2e8f0',
      }}>
        {/* Title - V8 Style: small, muted, uppercase */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <i className="bi bi-funnel-fill" style={{ color: '#94a3b8', fontSize: '0.72rem' }}></i>
          <span style={{ fontWeight: 700, color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Search & Filter</span>
        </div>

        {/* Filter Row - V8 Layout: row g-2 align-items-start */}
        <div className="row g-2 align-items-start">
          {/* Global Search - col-md-2 */}
          <div className="col-md-2">
            <label className="form-label mb-1" style={{ fontSize: '0.75rem', color: '#6c757d' }}>Global Search</label>
            <div className="input-group input-group-sm">
              <span className="input-group-text"><i className="bi bi-search"></i></span>
              <input 
                type="text" 
                className="form-control"
                value={search} 
                onChange={e => { setSearch(e.target.value); setPage(0) }}
                placeholder="Search all fields..."
              />
            </div>
            <div style={{ marginTop: 4 }}>
              <button onClick={() => setAdvancedFiltersOpen(!advancedFiltersOpen)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#6c757d', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <i className="bi bi-chevron-right" style={{ fontSize: '0.65rem', transition: 'transform 0.2s', transform: advancedFiltersOpen ? 'rotate(90deg)' : 'none' }}></i>
                <span>{advancedFiltersOpen ? 'Hide Advanced Filters' : 'Advanced Filters'}</span>
              </button>
            </div>
          </div>

          {/* Vendor - col-md-2 */}
          <div className="col-md-2">
            <label className="form-label mb-1" style={{ fontSize: '0.75rem', color: '#6c757d' }}>Vendor</label>
            <input type="text" className="form-control form-control-sm" value={colFilters['vendor'] || ''} onChange={e => setColFilter('vendor', e.target.value)}
              placeholder="e.g. Nantong..." />
          </div>

          {/* Customer - col-md-2 */}
          <div className="col-md-2">
            <label className="form-label mb-1" style={{ fontSize: '0.75rem', color: '#6c757d' }}>Customer</label>
            <select className="form-control form-control-sm" value={colFilters['customer'] || ''} onChange={e => setColFilter('customer', e.target.value)}>
              <option value="">All Customers</option>
              <option value="Bonprix">Bonprix</option>
              <option value="OVH CAFS">OVH CAFS</option>
              <option value="HSE">HSE</option>
              <option value="ERF">ERF</option>
            </select>
          </div>

          {/* Status - col-md-2 */}
          <div className="col-md-2">
            <label className="form-label mb-1" style={{ fontSize: '0.75rem', color: '#6c757d' }}>Status</label>
            <select className="form-control form-control-sm" value={colFilters['status'] || ''} onChange={e => setColFilter('status', e.target.value)}>
              <option value="">All Status</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="CLOSED">Closed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Action Buttons - col-md-4 d-flex gap-2 align-items-end flex-wrap */}
          <div className="col-md-4 d-flex gap-2 align-items-end flex-wrap" style={{ paddingTop: 22 }}>
            <button onClick={resetAllFilters} title="Reset Filters"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 12px', fontSize: '0.8rem', fontWeight: 600, border: 'none', borderRadius: 6, cursor: 'pointer', background: '#64748b', color: '#fff' }}>
              <i className="bi bi-arrow-repeat"></i>
            </button>
            <button onClick={openColCustomizer} title="Customize Columns"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: '0.8rem', fontWeight: 600, border: 'none', borderRadius: 6, cursor: 'pointer', background: '#1a3a5c', color: '#fff' }}>
              <i className="bi bi-layout-three-columns me-1"></i> Columns
            </button>
            <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: 4, whiteSpace: 'nowrap', paddingBottom: 7 }}>
              {total !== totalAll ? `Showing ${total} of ${totalAll} claims` : `${total} claims`}
            </span>
          </div>
        </div>

        {/* Advanced Filters */}
        {advancedFiltersOpen && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '0 0 160px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#6c757d', marginBottom: 4 }}>Location</label>
                <select value={colFilters['location'] || ''} onChange={e => setColFilter('location', e.target.value)}
                  style={{ width: '100%', padding: '5px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.85rem', background: '#fff' }}>
                  <option value="">All Locations</option>
                  {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
              </div>

              <div style={{ flex: '0 0 160px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#6c757d', marginBottom: 4 }}>Defect Category</label>
                <select value={colFilters['defectCategory'] || ''} onChange={e => setColFilter('defectCategory', e.target.value)}
                  style={{ width: '100%', padding: '5px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.85rem', background: '#fff' }}>
                  <option value="">All Categories</option>
                  {DEFECT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div style={{ flex: '0 0 160px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#6c757d', marginBottom: 4 }}>Inspector</label>
                <select value={colFilters['inspector'] || ''} onChange={e => setColFilter('inspector', e.target.value)}
                  style={{ width: '100%', padding: '5px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.85rem', background: '#fff' }}>
                  <option value="">All Inspectors</option>
                  <option value="Andy Martin">Andy Martin</option>
                  <option value="Bella Chen">Bella Chen</option>
                  <option value="David Wu">David Wu</option>
                  <option value="Emily Zhang">Emily Zhang</option>
                </select>
              </div>

              <div style={{ flex: '0 0 160px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#6c757d', marginBottom: 4 }}>Claim Date From</label>
                <input type="date" value={colFilters['dateFrom'] || ''} onChange={e => setColFilter('dateFrom', e.target.value)}
                  style={{ width: '100%', padding: '5px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.85rem' }} />
              </div>

              <div style={{ flex: '0 0 160px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#6c757d', marginBottom: 4 }}>Claim Date To</label>
                <input type="date" value={colFilters['dateTo'] || ''} onChange={e => setColFilter('dateTo', e.target.value)}
                  style={{ width: '100%', padding: '5px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.85rem' }} />
              </div>

              <div style={{ flex: '0 0 160px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#6c757d', marginBottom: 4 }}>RCA Status</label>
                <select value={colFilters['rcaStatus'] || ''} onChange={e => setColFilter('rcaStatus', e.target.value)}
                  style={{ width: '100%', padding: '5px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.85rem', background: '#fff' }}>
                  <option value="">All</option>
                  <option value="done">RCA Done</option>
                  <option value="pending">RCA Pending</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Toolbar Action Buttons - V8 Style */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 12, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
          {/* Data Actions Group - Cyan - 所有用户可见 */}
          {canImportExport() && (
            <>
              <button onClick={() => setShowImport(true)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: isMobile ? '7px 10px' : '7px 14px', fontSize: '0.8rem', fontWeight: 600,
                  border: 'none', borderRadius: 6, cursor: 'pointer', background: '#0891b2', color: '#fff',
                  boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
                  transition: 'filter 0.22s, transform 0.22s, box-shadow 0.22s',
                }}>
                <i className="bi bi-file-earmark-arrow-up me-1"></i>{!isMobile && ' Import'}
              </button>

              <button onClick={handleExportSelected}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: isMobile ? '7px 10px' : '7px 14px', fontSize: '0.8rem', fontWeight: 600,
                  border: 'none', borderRadius: 6, cursor: 'pointer', background: '#0891b2', color: '#fff',
                  boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
                  transition: 'filter 0.22s, transform 0.22s, box-shadow 0.22s',
                }}>
                <i className="bi bi-file-earmark-excel me-1"></i>{!isMobile && ` Export${selected.size > 0 ? ` (${selected.size})` : ''}`}
              </button>

              {/* Divider */}
              <span style={{ width: 1, height: 22, background: '#e2e8f0', display: 'inline-block', margin: '0 2px' }}></span>
            </>
          )}
          
          {/* RCA Reminder Group - Orange/Amber - Supervisor/Manager/Admin 可见 */}
          {canSendRCAReminder() && (
            <>
              <button onClick={handleSendRCAReminder}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: isMobile ? '7px 10px' : '7px 14px', fontSize: '0.8rem', fontWeight: 600,
                  border: 'none', borderRadius: 6, cursor: 'pointer', background: '#d97706', color: '#fff',
                  boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
                  transition: 'filter 0.22s, transform 0.22s, box-shadow 0.22s',
                }}>
                <i className="bi bi-envelope-paper me-1"></i>{!isMobile && ' RCA Reminder'}
              </button>
            </>
          )}
          
          {/* Early Warning - Supervisor/Manager/Admin 可见 */}
          {canSendEarlyWarning() && (
            <>
              <button onClick={handleCheckEarlyWarning} title="Send early warning to claims on day 5-6"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: isMobile ? '7px 10px' : '7px 14px', fontSize: '0.8rem', fontWeight: 600,
                  border: 'none', borderRadius: 6, cursor: 'pointer', background: '#f59e0b', color: '#fff',
                  boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
                  transition: 'filter 0.22s, transform 0.22s, box-shadow 0.22s',
                }}>
                <i className="bi bi-exclamation-triangle me-1"></i>{!isMobile && ' Early Warning'}
              </button>

              {/* Divider */}
              <span style={{ width: 1, height: 22, background: '#e2e8f0', display: 'inline-block', margin: '0 2px' }}></span>
            </>
          )}

          {/* Bookmark - Deep Blue */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowPresetsMenu(v => !v)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: isMobile ? '7px 10px' : '7px 14px', fontSize: '0.8rem', fontWeight: 600,
                border: 'none', borderRadius: 6, cursor: 'pointer', background: '#1a3a5c', color: '#fff',
                boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
                transition: 'filter 0.22s, transform 0.22s, box-shadow 0.22s',
              }}>
              <i className="bi bi-bookmark-star me-1"></i>{!isMobile && ' Bookmark'}
            </button>
            {showPresetsMenu && (
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 999, background: '#fff',
                border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.1)', minWidth: 240, overflow: 'hidden' }}>
                <div style={{ padding: '9px 12px', background: 'linear-gradient(135deg,#1e4270,#2c5f8a)', color: '#fff',
                  fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="bi bi-bookmark-star-fill"></i> Saved Filter Presets
                </div>
                <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {presets.length === 0 && (
                    <div style={{ padding: '10px 14px', fontSize: 13, color: '#94a3b8' }}>No saved presets</div>
                  )}
                  {presets.map((p, i) => (
                    <div key={i} style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8,
                      borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                      <span style={{ flex: 1, fontSize: 13 }} onClick={() => loadPreset(p)}>{p.name}</span>
                      <button onClick={() => deletePreset(i)} style={{ background: 'none', border: 'none',
                        color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
                    </div>
                  ))}
                </div>
                <div style={{ padding: 10, borderTop: '1px solid #e2e8f0' }}>
                  {showSavePreset ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input value={presetName} onChange={e => setPresetName(e.target.value)}
                        placeholder="Name this filter preset..." autoFocus
                        style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }} />
                      <button onClick={savePreset} style={{ padding: '5px 10px', borderRadius: 6, background: '#1a3a5c',
                        color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Save</button>
                    </div>
                  ) : (
                    <button onClick={() => setShowSavePreset(true)} style={{ width: '100%', padding: '6px 0',
                      borderRadius: 6, border: '1px dashed #93c5fd', background: 'transparent',
                      color: '#3b82f6', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                      + Save current filters
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* New Claim - Pushed to right */}
          <button onClick={() => navigate('/claims/new')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: isMobile ? '7px 10px' : '7px 14px', fontSize: '0.8rem', fontWeight: 600,
              border: 'none', borderRadius: 6, cursor: 'pointer', background: '#1a3a5c', color: '#fff', marginLeft: 'auto',
              boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
              transition: 'filter 0.22s, transform 0.22s, box-shadow 0.22s',
            }}>
            <i className="bi bi-plus-circle me-1"></i>{!isMobile && ' New Claim'}
          </button>
        </div>

        {/* Active Filter Tags */}
        {Object.entries(colFilters).filter(([, v]) => v).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
            {Object.entries(colFilters).filter(([, v]) => v).map(([key, val]) => {
              const col = ALL_COLUMNS.find(c => c.filterKey === key)
              return (
                <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: '#eff6ff', color: '#1a3a5c', border: '1px solid #bfdbfe',
                  borderRadius: 20, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 600 }}>
                  {col?.label}: {val.replace(/_/g, ' ')}
                  <span onClick={() => clearColFilter(key)} style={{ cursor: 'pointer', opacity: 0.6, fontSize: '0.9rem' }}>×</span>
                </span>
              )
            })}
          </div>
        )}
      </div>

      {/* Table Wrapper */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 16,
        boxShadow: '0 1px 3px rgba(15,23,42,0.08)', border: '1px solid #e2e8f0' }}>

        {/* Bulk Action Toolbar */}
        {selected.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#eff6ff', border: '1px solid #bfdbfe',
            borderRadius: 8, padding: '8px 14px', marginBottom: 12, fontSize: '0.82rem' }}>
            <span style={{ fontWeight: 700, color: '#1a3a5c' }}><span>{selected.size}</span> selected</span>
            <button onClick={handleBulkClose} disabled={bulkLoading}
              style={{ padding: '5px 12px', borderRadius: 6, background: '#22c55e', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem' }}>
              <i className="bi bi-check-circle"></i> Mark Closed
            </button>
            <button onClick={() => setShowBulkEmailModal(true)}
              style={{ padding: '5px 12px', borderRadius: 6, background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem' }}>
              <i className="bi bi-envelope"></i> Send Email
            </button>
            <button onClick={handleExportSelected}
              style={{ padding: '5px 12px', borderRadius: 6, background: '#fff', color: '#1a3a5c', border: '1px solid #e2e8f0', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem' }}>
              <i className="bi bi-file-earmark-excel"></i> Export Selected
            </button>
            <button onClick={() => setSelected(new Set())}
              style={{ marginLeft: 'auto', padding: '5px 12px', borderRadius: 6, background: 'transparent', color: '#64748b', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '0.75rem' }}>
              <i className="bi bi-x-lg"></i> Clear
            </button>
          </div>
        )}

        {/* Table - V8 Style */}
        <div className="table-responsive" style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
          <table className="table table-hover table-sm" id="claimsTable" style={{ tableLayout: 'fixed', borderCollapse: 'collapse', boxSizing: 'border-box' }}>
            {/* V8: Column group for width synchronization */}
            <colgroup>
              <col style={{ width: 36, minWidth: 36 }} />
              <col style={{ width: 32, minWidth: 32 }} />
              {COLUMNS.map(col => {
                const w = colWidths[col.key] || DEFAULT_COL_WIDTHS[col.key] || 90
                return <col key={col.key} data-col-key={col.key} style={{ width: w, minWidth: w }} />
              })}
              <col style={{ width: 100, minWidth: 100 }} />
            </colgroup>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                <th className="th-cb" style={{ padding: 0, textAlign: 'center', background: '#f8fafc' }}>
                  <div className="th-inner" style={{ justifyContent: 'center' }}>
                    <input type="checkbox" checked={selected.size === claims.length && claims.length > 0}
                      onChange={toggleAll} style={{ accentColor: '#1a3a5c', cursor: 'pointer', width: 15, height: 15 }} />
                  </div>
                </th>
                <th className="th-exp" style={{ padding: 0, background: '#f8fafc' }}>
                  <div className="th-inner"></div>
                </th>
                {COLUMNS.map(col => (
                  <FilterTh
                    key={col.key}
                    col={col}
                    filterValue={col.filterKey ? (colFilters[col.filterKey] ?? '') : ''}
                    onFilterChange={val => col.filterKey && setColFilter(col.filterKey, val)}
                    onFilterClear={() => col.filterKey && clearColFilter(col.filterKey)}
                    onResize={handleColResize}
                    currentWidth={colWidths[col.key]}
                    draggingKey={draggingThKey}
                    onDragStart={handleThDragStart}
                    onDragEnd={handleThDragEnd}
                    onDragEndWithTarget={handleThDragEndWithTarget}
                    claims={claims}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={COLUMNS.length + 2} style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: '0.82rem' }}>Loading...</td></tr>
              ) : claims.length === 0 ? (
                <tr><td colSpan={COLUMNS.length + 2} style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: '0.82rem' }}>No claims found</td></tr>
              ) : claims.map((claim) => (
                <React.Fragment key={claim.id}>
                  <tr className={getStatusRowClass(claim.status)}
                    style={{
                      borderBottom: expandedRows.has(claim.id) ? 'none' : '1px solid #f1f5f9',
                      cursor: 'pointer'
                    }}
                    onClick={(e) => {
                      const target = e.target as HTMLElement
                      if (target.closest('button, a, input[type=checkbox]')) return
                      navigate(`/claims/${claim.id}`)
                    }}>
                    <td className="td-cb" style={{ textAlign: 'center' }}>
                      <input type="checkbox" checked={selected.has(claim.id)} onChange={() => toggleSelect(claim.id)}
                        style={{ accentColor: '#1a3a5c', cursor: 'pointer', width: 15, height: 15 }} />
                    </td>
                    <td className="td-exp" style={{ textAlign: 'center' }}>
                      <button className="expand-btn" onClick={(e) => { e.stopPropagation(); toggleRow(claim.id) }} title="Show details"
                        style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 20, height: 20, borderRadius: 4, border: '1px solid #e2e8f0',
                          background: expandedRows.has(claim.id) ? '#3b82f6' : 'transparent',
                          color: expandedRows.has(claim.id) ? '#fff' : '#94a3b8',
                          transform: expandedRows.has(claim.id) ? 'rotate(90deg)' : 'none',
                          cursor: 'pointer', fontSize: '0.6rem', padding: 0, lineHeight: 1,
                          transition: 'background 0.15s, color 0.15s, transform 0.15s'
                        }}>
                        <i className="bi bi-chevron-right"></i>
                      </button>
                    </td>
                    {COLUMNS.map(col => (
                      <td key={col.key} style={{ fontSize: '0.82rem', padding: '5px 8px' }}>
                        {getCellValue(claim, col.key)}
                      </td>
                    ))}
                  </tr>
                  {/* V8 Style Subrow */}
                  <tr className={`subrow ${expandedRows.has(claim.id) ? 'open' : ''}`}>
                    <td colSpan={COLUMNS.length + 2} style={{ padding: '5px 10px 8px 52px', background: '#f8fafc', borderTop: 'none' }}>
                      <div className="subrow-fields" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
                        {(() => {
                          // V8: Only show fields in subrow that are not already visible in main columns
                          const activeKeys = new Set(COLUMNS.map(c => c.key))
                          return SECONDARY_FIELDS
                            .filter(f => !activeKeys.has(f.key))
                            .map(f => {
                              const val = (claim as any)[f.key]
                              const isEmpty = !val && val !== 0
                              return (
                                <span key={f.key} className="subrow-field" style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, fontSize: '0.76rem', whiteSpace: 'nowrap' }}>
                                  <span className="sf-label" style={{ fontWeight: 700, color: '#64748b', fontSize: '0.67rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.label}</span>
                                  <span className={`sf-val${isEmpty ? ' sf-empty' : ''}`} style={{ color: isEmpty ? '#94a3b8' : '#0f172a', fontWeight: isEmpty ? 400 : 500, fontStyle: isEmpty ? 'italic' : 'normal' }}>{isEmpty ? '—' : val}</span>
                                </span>
                              )
                            })
                        })()}
                      </div>
                    </td>
                  </tr>
                  </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar - Always show page size selector */}
        {total > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 6px 2px', fontSize: '0.8rem', flexWrap: 'wrap', gap: 8,
            borderTop: '1px solid #e2e8f0', marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#64748b' }}>
                {size === 0 ? `Showing all ${total} claims` : `Showing ${page * size + 1}–${Math.min((page + 1) * size, total)} of ${total}`}
              </span>
              <select value={size} onChange={e => { setSize(parseInt(e.target.value)); setPage(0) }}
                style={{ fontSize: '0.78rem', borderRadius: 6, border: '1px solid #e2e8f0', padding: '2px 6px', cursor: 'pointer' }}>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
                <option value={0}>All</option>
              </select>
            </div>
            {totalPages > 1 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                <button disabled={page === 0} onClick={() => setPage(0)}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 28, height: 28,
                    borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1a3a5c', fontSize: '0.78rem', fontWeight: 600,
                    cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.35 : 1 }}>|&lt;</button>
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 28, height: 28,
                    borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1a3a5c', fontSize: '0.78rem', fontWeight: 600,
                    cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.35 : 1 }}>&lt;</button>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 28, height: 28,
                  borderRadius: 6, background: '#1a3a5c', color: '#fff', fontSize: '0.78rem', fontWeight: 600 }}>{page + 1}</span>
                <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 28, height: 28,
                    borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1a3a5c', fontSize: '0.78rem', fontWeight: 600,
                    cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page >= totalPages - 1 ? 0.35 : 1 }}>&gt;</button>
                <button disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 28, height: 28,
                    borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1a3a5c', fontSize: '0.78rem', fontWeight: 600,
                    cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page >= totalPages - 1 ? 0.35 : 1 }}>&gt;|</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Column Customizer Modal - V8 Style */}
      {showColModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9800 }}>
          {/* Overlay */}
          <div 
            style={{ 
              position: 'absolute', 
              inset: 0, 
              background: 'rgba(15,23,42,0.5)'
            }} 
            onClick={closeColCustomizer}
          />
          {/* Modal */}
          <div style={{ 
            position: 'absolute', 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)', 
            zIndex: 9801, 
            width: 320, 
            maxHeight: '85vh', 
            background: '#fff', 
            borderRadius: 12, 
            boxShadow: '0 8px 32px rgba(15,23,42,.28)', 
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header */}
            <div style={{ 
              background: 'linear-gradient(135deg,#1a3a5c,#2c5f8a)', 
              color: 'white', 
              padding: '12px 16px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              flexShrink: 0 
            }}>
              <i className="bi bi-layout-three-columns"></i>
              <span style={{ fontWeight: 600, fontSize: '0.95rem', flex: 1 }}>Customize Columns</span>
              <button 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'white', 
                  fontSize: '1.3rem', 
                  cursor: 'pointer', 
                  padding: '0 4px', 
                  lineHeight: 1 
                }} 
                onClick={closeColCustomizer}
              >×</button>
            </div>
            
            {/* Content */}
            <div style={{ 
              padding: '12px 14px', 
              overflowY: 'auto', 
              flex: 1, 
              minHeight: 0 
            }}>
              <p style={{ 
                color: '#6c757d', 
                fontSize: '0.8rem', 
                marginBottom: 12,
                marginTop: 0 
              }}>
                <i className="bi bi-grip-vertical"></i> Drag to reorder &nbsp;·&nbsp; <i className="bi bi-eye"></i> Click to show/hide
              </p>
              
              {tempColConfig.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                  Loading columns...
                </div>
              ) : (
                <ul 
                  ref={colListRef}
                  style={{ 
                    listStyle: 'none', 
                    padding: 0, 
                    margin: 0,
                    userSelect: 'none'
                  }}
                >
                  {tempColConfig.map(cfg => {
                    const col = ALL_COLUMNS.find(c => c.key === cfg.key)
                    if (!col) return null
                    return (
                      <li 
                        key={cfg.key}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 9, 
                          padding: '7px 10px', 
                          border: '1px solid #e2e8f0', 
                          borderRadius: 6, 
                          marginBottom: 5, 
                          background: cfg.visible ? '#fff' : '#f8fafc',
                          cursor: 'default'
                        }}
                      >
                        {/* Drag Handle */}
                        <span 
                          style={{ 
                            cursor: 'grab', 
                            color: '#cbd5e1', 
                            fontSize: '0.95rem', 
                            padding: '0 2px', 
                            flexShrink: 0 
                          }}
                        >
                          <i className="bi bi-grip-vertical"></i>
                        </span>
                        
                        {/* Column Name */}
                        <span style={{ 
                          flex: 1, 
                          fontSize: '0.84rem', 
                          fontWeight: 500,
                          color: cfg.visible ? '#1e293b' : '#94a3b8'
                        }}>
                          {col.label}
                        </span>
                        
                        {/* Visibility Toggle */}
                        <span 
                          style={{ 
                            flexShrink: 0, 
                            cursor: 'pointer', 
                            fontSize: '1.05rem',
                            color: cfg.visible ? '#3b82f6' : '#cbd5e1'
                          }}
                          onClick={() => toggleColVisibility(cfg.key)}
                          title={cfg.visible ? 'Hide column' : 'Show column'}
                        >
                          <i className={cfg.visible ? 'bi bi-eye' : 'bi bi-eye-slash'}></i>
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
            
            {/* Footer */}
            <div style={{ 
              padding: '10px 14px', 
              borderTop: '1px solid #e2e8f0', 
              display: 'flex', 
              gap: 8, 
              justifyContent: 'flex-end', 
              flexShrink: 0 
            }}>
              <button 
                style={{ 
                  padding: '6px 12px', 
                  borderRadius: 6, 
                  border: '1px solid #e2e8f0', 
                  background: '#fff', 
                  cursor: 'pointer', 
                  fontSize: '0.85rem',
                  color: '#64748b'
                }}
                onClick={resetColConfig}
              >Reset Defaults</button>
              <button 
                style={{ 
                  padding: '6px 12px', 
                  borderRadius: 6, 
                  background: '#1a3a5c', 
                  color: '#fff', 
                  border: 'none', 
                  cursor: 'pointer', 
                  fontSize: '0.85rem',
                  fontWeight: 500
                }}
                onClick={applyColConfig}
              >Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 9000,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 540,
            boxShadow: '0 24px 64px rgba(15,23,42,.3)' }}>
            <h3 style={{ color: '#1a3a5c', margin: '0 0 16px', fontWeight: 700 }}>Import Claims</h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', marginBottom: 6 }}>CSV File</label>
              <input ref={fileImportRef} type="file" accept=".csv" onChange={handleImportFile} style={{ display: 'none' }} />
              <button onClick={() => fileImportRef.current?.click()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: '0.8rem', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}>
                <i className="bi bi-upload"></i> Select File
              </button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', marginBottom: 6 }}>Or paste CSV data</label>
              <textarea value={importText} onChange={e => { setImportText(e.target.value); setImportError('') }}
                placeholder="claimNo,vendor,customer,inspector,defectCategory,location,claimDate,status,rcaStatus..."
                style={{ width: '100%', height: 120, padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.78rem', fontFamily: 'monospace' }} />
            </div>
            {importError && (
              <div style={{ marginBottom: 16, padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: '0.78rem' }}>
                <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: 6 }}></i>
                {importError}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => { setShowImport(false); setImportText(''); setImportError('') }}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
              <button onClick={handleImportSubmit} disabled={!importText.trim()}
                style={{ padding: '8px 16px', borderRadius: 8, background: '#1a3a5c', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, opacity: importText.trim() ? 1 : 0.5 }}>Import</button>
            </div>
          </div>
        </div>
      )}

      {/* Early Warning Modal - List View with Individual Email Preview */}
      {showEarlyWarningModal && (
        <div 
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => { setShowEarlyWarningModal(false); setSelectedEWClaim(null); setShowEWEmailPreview(false); }}
          onKeyDown={(e) => { if (e.key === 'Escape') { setShowEarlyWarningModal(false); setSelectedEWClaim(null); setShowEWEmailPreview(false); } }}
          tabIndex={0}
          ref={(el) => el?.focus()}
        >
          <div 
            style={{ background: '#fff', borderRadius: 16, padding: 28, width: 1000, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(15,23,42,.3)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ color: '#1a3a5c', margin: '0 0 16px', fontWeight: 700 }}>
              <i className="bi bi-exclamation-triangle" style={{ color: '#f59e0b', marginRight: 8 }}></i>
              Early Warning
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.82rem', marginBottom: 16 }}>
              Found <strong>{earlyWarningClaims.length}</strong> claims on day 5-6 (approaching overdue). Click "Preview Email" to view email for each claim.
            </p>
            
            {/* Claims List Table */}
            <div style={{ marginBottom: 20, maxHeight: 400, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', fontFamily: "'Segoe UI',sans-serif" }}>
                <thead>
                  <tr style={{ background: '#f0f4f8' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'center', color: '#6c757d', fontWeight: 600, borderBottom: '2px solid #dee2e6' }}>#</th>
                    <th style={{ padding: '10px 12px', color: '#1a3a5c', fontWeight: 600, borderBottom: '2px solid #dee2e6' }}>Claim No.</th>
                    <th style={{ padding: '10px 12px', color: '#1a3a5c', fontWeight: 600, borderBottom: '2px solid #dee2e6' }}>Vendor</th>
                    <th style={{ padding: '10px 12px', color: '#1a3a5c', fontWeight: 600, borderBottom: '2px solid #dee2e6' }}>Location</th>
                    <th style={{ padding: '10px 12px', color: '#1a3a5c', fontWeight: 600, borderBottom: '2px solid #dee2e6' }}>QC Trip Leader</th>
                    <th style={{ padding: '10px 12px', color: '#1a3a5c', fontWeight: 600, borderBottom: '2px solid #dee2e6' }}>QC Inform Date</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', color: '#1a3a5c', fontWeight: 600, borderBottom: '2px solid #dee2e6' }}>Remaining</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', color: '#1a3a5c', fontWeight: 600, borderBottom: '2px solid #dee2e6' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {earlyWarningClaims.map((c, idx) => {
                    const days = Math.floor((Date.now() - new Date(c.qcInformDate!).getTime()) / 86400000)
                    const remaining = 7 - days
                    return (
                      <tr key={c.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f9fafb' }}>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #e8ecf0', textAlign: 'center', color: '#888' }}>{idx + 1}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #e8ecf0', fontWeight: 600 }}>{c.claimNo || '-'}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #e8ecf0' }}>{c.vendor || '-'}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #e8ecf0' }}>{c.location || '-'}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #e8ecf0' }}>{c.inspector || '-'}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #e8ecf0' }}>{c.qcInformDate || '-'}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #e8ecf0', textAlign: 'center' }}>
                          <span style={{ background: '#f59e0b', color: '#fff', padding: '3px 10px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 600 }}>{remaining}d left</span>
                        </td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #e8ecf0', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                            <button 
                              onClick={() => handlePreviewEWEmail(c)}
                              style={{ 
                                padding: '5px 12px', 
                                borderRadius: 6, 
                                background: '#10b981', 
                                color: '#fff', 
                                border: 'none', 
                                cursor: 'pointer', 
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                            >
                              <i className="bi bi-envelope"></i>Preview Email
                            </button>
                            <button 
                              onClick={() => { setViewClaimDetail(c) }}
                              style={{ 
                                padding: '5px 12px', 
                                borderRadius: 6, 
                                background: '#3b82f6', 
                                color: '#fff', 
                                border: 'none', 
                                cursor: 'pointer', 
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                            >
                              <i className="bi bi-eye"></i>View
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => { setShowEarlyWarningModal(false); setSelectedEWClaim(null); setShowEWEmailPreview(false); }}
                style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
              <button onClick={handleSendEWBulkEmail}
                style={{ padding: '10px 20px', borderRadius: 8, background: '#f59e0b', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="bi bi-send"></i>Send Email ({earlyWarningClaims.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Early Warning Single Email Preview Modal */}
      {showEWEmailPreview && selectedEWClaim && (
        <div 
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.6)', zIndex: 9500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => { setShowEWEmailPreview(false); setSelectedEWClaim(null); }}
          onKeyDown={(e) => { if (e.key === 'Escape') { setShowEWEmailPreview(false); setSelectedEWClaim(null); } }}
          tabIndex={0}
          ref={(el) => el?.focus()}
        >
          <div 
            style={{ background: '#fff', borderRadius: 16, padding: 28, width: 800, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(15,23,42,.4)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ color: '#1a3a5c', margin: '0 0 16px', fontWeight: 700 }}>
              <i className="bi bi-envelope" style={{ color: '#10b981', marginRight: 8 }}></i>
              Email Preview - {selectedEWClaim.claimNo}
            </h3>
            
            <div style={{ marginBottom: 16, padding: 16, background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: 4, fontWeight: 600 }}>Subject</label>
                <input type="text" value={ewEmailSubject} readOnly
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.85rem', background: '#fff' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: 4, fontWeight: 600 }}>To</label>
                <input type="text" value={ewRecipients} onChange={e => setEwRecipients(e.target.value)}
                  placeholder="comma-separated emails..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.85rem' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: 4, fontWeight: 600 }}>Cc</label>
                <input type="text" value={ewCcRecipients} onChange={e => setEwCcRecipients(e.target.value)}
                  placeholder="comma-separated emails..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.85rem' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: 4, fontWeight: 600 }}>Email Body</label>
                <div dangerouslySetInnerHTML={{ __html: ewEmailBody }} 
                  style={{ width: '100%', padding: 16, borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.85rem', background: '#fff', maxHeight: 300, overflowY: 'auto' }} />
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => { setShowEWEmailPreview(false); setSelectedEWClaim(null); }}
                style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}>Close</button>
              <button onClick={() => { handleSendEarlyWarning(); setShowEWEmailPreview(false); }} disabled={!ewRecipients.trim()}
                style={{ padding: '10px 20px', borderRadius: 8, background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, opacity: ewRecipients.trim() ? 1 : 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="bi bi-send"></i>Send Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Claim Detail View Modal */}
      {viewClaimDetail && (
        <div 
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.7)', zIndex: 9600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => { setViewClaimDetail(null) }}
          onKeyDown={(e) => { if (e.key === 'Escape') { setViewClaimDetail(null) } }}
          tabIndex={0}
          ref={(el) => el?.focus()}
        >
          <div 
            style={{ background: '#fff', borderRadius: 16, padding: 28, width: 900, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(15,23,42,.5)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottom: '2px solid #e2e8f0' }}>
              <h3 style={{ color: '#1a3a5c', margin: 0, fontWeight: 700 }}>
                <i className="bi bi-file-text" style={{ color: '#3b82f6', marginRight: 8 }}></i>
                Claim Detail - {viewClaimDetail.claimNo}
              </h3>
              <button 
                onClick={() => setViewClaimDetail(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: 4 }}>Vendor</label>
                <div style={{ fontWeight: 600, color: '#1a3a5c' }}>{viewClaimDetail.vendor || '-'}</div>
              </div>
              <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: 4 }}>Customer</label>
                <div style={{ fontWeight: 600, color: '#1a3a5c' }}>{viewClaimDetail.customer || '-'}</div>
              </div>
              <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: 4 }}>Location</label>
                <div style={{ fontWeight: 600, color: '#1a3a5c' }}>{viewClaimDetail.location || '-'}</div>
              </div>
              <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: 4 }}>QC Trip Leader</label>
                <div style={{ fontWeight: 600, color: '#1a3a5c' }}>{viewClaimDetail.inspector || '-'}</div>
              </div>
              <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: 4 }}>Style No.</label>
                <div style={{ fontWeight: 600, color: '#1a3a5c' }}>{viewClaimDetail.styleNo || '-'}</div>
              </div>
              <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: 4 }}>Order No.</label>
                <div style={{ fontWeight: 600, color: '#1a3a5c' }}>{viewClaimDetail.orderNo || '-'}</div>
              </div>
              <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: 4 }}>QC Inform Date</label>
                <div style={{ fontWeight: 600, color: '#1a3a5c' }}>{viewClaimDetail.qcInformDate || '-'}</div>
              </div>
              <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: 4 }}>Status</label>
                <div style={{ fontWeight: 600, color: '#1a3a5c' }}>{viewClaimDetail.status || '-'}</div>
              </div>
            </div>
            
            <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: 4 }}>Defect Description</label>
              <div style={{ color: '#1a3a5c' }}>{viewClaimDetail.defectDescription || '-'}</div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button 
                onClick={() => { setViewClaimDetail(null); navigate(`/claims/${viewClaimDetail.id}/edit`) }}
                style={{ padding: '10px 20px', borderRadius: 8, background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
              >
                <i className="bi bi-pencil"></i> Edit Claim
              </button>
              <button 
                onClick={() => setViewClaimDetail(null)}
                style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RCA Reminder Modal - V8 Style */}
      {showRCAReminderModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 1000, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(15,23,42,.3)' }}>
            <h3 style={{ color: '#1a3a5c', margin: '0 0 16px', fontWeight: 700 }}>
              <i className="bi bi-envelope-paper" style={{ color: '#d97706', marginRight: 8 }}></i>
              RCA Reminder
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.82rem', marginBottom: 16 }}>
              Found <strong>{rcaPendingClaims.length}</strong> overdue RCA claims (no report &gt;7 days).
            </p>
            
            {/* Grouped by Location Table */}
            <div style={{ marginBottom: 20, maxHeight: 350, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              {(() => {
                const grouped: Record<string, Claim[]> = {}
                rcaPendingClaims.forEach(c => {
                  const team = c.location || 'Unknown'
                  if (!grouped[team]) grouped[team] = []
                  grouped[team].push(c)
                })
                
                return Object.entries(grouped).map(([team, items]) => {
                  const today = new Date()
                  return (
                    <div key={team} style={{ marginBottom: 16 }}>
                      <div style={{ background: 'linear-gradient(135deg,#1a3a5c,#2c5f8a)', color: 'white', padding: '10px 16px', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>📍 {team}</span>
                        <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 10px', borderRadius: 12, fontSize: '0.8rem' }}>{items.length} item{items.length > 1 ? 's' : ''}</span>
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', fontFamily: "'Segoe UI',sans-serif" }}>
                        <thead>
                          <tr style={{ background: '#f0f4f8' }}>
                            <th style={{ padding: '8px 10px', textAlign: 'center', color: '#6c757d', fontWeight: 600, borderBottom: '2px solid #dee2e6' }}>#</th>
                            <th style={{ padding: '8px 10px', color: '#1a3a5c', fontWeight: 600, borderBottom: '2px solid #dee2e6' }}>Claim No.</th>
                            <th style={{ padding: '8px 10px', color: '#1a3a5c', fontWeight: 600, borderBottom: '2px solid #dee2e6' }}>Vendor</th>
                            <th style={{ padding: '8px 10px', color: '#1a3a5c', fontWeight: 600, borderBottom: '2px solid #dee2e6' }}>Defect</th>
                            <th style={{ padding: '8px 10px', color: '#1a3a5c', fontWeight: 600, borderBottom: '2px solid #dee2e6' }}>QC Trip Leader</th>
                            <th style={{ padding: '8px 10px', color: '#1a3a5c', fontWeight: 600, borderBottom: '2px solid #dee2e6' }}>QC Inform Date</th>
                            <th style={{ padding: '8px 10px', textAlign: 'center', color: '#1a3a5c', fontWeight: 600, borderBottom: '2px solid #dee2e6' }}>Overdue</th>
                            <th style={{ padding: '8px 10px', textAlign: 'center', color: '#1a3a5c', fontWeight: 600, borderBottom: '2px solid #dee2e6' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((c, idx) => {
                            const days = Math.floor((today.getTime() - new Date(c.qcInformDate!).getTime()) / 86400000)
                            const color = days > 14 ? '#dc3545' : '#fd7e14'
                            return (
                              <tr key={c.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f9fafb' }}>
                                <td style={{ padding: '7px 10px', borderBottom: '1px solid #e8ecf0', textAlign: 'center', color: '#888', fontSize: '0.82rem' }}>{idx + 1}</td>
                                <td style={{ padding: '7px 10px', borderBottom: '1px solid #e8ecf0', fontWeight: 600 }}>{c.claimNo || '-'}</td>
                                <td style={{ padding: '7px 10px', borderBottom: '1px solid #e8ecf0' }}>{c.vendor || '-'}</td>
                                <td style={{ padding: '7px 10px', borderBottom: '1px solid #e8ecf0' }}>{c.defectCategory || '-'}</td>
                                <td style={{ padding: '7px 10px', borderBottom: '1px solid #e8ecf0' }}>{c.inspector || '-'}</td>
                                <td style={{ padding: '7px 10px', borderBottom: '1px solid #e8ecf0' }}>{c.qcInformDate || '-'}</td>
                                <td style={{ padding: '7px 10px', borderBottom: '1px solid #e8ecf0', textAlign: 'center' }}>
                                  <span style={{ background: color, color: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 600 }}>+{days - 7}d</span>
                                </td>
                                <td style={{ padding: '7px 10px', borderBottom: '1px solid #e8ecf0', textAlign: 'center' }}>
                                  <button 
                                    onClick={() => { setShowRCAReminderModal(false); navigate(`/claims/${c.id}`) }}
                                    style={{ 
                                      padding: '4px 10px', 
                                      borderRadius: 6, 
                                      background: '#3b82f6', 
                                      color: '#fff', 
                                      border: 'none', 
                                      cursor: 'pointer', 
                                      fontSize: '0.75rem',
                                      fontWeight: 500
                                    }}
                                  >
                                    <i className="bi bi-eye" style={{ marginRight: 4 }}></i>View
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                })
              })()}
            </div>
            
            {/* Recipients */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', marginBottom: 6 }}>To (Inspectors - same Factory Agent)</label>
              <input type="text" value={rcaRecipients} onChange={e => setRcaRecipients(e.target.value)}
                placeholder="comma-separated emails..."
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.82rem' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', marginBottom: 6 }}>Cc (Supervisor / QC Admin / Manager)</label>
              <input type="text" value={rcaCcRecipients} onChange={e => setRcaCcRecipients(e.target.value)}
                placeholder="comma-separated emails..."
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.82rem' }} />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => { setShowRCAReminderModal(false); setRcaRecipients(''); setRcaCcRecipients('') }}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
              <button onClick={handleSendRCAReminderSubmit} disabled={!rcaRecipients.trim() || rcaPendingClaims.length === 0 || sendingRcaReminder}
                style={{ padding: '8px 16px', borderRadius: 8, background: '#d97706', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, opacity: (rcaRecipients.trim() && rcaPendingClaims.length > 0 && !sendingRcaReminder) ? 1 : 0.5 }}>
                {sendingRcaReminder ? (
                  <><i className="bi bi-hourglass-split" style={{ marginRight: 6 }}></i>Sending...</>
                ) : (
                  <><i className="bi bi-send-fill" style={{ marginRight: 6 }}></i>Send Reminder</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Email Modal */}
      {showBulkEmailModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 480, boxShadow: '0 24px 64px rgba(15,23,42,.3)' }}>
            <h3 style={{ color: '#1a3a5c', margin: '0 0 16px', fontWeight: 700 }}>
              <i className="bi bi-envelope" style={{ color: '#3b82f6', marginRight: 8 }}></i>
              Send Bulk Email
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.82rem', marginBottom: 16 }}>
              Send email notification for <strong>{selected.size}</strong> selected claims.
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', marginBottom: 6 }}>Recipient Email(s)</label>
              <input type="text" value={bulkEmailRecipients} onChange={e => setBulkEmailRecipients(e.target.value)}
                placeholder="comma-separated emails..."
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.82rem' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => { setShowBulkEmailModal(false); setBulkEmailRecipients('') }}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
              <button onClick={handleBulkEmail} disabled={!bulkEmailRecipients.trim()}
                style={{ padding: '8px 16px', borderRadius: 8, background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, opacity: bulkEmailRecipients.trim() ? 1 : 0.5 }}>Send Email</button>
            </div>
          </div>
        </div>
      )}

      {/* Attachment Preview Modal */}
      {showAttachmentModal && currentAttachments.length > 0 && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }}>
            {/* Close button */}
            <button 
              onClick={() => setShowAttachmentModal(false)}
              style={{
                position: 'absolute',
                top: -40,
                right: 0,
                background: 'none',
                border: 'none',
                color: '#fff',
                fontSize: 24,
                cursor: 'pointer',
                zIndex: 10
              }}
            >
              ✕
            </button>
            
            {/* Navigation buttons */}
            {currentAttachments.length > 1 && (
              <>
                <button 
                  onClick={() => setCurrentAttachmentIndex(prev => (prev > 0 ? prev - 1 : currentAttachments.length - 1))}
                  style={{
                    position: 'absolute',
                    left: -50,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(0,0,0,0.5)',
                    border: 'none',
                    color: '#fff',
                    fontSize: 32,
                    cursor: 'pointer',
                    padding: '10px 15px',
                    borderRadius: 50
                  }}
                >
                  ←
                </button>
                <button 
                  onClick={() => setCurrentAttachmentIndex(prev => (prev < currentAttachments.length - 1 ? prev + 1 : 0))}
                  style={{
                    position: 'absolute',
                    right: -50,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(0,0,0,0.5)',
                    border: 'none',
                    color: '#fff',
                    fontSize: 32,
                    cursor: 'pointer',
                    padding: '10px 15px',
                    borderRadius: 50
                  }}
                >
                  →
                </button>
              </>
            )}
            
            {/* Image preview */}
            {currentAttachments[currentAttachmentIndex].contentType?.startsWith('image/') ? (
              <img 
                src={`/api/attachments/${currentAttachments[currentAttachmentIndex].id}`}
                alt={currentAttachments[currentAttachmentIndex].fileName}
                style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
              />
            ) : (
              <div style={{ background: '#fff', padding: 40, borderRadius: 8, textAlign: 'center' }}>
                <i className="bi bi-file-earmark" style={{ fontSize: 64, color: '#94a3b8' }}></i>
                <p style={{ marginTop: 16, color: '#64748b' }}>
                  {currentAttachments[currentAttachmentIndex].fileName}
                </p>
                <a 
                  href={`/api/attachments/${currentAttachments[currentAttachmentIndex].id}`}
                  download={currentAttachments[currentAttachmentIndex].fileName}
                  style={{
                    display: 'inline-block',
                    marginTop: 16,
                    padding: '8px 16px',
                    background: '#3b82f6',
                    color: '#fff',
                    textDecoration: 'none',
                    borderRadius: 6
                  }}
                >
                  Download File
                </a>
              </div>
            )}
            
            {/* File info */}
            <div style={{ position: 'absolute', bottom: -40, left: 0, right: 0, color: '#fff', textAlign: 'center', fontSize: '0.8rem' }}>
              {currentAttachmentIndex + 1} / {currentAttachments.length} - {currentAttachments[currentAttachmentIndex].fileName}
            </div>
          </div>
        </div>
      )}

      </>
      )}
    </div>
  )
}

export default ClaimsListPage
