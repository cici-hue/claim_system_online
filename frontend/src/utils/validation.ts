export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: RegExp
  email?: boolean
  url?: boolean
  custom?: (value: any) => string | null
}

export interface ValidationErrors {
  [field: string]: string
}

export interface ValidationSchema {
  [field: string]: ValidationRule
}

export function validate(data: Record<string, any>, schema: ValidationSchema): ValidationErrors {
  const errors: ValidationErrors = {}

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field]

    if (rules.required && (value === undefined || value === null || value === '')) {
      errors[field] = `${field} is required`
      continue
    }

    if (value === undefined || value === null || value === '') continue

    if (typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        errors[field] = `${field} must be at least ${rules.minLength} characters`
        continue
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        errors[field] = `${field} must be at most ${rules.maxLength} characters`
        continue
      }
      if (rules.pattern && !rules.pattern.test(value)) {
        errors[field] = `${field} format is invalid`
        continue
      }
      if (rules.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors[field] = `${field} must be a valid email address`
        continue
      }
      if (rules.url && !/^https?:\/\/.+/.test(value)) {
        errors[field] = `${field} must be a valid URL`
        continue
      }
    }

    if (typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors[field] = `${field} must be at least ${rules.min}`
        continue
      }
      if (rules.max !== undefined && value > rules.max) {
        errors[field] = `${field} must be at most ${rules.max}`
        continue
      }
    }

    if (rules.custom) {
      const customError = rules.custom(value)
      if (customError) {
        errors[field] = customError
      }
    }
  }

  return errors
}

export function isValid(errors: ValidationErrors): boolean {
  return Object.keys(errors).length === 0
}

export const claimFormSchema: ValidationSchema = {
  vendor: { required: true, minLength: 1 },
  customer: { required: true, minLength: 1 },
  location: { required: true, minLength: 1 },
  defectCategory: { required: true },
  claimNo: { required: true },
  claimDate: { required: true },
  claimQty: { required: true, min: 1, max: 999999 },
  shippedQty: { required: true, min: 0, max: 999999 },
  defectDescription: { required: true, minLength: 10 },
  qcResponsibility: { required: true },
  inspector: { required: true },
}

export const userFormSchema: ValidationSchema = {
  email: { required: true, email: true },
  password: { required: true, minLength: 6, maxLength: 100 },
  role: { required: true },
  factoryAgent: { required: true },
}
