import axios from 'axios'

const TOKEN_KEY = 'auth_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY)
  window.location.href = '/login'
}

export async function loginWithGoogle(idToken) {
  const res = await axios.post('/api/auth/google', { idToken })
  return res.data // { token, user, linked }
}

export async function loginWithEmail(email, password) {
  const res = await axios.post('/api/auth/login', { email, password })
  return res.data
}

export async function register(name, email, password) {
  const res = await axios.post('/api/auth/register', { name, email, password })
  return res.data
}
