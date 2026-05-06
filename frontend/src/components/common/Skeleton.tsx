import React from 'react'

interface SkeletonProps {
  width?: string | number
  height?: string | number
  borderRadius?: string | number
  style?: React.CSSProperties
}

const Skeleton: React.FC<SkeletonProps> = ({ width = '100%', height = 16, borderRadius = 6, style }) => (
  <div
    style={{
      width,
      height,
      borderRadius,
      background: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)',
      backgroundSize: '200% 100%',
      animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
      ...style,
    }}
  />
)

export const SkeletonCard: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
  <div style={{ background: 'var(--color-bg-card, #fff)', borderRadius: 'var(--radius-lg, 12px)', padding: 20,
    boxShadow: 'var(--shadow-md, 0 2px 8px rgba(15,23,42,.08))', border: '1px solid var(--color-border, #e2e8f0)' }}>
    <Skeleton width="60%" height={14} style={{ marginBottom: 12 }} />
    <Skeleton width="40%" height={28} style={{ marginBottom: 16 }} />
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} width={`${85 - i * 10}%`} height={10} style={{ marginBottom: 8 }} />
    ))}
  </div>
)

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 6 }) => (
  <div style={{ background: 'var(--color-bg-card, #fff)', borderRadius: 'var(--radius-lg, 12px)', padding: 16,
    boxShadow: 'var(--shadow-md, 0 2px 8px rgba(15,23,42,.08))', border: '1px solid var(--color-border, #e2e8f0)' }}>
    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} width={`${100 / cols}%`} height={12} />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
        {Array.from({ length: cols }).map((_, j) => (
          <Skeleton key={j} width={`${100 / cols}%`} height={10} />
        ))}
      </div>
    ))}
  </div>
)

export default Skeleton
