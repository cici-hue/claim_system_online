import api from './api'

export interface Notifications {
  rcaCount: number
  rcaType: string
  newClaimCount: number
}

export const getNotifications = async (): Promise<Notifications> => {
  const response = await api.get('/notifications')
  return response.data
}
