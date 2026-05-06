import { AxiosError } from 'axios'

export interface AppError {
  message: string
  code?: string
  status?: number
  details?: any
}

export function parseError(err: unknown): AppError {
  if (err instanceof AxiosError) {
    const data = err.response?.data
    return {
      message: data?.message || data?.error || err.message || 'Request failed',
      code: data?.code || data?.errorCode,
      status: err.response?.status,
      details: data?.details || data?.errors,
    }
  }

  if (err instanceof Error) {
    return { message: err.message }
  }

  if (typeof err === 'string') {
    return { message: err }
  }

  return { message: 'An unexpected error occurred' }
}

export function getErrorMessage(err: unknown): string {
  return parseError(err).message
}

export function isNetworkError(err: unknown): boolean {
  if (err instanceof AxiosError) {
    return !err.response || err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED'
  }
  return false
}

export function isAuthError(err: unknown): boolean {
  if (err instanceof AxiosError) {
    return err.response?.status === 401 || err.response?.status === 403
  }
  return false
}

export function isValidationError(err: unknown): boolean {
  if (err instanceof AxiosError) {
    return err.response?.status === 400
  }
  return false
}
