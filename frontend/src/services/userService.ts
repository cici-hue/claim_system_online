import { mockApi } from './mockData'

export interface User {
  id: number; username: string; fullname: string; email: string
  role: string; team: string; factoryAgent: string; createdAt: string
}

export interface CreateUserRequest {
  username: string; fullname: string; email: string
  password: string; role: string; team: string; factoryAgent: string
}

const USE_MOCK = true

export const getUsers = async () => {
  if (USE_MOCK) {
    const response = await mockApi.getUsers()
    return response.data
  }
  const api = (await import('./api')).default
  return api.get<User[]>('/users').then(r => r.data)
}

export const createUser = async (data: CreateUserRequest) => {
  if (USE_MOCK) {
    const response = await mockApi.createUser(data as any)
    return response.data
  }
  const api = (await import('./api')).default
  return api.post<User>('/users', data).then(r => r.data)
}

export const updateUser = async (id: number, data: Partial<CreateUserRequest>) => {
  if (USE_MOCK) {
    const response = await mockApi.updateUser(id, data as any)
    return response.data
  }
  const api = (await import('./api')).default
  return api.put<User>(`/users/${id}`, data).then(r => r.data)
}

export const deleteUser = async (id: number) => {
  if (USE_MOCK) {
    await mockApi.deleteUser(id)
    return
  }
  const api = (await import('./api')).default
  return api.delete(`/users/${id}`)
}
