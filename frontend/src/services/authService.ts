import { mockApi } from './mockData'

export interface LoginRequest { username: string; password: string }
export interface LoginResponse {
  token: string; username: string; fullname: string
  role: string; team: string; factoryAgent: string
}

const USE_MOCK = true

export const login = async (data: LoginRequest) => {
  if (USE_MOCK) {
    const response = await mockApi.login(data.username)
    return response.data
  }
  const api = (await import('./api')).default
  return api.post<LoginResponse>('/auth/login', data).then(r => r.data)
}

export const logout = () => {
  localStorage.removeItem('cms_token')
  localStorage.removeItem('cms_user')
}
