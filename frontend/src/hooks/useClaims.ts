import { useState, useEffect, useCallback } from 'react'
import { getClaims } from '../services/claimService'
import { Claim, ClaimFilters } from '../types/claim'

interface UseClaimsOptions {
  initialFilters?: ClaimFilters
  initialPage?: number
  initialSize?: number
}

interface UseClaimsReturn {
  claims: Claim[]
  total: number
  loading: boolean
  error: string | null
  page: number
  size: number
  filters: ClaimFilters
  setPage: (page: number) => void
  setSize: (size: number) => void
  setFilters: (filters: ClaimFilters) => void
  updateFilter: (key: keyof ClaimFilters, value: string) => void
  refresh: () => void
}

export function useClaims(options: UseClaimsOptions = {}): UseClaimsReturn {
  const { initialFilters = {}, initialPage = 0, initialSize = 50 } = options

  const [claims, setClaims] = useState<Claim[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(initialPage)
  const [size, setSize] = useState(initialSize)
  const [filters, setFilters] = useState<ClaimFilters>(initialFilters)

  const fetchClaims = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getClaims({ ...filters, page, size })
      setClaims(data.content)
      setTotal(data.totalElements)
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch claims')
    } finally {
      setLoading(false)
    }
  }, [filters, page, size])

  useEffect(() => {
    fetchClaims()
  }, [fetchClaims])

  const updateFilter = useCallback((key: keyof ClaimFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }))
    setPage(0)
  }, [])

  return {
    claims,
    total,
    loading,
    error,
    page,
    size,
    filters,
    setPage,
    setSize,
    setFilters,
    updateFilter,
    refresh: fetchClaims,
  }
}
