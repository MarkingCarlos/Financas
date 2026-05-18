import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Injeta o Google ID Token em cada requisição (quando disponível)
api.interceptors.request.use(config => {
  const token = localStorage.getItem('google_id_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Redireciona para login se o token expirou (401)
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('google_id_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
