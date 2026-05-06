import axios from 'axios'

const isDev = import.meta.env.DEV
const baseURL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({ baseURL })

api.interceptors.request.use(config => {
  const token = localStorage.getItem('cms_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  if (isDev) {
    console.debug(`[API] ${config.method?.toUpperCase()} ${config.url}`, config.data || config.params || '')
  }
  return config
})

api.interceptors.response.use(
  res => {
    if (isDev) {
      console.debug(`[API] ${res.status} ${res.config.url}`, typeof res.data === 'object' ? 'OK' : res.data)
    }
    return res
  },
  err => {
    if (isDev) {
      console.error(`[API] ${err.response?.status || 'ERR'} ${err.config?.url}`, err.response?.data || err.message)
    }
    if (err.response?.status === 401) {
      localStorage.removeItem('cms_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
